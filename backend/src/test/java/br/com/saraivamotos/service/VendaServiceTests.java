package br.com.saraivamotos.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import br.com.saraivamotos.domain.FormaPagamento;
import br.com.saraivamotos.domain.MovimentacaoEstoque;
import br.com.saraivamotos.domain.Produto;
import br.com.saraivamotos.domain.StatusVenda;
import br.com.saraivamotos.domain.TipoMovimentacaoEstoque;
import br.com.saraivamotos.domain.Venda;
import br.com.saraivamotos.dto.CancelamentoVendaRequest;
import br.com.saraivamotos.dto.ItemVendaRequest;
import br.com.saraivamotos.dto.VendaRequest;
import br.com.saraivamotos.dto.VendaResponse;
import br.com.saraivamotos.exception.OperacaoVendaInvalidaException;
import br.com.saraivamotos.repository.MovimentacaoEstoqueRepository;
import br.com.saraivamotos.repository.ProdutoRepository;
import br.com.saraivamotos.repository.VendaRepository;
import br.com.saraivamotos.repository.ClienteRepository;
import br.com.saraivamotos.domain.Cliente;
import br.com.saraivamotos.domain.TipoCliente;
import br.com.saraivamotos.domain.TipoPreco;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import br.com.saraivamotos.exception.ClienteNaoEncontradoException;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VendaServiceTests {

    @Mock
    private VendaRepository vendaRepository;

    @Mock
    private ProdutoRepository produtoRepository;

    @Mock
    private MovimentacaoEstoqueRepository movimentacaoRepository;
    @Mock private ClienteRepository clienteRepository;

    private VendaService service;

    @BeforeEach
    void setUp() {
        service = new VendaService(vendaRepository, produtoRepository, movimentacaoRepository, clienteRepository);
        lenient().when(vendaRepository.saveAndFlush(any(Venda.class))).thenAnswer(invocation -> {
            Venda venda = invocation.getArgument(0);
            venda.setId(42L);
            return venda;
        });
        lenient().when(vendaRepository.save(any(Venda.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(movimentacaoRepository.saveAll(any())).thenReturn(List.of());
        lenient().when(produtoRepository.saveAll(any())).thenReturn(List.of());
    }

    @Test
    void criarCalculaTotaisBaixaEstoqueEPreservaSnapshots() {
        Produto produto = produto(7, true);
        when(produtoRepository.findAllByIdForUpdate(List.of(1L))).thenReturn(List.of(produto));

        VendaResponse response = service.criar(new VendaRequest(null,
                List.of(new ItemVendaRequest(1L, 2, new BigDecimal("30.00"))),
                new BigDecimal("5.00"), FormaPagamento.PIX, "  balcão  "));

        assertEquals("000042", response.numeroVenda());
        assertEquals(new BigDecimal("60.00"), response.subtotal());
        assertEquals(new BigDecimal("5.00"), response.desconto());
        assertEquals(new BigDecimal("55.00"), response.total());
        assertEquals(FormaPagamento.PIX, response.formaPagamento());
        assertEquals("balcão", response.observacoes());
        assertEquals(5, produto.getQuantidadeEstoque());
        assertEquals("REF-01", response.itens().get(0).codigoProduto());
        assertEquals("Pastilha de freio", response.itens().get(0).descricaoProduto());
        assertEquals(new BigDecimal("25.50"), response.itens().get(0).precoOriginal());
        assertEquals(new BigDecimal("30.00"), response.itens().get(0).precoUnitario());
        assertEquals(new BigDecimal("60.00"), response.itens().get(0).subtotal());
    }

    @Test
    void criarComOficinaUsaRevendaEPreservaSnapshot() {
        Produto produto = produto(7, true);
        Cliente cliente = cliente(8L, TipoCliente.OFICINA, true);
        when(clienteRepository.findById(8L)).thenReturn(Optional.of(cliente));
        when(produtoRepository.findAllByIdForUpdate(List.of(1L))).thenReturn(List.of(produto));
        VendaResponse response = service.criar(new VendaRequest(8L,
                List.of(new ItemVendaRequest(1L, 1, new BigDecimal("20.00"))), BigDecimal.ZERO,
                FormaPagamento.PIX, null));
        assertEquals("Oficina Teste", response.clienteNome());
        assertEquals("OFICINA", response.clienteTipo());
        assertEquals(TipoPreco.REVENDA, response.tipoPrecoUtilizado());
        assertEquals(new BigDecimal("20.00"), response.itens().get(0).precoOriginal());
    }

    @Test
    void clienteInativoImpedeVendaAntesDeAlterarEstoque() {
        when(clienteRepository.findById(8L)).thenReturn(Optional.of(cliente(8L, TipoCliente.CLIENTE_COMUM, false)));
        assertThrows(OperacaoVendaInvalidaException.class, () -> service.criar(new VendaRequest(8L,
                List.of(new ItemVendaRequest(1L, 1, BigDecimal.ONE)), BigDecimal.ZERO, FormaPagamento.PIX, null)));
        verify(produtoRepository, never()).findAllByIdForUpdate(any());
    }

    @ParameterizedTest
    @EnumSource(TipoCliente.class)
    void aplicaPrecoPadraoDeCadaTipoDeCliente(TipoCliente tipo) {
        Produto produto = produto(7, true);
        when(clienteRepository.findById(8L)).thenReturn(Optional.of(cliente(8L, tipo, true)));
        when(produtoRepository.findAllByIdForUpdate(List.of(1L))).thenReturn(List.of(produto));
        VendaResponse response = service.criar(new VendaRequest(8L,
                List.of(new ItemVendaRequest(1L, 1, new BigDecimal("19.00"))), BigDecimal.ZERO,
                FormaPagamento.PIX, null));
        BigDecimal esperado = tipo == TipoCliente.CLIENTE_COMUM ? new BigDecimal("25.50") : new BigDecimal("20.00");
        assertEquals(esperado, response.itens().get(0).precoOriginal());
        assertEquals(tipo.getTipoPreco(), response.tipoPrecoUtilizado());
        assertEquals(new BigDecimal("19.00"), response.itens().get(0).precoUnitario());
    }

    @Test
    void clienteInexistenteRetornaErroAntesDeAlterarEstoque() {
        when(clienteRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ClienteNaoEncontradoException.class, () -> service.criar(new VendaRequest(99L,
                List.of(new ItemVendaRequest(1L, 1, BigDecimal.ONE)), BigDecimal.ZERO, FormaPagamento.PIX, null)));
        verify(produtoRepository, never()).findAllByIdForUpdate(any());
    }

    @Test
    void criarRegistraMovimentacaoVinculadaAoIdDaVenda() {
        Produto produto = produto(7, true);
        when(produtoRepository.findAllByIdForUpdate(List.of(1L))).thenReturn(List.of(produto));
        ArgumentCaptor<List<MovimentacaoEstoque>> captor = ArgumentCaptor.forClass(List.class);

        service.criar(new VendaRequest(null,
                List.of(new ItemVendaRequest(1L, 2, new BigDecimal("30.00"))),
                BigDecimal.ZERO, FormaPagamento.DINHEIRO, null));

        verify(movimentacaoRepository).saveAll(captor.capture());
        MovimentacaoEstoque movimento = captor.getValue().get(0);
        assertEquals(42L, movimento.getVendaId());
        assertEquals(TipoMovimentacaoEstoque.SAIDA_VENDA, movimento.getTipo());
        assertEquals(7, movimento.getEstoqueAnterior());
        assertEquals(5, movimento.getEstoquePosterior());
    }

    @Test
    void criarComDoisProdutosBaixaEstoquesERegistraUmaSaidaPorItem() {
        Produto primeiro = produto(7, true);
        Produto segundo = produto(4, true);
        segundo.setId(2L);
        segundo.setNome("Óleo 10W40");
        segundo.setCodigoReferencia("OL-10");
        when(produtoRepository.findAllByIdForUpdate(List.of(1L, 2L))).thenReturn(List.of(primeiro, segundo));
        ArgumentCaptor<List<MovimentacaoEstoque>> captor = ArgumentCaptor.forClass(List.class);

        VendaResponse response = service.criar(new VendaRequest(null, List.of(
                new ItemVendaRequest(1L, 2, new BigDecimal("30.00")),
                new ItemVendaRequest(2L, 1, new BigDecimal("40.00"))),
                BigDecimal.ZERO, FormaPagamento.CARTAO_DEBITO, null));

        assertEquals(2, response.itens().size());
        assertEquals(new BigDecimal("100.00"), response.total());
        assertEquals(5, primeiro.getQuantidadeEstoque());
        assertEquals(3, segundo.getQuantidadeEstoque());
        verify(movimentacaoRepository).saveAll(captor.capture());
        assertEquals(2, captor.getValue().size());
    }

    @Test
    void produtoInativoImpedeVendaSemPersistirAlteracoes() {
        Produto produto = produto(7, false);
        when(produtoRepository.findAllByIdForUpdate(List.of(1L))).thenReturn(List.of(produto));

        assertThrows(OperacaoVendaInvalidaException.class, () -> service.criar(new VendaRequest(null,
                List.of(new ItemVendaRequest(1L, 1, BigDecimal.TEN)), BigDecimal.ZERO,
                FormaPagamento.DINHEIRO, null)));

        assertEquals(7, produto.getQuantidadeEstoque());
        verify(vendaRepository, never()).saveAndFlush(any());
        verify(movimentacaoRepository, never()).saveAll(any());
    }

    @Test
    void estoqueInsuficienteEmUmDosItensImpedePersistenciaDaVenda() {
        Produto primeiro = produto(7, true);
        Produto segundo = produto(1, true);
        segundo.setId(2L);
        when(produtoRepository.findAllByIdForUpdate(List.of(1L, 2L))).thenReturn(List.of(primeiro, segundo));

        assertThrows(OperacaoVendaInvalidaException.class, () -> service.criar(new VendaRequest(null, List.of(
                new ItemVendaRequest(1L, 2, BigDecimal.TEN),
                new ItemVendaRequest(2L, 2, BigDecimal.TEN)), BigDecimal.ZERO,
                FormaPagamento.PIX, null)));

        assertEquals(7, primeiro.getQuantidadeEstoque());
        assertEquals(1, segundo.getQuantidadeEstoque());
        verify(vendaRepository, never()).saveAndFlush(any());
        verify(movimentacaoRepository, never()).saveAll(any());
    }

    @Test
    void cancelarDevolveEstoqueERegistraMovimentacao() {
        Produto produto = produto(5, true);
        Venda venda = vendaConcluida(produto);
        when(vendaRepository.buscarCompletaPorIdParaAtualizar(42L)).thenReturn(Optional.of(venda));
        when(produtoRepository.findAllByIdForUpdate(List.of(1L))).thenReturn(List.of(produto));
        ArgumentCaptor<List<MovimentacaoEstoque>> captor = ArgumentCaptor.forClass(List.class);

        VendaResponse response = service.cancelar(42L, new CancelamentoVendaRequest("  desistência  "));

        assertEquals(StatusVenda.CANCELADA, response.status());
        assertEquals("desistência", response.motivoCancelamento());
        assertEquals(7, produto.getQuantidadeEstoque());
        verify(movimentacaoRepository).saveAll(captor.capture());
        assertEquals(TipoMovimentacaoEstoque.CANCELAMENTO_VENDA, captor.getValue().get(0).getTipo());
        assertEquals(42L, captor.getValue().get(0).getVendaId());
    }

    @Test
    void cancelarVendaJaCanceladaNaoAlteraEstoque() {
        Produto produto = produto(5, true);
        Venda venda = vendaConcluida(produto);
        venda.setStatus(StatusVenda.CANCELADA);
        when(vendaRepository.buscarCompletaPorIdParaAtualizar(42L)).thenReturn(Optional.of(venda));

        assertThrows(OperacaoVendaInvalidaException.class,
                () -> service.cancelar(42L, new CancelamentoVendaRequest("duplicado")));

        verify(produtoRepository, never()).findAllByIdForUpdate(any());
        verify(movimentacaoRepository, never()).saveAll(any());
    }

    @Test
    void listarPorClienteIncluiVendaCanceladaEUsaConsultaDedicada() {
        Produto produto = produto(5, true);
        Venda venda = vendaConcluida(produto);
        venda.setStatus(StatusVenda.CANCELADA);
        venda.setClienteId(8L);
        when(vendaRepository.findByClienteIdOrderByDataHoraDescIdDesc(8L)).thenReturn(List.of(venda));

        List<VendaResponse> response = service.listar(null, null, null, null, 8L);

        assertEquals(1, response.size());
        assertEquals(StatusVenda.CANCELADA, response.get(0).status());
        verify(vendaRepository).findByClienteIdOrderByDataHoraDescIdDesc(8L);
        verify(vendaRepository, never()).buscar(any(), any(), any(), any());
    }

    @Test
    void vendaSemClienteNaoEhAssociadaAoHistoricoDeOutroCliente() {
        when(vendaRepository.findByClienteIdOrderByDataHoraDescIdDesc(8L)).thenReturn(List.of());

        assertEquals(0, service.listar(null, null, null, null, 8L).size());

        verify(vendaRepository).findByClienteIdOrderByDataHoraDescIdDesc(8L);
    }

    private Produto produto(int estoque, boolean ativo) {
        Produto produto = new Produto();
        produto.setId(1L);
        produto.setNome("Pastilha de freio");
        produto.setCodigoReferencia("REF-01");
        produto.setPrecoVarejo(new BigDecimal("25.50"));
        produto.setPrecoRevenda(new BigDecimal("20.00"));
        produto.setQuantidadeEstoque(estoque);
        produto.setAtivo(ativo);
        return produto;
    }

    private Cliente cliente(Long id, TipoCliente tipo, boolean ativo) {
        Cliente c = new Cliente(); c.setId(id); c.setNomeRazaoSocial("Oficina Teste"); c.setTipoCliente(tipo); c.setAtivo(ativo); return c;
    }

    private Venda vendaConcluida(Produto produto) {
        Venda venda = new Venda();
        venda.setId(42L);
        venda.setNumeroVenda("000042");
        venda.setStatus(StatusVenda.CONCLUIDA);
        br.com.saraivamotos.domain.ItemVenda item = new br.com.saraivamotos.domain.ItemVenda();
        item.setProduto(produto);
        item.setQuantidade(2);
        item.setPrecoOriginal(new BigDecimal("25.50"));
        item.setPrecoUnitario(new BigDecimal("30.00"));
        venda.adicionarItem(item);
        return venda;
    }
}
