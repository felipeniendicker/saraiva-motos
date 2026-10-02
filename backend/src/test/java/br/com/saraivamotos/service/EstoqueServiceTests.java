package br.com.saraivamotos.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import br.com.saraivamotos.domain.MovimentacaoEstoque;
import br.com.saraivamotos.domain.Produto;
import br.com.saraivamotos.domain.TipoMovimentacaoEstoque;
import br.com.saraivamotos.dto.AjusteEstoqueRequest;
import br.com.saraivamotos.dto.EntradaEstoqueRequest;
import br.com.saraivamotos.dto.MovimentacaoEstoqueResponse;
import br.com.saraivamotos.dto.SaidaEstoqueRequest;
import br.com.saraivamotos.exception.OperacaoEstoqueInvalidaException;
import br.com.saraivamotos.exception.ProdutoNaoEncontradoException;
import br.com.saraivamotos.repository.MovimentacaoEstoqueRepository;
import br.com.saraivamotos.repository.ProdutoRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EstoqueServiceTests {

    @Mock
    private ProdutoRepository produtoRepository;

    @Mock
    private MovimentacaoEstoqueRepository movimentacaoRepository;

    private EstoqueService service;

    @BeforeEach
    void setUp() {
        service = new EstoqueService(produtoRepository, movimentacaoRepository);
        lenient().when(movimentacaoRepository.save(any())).thenAnswer(invocation -> {
            MovimentacaoEstoque movimentacao = invocation.getArgument(0);
            movimentacao.setId(10L);
            return movimentacao;
        });
    }

    @Test
    void entradaAtualizaSaldoECriaMovimentacao() {
        Produto produto = produto(5, true);
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto));

        MovimentacaoEstoqueResponse response = service.entrada(new EntradaEstoqueRequest(1L, 3, "Nota 123"));

        assertEquals(TipoMovimentacaoEstoque.ENTRADA, response.tipo());
        assertEquals(3, response.quantidade());
        assertEquals(5, response.saldoAnterior());
        assertEquals(8, response.saldoPosterior());
        assertEquals(8, produto.getQuantidadeEstoque());
        assertEquals("Nota 123", response.motivo());
        verify(produtoRepository).findByIdForUpdate(1L);
        verify(produtoRepository).save(produto);
        verify(movimentacaoRepository).save(any(MovimentacaoEstoque.class));
    }

    @Test
    void entradaSemObservacaoUsaMotivoPadrao() {
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto(0, true)));

        assertEquals("Entrada manual", service.entrada(new EntradaEstoqueRequest(1L, 1, " ")).motivo());
    }

    @Test
    void entradaZeroEhRejeitada() {
        assertThrows(IllegalArgumentException.class, () -> service.entrada(new EntradaEstoqueRequest(1L, 0, null)));
        verify(produtoRepository, never()).findByIdForUpdate(any());
    }

    @Test
    void entradaNegativaEhRejeitada() {
        assertThrows(IllegalArgumentException.class, () -> service.entrada(new EntradaEstoqueRequest(1L, -1, null)));
    }

    @Test
    void entradaComSomaAcimaDoLimiteEhRejeitada() {
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto(Integer.MAX_VALUE, true)));

        assertThrows(IllegalArgumentException.class, () -> service.entrada(new EntradaEstoqueRequest(1L, 1, null)));
        verify(movimentacaoRepository, never()).save(any());
    }

    @Test
    void produtoInexistenteEhRejeitado() {
        when(produtoRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());

        assertThrows(ProdutoNaoEncontradoException.class,
                () -> service.entrada(new EntradaEstoqueRequest(99L, 1, null)));
    }

    @Test
    void entradaEmProdutoInativoEhRejeitada() {
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto(5, false)));

        assertThrows(OperacaoEstoqueInvalidaException.class,
                () -> service.entrada(new EntradaEstoqueRequest(1L, 1, null)));
        verify(movimentacaoRepository, never()).save(any());
    }

    @Test
    void ajusteParaCimaRegistraDiferencaComoEntrada() {
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto(5, true)));

        MovimentacaoEstoqueResponse response = service.ajustar(new AjusteEstoqueRequest(1L, 9, "Contagem"));

        assertEquals(TipoMovimentacaoEstoque.AJUSTE_ENTRADA, response.tipo());
        assertEquals(4, response.quantidade());
        assertEquals(9, response.saldoPosterior());
    }

    @Test
    void ajusteParaBaixoRegistraDiferencaComoSaida() {
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto(9, true)));

        MovimentacaoEstoqueResponse response = service.ajustar(new AjusteEstoqueRequest(1L, 2, "Contagem"));

        assertEquals(TipoMovimentacaoEstoque.AJUSTE_SAIDA, response.tipo());
        assertEquals(7, response.quantidade());
        assertEquals(2, response.saldoPosterior());
    }

    @Test
    void ajustePodeZerarEstoque() {
        Produto produto = produto(2, true);
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto));

        service.ajustar(new AjusteEstoqueRequest(1L, 0, "Inventario"));

        assertEquals(0, produto.getQuantidadeEstoque());
    }

    @Test
    void ajusteNegativoEhRejeitado() {
        assertThrows(IllegalArgumentException.class,
                () -> service.ajustar(new AjusteEstoqueRequest(1L, -1, "Contagem")));
    }

    @Test
    void ajusteSemMotivoEhRejeitado() {
        assertThrows(IllegalArgumentException.class,
                () -> service.ajustar(new AjusteEstoqueRequest(1L, 1, " ")));
    }

    @Test
    void ajusteSemDiferencaEhRejeitadoSemMovimentacao() {
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto(5, true)));

        assertThrows(OperacaoEstoqueInvalidaException.class,
                () -> service.ajustar(new AjusteEstoqueRequest(1L, 5, "Contagem")));
        verify(movimentacaoRepository, never()).save(any());
    }

    @Test
    void ajusteEmProdutoInativoEhRejeitado() {
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto(5, false)));

        assertThrows(OperacaoEstoqueInvalidaException.class,
                () -> service.ajustar(new AjusteEstoqueRequest(1L, 6, "Contagem")));
    }

    @Test
    void saidaManualReduzEstoqueERegistraSaldos() {
        Produto produto = produto(7, true);
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto));

        MovimentacaoEstoqueResponse response = service.saida(
                new SaidaEstoqueRequest(1L, 3, "Uso interno"));

        assertEquals(TipoMovimentacaoEstoque.SAIDA_MANUAL, response.tipo());
        assertEquals(3, response.quantidade());
        assertEquals(7, response.saldoAnterior());
        assertEquals(4, response.saldoPosterior());
        assertEquals(4, produto.getQuantidadeEstoque());
        assertEquals("Uso interno", response.motivo());
    }

    @Test
    void saidaManualPodeZerarEstoque() {
        Produto produto = produto(2, true);
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto));

        service.saida(new SaidaEstoqueRequest(1L, 2, "Avaria"));

        assertEquals(0, produto.getQuantidadeEstoque());
    }

    @Test
    void saidaMaiorQueSaldoFalhaSemMovimentacao() {
        Produto produto = produto(2, true);
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto));

        assertThrows(OperacaoEstoqueInvalidaException.class,
                () -> service.saida(new SaidaEstoqueRequest(1L, 3, "Uso interno")));

        assertEquals(2, produto.getQuantidadeEstoque());
        verify(movimentacaoRepository, never()).save(any());
        verify(produtoRepository, never()).save(any());
    }

    @Test
    void saidaSemMotivoOuComQuantidadeInvalidaEhRejeitada() {
        assertThrows(IllegalArgumentException.class,
                () -> service.saida(new SaidaEstoqueRequest(1L, 1, " ")));
        assertThrows(IllegalArgumentException.class,
                () -> service.saida(new SaidaEstoqueRequest(1L, 0, "Uso interno")));
        verify(produtoRepository, never()).findByIdForUpdate(any());
    }

    @Test
    void saidaEmProdutoInativoEhRejeitada() {
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto(5, false)));

        assertThrows(OperacaoEstoqueInvalidaException.class,
                () -> service.saida(new SaidaEstoqueRequest(1L, 1, "Avaria")));
        verify(movimentacaoRepository, never()).save(any());
    }

    @Test
    void falhaAoSalvarMovimentacaoNaoAlteraObjetoProduto() {
        Produto produto = produto(5, true);
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto));
        doThrow(new RuntimeException("falha simulada")).when(movimentacaoRepository).save(any());

        assertThrows(RuntimeException.class, () -> service.entrada(new EntradaEstoqueRequest(1L, 3, null)));
        assertEquals(5, produto.getQuantidadeEstoque());
        verify(produtoRepository, never()).save(any());
    }

    @Test
    void movimentoManualNaoRecebeVenda() {
        when(produtoRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(produto(5, true)));
        ArgumentCaptor<MovimentacaoEstoque> captor = ArgumentCaptor.forClass(MovimentacaoEstoque.class);

        service.entrada(new EntradaEstoqueRequest(1L, 1, null));

        verify(movimentacaoRepository).save(captor.capture());
        assertEquals(null, captor.getValue().getVendaId());
    }

    @Test
    void historicoGeralEhConsultadoNaOrdemDoRepositorio() {
        MovimentacaoEstoque primeiro = movimento(2L, LocalDateTime.of(2026, 9, 27, 11, 0));
        MovimentacaoEstoque segundo = movimento(1L, LocalDateTime.of(2026, 9, 27, 10, 0));
        when(movimentacaoRepository.findAllByOrderByDataHoraDescIdDesc()).thenReturn(List.of(primeiro, segundo));

        List<MovimentacaoEstoqueResponse> result = service.listarMovimentacoes(null);

        assertEquals(List.of(2L, 1L), result.stream().map(MovimentacaoEstoqueResponse::id).toList());
    }

    @Test
    void historicoPodeSerFiltradoPorProduto() {
        when(movimentacaoRepository.findByProdutoIdOrderByDataHoraDescIdDesc(1L))
                .thenReturn(List.of(movimento(3L, LocalDateTime.now())));

        List<MovimentacaoEstoqueResponse> result = service.listarMovimentacoes(1L);

        assertEquals(1, result.size());
        verify(movimentacaoRepository).findByProdutoIdOrderByDataHoraDescIdDesc(1L);
        verify(movimentacaoRepository, never()).findAllByOrderByDataHoraDescIdDesc();
    }

    private Produto produto(int estoque, boolean ativo) {
        Produto produto = new Produto();
        produto.setId(1L);
        produto.setNome("Pastilha de freio");
        produto.setQuantidadeEstoque(estoque);
        produto.setAtivo(ativo);
        return produto;
    }

    private MovimentacaoEstoque movimento(Long id, LocalDateTime dataHora) {
        MovimentacaoEstoque movimento = new MovimentacaoEstoque();
        movimento.setId(id);
        movimento.setProduto(produto(5, true));
        movimento.setTipo(TipoMovimentacaoEstoque.ENTRADA);
        movimento.setQuantidade(1);
        movimento.setEstoqueAnterior(4);
        movimento.setEstoquePosterior(5);
        movimento.setMotivo("Teste");
        movimento.setDataHora(dataHora);
        return movimento;
    }
}
