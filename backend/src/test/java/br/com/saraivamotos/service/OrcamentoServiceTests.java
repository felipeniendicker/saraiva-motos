package br.com.saraivamotos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import br.com.saraivamotos.domain.Produto;
import br.com.saraivamotos.domain.Cliente;
import br.com.saraivamotos.domain.CondicaoPagamento;
import br.com.saraivamotos.domain.FormaPagamento;
import br.com.saraivamotos.domain.ItemOrcamento;
import br.com.saraivamotos.domain.Orcamento;
import br.com.saraivamotos.domain.StatusOrcamento;
import br.com.saraivamotos.domain.TipoCliente;
import br.com.saraivamotos.domain.TipoPreco;
import br.com.saraivamotos.domain.TipoItem;
import br.com.saraivamotos.dto.ItemOrcamentoRequest;
import br.com.saraivamotos.dto.OrcamentoRequest;
import br.com.saraivamotos.dto.ConversaoOrcamentoRequest;
import br.com.saraivamotos.dto.VendaRequest;
import br.com.saraivamotos.dto.VendaResponse;
import br.com.saraivamotos.repository.ClienteRepository;
import br.com.saraivamotos.repository.OrcamentoRepository;
import br.com.saraivamotos.repository.ProdutoRepository;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OrcamentoServiceTests {
    @Mock OrcamentoRepository orcamentos;
    @Mock ClienteRepository clientes;
    @Mock ProdutoRepository produtos;
    @Mock OperacaoIdempotenteService operacoes;
    @Mock VendaService vendas;

    private OrcamentoService service;

    @BeforeEach
    void setup() {
        service = new OrcamentoService(orcamentos, clientes, produtos, operacoes, vendas);
        lenient().when(orcamentos.saveAndFlush(any())).thenAnswer(invocation -> {
            var orcamento = invocation.<br.com.saraivamotos.domain.Orcamento>getArgument(0);
            orcamento.setId(12L);
            orcamento.setVersao(0L);
            return orcamento;
        });
        lenient().when(orcamentos.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void criaOrcamentoComProdutoEServicoSemAlterarEstoque() {
        Produto produto = produto();
        when(produtos.findAllById(List.of(3L))).thenReturn(List.of(produto));
        OrcamentoRequest request = new OrcamentoRequest(null, List.of(
                new ItemOrcamentoRequest(TipoItem.PRODUTO, 3L, null, 2,
                        new BigDecimal("40.00"), new BigDecimal("40.00"), false),
                new ItemOrcamentoRequest(TipoItem.SERVICO, null, "Instalacao", 1,
                        new BigDecimal("20.00"), new BigDecimal("20.00"), true)),
                new BigDecimal("10.00"), LocalDate.now().plusDays(7),
                StatusOrcamento.EMITIDO, null, null);

        var response = service.criar(request, new AuthenticatedUser(7L, "operador@saraiva.test"));

        assertThat(response.numero()).isEqualTo("ORC-000012");
        assertThat(response.subtotal()).isEqualByComparingTo("100.00");
        assertThat(response.desconto()).isEqualByComparingTo("10.00");
        assertThat(response.total()).isEqualByComparingTo("90.00");
        assertThat(response.itens()).hasSize(2);
        assertThat(produto.getQuantidadeEstoque()).isEqualTo(5);
    }

    @Test
    void orcamentoAPrazoArmazenaSomenteCondicoesPrevistasSemCriarOperacaoFinanceira() {
        Cliente cliente = cliente();
        when(clientes.findById(8L)).thenReturn(Optional.of(cliente));
        LocalDate vencimento = LocalDate.now().plusDays(30);
        OrcamentoRequest request = new OrcamentoRequest(8L, List.of(
                new ItemOrcamentoRequest(TipoItem.SERVICO, null, "Revisao", 1,
                        new BigDecimal("600.00"), new BigDecimal("600.00"), true)),
                BigDecimal.ZERO, LocalDate.now().plusDays(7), StatusOrcamento.EMITIDO, null, null,
                null, CondicaoPagamento.A_PRAZO, vencimento, new BigDecimal("200.00"), FormaPagamento.PIX);

        var response = service.criar(request, new AuthenticatedUser(7L, "operador@saraiva.test"));

        assertThat(response.condicaoPagamentoPrevista()).isEqualTo(CondicaoPagamento.A_PRAZO);
        assertThat(response.vencimentoPrevisto()).isEqualTo(vencimento);
        assertThat(response.entradaPrevista()).isEqualByComparingTo("200.00");
        assertThat(response.formaPagamentoEntradaPrevista()).isEqualTo(FormaPagamento.PIX);
        verify(operacoes, never()).venda(anyString(), any(), any());
    }

    @Test
    void conversaoAPrazoPreservaValoresCriaUmaVendaEReenvioRetornaMesmaVenda() {
        Orcamento orcamento = orcamentoAPrazo();
        AuthenticatedUser operador = new AuthenticatedUser(7L, "operador@saraiva.test");
        VendaResponse venda = org.mockito.Mockito.mock(VendaResponse.class);
        when(venda.id()).thenReturn(40L);
        when(orcamentos.buscarParaAtualizar(22L)).thenReturn(Optional.of(orcamento));
        when(operacoes.venda(anyString(), any(VendaRequest.class), eq(operador))).thenReturn(venda);
        when(vendas.buscarPorId(40L)).thenReturn(venda);
        String chave = java.util.UUID.randomUUID().toString();
        ConversaoOrcamentoRequest request = new ConversaoOrcamentoRequest(FormaPagamento.OUTRO,
                CondicaoPagamento.A_PRAZO, orcamento.getVencimentoPrevisto(),
                orcamento.getEntradaPrevista(), FormaPagamento.PIX, null);

        VendaResponse primeira = service.converter(22L, chave, request, operador);
        VendaResponse repetida = service.converter(22L, chave, request, operador);

        assertThat(primeira).isSameAs(venda);
        assertThat(repetida).isSameAs(venda);
        assertThat(orcamento.getStatus()).isEqualTo(StatusOrcamento.CONVERTIDO);
        assertThat(orcamento.getVendaId()).isEqualTo(40L);
        ArgumentCaptor<VendaRequest> captor = ArgumentCaptor.forClass(VendaRequest.class);
        verify(operacoes, times(1)).venda(anyString(), captor.capture(), eq(operador));
        VendaRequest vendaRequest = captor.getValue();
        assertThat(vendaRequest.condicaoPagamento()).isEqualTo(CondicaoPagamento.A_PRAZO);
        assertThat(vendaRequest.vencimento()).isEqualTo(orcamento.getVencimentoPrevisto());
        assertThat(vendaRequest.pagamentoInicial()).isEqualByComparingTo("200.00");
        assertThat(vendaRequest.formaPagamentoInicial()).isEqualTo(FormaPagamento.PIX);
        assertThat(vendaRequest.itens().get(0).precoUnitario()).isEqualByComparingTo("600.00");
        assertThat(vendaRequest.itens().get(0).precoAlteradoManualmente()).isTrue();
    }

    private Orcamento orcamentoAPrazo() {
        Orcamento orcamento = new Orcamento();
        orcamento.setId(22L);
        orcamento.setNumero("ORC-000022");
        orcamento.setClienteId(8L);
        orcamento.setClienteNome("Cliente a prazo");
        orcamento.setClienteTipo(TipoCliente.CLIENTE_COMUM.name());
        orcamento.setTipoPrecoUtilizado(TipoPreco.VAREJO);
        orcamento.setStatus(StatusOrcamento.EMITIDO);
        orcamento.setSubtotal(new BigDecimal("600.00"));
        orcamento.setDesconto(BigDecimal.ZERO.setScale(2));
        orcamento.setDescontoPercentual(BigDecimal.ZERO.setScale(4));
        orcamento.setTotal(new BigDecimal("600.00"));
        orcamento.setCondicaoPagamentoPrevista(CondicaoPagamento.A_PRAZO);
        orcamento.setVencimentoPrevisto(LocalDate.now().plusDays(30));
        orcamento.setEntradaPrevista(new BigDecimal("200.00"));
        orcamento.setFormaPagamentoEntradaPrevista(FormaPagamento.PIX);
        ItemOrcamento item = new ItemOrcamento();
        item.setTipoItem(TipoItem.SERVICO);
        item.setCodigoItem("SERVICO");
        item.setDescricaoItem("Revisao");
        item.setQuantidade(1);
        item.setPrecoOriginal(new BigDecimal("600.00"));
        item.setPrecoUnitario(new BigDecimal("600.00"));
        item.setPrecoAlteradoManualmente(false);
        item.setSubtotal(new BigDecimal("600.00"));
        orcamento.adicionarItem(item);
        return orcamento;
    }

    private Cliente cliente() {
        Cliente cliente = new Cliente();
        cliente.setId(8L);
        cliente.setNomeRazaoSocial("Cliente a prazo");
        cliente.setTipoCliente(TipoCliente.CLIENTE_COMUM);
        cliente.setAtivo(true);
        return cliente;
    }

    private Produto produto() {
        Produto produto = new Produto();
        produto.setId(3L);
        produto.setNome("Produto homologado");
        produto.setCodigoReferencia("PROD-3");
        produto.setPrecoVarejo(new BigDecimal("40.00"));
        produto.setPrecoRevenda(new BigDecimal("35.00"));
        produto.setQuantidadeEstoque(5);
        produto.setAtivo(true);
        return produto;
    }
}
