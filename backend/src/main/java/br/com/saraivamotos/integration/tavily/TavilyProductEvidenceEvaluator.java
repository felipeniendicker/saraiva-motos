package br.com.saraivamotos.integration.tavily;

import java.net.URI;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import br.com.saraivamotos.dto.ProdutoFonteResponse;
import br.com.saraivamotos.dto.ProdutoSugestaoResponse;
import br.com.saraivamotos.service.GtinNormalizer;

final class TavilyProductEvidenceEvaluator {

    enum Confidence { ALTA, MEDIA, BAIXA, REJEITADA }

    private static final Pattern CODE_CANDIDATE = Pattern.compile("(?<!\\d)\\d(?:[\\s./-]*\\d){7,13}(?!\\d)");
    private static final Pattern GENERIC_PAGE = Pattern.compile(
            "(?iu)^(?:consulta|busca|pesquisa|lookup|search|checker|verificador)?\\s*(?:de\\s+)?(?:c[oó]digo\\s+de\\s+barras|upc|ean|gtin|barcode)(?:\\s+(?:lookup|search|checker|database|banco\\s+de\\s+dados))?\\s*$");
    private static final Set<String> IDENTITY_STOP_WORDS = Set.of(
            "a", "as", "com", "da", "das", "de", "do", "dos", "e", "em", "para", "por",
            "produto", "peca", "moto", "motos", "original", "novo", "unidade");

    private final TavilyProductMetadataExtractor metadataExtractor;

    TavilyProductEvidenceEvaluator(TavilyProductMetadataExtractor metadataExtractor) {
        this.metadataExtractor = metadataExtractor;
    }

    Evaluation evaluate(List<TavilySearchResult> results, String codigo) {
        if (results == null || results.isEmpty()) return Evaluation.rejected();
        List<Candidate> candidates = results.stream()
                .map(result -> candidate(result, codigo))
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparingInt(Candidate::quality).reversed())
                .toList();
        if (candidates.isEmpty()) return Evaluation.rejected();

        Candidate anchor = candidates.get(0);
        List<Candidate> consistent = candidates.stream()
                .filter(candidate -> identitiesAgree(anchor, candidate))
                .toList();
        Confidence confidence = classify(anchor, consistent);
        List<ProdutoFonteResponse> sources = consistent.stream()
                .map(Candidate::source)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        TavilyProductMetadataExtractor.Metadata metadata = anchor.metadata();
        ProdutoSugestaoResponse suggestion = new ProdutoSugestaoResponse(
                "TAVILY", codigo, anchor.name(), metadata.marca(), metadata.categoria(), metadata.descricao(),
                metadata.aplicacao(), metadata.codigoReferencia(), confidence.name(), sources);
        return new Evaluation(confidence, suggestion, candidates.size(), consistent.size());
    }

    private Candidate candidate(TavilySearchResult result, String codigo) {
        if (result == null || !containsEquivalentGtin(result, codigo)) return null;
        String name = metadataExtractor.sanitizeTitle(result.title(), codigo);
        if (name == null || isGeneric(name, codigo)) return null;
        TavilyProductMetadataExtractor.Metadata metadata = metadataExtractor.extract(result.title(), result.content(), codigo);
        int quality = identityTokens(name).size() * 2;
        if (containsEquivalentGtin(result.title(), codigo)) quality += 4;
        if (metadata.marca() != null) quality += 2;
        if (metadata.codigoReferencia() != null) quality += 3;
        if (metadata.aplicacao() != null) quality += 1;
        ProdutoFonteResponse source = source(result);
        return new Candidate(name, metadata, source, host(source), quality);
    }

    private Confidence classify(Candidate anchor, List<Candidate> consistent) {
        if (identityTokens(anchor.name()).size() < 2) return Confidence.BAIXA;
        long independentDomains = consistent.stream().map(Candidate::host).filter(value -> value != null)
                .distinct().count();
        boolean strongStructuredIdentity = anchor.metadata().marca() != null
                && anchor.metadata().codigoReferencia() != null;
        return independentDomains >= 2 || strongStructuredIdentity ? Confidence.ALTA : Confidence.MEDIA;
    }

    private boolean identitiesAgree(Candidate first, Candidate second) {
        if (first == second) return true;
        String firstReference = first.metadata().codigoReferencia();
        String secondReference = second.metadata().codigoReferencia();
        if (firstReference != null && secondReference != null
                && !firstReference.equalsIgnoreCase(secondReference)) return false;
        String firstBrand = first.metadata().marca();
        String secondBrand = second.metadata().marca();
        if (firstBrand != null && secondBrand != null && !firstBrand.equalsIgnoreCase(secondBrand)) return false;

        Set<String> firstTokens = identityTokens(first.name());
        Set<String> secondTokens = identityTokens(second.name());
        Set<String> intersection = new HashSet<>(firstTokens);
        intersection.retainAll(secondTokens);
        int minimum = Math.min(firstTokens.size(), secondTokens.size());
        return minimum > 0 && intersection.size() * 2 >= minimum;
    }

    private boolean containsEquivalentGtin(TavilySearchResult result, String codigo) {
        return result != null && (containsEquivalentGtin(result.title(), codigo)
                || containsEquivalentGtin(result.content(), codigo));
    }

    private boolean containsEquivalentGtin(String text, String codigo) {
        if (text == null || text.isBlank()) return false;
        Set<String> expected = GtinNormalizer.equivalents(codigo);
        Matcher matcher = CODE_CANDIDATE.matcher(text);
        while (matcher.find()) {
            String candidate = GtinNormalizer.normalizeInput(matcher.group());
            if (expected.contains(candidate)) return true;
        }
        return false;
    }

    private boolean isGeneric(String name, String codigo) {
        String withoutCode = name;
        for (String equivalent : GtinNormalizer.equivalents(codigo)) {
            withoutCode = withoutCode.replace(equivalent, " ");
        }
        return GENERIC_PAGE.matcher(withoutCode.replaceAll("[-|:]", " ").trim()).matches();
    }

    private Set<String> identityTokens(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ");
        LinkedHashSet<String> tokens = new LinkedHashSet<>();
        Arrays.stream(normalized.split("\\s+"))
                .filter(token -> token.length() > 1 && !IDENTITY_STOP_WORDS.contains(token) && !token.matches("\\d{8,14}"))
                .forEach(tokens::add);
        return tokens;
    }

    private ProdutoFonteResponse source(TavilySearchResult result) {
        try {
            URI uri = URI.create(result.url());
            if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null) return null;
            return new ProdutoFonteResponse(result.title(), uri.toString());
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private String host(ProdutoFonteResponse source) {
        if (source == null) return null;
        try {
            return URI.create(source.url()).getHost().toLowerCase(Locale.ROOT).replaceFirst("^www\\.", "");
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    record Evaluation(Confidence confidence, ProdutoSugestaoResponse suggestion, int accepted, int consistent) {
        static Evaluation rejected() {
            return new Evaluation(Confidence.REJEITADA, null, 0, 0);
        }
    }

    private record Candidate(
            String name,
            TavilyProductMetadataExtractor.Metadata metadata,
            ProdutoFonteResponse source,
            String host,
            int quality) {
    }
}
