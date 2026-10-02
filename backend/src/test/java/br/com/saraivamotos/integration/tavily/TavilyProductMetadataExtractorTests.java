package br.com.saraivamotos.integration.tavily;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TavilyProductMetadataExtractorTests {

    private final TavilyProductMetadataExtractor extractor = new TavilyProductMetadataExtractor();

    @Test
    void extractsDiafragReferenceAndBrakeCategory() {
        var result = extractor.extract(
                "SAPATA FREIO DT/TR 0,25 TITAN 00-ES/KS/CG 125 - 7898477870799",
                "Fabricante: Diafrag Código de barras: 7898477870799 Código do Produto: 5008.127.00A",
                "7898477870799");
        assertEquals("Diafrag", result.marca());
        assertEquals("5008.127.00A", result.codigoReferencia());
        assertEquals("Freios", result.categoria());
    }

    @Test
    void extractsRiffelAndTransmissionCategory() {
        var result = extractor.extract("Kit Relação Riffel Top Titan/Start/Cargo/Fan 150 - 7899128881614", "GTIN 7899128881614", "7899128881614");
        assertEquals("Riffel", result.marca());
        assertEquals("Transmissão", result.categoria());
        assertNull(result.aplicacao());
    }

    @Test
    void extractsMobilAndLubricantsCategory() {
        var result = extractor.extract("oleo mobil super moto 10w30 mx 4t 1lt", "OLEO MOBIL SUPER MOTO 10W30 MX 4T 1LT 7896636550827", "7896636550827");
        assertEquals("Mobil", result.marca());
        assertEquals("Lubrificantes", result.categoria());
    }

    @Test
    void extractsMagnetronManufacturerReferenceAndElectricalCategory() {
        var result = extractor.extract("Interruptor Chave Luz Honda Titan 7898485619632", "Marca: Magnetron Código do Fabricante: 90235020", "7898485619632");
        assertEquals("Magnetron", result.marca());
        assertEquals("90235020", result.codigoReferencia());
        assertEquals("Elétrica", result.categoria());
    }

    @Test
    void unknownBrandAndCategoryRemainEmpty() {
        var result = extractor.extract("Peça especial 1234567890123", "Descrição sem classificação", "1234567890123");
        assertNull(result.marca());
        assertNull(result.categoria());
    }

    @Test
    void ncmAndGtinNeverBecomeReference() {
        var ncm = extractor.extract("Pastilha de freio", "NCM: 87141000 GTIN: 7898477870799", "7898477870799");
        var sameBarcode = extractor.extract("Pastilha de freio", "Código do Produto: 7898477870799", "7898477870799");
        assertNull(ncm.codigoReferencia());
        assertNull(sameBarcode.codigoReferencia());
    }

    @Test
    void sanitizesHtmlCssAndPreservesUsefulEvidence() {
        String noisy = "<style>.x { color:red; }</style><div>Fabricante: Diafrag</div> .button { display:none; } Código do Produto: 5008.127.00A   GTIN 7898477870799";
        var result = extractor.extract("Sapata de freio", noisy, "7898477870799");
        assertFalse(result.descricao().contains("color:red"));
        assertFalse(result.descricao().contains("display:none"));
        assertTrue(result.descricao().contains("Diafrag"));
        assertTrue(result.descricao().contains("5008.127.00A"));
    }

    @Test
    void preservesLeadingZeroBarcodeWithoutUsingItAsReference() {
        var result = extractor.extract("Produto 000000736473", "GTIN 000000736473", "000000736473");
        assertNull(result.codigoReferencia());
    }

    @Test
    void cleansCommercialSuffixFromMobilTitle() {
        String title = "Óleo Mobil Moto 4T 10W30 Super Moto 1 Litro - PPneus Moto Peças - Capacete, Vestuário, Pneus e Ac...";
        String result = extractor.sanitizeTitle(title, "7896636550827");
        assertEquals("Óleo Mobil Moto 4T 10W30 Super Moto 1 Litro", result);
        assertFalse(result.contains("PPneus"));
        assertFalse(result.contains("Capacete"));
        assertFalse(result.contains("Vestuário"));
    }

    @Test
    void preservesLegitimateHyphenatedProductTitle() {
        assertEquals("Óleo 4T - Semissintético 10W30",
                extractor.sanitizeTitle("Óleo 4T - Semissintético 10W30", "7896636550827"));
    }

    @Test
    void prioritizesStructuredDiafragDataAndRemovesPageNoise() {
        String content = "#### Informação Técnica | | | --- | Fabricante: | Diafrag | | Código do Produto: | 5008.127.00A | NCM: | 8714.10.00 | Peso bruto: | 0.275 | Frequentemente comprados juntos";
        var result = extractor.extract("Sapata de freio Diafrag", content, "7898477870799");
        assertTrue(result.descricao().contains("Fabricante: Diafrag"));
        assertTrue(result.descricao().contains("Código do Produto: 5008.127.00A"));
        assertTrue(result.descricao().contains("NCM: 8714.10.00"));
        assertTrue(result.descricao().contains("Peso bruto: 0.275"));
        assertFalse(result.descricao().contains("Frequentemente comprados juntos"));
        assertFalse(result.descricao().contains("|||"));
        assertFalse(result.descricao().contains("####"));
        assertEquals("Diafrag", result.marca());
        assertEquals("5008.127.00A", result.codigoReferencia());
        assertEquals("Freios", result.categoria());
    }

    @Test
    void removesObservedMobilInterfaceNoise() {
        String content = "Deixe seu comentário e sua avaliação | Mensagem | Máximo de 512 caracteres | Emojis não são suportados | Clique para Avaliar | Enviar | Produtos relacionados";
        var result = extractor.extract("Óleo Mobil 10W30", content, "7896636550827");
        assertNull(result.descricao());
        assertEquals("Mobil", result.marca());
        assertEquals("Lubrificantes", result.categoria());
    }

    @Test
    void emptyContentIsSafeAndDescriptionMayRemainEmpty() {
        assertNull(extractor.extract("Produto", null, "000000736473").descricao());
        assertNull(extractor.extract("Produto", "   ", "000000736473").descricao());
    }

    @Test
    void descriptionLimitDoesNotCutLastWord() {
        String content = "descrição útil ".repeat(60);
        String description = extractor.extract("Produto", content, "000000736473").descricao();
        assertTrue(description.length() <= 500);
        assertFalse(description.endsWith("descri"));
    }

    @Test
    void rejectsGenericApplicationHeaderButAcceptsRealApplication() {
        var generic = extractor.extract("Sapata de freio Diafrag", "Aplicação: Montadora/Marca", "7898477870799");
        var real = extractor.extract("Sapata de freio Diafrag", "Aplicação: Honda CG 160 2016+", "7898477870799");
        assertNull(generic.aplicacao());
        assertEquals("Honda CG 160 2016+", real.aplicacao());
    }

    @Test
    void structuredMobilDataStopsBeforeRelatedProductSequence() {
        String content = "Código: MOB-10W30 | Código de barras: 7896636550827 | Modelo: Super Moto 4T | Categoria: Lubrificantes | Marca: Mobil | Itens Inclusos: 1 litro | Óleo Mobil Moto 4T 20w50 | Óleo Ipiranga Moto | Óleo Petronas | Óleo Motul";
        var result = extractor.extract("Óleo Mobil Moto 4T 10W30", content, "7896636550827");
        assertTrue(result.descricao().contains("Código: MOB-10W30"));
        assertTrue(result.descricao().contains("Código de barras: 7896636550827"));
        assertTrue(result.descricao().contains("Modelo: Super Moto 4T"));
        assertTrue(result.descricao().contains("Itens Inclusos: 1 litro"));
        assertFalse(result.descricao().contains("20w50"));
        assertFalse(result.descricao().contains("Ipiranga"));
        assertFalse(result.descricao().contains("Petronas"));
        assertFalse(result.descricao().contains("Motul"));
        assertEquals("Mobil", result.marca());
        assertEquals("Lubrificantes", result.categoria());
    }
}
