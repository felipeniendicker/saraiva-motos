package br.com.saraivamotos.service;

import java.math.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import br.com.saraivamotos.domain.*;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.exception.OperacaoVendaInvalidaException;
import br.com.saraivamotos.repository.*;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrcamentoService {
    private final OrcamentoRepository orcamentos;
    private final ClienteRepository clientes;
    private final ProdutoRepository produtos;
    private final OperacaoIdempotenteService operacoes;
    private final VendaService vendas;

    public OrcamentoService(OrcamentoRepository orcamentos,ClienteRepository clientes,ProdutoRepository produtos,
            OperacaoIdempotenteService operacoes,VendaService vendas){this.orcamentos=orcamentos;this.clientes=clientes;
        this.produtos=produtos;this.operacoes=operacoes;this.vendas=vendas;}

    @Transactional
    public OrcamentoResponse criar(OrcamentoRequest request,AuthenticatedUser user){
        validarStatusEditavel(request.status());
        Orcamento orcamento=new Orcamento();
        orcamento.setNumero("TMP-"+UUID.randomUUID().toString().replace("-","").substring(0,20));
        orcamento.setDataEmissao(LocalDateTime.now());
        orcamento.setOperadorId(user.id());orcamento.setOperadorEmail(user.email());
        preencher(orcamento,request);
        orcamento=orcamentos.saveAndFlush(orcamento);
        orcamento.setNumero(String.format("ORC-%06d",orcamento.getId()));
        return OrcamentoResponse.from(orcamentos.save(orcamento));
    }

    @Transactional
    public OrcamentoResponse atualizar(Long id,OrcamentoRequest request){
        validarStatusEditavel(request.status());
        Orcamento orcamento=bloquear(id);
        if(orcamento.getStatus()==StatusOrcamento.CONVERTIDO||orcamento.getStatus()==StatusOrcamento.CANCELADO)
            throw new IllegalArgumentException("Somente orcamentos ativos podem ser editados.");
        if(request.versao()==null||!request.versao().equals(orcamento.getVersao()))
            throw new IllegalArgumentException("O orcamento foi alterado em outro computador. Atualize a tela antes de continuar.");
        preencher(orcamento,request);
        return OrcamentoResponse.from(orcamentos.save(orcamento));
    }

    @Transactional(readOnly=true) public List<OrcamentoResponse> listar(){return orcamentos.findAllByOrderByDataEmissaoDescIdDesc().stream().map(OrcamentoResponse::from).toList();}
    @Transactional(readOnly=true) public OrcamentoResponse buscar(Long id){return OrcamentoResponse.from(orcamentos.buscarCompleto(id).orElseThrow(()->new IllegalArgumentException("Orcamento nao encontrado.")));}

    @Transactional
    public OrcamentoResponse cancelar(Long id,CancelamentoOrcamentoRequest request){
        Orcamento orcamento=bloquear(id);
        if(orcamento.getStatus()==StatusOrcamento.CONVERTIDO)throw new IllegalArgumentException("Um orcamento convertido nao pode ser cancelado.");
        if(orcamento.getStatus()==StatusOrcamento.CANCELADO)return OrcamentoResponse.from(orcamento);
        orcamento.setStatus(StatusOrcamento.CANCELADO);orcamento.setDataCancelamento(LocalDateTime.now());
        orcamento.setMotivoCancelamento(request.motivo().trim());orcamento.setDataAtualizacao(LocalDateTime.now());
        return OrcamentoResponse.from(orcamentos.save(orcamento));
    }

    @Transactional
    public VendaResponse converter(Long id,String chave,ConversaoOrcamentoRequest request,AuthenticatedUser user){
        Orcamento orcamento=bloquear(id);
        if(orcamento.getStatus()==StatusOrcamento.CONVERTIDO){
            if(orcamento.getVendaId()==null)throw new IllegalStateException("Orcamento convertido sem venda vinculada.");
            return vendas.buscarPorId(orcamento.getVendaId());
        }
        if(orcamento.getStatus()==StatusOrcamento.CANCELADO)throw new IllegalArgumentException("Orcamento cancelado nao pode ser convertido.");
        List<ItemVendaRequest> itens=orcamento.getItens().stream().map(item->new ItemVendaRequest(item.getTipoItem(),
                item.getProduto()==null?null:item.getProduto().getId(),item.getDescricaoItem(),item.getQuantidade(),
                item.getPrecoUnitario(),item.getPrecoOriginal(),item.getPrecoAlteradoManualmente())).toList();
        String observacoes=request.observacoes()==null||request.observacoes().isBlank()?orcamento.getObservacoes():request.observacoes().trim();
        VendaRequest vendaRequest=new VendaRequest(orcamento.getClienteId(),itens,orcamento.getDesconto(),
                orcamento.getDescontoPercentual(),request.formaPagamento(),observacoes);
        VendaResponse venda=operacoes.venda(chaveConversao(id,chave),vendaRequest,user);
        orcamento.setStatus(StatusOrcamento.CONVERTIDO);orcamento.setVendaId(venda.id());orcamento.setDataAtualizacao(LocalDateTime.now());
        orcamentos.save(orcamento);return venda;
    }

    private void preencher(Orcamento orcamento,OrcamentoRequest request){
        Cliente cliente=request.clienteId()==null?null:clientes.findById(request.clienteId())
                .orElseThrow(()->new IllegalArgumentException("Cliente nao encontrado."));
        if(cliente!=null&&!Boolean.TRUE.equals(cliente.getAtivo()))throw new IllegalArgumentException("O cliente selecionado esta inativo.");
        TipoPreco tipoPreco=cliente==null?TipoPreco.VAREJO:cliente.getTipoCliente().getTipoPreco();
        Map<Long,Produto> produtosPorId=buscarProdutos(request.itens());
        BigDecimal subtotal=BigDecimal.ZERO.setScale(2);List<ItemOrcamento> itens=new ArrayList<>();
        for(ItemOrcamentoRequest itemRequest:request.itens()){
            validarItem(itemRequest);
            Produto produto=itemRequest.tipoItem()==TipoItem.PRODUTO?produtosPorId.get(itemRequest.produtoId()):null;
            BigDecimal preco=dinheiro(itemRequest.precoUnitario());BigDecimal original;
            ItemOrcamento item=new ItemOrcamento();item.setTipoItem(itemRequest.tipoItem());item.setProduto(produto);
            if(produto!=null){
                if(!Boolean.TRUE.equals(produto.getAtivo()))throw new IllegalArgumentException("O produto "+produto.getNome()+" esta inativo.");
                original=dinheiro(tipoPreco==TipoPreco.REVENDA?produto.getPrecoRevenda():produto.getPrecoVarejo());
                item.setCodigoItem(produto.getCodigoReferencia()==null||produto.getCodigoReferencia().isBlank()?"SEM-REFERENCIA":produto.getCodigoReferencia());
                item.setDescricaoItem(produto.getNome());
            }else{
                original=dinheiro(itemRequest.precoOriginal()==null?preco:itemRequest.precoOriginal());
                item.setCodigoItem("SERVICO");item.setDescricaoItem(itemRequest.descricao().trim());
            }
            BigDecimal itemSubtotal=dinheiro(preco.multiply(BigDecimal.valueOf(itemRequest.quantidade())));
            item.setQuantidade(itemRequest.quantidade());item.setPrecoOriginal(original);item.setPrecoUnitario(preco);
            item.setPrecoAlteradoManualmente(!Boolean.FALSE.equals(itemRequest.precoAlteradoManualmente())||preco.compareTo(original)!=0);
            item.setSubtotal(itemSubtotal);subtotal=dinheiro(subtotal.add(itemSubtotal));itens.add(item);
        }
        BigDecimal percentual=request.descontoPercentual().setScale(4,RoundingMode.HALF_UP);
        BigDecimal desconto=dinheiro(subtotal.multiply(percentual).divide(BigDecimal.valueOf(100)));
        orcamento.setClienteId(cliente==null?null:cliente.getId());orcamento.setClienteNome(cliente==null?null:cliente.getNomeRazaoSocial());
        orcamento.setClienteTipo(cliente==null?null:cliente.getTipoCliente().name());orcamento.setTipoPrecoUtilizado(tipoPreco);
        orcamento.setStatus(request.status());orcamento.setValidade(request.validade());orcamento.setSubtotal(subtotal);
        orcamento.setDescontoPercentual(percentual);orcamento.setDesconto(desconto);orcamento.setTotal(dinheiro(subtotal.subtract(desconto)));
        orcamento.setObservacoes(request.observacoes()==null||request.observacoes().isBlank()?null:request.observacoes().trim());
        orcamento.setDataAtualizacao(LocalDateTime.now());orcamento.getItens().clear();itens.forEach(orcamento::adicionarItem);
    }

    private Map<Long,Produto> buscarProdutos(List<ItemOrcamentoRequest> itens){
        List<Long> ids=itens.stream().filter(i->i.tipoItem()==TipoItem.PRODUTO).map(ItemOrcamentoRequest::produtoId)
                .filter(Objects::nonNull).distinct().toList();Map<Long,Produto> resultado=new HashMap<>();
        produtos.findAllById(ids).forEach(p->resultado.put(p.getId(),p));
        if(resultado.size()!=ids.size())throw new IllegalArgumentException("Um dos produtos do orcamento nao foi encontrado.");
        return resultado;
    }
    private void validarItem(ItemOrcamentoRequest item){
        if(item.tipoItem()==TipoItem.PRODUTO&&item.produtoId()==null)throw new IllegalArgumentException("Produto obrigatorio no item de produto.");
        if(item.tipoItem()==TipoItem.SERVICO&&(item.descricao()==null||item.descricao().isBlank()))throw new IllegalArgumentException("Descricao obrigatoria no servico.");
    }
    private void validarStatusEditavel(StatusOrcamento status){if(status!=StatusOrcamento.RASCUNHO&&status!=StatusOrcamento.EMITIDO)throw new IllegalArgumentException("Status invalido para salvar o orcamento.");}
    private Orcamento bloquear(Long id){return orcamentos.buscarParaAtualizar(id).orElseThrow(()->new IllegalArgumentException("Orcamento nao encontrado."));}
    private String chaveConversao(Long orcamentoId,String chave){
        try{
            String uuid=UUID.fromString(chave).toString();
            return UUID.nameUUIDFromBytes(("ORCAMENTO|"+orcamentoId+"|"+uuid).getBytes(StandardCharsets.UTF_8)).toString();
        }catch(Exception exception){
            throw new IllegalArgumentException("Idempotency-Key deve ser UUID valido.");
        }
    }
    private BigDecimal dinheiro(BigDecimal valor){return valor.setScale(2,RoundingMode.HALF_UP);}
}
