package br.com.saraivamotos.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.saraivamotos.domain.Produto;
import br.com.saraivamotos.repository.ProdutoRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductLookupServiceTests {

    @Mock private ProdutoRepository repository;
    private ProductLookupService service;

    @BeforeEach
    void setUp() {
        service = new ProductLookupService(repository, List.of());
    }

    @Test
    void findsLocalProductByBarcodeBeforeReference() {
        Produto product = product(true);
        when(repository.findByCodigoBarras("00012345678905")).thenReturn(Optional.of(product));

        var result = service.lookup(" 00012345678905 ");

        assertTrue(result.encontrado());
        assertTrue(result.cadastradoLocalmente());
        assertEquals("LOCAL", result.origem());
        assertEquals("00012345678905", result.produto().codigoBarras());
        verify(repository, never()).findByCodigoReferenciaOrderByIdAsc(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void findsInactiveLocalProductSoPdvCanExplainState() {
        Produto product = product(false);
        when(repository.findByCodigoBarras("INATIVO-1")).thenReturn(Optional.of(product));

        var result = service.lookup("INATIVO-1");

        assertTrue(result.encontrado());
        assertFalse(result.produto().ativo());
    }

    @Test
    void fallsBackToExactReference() {
        when(repository.findByCodigoBarras("REF-001")).thenReturn(Optional.empty());
        when(repository.findByCodigoReferenciaOrderByIdAsc("REF-001")).thenReturn(List.of(product(true)));
        assertEquals(1L, service.lookup("REF-001").produto().id());
    }

    @Test
    void returnsStructuredNotFoundWithoutInventedSuggestion() {
        when(repository.findByCodigoBarras("DESCONHECIDO")).thenReturn(Optional.empty());
        when(repository.findByCodigoReferenciaOrderByIdAsc("DESCONHECIDO")).thenReturn(List.of());

        var result = service.lookup("DESCONHECIDO");

        assertFalse(result.encontrado());
        assertEquals("NAO_ENCONTRADO", result.origem());
        assertNull(result.produto());
        assertNull(result.sugestao());
    }

    private Produto product(boolean active) {
        Produto product = new Produto();
        product.setId(1L);
        product.setNome("Pastilha");
        product.setCodigoReferencia("REF-001");
        product.setCodigoBarras("00012345678905");
        product.setValorCusto(BigDecimal.TEN);
        product.setPrecoVarejo(new BigDecimal("20.00"));
        product.setPrecoRevenda(new BigDecimal("15.00"));
        product.setQuantidadeEstoque(5);
        product.setEstoqueMinimo(1);
        product.setAtivo(active);
        product.setDataCadastro(LocalDateTime.now());
        return product;
    }
}
