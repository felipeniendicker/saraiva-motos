package br.com.saraivamotos.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GtinNormalizerTests {
    @Test
    void removesOnlySafeGtinFormattingAndPreservesReferences() {
        assertEquals("7908006704133", GtinNormalizer.normalizeInput("7908 0067-0413.3"));
        assertEquals("ABC-123", GtinNormalizer.normalizeInput("ABC-123"));
    }

    @Test
    void recognizesOnlyZeroPaddedGtin13AndGtin14Equivalence() {
        assertTrue(GtinNormalizer.equivalents("7908006704133").contains("07908006704133"));
        assertTrue(GtinNormalizer.equivalents("07908006704133").contains("7908006704133"));
    }
}
