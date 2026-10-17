package br.com.saraivamotos.integration.tavily;

import java.util.List;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class TavilyProductEvidenceEvaluatorTests {

    private final TavilyProductEvidenceEvaluator evaluator =
            new TavilyProductEvidenceEvaluator(new TavilyProductMetadataExtractor());

    @Test
    void evaluatesStoreGtinAcrossConsistentBrazilianSourcesAsHighConfidence() {
        var evaluation = evaluator.evaluate(List.of(
                result("Motor de Partida Starke CG 160 - 7908006704133", "https://loja-a.com.br/item",
                        "EAN: 7908006704133 Marca: Starke Código do fabricante (MPN): MA0007 Aplicação: Honda CG 160"),
                result("Motor de arranque Starke CG 160", "https://loja-b.com.br/produto",
                        "GTIN 0 7908006704133 Marca: Starke MPN: MA0007 Compatibilidade: Honda CG 160")),
                "7908006704133");

        assertEquals(TavilyProductEvidenceEvaluator.Confidence.ALTA, evaluation.confidence());
        assertEquals("Starke", evaluation.suggestion().marca());
        assertEquals("MA0007", evaluation.suggestion().codigoReferencia());
        assertEquals("Elétrica", evaluation.suggestion().categoria());
        assertEquals(2, evaluation.suggestion().fontes().size());
    }

    @Test
    void acceptsSafeGtin13AndZeroPaddedGtin14Equivalence() {
        var evaluation = evaluator.evaluate(List.of(result(
                "Motor de partida Starke", "https://pecas.test/item", "GTIN: 0-7908006704133")),
                "7908006704133");
        assertEquals(TavilyProductEvidenceEvaluator.Confidence.MEDIA, evaluation.confidence());
    }

    @Test
    void rejectsGenericPagesAndPartialMatches() {
        var generic = evaluator.evaluate(List.of(result(
                "Consulta de código de barras", "https://generic.test", "Pesquise o GTIN 7908006704133")),
                "7908006704133");
        var partial = evaluator.evaluate(List.of(result(
                "Motor de partida", "https://parts.test", "Código 790800670413")),
                "7908006704133");
        assertEquals(TavilyProductEvidenceEvaluator.Confidence.REJEITADA, generic.confidence());
        assertEquals(TavilyProductEvidenceEvaluator.Confidence.REJEITADA, partial.confidence());
    }

    @Test
    void conflictingProductsAreNotMixed() {
        var evaluation = evaluator.evaluate(List.of(
                result("Motor de partida Starke CG 160", "https://a.test", "GTIN 7908006704133 Marca: Starke MPN: MA0007"),
                result("Pastilha de freio Acme", "https://b.test", "GTIN 7908006704133 Marca: Acme MPN: XX999")),
                "7908006704133");
        assertEquals(1, evaluation.consistent());
        assertEquals("Starke", evaluation.suggestion().marca());
        assertEquals("MA0007", evaluation.suggestion().codigoReferencia());
    }

    @Test
    void incompleteEvidenceIsLowConfidenceAndNeverCreatesFinancialData() {
        var evaluation = evaluator.evaluate(List.of(result("Peça 7908006704133", "https://a.test",
                "GTIN 7908006704133 Preço R$ 999 Estoque 20")), "7908006704133");
        assertEquals(TavilyProductEvidenceEvaluator.Confidence.BAIXA, evaluation.confidence());
        assertNull(evaluation.suggestion().descricao());
    }

    private TavilySearchResult result(String title, String url, String content) {
        return new TavilySearchResult(title, url, content, 0.99);
    }
}
