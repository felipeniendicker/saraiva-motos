package br.com.saraivamotos.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

import br.com.saraivamotos.domain.Cliente;
import br.com.saraivamotos.domain.CondicaoPagamento;
import br.com.saraivamotos.domain.ItemOrcamento;
import br.com.saraivamotos.domain.ItemPedido;
import br.com.saraivamotos.domain.Orcamento;
import br.com.saraivamotos.domain.Pedido;
import br.com.saraivamotos.domain.PedidoHistoricoStatus;
import br.com.saraivamotos.domain.StatusOrcamento;
import br.com.saraivamotos.domain.StatusPedido;
import br.com.saraivamotos.dto.AlteracaoStatusPedidoRequest;
import br.com.saraivamotos.dto.CancelamentoPedidoRequest;
import br.com.saraivamotos.dto.ConversaoPedidoRequest;
import br.com.saraivamotos.dto.FinalizacaoPedidoRequest;
import br.com.saraivamotos.dto.ItemVendaRequest;
import br.com.saraivamotos.dto.PedidoResponse;
import br.com.saraivamotos.dto.VendaRequest;
import br.com.saraivamotos.dto.VendaResponse;
import br.com.saraivamotos.repository.ClienteRepository;
import br.com.saraivamotos.repository.OrcamentoRepository;
import br.com.saraivamotos.repository.PedidoRepository;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PedidoService {
    private final PedidoRepository pedidos;
    private final OrcamentoRepository orcamentos;
    private final ClienteRepository clientes;
    private final OperacaoIdempotenteService operacoes;
    private final VendaService vendas;

    public PedidoService(PedidoRepository pedidos, OrcamentoRepository orcamentos, ClienteRepository clientes,
            OperacaoIdempotenteService operacoes, VendaService vendas) {
        this.pedidos = pedidos;
        this.orcamentos = orcamentos;
        this.clientes = clientes;
        this.operacoes = operacoes;
        this.vendas = vendas;
    }

    @Transactional
    public PedidoResponse converterOrcamento(Long orcamentoId, ConversaoPedidoRequest request,
            AuthenticatedUser operador) {
        Orcamento orcamento = orcamentos.buscarParaAtualizar(orcamentoId)
                .orElseThrow(() -> new IllegalArgumentException("Orcamento nao encontrado."));
        Pedido existente = pedidos.findByOrcamentoId(orcamentoId).orElse(null);
        if (existente != null) return respostaCompleta(existente.getId());
        if (orcamento.getStatus() == StatusOrcamento.CANCELADO) {
            throw new IllegalArgumentException("Orcamento cancelado nao pode ser convertido em pedido.");
        }
        if (orcamento.getStatus() == StatusOrcamento.CONVERTIDO) {
            throw new IllegalArgumentException("O orcamento ja possui uma conversao comercial.");
        }
        if (orcamento.getClienteId() == null) {
            throw new IllegalArgumentException("Cliente cadastrado e obrigatorio para criar um pedido.");
        }
        Cliente cliente = clientes.findById(orcamento.getClienteId())
                .orElseThrow(() -> new IllegalArgumentException("Cliente nao encontrado."));
        if (!Boolean.TRUE.equals(cliente.getAtivo())) {
            throw new IllegalArgumentException("O cliente selecionado esta inativo.");
        }

        LocalDateTime agora = LocalDateTime.now();
        Pedido pedido = new Pedido();
        pedido.setNumero("TMP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20));
        pedido.setClienteId(cliente.getId());
        pedido.setClienteNome(orcamento.getClienteNome());
        pedido.setClienteTipo(orcamento.getClienteTipo());
        pedido.setOrcamentoId(orcamento.getId());
        pedido.setTipoPrecoUtilizado(orcamento.getTipoPrecoUtilizado());
        pedido.setStatus(StatusPedido.PENDENTE);
        pedido.setSubtotal(orcamento.getSubtotal());
        pedido.setDesconto(orcamento.getDesconto());
        pedido.setDescontoPercentual(orcamento.getDescontoPercentual());
        pedido.setTotal(orcamento.getTotal());
        pedido.setFormaPagamentoPrevista(orcamento.getFormaPagamentoPrevista());
        pedido.setCondicaoPagamentoPrevista(orcamento.getCondicaoPagamentoPrevista());
        pedido.setVencimentoPrevisto(orcamento.getVencimentoPrevisto());
        pedido.setEntradaPrevista(orcamento.getEntradaPrevista());
        pedido.setFormaPagamentoEntradaPrevista(orcamento.getFormaPagamentoEntradaPrevista());
        pedido.setDataCriacao(agora);
        pedido.setDataAtualizacao(agora);
        pedido.setPrevisaoRetirada(request.previsaoRetirada());
        pedido.setObservacoes(texto(request.observacoes()) == null ? orcamento.getObservacoes() : texto(request.observacoes()));
        pedido.setOperadorId(operador.id());
        pedido.setOperadorEmail(operador.email());
        orcamento.getItens().stream().map(this::copiarItem).forEach(pedido::adicionarItem);
        pedido.adicionarHistorico(historico(null, StatusPedido.PENDENTE, "Pedido criado a partir do orcamento "
                + orcamento.getNumero() + ".", operador, agora));
        pedido = pedidos.saveAndFlush(pedido);
        pedido.setNumero(String.format("PED-%06d", pedido.getId()));

        orcamento.setStatus(StatusOrcamento.CONVERTIDO);
        orcamento.setDataAtualizacao(agora);
        orcamentos.save(orcamento);
        pedidos.save(pedido);
        return PedidoResponse.from(pedido);
    }

    @Transactional(readOnly = true)
    public List<PedidoResponse> listar(String busca, StatusPedido status) {
        String termo = busca == null || busca.isBlank() ? null : busca.trim();
        return pedidos.buscar(termo, status).stream().map(PedidoResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PedidoResponse buscar(Long id) {
        return respostaCompleta(id);
    }

    @Transactional
    public PedidoResponse alterarStatus(Long id, AlteracaoStatusPedidoRequest request, AuthenticatedUser operador) {
        Pedido pedido = bloquear(id);
        StatusPedido anterior = pedido.getStatus();
        validarTransicao(anterior, request.status());
        registrarTransicao(pedido, anterior, request.status(), request.observacao(), operador);
        return PedidoResponse.from(pedidos.save(pedido));
    }

    @Transactional
    public PedidoResponse cancelar(Long id, CancelamentoPedidoRequest request, AuthenticatedUser operador) {
        Pedido pedido = bloquear(id);
        if (pedido.getStatus() == StatusPedido.CANCELADO) return PedidoResponse.from(pedido);
        if (pedido.getStatus() == StatusPedido.FINALIZADO) {
            throw new IllegalArgumentException("Pedido finalizado nao pode ser cancelado.");
        }
        registrarTransicao(pedido, pedido.getStatus(), StatusPedido.CANCELADO, request.motivo(), operador);
        return PedidoResponse.from(pedidos.save(pedido));
    }

    @Transactional
    public VendaResponse finalizar(Long id, String chave, FinalizacaoPedidoRequest request,
            AuthenticatedUser operador) {
        Pedido pedido = bloquear(id);
        if (pedido.getStatus() == StatusPedido.FINALIZADO) {
            if (pedido.getVendaId() == null) throw new IllegalStateException("Pedido finalizado sem venda vinculada.");
            return vendas.buscarPorId(pedido.getVendaId());
        }
        if (pedido.getStatus() != StatusPedido.PRONTO) {
            throw new IllegalArgumentException("Somente pedidos prontos podem ser finalizados.");
        }

        List<ItemVendaRequest> itens = pedido.getItens().stream()
                .map(item -> new ItemVendaRequest(item.getTipoItem(),
                        item.getProduto() == null ? null : item.getProduto().getId(), item.getDescricaoItem(),
                        item.getQuantidade(), item.getPrecoUnitario(), item.getPrecoOriginal(), true))
                .toList();
        String observacoes = texto(request.observacoes()) == null ? pedido.getObservacoes() : texto(request.observacoes());
        VendaRequest vendaRequest = new VendaRequest(pedido.getClienteId(), itens, pedido.getDesconto(),
                pedido.getDescontoPercentual(), request.formaPagamento(), observacoes,
                request.condicaoPagamento() == null ? CondicaoPagamento.IMEDIATO : request.condicaoPagamento(),
                request.vencimento(), request.pagamentoInicial(), request.formaPagamentoInicial());
        VendaResponse venda = operacoes.venda(chaveFinalizacao(id, chave), vendaRequest, operador);
        pedido.setVendaId(venda.id());
        registrarTransicao(pedido, pedido.getStatus(), StatusPedido.FINALIZADO,
                "Venda " + venda.numeroVenda() + " gerada.", operador);
        pedidos.save(pedido);
        return venda;
    }

    private PedidoResponse respostaCompleta(Long id) {
        return PedidoResponse.from(pedidos.buscarCompleto(id)
                .orElseThrow(() -> new IllegalArgumentException("Pedido nao encontrado.")));
    }

    private Pedido bloquear(Long id) {
        return pedidos.buscarParaAtualizar(id)
                .orElseThrow(() -> new IllegalArgumentException("Pedido nao encontrado."));
    }

    private ItemPedido copiarItem(ItemOrcamento origem) {
        ItemPedido item = new ItemPedido();
        item.setTipoItem(origem.getTipoItem());
        item.setProduto(origem.getProduto());
        item.setCodigoItem(origem.getCodigoItem());
        item.setDescricaoItem(origem.getDescricaoItem());
        item.setQuantidade(origem.getQuantidade());
        item.setPrecoOriginal(origem.getPrecoOriginal());
        item.setPrecoUnitario(origem.getPrecoUnitario());
        item.setPrecoAlteradoManualmente(origem.getPrecoAlteradoManualmente());
        item.setSubtotal(origem.getSubtotal());
        return item;
    }

    private void validarTransicao(StatusPedido atual, StatusPedido novo) {
        if (atual == novo) return;
        boolean valida = atual == StatusPedido.PENDENTE && novo == StatusPedido.CONFIRMADO
                || atual == StatusPedido.CONFIRMADO && novo == StatusPedido.PRONTO;
        if (!valida) throw new IllegalArgumentException("Transicao de status invalida para o pedido.");
    }

    private void registrarTransicao(Pedido pedido, StatusPedido anterior, StatusPedido novo, String observacao,
            AuthenticatedUser operador) {
        if (anterior == novo) return;
        LocalDateTime agora = LocalDateTime.now();
        pedido.setStatus(novo);
        pedido.setDataAtualizacao(agora);
        pedido.adicionarHistorico(historico(anterior, novo, texto(observacao), operador, agora));
    }

    private PedidoHistoricoStatus historico(StatusPedido anterior, StatusPedido novo, String observacao,
            AuthenticatedUser operador, LocalDateTime dataHora) {
        PedidoHistoricoStatus registro = new PedidoHistoricoStatus();
        registro.setStatusAnterior(anterior);
        registro.setStatusNovo(novo);
        registro.setDataHora(dataHora);
        registro.setOperadorId(operador.id());
        registro.setOperadorEmail(operador.email());
        registro.setObservacao(observacao);
        return registro;
    }

    private String chaveFinalizacao(Long pedidoId, String chave) {
        try {
            String uuid = UUID.fromString(chave).toString();
            return UUID.nameUUIDFromBytes(("PEDIDO|" + pedidoId + "|" + uuid)
                    .getBytes(StandardCharsets.UTF_8)).toString();
        } catch (Exception exception) {
            throw new IllegalArgumentException("Idempotency-Key deve ser UUID valido.");
        }
    }

    private String texto(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
