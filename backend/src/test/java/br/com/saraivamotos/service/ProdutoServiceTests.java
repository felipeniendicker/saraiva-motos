package br.com.saraivamotos.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import br.com.saraivamotos.domain.Produto;
import br.com.saraivamotos.dto.ProdutoRequest;
import br.com.saraivamotos.dto.ProdutoResponse;
import br.com.saraivamotos.exception.CodigoBarrasDuplicadoException;
import br.com.saraivamotos.exception.ProdutoNaoEncontradoException;
import br.com.saraivamotos.repository.ProdutoRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProdutoServiceTests {

    @Mock
    private ProdutoRepository repository;

    private ProdutoService service;

    @BeforeEach
    void setUp() {
        service = new ProdutoService(repository);
        lenient().when(repository.save(any(Produto.class))).thenAnswer(invocation -> {
            Produto produto = invocation.getArgument(0);
            if (produto.getId() == null) {
                produto.setId(1L);
            }
            return produto;
        });
    }

    @Test
    void cadastroValido() {
        ProdutoResponse response = service.criar(request("00123456"));

        assertEquals(1L, response.id());
        assertEquals("Pastilha de freio", response.nome());
        assertTrue(response.ativo());
        assertNotNull(response.dataCadastro());
        assertEquals(0, response.quantidadeEstoque());
    }

    @Test
    void codigoBarrasOpcional() {
        ProdutoResponse response = service.criar(request(null));

        assertNull(response.codigoBarras());
        verify(repository, never()).findByCodigoBarras(any());
    }

    @Test
    void codigoBarrasVazioNormalizadoParaNull() {
        ProdutoResponse response = service.criar(request("   "));

        assertNull(response.codigoBarras());
    }

    @Test
    void codigoBarrasDuplicadoRejeitado() {
        when(repository.findByCodigoBarras("00123456")).thenReturn(Optional.of(produto(2L, true)));

        assertThrows(CodigoBarrasDuplicadoException.class, () -> service.criar(request("00123456")));
        verify(repository, never()).save(any());
    }

    @Test
    void consultaPorId() {
        Produto produto = produto(8L, true);
        when(repository.findById(8L)).thenReturn(Optional.of(produto));

        assertEquals(8L, service.buscarPorId(8L).id());
    }

    @Test
    void idInexistenteRejeitado() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ProdutoNaoEncontradoException.class, () -> service.buscarPorId(99L));
    }

    @Test
    void atualizacaoAlteraDadosCadastrais() {
        Produto produto = produto(3L, true);
        when(repository.findByIdForUpdate(3L)).thenReturn(Optional.of(produto));

        ProdutoResponse response = service.atualizar(3L, request("9988"));

        assertEquals("9988", response.codigoBarras());
        assertEquals(new BigDecimal("25.50"), response.precoVarejo());
    }

    @Test
    void atualizacaoPreservaDataCadastro() {
        Produto produto = produto(3L, true);
        LocalDateTime original = produto.getDataCadastro();
        when(repository.findByIdForUpdate(3L)).thenReturn(Optional.of(produto));

        ProdutoResponse response = service.atualizar(3L, request("9988"));

        assertSame(original, response.dataCadastro());
    }

    @Test
    void atualizacaoCadastralNaoAlteraEstoque() {
        Produto produto = produto(3L, true);
        produto.setQuantidadeEstoque(12);
        when(repository.findByIdForUpdate(3L)).thenReturn(Optional.of(produto));

        ProdutoResponse response = service.atualizar(3L, request("9988"));

        assertEquals(12, response.quantidadeEstoque());
    }

    @Test
    void atualizacaoNaoReativaProduto() {
        Produto produto = produto(3L, false);
        when(repository.findByIdForUpdate(3L)).thenReturn(Optional.of(produto));

        ProdutoResponse response = service.atualizar(3L, request("9988"));

        assertFalse(response.ativo());
    }

    @Test
    void atualizacaoAceitaCodigoDoProprioProduto() {
        Produto produto = produto(3L, true);
        when(repository.findByIdForUpdate(3L)).thenReturn(Optional.of(produto));
        when(repository.findByCodigoBarras("00123456")).thenReturn(Optional.of(produto));

        ProdutoResponse response = service.atualizar(3L, request("00123456"));

        assertEquals("00123456", response.codigoBarras());
    }

    @Test
    void atualizacaoRejeitaCodigoDeOutroProduto() {
        when(repository.findByIdForUpdate(3L)).thenReturn(Optional.of(produto(3L, true)));
        when(repository.findByCodigoBarras("00123456")).thenReturn(Optional.of(produto(4L, true)));

        assertThrows(CodigoBarrasDuplicadoException.class,
                () -> service.atualizar(3L, request("00123456")));
    }

    @Test
    void desativacao() {
        Produto produto = produto(3L, true);
        when(repository.findByIdForUpdate(3L)).thenReturn(Optional.of(produto));

        assertFalse(service.desativar(3L).ativo());
    }

    @Test
    void reativacao() {
        Produto produto = produto(3L, false);
        when(repository.findByIdForUpdate(3L)).thenReturn(Optional.of(produto));

        assertTrue(service.reativar(3L).ativo());
    }

    @Test
    void listagemPadraoNaoSolicitaInativos() {
        when(repository.buscar(null, false)).thenReturn(List.of(produto(1L, true)));

        List<ProdutoResponse> result = service.listar(null, false);

        assertEquals(1, result.size());
        verify(repository).buscar(null, false);
    }

    @Test
    void listagemAdministrativaPodeIncluirInativos() {
        when(repository.buscar(null, true)).thenReturn(List.of(produto(1L, false)));

        assertFalse(service.listar(null, true).get(0).ativo());
    }

    @Test
    void consultaPorCodigoBarras() {
        when(repository.findFirstByCodigoBarrasAndAtivoTrue("00123456"))
                .thenReturn(Optional.of(produto(1L, true)));

        assertEquals(1L, service.buscarPorCodigo("00123456").id());
        verify(repository, never()).findFirstByCodigoReferenciaAndAtivoTrueOrderByIdAsc(any());
    }

    @Test
    void consultaPorCodigoReferenciaComoFallback() {
        when(repository.findFirstByCodigoBarrasAndAtivoTrue("REF-01")).thenReturn(Optional.empty());
        when(repository.findFirstByCodigoReferenciaAndAtivoTrueOrderByIdAsc("REF-01"))
                .thenReturn(Optional.of(produto(2L, true)));

        assertEquals(2L, service.buscarPorCodigo("REF-01").id());
    }

    @Test
    void consultaPorCodigoInexistenteRejeitada() {
        when(repository.findFirstByCodigoBarrasAndAtivoTrue("SEM-CODIGO")).thenReturn(Optional.empty());
        when(repository.findFirstByCodigoReferenciaAndAtivoTrueOrderByIdAsc("SEM-CODIGO"))
                .thenReturn(Optional.empty());

        assertThrows(ProdutoNaoEncontradoException.class,
                () -> service.buscarPorCodigo("SEM-CODIGO"));
    }

    @Test
    void zerosAEsquerdaSaoPreservados() {
        when(repository.findFirstByCodigoBarrasAndAtivoTrue("00001234"))
                .thenReturn(Optional.of(produto(1L, true)));

        service.buscarPorCodigo("00001234");

        verify(repository).findFirstByCodigoBarrasAndAtivoTrue("00001234");
    }

    @Test
    void buscaPorNome() {
        service.listar("pastilha", false);
        verify(repository).buscar("pastilha", false);
    }

    @Test
    void buscaPorMarca() {
        service.listar("Cobreq", false);
        verify(repository).buscar("Cobreq", false);
    }

    @Test
    void buscaPorAplicacao() {
        service.listar("CG 160", false);
        verify(repository).buscar("CG 160", false);
    }

    private ProdutoRequest request(String codigoBarras) {
        return new ProdutoRequest(
                " Pastilha de freio ",
                "REF-01",
                codigoBarras,
                "Cobreq",
                "Freios",
                "Honda CG 160",
                new BigDecimal("10.00"),
                new BigDecimal("25.50"),
                new BigDecimal("20.00"),
                5,
                2,
                "Teste");
    }

    private Produto produto(Long id, boolean ativo) {
        Produto produto = new Produto();
        produto.setId(id);
        produto.setNome("Pastilha de freio");
        produto.setCodigoReferencia("REF-01");
        produto.setCodigoBarras("00123456");
        produto.setMarca("Cobreq");
        produto.setCategoria("Freios");
        produto.setAplicacao("Honda CG 160");
        produto.setValorCusto(new BigDecimal("10.00"));
        produto.setPrecoVarejo(new BigDecimal("25.50"));
        produto.setPrecoRevenda(new BigDecimal("20.00"));
        produto.setQuantidadeEstoque(5);
        produto.setEstoqueMinimo(2);
        produto.setObservacoes("Teste");
        produto.setAtivo(ativo);
        produto.setDataCadastro(LocalDateTime.of(2026, 9, 27, 9, 0));
        return produto;
    }
}
