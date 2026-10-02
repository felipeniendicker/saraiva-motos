package br.com.saraivamotos.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import br.com.saraivamotos.domain.ItemVenda;
import br.com.saraivamotos.domain.Cliente;
import br.com.saraivamotos.domain.MovimentacaoEstoque;
import br.com.saraivamotos.domain.Produto;
import br.com.saraivamotos.domain.StatusVenda;
import br.com.saraivamotos.domain.TipoMovimentacaoEstoque;
import br.com.saraivamotos.domain.TipoPreco;
import br.com.saraivamotos.domain.Venda;
import br.com.saraivamotos.dto.CancelamentoVendaRequest;
import br.com.saraivamotos.dto.ItemVendaRequest;
import br.com.saraivamotos.dto.VendaRequest;
import br.com.saraivamotos.dto.VendaResponse;
import br.com.saraivamotos.exception.OperacaoVendaInvalidaException;
import br.com.saraivamotos.exception.ClienteNaoEncontradoException;
import br.com.saraivamotos.exception.ProdutoNaoEncontradoException;
import br.com.saraivamotos.exception.VendaNaoEncontradaException;
import br.com.saraivamotos.repository.MovimentacaoEstoqueRepository;
import br.com.saraivamotos.repository.ClienteRepository;
import br.com.saraivamotos.repository.ProdutoRepository;
import br.com.saraivamotos.repository.VendaRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VendaService {
    private static final int ESCALA = 2;

    private final VendaRepository vendaRepository;
    private final ProdutoRepository produtoRepository;
    private final MovimentacaoEstoqueRepository movimentacaoRepository;
    private final ClienteRepository clienteRepository;

    public VendaService(VendaRepository vendaRepository, ProdutoRepository produtoRepository,
            MovimentacaoEstoqueRepository movimentacaoRepository, ClienteRepository clienteRepository) {
        this.vendaRepository = vendaRepository;
        this.produtoRepository = produtoRepository;
        this.movimentacaoRepository = movimentacaoRepository;
        this.clienteRepository = clienteRepository;
    }

    @Transactional
    public VendaResponse criar(VendaRequest request) {
        validarRequest(request);
        Cliente cliente = buscarClienteAtivo(request.clienteId());
        TipoPreco tipoPreco = cliente == null ? TipoPreco.VAREJO : cliente.getTipoCliente().getTipoPreco();
        List<ItemVendaRequest> itensRequest = new ArrayList<>(request.itens());
        List<Long> ids = validarEOrdenarIdsUnicos(itensRequest);
        Map<Long, Produto> produtos = bloquearProdutos(ids);

        BigDecimal subtotalVenda = BigDecimal.ZERO.setScale(ESCALA);
        List<ItemCalculado> calculados = new ArrayList<>();
        for (ItemVendaRequest itemRequest : itensRequest) {
            Produto produto = produtos.get(itemRequest.produtoId());
            validarProdutoParaVenda(produto, itemRequest.quantidade());
            BigDecimal precoOriginal = dinheiro(tipoPreco == TipoPreco.REVENDA ? produto.getPrecoRevenda() : produto.getPrecoVarejo());
            BigDecimal precoPraticado = dinheiro(itemRequest.precoUnitario());
            BigDecimal subtotalItem = dinheiro(precoPraticado.multiply(BigDecimal.valueOf(itemRequest.quantidade())));
            calculados.add(new ItemCalculado(itemRequest, produto, precoOriginal, precoPraticado, subtotalItem));
            subtotalVenda = dinheiro(subtotalVenda.add(subtotalItem));
        }

        BigDecimal desconto = dinheiro(request.desconto());
        if (desconto.compareTo(subtotalVenda) > 0) {
            throw new IllegalArgumentException("O desconto não pode ser maior que o subtotal da venda.");
        }

        Venda venda = novaVenda(request, cliente, tipoPreco, subtotalVenda, desconto);
        venda = vendaRepository.saveAndFlush(venda);
        venda.setNumeroVenda(String.format("%06d", venda.getId()));

        List<MovimentacaoEstoque> movimentacoes = new ArrayList<>();
        for (ItemCalculado calculado : calculados) {
            ItemVenda item = criarItem(calculado);
            venda.adicionarItem(item);
            Produto produto = calculado.produto();
            int saldoAnterior = produto.getQuantidadeEstoque();
            int saldoPosterior = saldoAnterior - calculado.request().quantidade();
            produto.setQuantidadeEstoque(saldoPosterior);
            movimentacoes.add(criarMovimentacao(produto, TipoMovimentacaoEstoque.SAIDA_VENDA,
                    calculado.request().quantidade(), saldoAnterior, saldoPosterior,
                    "Saída da venda " + venda.getNumeroVenda(), venda.getId()));
        }

        produtoRepository.saveAll(produtos.values());
        movimentacaoRepository.saveAll(movimentacoes);
        return VendaResponse.from(vendaRepository.save(venda));
    }

    @Transactional(readOnly = true)
    public List<VendaResponse> listar(String numero, StatusVenda status, LocalDate dataInicial, LocalDate dataFinal,
            Long clienteId) {
        if (clienteId != null) {
            return vendaRepository.findByClienteIdOrderByDataHoraDescIdDesc(clienteId).stream()
                    .map(VendaResponse::from)
                    .toList();
        }
        LocalDateTime inicio = dataInicial == null ? null : dataInicial.atStartOfDay();
        LocalDateTime fim = dataFinal == null ? null : dataFinal.plusDays(1).atStartOfDay();
        if (dataInicial != null && dataFinal != null && dataFinal.isBefore(dataInicial)) {
            throw new IllegalArgumentException("A data final não pode ser anterior à data inicial.");
        }
        String numeroNormalizado = numero == null || numero.isBlank() ? null : numero.trim();
        return vendaRepository.buscar(numeroNormalizado, status, inicio, fim).stream().map(VendaResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public VendaResponse buscarPorId(Long id) {
        return VendaResponse.from(vendaRepository.buscarCompletaPorId(id)
                .orElseThrow(() -> new VendaNaoEncontradaException(id)));
    }

    @Transactional
    public VendaResponse cancelar(Long id, CancelamentoVendaRequest request) {
        if (request.motivo() == null || request.motivo().isBlank()) {
            throw new IllegalArgumentException("O motivo do cancelamento é obrigatório.");
        }
        Venda venda = vendaRepository.buscarCompletaPorIdParaAtualizar(id)
                .orElseThrow(() -> new VendaNaoEncontradaException(id));
        if (venda.getStatus() != StatusVenda.CONCLUIDA) {
            throw new OperacaoVendaInvalidaException("A venda já está cancelada.");
        }

        List<Long> ids = venda.getItens().stream().map(item -> item.getProduto().getId()).distinct().sorted().toList();
        Map<Long, Produto> produtos = bloquearProdutos(ids);
        List<MovimentacaoEstoque> movimentacoes = new ArrayList<>();
        for (ItemVenda item : venda.getItens()) {
            Produto produto = produtos.get(item.getProduto().getId());
            int saldoAnterior = produto.getQuantidadeEstoque();
            int saldoPosterior;
            try {
                saldoPosterior = Math.addExact(saldoAnterior, item.getQuantidade());
            } catch (ArithmeticException exception) {
                throw new OperacaoVendaInvalidaException("Não foi possível devolver o estoque da venda.");
            }
            produto.setQuantidadeEstoque(saldoPosterior);
            movimentacoes.add(criarMovimentacao(produto, TipoMovimentacaoEstoque.CANCELAMENTO_VENDA,
                    item.getQuantidade(), saldoAnterior, saldoPosterior,
                    "Cancelamento da venda " + venda.getNumeroVenda(), venda.getId()));
        }

        venda.setStatus(StatusVenda.CANCELADA);
        venda.setDataCancelamento(LocalDateTime.now());
        venda.setMotivoCancelamento(request.motivo().trim());
        produtoRepository.saveAll(produtos.values());
        movimentacaoRepository.saveAll(movimentacoes);
        return VendaResponse.from(vendaRepository.save(venda));
    }

    private void validarRequest(VendaRequest request) {
        if (request.itens() == null || request.itens().isEmpty()) throw new IllegalArgumentException("A venda deve possuir ao menos um item.");
        if (request.desconto() == null || request.desconto().signum() < 0) throw new IllegalArgumentException("O desconto não pode ser negativo.");
        if (request.formaPagamento() == null) throw new IllegalArgumentException("A forma de pagamento é obrigatória.");
        for (ItemVendaRequest item : request.itens()) {
            if (item.produtoId() == null) throw new IllegalArgumentException("O produto do item é obrigatório.");
            if (item.quantidade() == null || item.quantidade() <= 0) throw new IllegalArgumentException("A quantidade deve ser maior que zero.");
            if (item.precoUnitario() == null || item.precoUnitario().signum() < 0) throw new IllegalArgumentException("O preço praticado não pode ser negativo.");
        }
    }

    private List<Long> validarEOrdenarIdsUnicos(List<ItemVendaRequest> itens) {
        Set<Long> unicos = new HashSet<>();
        for (ItemVendaRequest item : itens) {
            if (!unicos.add(item.produtoId())) throw new IllegalArgumentException("O mesmo produto não pode aparecer mais de uma vez na venda.");
        }
        return unicos.stream().sorted().toList();
    }

    private Map<Long, Produto> bloquearProdutos(List<Long> ids) {
        List<Produto> bloqueados = produtoRepository.findAllByIdForUpdate(ids);
        Map<Long, Produto> produtos = new HashMap<>();
        bloqueados.forEach(produto -> produtos.put(produto.getId(), produto));
        for (Long id : ids) {
            if (!produtos.containsKey(id)) throw new ProdutoNaoEncontradoException("Produto não encontrado para o id " + id + ".");
        }
        return produtos;
    }

    private void validarProdutoParaVenda(Produto produto, int quantidade) {
        if (!Boolean.TRUE.equals(produto.getAtivo())) throw new OperacaoVendaInvalidaException("O produto " + produto.getNome() + " está inativo.");
        if (produto.getQuantidadeEstoque() < quantidade) throw new OperacaoVendaInvalidaException("Estoque insuficiente para o produto " + produto.getNome() + ".");
    }

    private Venda novaVenda(VendaRequest request, Cliente cliente, TipoPreco tipoPreco, BigDecimal subtotal, BigDecimal desconto) {
        Venda venda = new Venda();
        venda.setNumeroVenda("TMP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20));
        venda.setClienteId(cliente == null ? null : cliente.getId());
        venda.setClienteNome(cliente == null ? null : cliente.getNomeRazaoSocial());
        venda.setClienteTipo(cliente == null ? null : cliente.getTipoCliente().name());
        venda.setTipoPrecoUtilizado(tipoPreco);
        venda.setSubtotal(subtotal);
        venda.setDesconto(desconto);
        venda.setTotal(dinheiro(subtotal.subtract(desconto)));
        venda.setFormaPagamento(request.formaPagamento());
        venda.setStatus(StatusVenda.CONCLUIDA);
        venda.setDataHora(LocalDateTime.now());
        venda.setObservacoes(normalizarOpcional(request.observacoes()));
        return venda;
    }

    private Cliente buscarClienteAtivo(Long id) {
        if (id == null) return null;
        Cliente cliente = clienteRepository.findById(id).orElseThrow(() -> new ClienteNaoEncontradoException(id));
        if (!Boolean.TRUE.equals(cliente.getAtivo())) {
            throw new OperacaoVendaInvalidaException("O cliente selecionado está inativo.");
        }
        return cliente;
    }

    private ItemVenda criarItem(ItemCalculado calculado) {
        ItemVenda item = new ItemVenda();
        item.setProduto(calculado.produto());
        String codigo = calculado.produto().getCodigoReferencia();
        item.setCodigoProduto(codigo == null || codigo.isBlank() ? "SEM-REFERENCIA" : codigo);
        item.setDescricaoProduto(calculado.produto().getNome());
        item.setQuantidade(calculado.request().quantidade());
        item.setPrecoOriginal(calculado.precoOriginal());
        item.setPrecoUnitario(calculado.precoPraticado());
        item.setSubtotal(calculado.subtotal());
        return item;
    }

    private MovimentacaoEstoque criarMovimentacao(Produto produto, TipoMovimentacaoEstoque tipo, int quantidade,
            int anterior, int posterior, String motivo, Long vendaId) {
        MovimentacaoEstoque movimento = new MovimentacaoEstoque();
        movimento.setProduto(produto);
        movimento.setTipo(tipo);
        movimento.setQuantidade(quantidade);
        movimento.setEstoqueAnterior(anterior);
        movimento.setEstoquePosterior(posterior);
        movimento.setMotivo(motivo);
        movimento.setVendaId(vendaId);
        movimento.setDataHora(LocalDateTime.now());
        return movimento;
    }

    private BigDecimal dinheiro(BigDecimal valor) { return valor.setScale(ESCALA, RoundingMode.HALF_UP); }
    private String normalizarOpcional(String valor) { return valor == null || valor.isBlank() ? null : valor.trim(); }

    private record ItemCalculado(ItemVendaRequest request, Produto produto, BigDecimal precoOriginal,
            BigDecimal precoPraticado, BigDecimal subtotal) {}
}
