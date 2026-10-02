package br.com.saraivamotos.integration.tavily;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class TavilyProductMetadataExtractor {

    private static final int DESCRIPTION_LIMIT = 500;
    private static final String STRUCTURED_LABEL = "(?:C[oó]digo(?: de barras| do Produto| do Fabricante)?|Categoria|Itens Inclusos|Fabricante|Marca|Refer[eê]ncia(?: do Fornecedor)?|NCM|Peso(?: bruto)?|Aplica(?:c|ç)[aã]o|Modelo|GTIN|EAN)";
    private static final Pattern STRUCTURED_FIELD = Pattern.compile(
            "(?iu)\\b(" + STRUCTURED_LABEL + ")\\s*:\\s*(.{1,120}?)(?=\\s*(?:\\||;|\\n|" + STRUCTURED_LABEL + "\\s*:|$))");
    private static final Pattern PAGE_NOISE = Pattern.compile(
            "(?iu)(?:Deixe seu coment[aá]rio(?: e sua avalia(?:c|ç)[aã]o)?|Clique para avaliar|M[aá]ximo de 512 caracteres|Emojis n[aã]o s[aã]o suportados|Produtos relacionados|Frequentemente comprados juntos|Mensagem|Enviar)");
    private static final Pattern COMMERCIAL_SUFFIX = Pattern.compile(
            "(?iu)(?:\\b(?:loja|moto pe[cç]as|capacete|vestu[aá]rio|acess[oó]rios|compre|online)\\b|www\\.|\\.(?:com|com\\.br)\\b)");
    private static final Pattern EXPLICIT_BRAND = Pattern.compile(
            "(?iu)(?:fabricante|marca)\\s*:\\s*([\\p{L}0-9][\\p{L}0-9 .&-]{1,39}?)(?=\\s+(?:c[oó]digo(?:\\s+do\\s+(?:fabricante|produto))?|ncm|ean|gtin|marca|fabricante)\\s*:|[;|\\n]|$)");
    private static final Pattern REFERENCE = Pattern.compile(
            "(?iu)c[oó]digo\\s+do\\s+(?:fabricante|produto)\\s*:\\s*([A-Z0-9][A-Z0-9./_-]{1,39})");
    private static final Pattern APPLICATION = Pattern.compile(
            "(?iu)aplica(?:c|ç)[aã]o\\s*:\\s*([^;|\\n]{3,100})");
    private static final Map<String, String> KNOWN_BRANDS = Map.of(
            "magnetron", "Magnetron",
            "diafrag", "Diafrag",
            "riffel", "Riffel",
            "mobil", "Mobil");
    private static final Set<String> GENERIC_APPLICATION_VALUES = Set.of(
            "montadora/marca", "montadora", "marca", "modelo", "sistema", "versao", "ano", "eixo");
    private static final Map<String, String[]> CATEGORY_RULES = categoryRules();

    Metadata extract(String title, String content, String barcode) {
        try {
            String sanitized = sanitize(content);
            String evidence = safe(title) + " " + safe(sanitized);
            return new Metadata(
                    extractBrand(evidence),
                    extractReference(evidence, barcode),
                    classifyCategory(evidence),
                    extractApplication(evidence),
                    sanitized);
        } catch (RuntimeException ignored) {
            return new Metadata(null, null, null, null, null);
        }
    }

    String sanitizeTitle(String title, String barcode) {
        try {
            String cleaned = cleanWebText(safe(title).replace(safe(barcode), " "))
                    .replaceAll("#{1,6}", " ")
                    .replaceAll("(?:\\s*\\|\\s*)+", " ")
                    .replaceAll("\\s+", " ")
                    .replaceAll("(?:\\s*\\.{3,}|\\s*…)\\s*$", "")
                    .replaceAll("^[\\s\\-|:]+|[\\s\\-|:]+$", "")
                    .trim();
            String[] parts = cleaned.split("\\s+-\\s+", 2);
            if (parts.length == 2 && COMMERCIAL_SUFFIX.matcher(parts[1]).find()) {
                cleaned = parts[0].trim();
            }
            return cleaned.isBlank() ? null : cleaned;
        } catch (RuntimeException ignored) {
            String fallback = safe(title).replace(safe(barcode), "").trim();
            return fallback.isBlank() ? null : fallback;
        }
    }

    private String extractBrand(String evidence) {
        Matcher explicit = EXPLICIT_BRAND.matcher(evidence);
        if (explicit.find()) return cleanValue(explicit.group(1));
        String normalized = normalize(evidence);
        return KNOWN_BRANDS.entrySet().stream()
                .filter(entry -> Pattern.compile("\\b" + Pattern.quote(entry.getKey()) + "\\b").matcher(normalized).find())
                .map(Map.Entry::getValue)
                .findFirst().orElse(null);
    }

    private String extractReference(String evidence, String barcode) {
        Matcher matcher = REFERENCE.matcher(evidence);
        if (!matcher.find()) return null;
        String candidate = matcher.group(1).trim();
        return candidate.equalsIgnoreCase(safe(barcode)) ? null : candidate;
    }

    private String classifyCategory(String evidence) {
        String normalized = normalize(evidence);
        for (Map.Entry<String, String[]> rule : CATEGORY_RULES.entrySet()) {
            for (String keyword : rule.getValue()) {
                if (normalized.contains(keyword)) return rule.getKey();
            }
        }
        return null;
    }

    private String extractApplication(String evidence) {
        Matcher matcher = APPLICATION.matcher(evidence);
        if (!matcher.find()) return null;
        String candidate = cleanValue(matcher.group(1));
        if (candidate == null || GENERIC_APPLICATION_VALUES.contains(normalize(candidate))) return null;
        return candidate;
    }

    private String sanitize(String value) {
        if (value == null || value.isBlank()) return null;
        String cleaned = cleanWebText(value)
                .replaceAll("(?m)^\\s*#{1,6}\\s*", "")
                .replaceAll("#{2,}", " ")
                .replaceAll("(?:\\s*\\|\\s*){2,}", " | ")
                .replaceAll("(?iu)\\s*" + PAGE_NOISE.pattern() + "\\s*", " | ")
                .replaceAll("(?:\\s*\\|\\s*){2,}", " | ")
                .replaceAll("^[\\s|;,-]+|[\\s|;,-]+$", "")
                .replaceAll("\\s+", " ")
                .trim();
        if (cleaned.isBlank()) return null;
        String structured = extractStructuredFields(cleaned);
        return truncateAtWord(structured == null ? cleaned : structured);
    }

    private String extractStructuredFields(String value) {
        Matcher matcher = STRUCTURED_FIELD.matcher(value.replaceAll(":\\s*\\|\\s*", ": "));
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            String fieldValue = cleanValue(matcher.group(2).replaceAll("^[\\s|]+|[\\s|]+$", ""));
            if (fieldValue == null) continue;
            if (!result.isEmpty()) result.append(" | ");
            result.append(cleanValue(matcher.group(1))).append(": ").append(fieldValue);
        }
        return result.isEmpty() ? null : result.toString();
    }

    private String cleanWebText(String value) {
        return value
                .replaceAll("(?is)<(?:script|style)[^>]*>.*?</(?:script|style)>", " ")
                .replaceAll("(?s)(?:[.#][\\w-]+\\s*)?\\{[^{}]*}", " ")
                .replaceAll("(?s)<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replaceAll("[\\r\\n]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String truncateAtWord(String value) {
        if (value.length() <= DESCRIPTION_LIMIT) return value;
        String truncated = value.substring(0, DESCRIPTION_LIMIT + 1);
        int boundary = truncated.lastIndexOf(' ');
        return truncated.substring(0, boundary > 0 ? boundary : DESCRIPTION_LIMIT).trim();
    }

    private String normalize(String value) {
        return Normalizer.normalize(safe(value), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
    }

    private String cleanValue(String value) {
        String cleaned = safe(value).replaceAll("\\s+", " ").trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private static Map<String, String[]> categoryRules() {
        Map<String, String[]> rules = new LinkedHashMap<>();
        rules.put("Freios", new String[]{"sapata de freio", "sapata freio", "pastilha de freio", "pastilha freio", "disco de freio", "disco freio"});
        rules.put("Lubrificantes", new String[]{"oleo", "lubrificante"});
        rules.put("Transmissão", new String[]{"kit relacao", "corrente", "coroa", "pinhao"});
        rules.put("Elétrica", new String[]{"interruptor", "chave de luz", "lampada", "rele"});
        rules.put("Pneus", new String[]{"pneu", "camara de ar"});
        return rules;
    }

    record Metadata(String marca, String codigoReferencia, String categoria, String aplicacao, String descricao) {
    }
}
