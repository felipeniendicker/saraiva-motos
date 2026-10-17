package br.com.saraivamotos.service;

import java.util.LinkedHashSet;
import java.util.Set;

public final class GtinNormalizer {

    private static final String SAFE_FORMATTED_GTIN = "[0-9\\s./-]+";

    private GtinNormalizer() {
    }

    public static String normalizeInput(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (!trimmed.matches(SAFE_FORMATTED_GTIN)) return trimmed.replaceAll("\\s+", "");
        String digits = trimmed.replaceAll("\\D", "");
        return digits.length() >= 8 && digits.length() <= 14 ? digits : trimmed.replaceAll("\\s+", "");
    }

    public static Set<String> equivalents(String value) {
        String normalized = normalizeInput(value);
        LinkedHashSet<String> values = new LinkedHashSet<>();
        if (normalized == null || !normalized.matches("\\d{8,14}")) return values;
        values.add(normalized);
        if (normalized.length() == 13) values.add("0" + normalized);
        if (normalized.length() == 14 && normalized.startsWith("0")) values.add(normalized.substring(1));
        return Set.copyOf(values);
    }
}
