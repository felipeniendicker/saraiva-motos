package br.com.saraivamotos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import br.com.saraivamotos.domain.Cliente;
import br.com.saraivamotos.domain.FormaPagamento;
import br.com.saraivamotos.domain.ItemOrcamento;
import br.com.saraivamotos.domain.ItemPedido;
import br.com.saraivamotos.domain.Orcamento;
import br.com.saraivamotos.domain.Pedido;
import br.com.saraivamotos.domain.StatusOrcamento;
import br.com.saraivamotos.domain.StatusPedido;
import br.com.saraivamotos.domain.TipoCliente;
import br.com.saraivamotos.domain.TipoItem;
import br.com.saraivamotos.domain.TipoPreco;
import br.com.saraivamotos.dto.AlteracaoStatusPedidoRequest;
import br.com.saraivamotos.dto.ConversaoPedidoRequest;
import br.com.saraivamotos.dto.FinalizacaoPedidoRequest;
import br.com.saraivamotos.dto.VendaResponse;
import br.com.saraivamotos.exception.OperacaoVendaInvalidaException;
import br.com.saraivamotos.repository.ClienteRepository;
import br.com.saraivamotos.repository.OrcamentoRepository;
import br.com.saraivamotos.repository.PedidoRepository;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PedidoServiceTests {
    @Mock PedidoRepository pedidos;
    @Mock OrcamentoRepository orcamentos;
    @Mock ClienteRepository clientes;
    @Mock OperacaoIdempotenteService operacoes;
    @Mock VendaService vendas;
    PedidoService service;
    AuthenticatedUser operador = new AuthenticatedUser(7L, "operador@saraiva.test");

    @BeforeEach
    void setup() {
        service = new PedidoService(pedidos, orcamentos, clientes, operacoes, vendas);
        lenient().when(pedidos.saveAndFlush(any(Pedido.class))).thenAnswer(invocation -> {
            Pedido pedido = invocation.getArgument(0);
            pedido.setId(11L);
            return pedido;
        });
        lenient().when(pedidos.save(any(Pedido.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void converteOrcamentoEmPedidoSemMovimentarVendaEstoqueOuCaixa() {
        Orcamento orcamento = orcamento();
        orcamento.setCondicaoPagamentoPrevista(br.com.saraivamotos.domain.CondicaoPagamento.A_PRAZO);
        orcamento.setVencimentoPrevisto(LocalDate.now().plusDays(30));
        orcamento.setEntradaPrevista(new BigDecimal("20.00"));
        orcamento.setFormaPagamentoEntradaPrevista(FormaPagamento.PIX);
        Cliente cliente = cliente();
        when(orcamentos.buscarParaAtualizar(4L)).thenReturn(Optional.of(orcamento));
        when(pedidos.findByOrcamentoId(4L)).thenReturn(Optional.empty());
        when(clientes.findById(3L)).thenReturn(Optional.of(cliente));

        var response = service.converterOrcamento(4L,
                new ConversaoPedidoRequest(LocalDate.now().plusDays(2), null), operador);

        assertThat(response.numero()).isEqualTo("PED-000011");
        assertThat(response.status()).isEqualTo(StatusPedido.PENDENTE);
        assertThat(response.total()).isEqualByComparingTo("80.00");
        assertThat(response.itens()).hasSize(1);
        assertThat(response.historico()).hasSize(1);
        assertThat(response.condicaoPagamentoPrevista())
                .isEqualTo(br.com.saraivamotos.domain.CondicaoPagamento.A_PRAZO);
        assertThat(response.entradaPrevista()).isEqualByComparingTo("20.00");
        assertThat(orcamento.getStatus()).isEqualTo(StatusOrcamento.CONVERTIDO);
        verify(operacoes, never()).venda(any(), any(), any());
    }

    @Test
    void pedidoDoMesmoOrcamentoEhRetornadoSemCriarOutro() {
        Orcamento orcamento = orcamento();
        Pedido existente = pedidoPronto(StatusPedido.PENDENTE);
        when(orcamentos.buscarParaAtualizar(4L)).thenReturn(Optional.of(orcamento));
        when(pedidos.findByOrcamentoId(4L)).thenReturn(Optional.of(existente));
        when(pedidos.buscarCompleto(11L)).thenReturn(Optional.of(existente));

        var response = service.converterOrcamento(4L, new ConversaoPedidoRequest(null, null), operador);

        assertThat(response.id()).isEqualTo(11L);
        verify(pedidos, never()).saveAndFlush(any());
        verify(operacoes, never()).venda(any(), any(), any());
    }

    @Test
    void aplicaSomenteTransicoesSequenciais() {
        Pedido pedido = pedidoPronto(StatusPedido.PENDENTE);
        when(pedidos.buscarParaAtualizar(11L)).thenReturn(Optional.of(pedido));

        service.alterarStatus(11L, new AlteracaoStatusPedidoRequest(StatusPedido.CONFIRMADO, null), operador);
        assertThat(pedido.getStatus()).isEqualTo(StatusPedido.CONFIRMADO);
        assertThatThrownBy(() -> service.alterarStatus(11L,
                new AlteracaoStatusPedidoRequest(StatusPedido.FINALIZADO, null), operador))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Transicao");
    }

    @Test
    void finalizacaoReutilizaVendaEImpedeDuplicacao() {
        Pedido pedido = pedidoPronto(StatusPedido.PRONTO);
        VendaResponse venda = org.mockito.Mockito.mock(VendaResponse.class);
        when(venda.id()).thenReturn(30L);
        when(venda.numeroVenda()).thenReturn("000030");
        when(pedidos.buscarParaAtualizar(11L)).thenReturn(Optional.of(pedido));
        when(operacoes.venda(any(), any(), any())).thenReturn(venda);
        when(vendas.buscarPorId(30L)).thenReturn(venda);
        FinalizacaoPedidoRequest request = new FinalizacaoPedidoRequest(FormaPagamento.PIX, null,
                null, null, null, null);

        VendaResponse primeira = service.finalizar(11L, UUID.randomUUID().toString(), request, operador);
        VendaResponse repetida = service.finalizar(11L, UUID.randomUUID().toString(), request, operador);

        assertThat(primeira).isSameAs(venda);
        assertThat(repetida).isSameAs(venda);
        assertThat(pedido.getStatus()).isEqualTo(StatusPedido.FINALIZADO);
        assertThat(pedido.getVendaId()).isEqualTo(30L);
        verify(operacoes).venda(any(), any(), any());
    }

    @Test
    void falhaDeEstoqueMantemPedidoPronto() {
        Pedido pedido = pedidoPronto(StatusPedido.PRONTO);
        when(pedidos.buscarParaAtualizar(11L)).thenReturn(Optional.of(pedido));
        when(operacoes.venda(any(), any(), any()))
                .thenThrow(new OperacaoVendaInvalidaException("Estoque insuficiente."));

        assertThatThrownBy(() -> service.finalizar(11L, UUID.randomUUID().toString(),
                new FinalizacaoPedidoRequest(FormaPagamento.PIX, null, null, null, null, null), operador))
                .isInstanceOf(OperacaoVendaInvalidaException.class);
        assertThat(pedido.getStatus()).isEqualTo(StatusPedido.PRONTO);
        assertThat(pedido.getVendaId()).isNull();
    }

    private Orcamento orcamento() {
        Orcamento orcamento = new Orcamento();
        orcamento.setId(4L);
        orcamento.setNumero("ORC-000004");
        orcamento.setClienteId(3L);
        orcamento.setClienteNome("Cliente Teste");
        orcamento.setClienteTipo(TipoCliente.CLIENTE_COMUM.name());
        orcamento.setTipoPrecoUtilizado(TipoPreco.VAREJO);
        orcamento.setStatus(StatusOrcamento.EMITIDO);
        orcamento.setSubtotal(new BigDecimal("80.00"));
        orcamento.setDesconto(BigDecimal.ZERO.setScale(2));
        orcamento.setDescontoPercentual(BigDecimal.ZERO.setScale(4));
        orcamento.setTotal(new BigDecimal("80.00"));
        orcamento.setDataAtualizacao(LocalDateTime.now());
        ItemOrcamento item = new ItemOrcamento();
        item.setTipoItem(TipoItem.SERVICO);
        item.setCodigoItem("SERVICO");
        item.setDescricaoItem("Instalacao");
        item.setQuantidade(1);
        item.setPrecoOriginal(new BigDecimal("80.00"));
        item.setPrecoUnitario(new BigDecimal("80.00"));
        item.setPrecoAlteradoManualmente(true);
        item.setSubtotal(new BigDecimal("80.00"));
        orcamento.adicionarItem(item);
        return orcamento;
    }

    private Cliente cliente() {
        Cliente cliente = new Cliente();
        cliente.setId(3L);
        cliente.setNomeRazaoSocial("Cliente Teste");
        cliente.setTipoCliente(TipoCliente.CLIENTE_COMUM);
        cliente.setAtivo(true);
        return cliente;
    }

    private Pedido pedidoPronto(StatusPedido status) {
        Pedido pedido = new Pedido();
        pedido.setId(11L);
        pedido.setNumero("PED-000011");
        pedido.setClienteId(3L);
        pedido.setClienteNome("Cliente Teste");
        pedido.setClienteTipo(TipoCliente.CLIENTE_COMUM.name());
        pedido.setTipoPrecoUtilizado(TipoPreco.VAREJO);
        pedido.setStatus(status);
        pedido.setSubtotal(new BigDecimal("80.00"));
        pedido.setDesconto(BigDecimal.ZERO.setScale(2));
        pedido.setDescontoPercentual(BigDecimal.ZERO.setScale(4));
        pedido.setTotal(new BigDecimal("80.00"));
        pedido.setDataCriacao(LocalDateTime.now());
        pedido.setDataAtualizacao(LocalDateTime.now());
        pedido.setOperadorId(operador.id());
        pedido.setOperadorEmail(operador.email());
        ItemPedido item = new ItemPedido();
        item.setTipoItem(TipoItem.SERVICO);
        item.setCodigoItem("SERVICO");
        item.setDescricaoItem("Instalacao");
        item.setQuantidade(1);
        item.setPrecoOriginal(new BigDecimal("80.00"));
        item.setPrecoUnitario(new BigDecimal("80.00"));
        item.setPrecoAlteradoManualmente(true);
        item.setSubtotal(new BigDecimal("80.00"));
        pedido.adicionarItem(item);
        return pedido;
    }
}
