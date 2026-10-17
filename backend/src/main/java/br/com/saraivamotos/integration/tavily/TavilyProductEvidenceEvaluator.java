package br.com.saraivamotos.integration.tavily;

import java.net.URI;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import br.com.saraivamotos.dto.ProdutoFonteResponse;
import br.com.saraivamotos.dto.ProdutoSugestaoResponse;
import br.com.saraivamotos.service.GtinNormalizer;

final class TavilyProductEvidenceEvaluator {

    enum Confidence { ALTA, MEDIA, BAIXA, REJEITADA }
    enum RejectionReason {
        RESULTADO_NULO,
        SEM_GTIN_NO_TITULO_OU_TRECHO,
        TITULO_AUSENTE,
        PAGINA_GENERICA,
        URL_INVALIDA,
        IDENTIDADE_CONFLITANTE
    }

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
        if (results == null || results.isEmpty()) return Evaluation.rejected(results == null ? 0 : results.size());
        List<ResultAssessment> assessments = results.stream()
                .map(result -> assess(result, codigo))
                .toList();
        List<Candidate> candidates = assessments.stream()
                .map(ResultAssessment::candidate)
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparingInt(Candidate::quality).reversed())
                .toList();
        if (candidates.isEmpty()) {
            Diagnostics diagnostics = diagnostics(assessments, null);
            return Evaluation.rejected(results.size(), diagnostics);
        }

        Candidate anchor = candidates.get(0);
        List<Candidate> consistent = candidates.stream()
                .filter(candidate -> identitiesAgree(anchor, candidate))
                .toList();
        Diagnostics diagnostics = diagnostics(assessments, anchor);
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
        int consistentSources = (int) consistent.stream().map(Candidate::source)
                .filter(java.util.Objects::nonNull).count();
        return new Evaluation(confidence, suggestion, diagnostics.accepted(), diagnostics.rejected(),
                results.size(), diagnostics.validSources(), consistentSources, diagnostics.rejectionCounts());
    }

    private ResultAssessment assess(TavilySearchResult result, String codigo) {
        if (result == null) return ResultAssessment.rejected(RejectionReason.RESULTADO_NULO, false);
        ProdutoFonteResponse source = source(result);
        boolean validSource = source != null;
        if (!containsEquivalentGtin(result, codigo)) {
            return ResultAssessment.rejected(RejectionReason.SEM_GTIN_NO_TITULO_OU_TRECHO, validSource);
        }
        String name = metadataExtractor.sanitizeTitle(result.title(), codigo);
        if (name == null) return ResultAssessment.rejected(RejectionReason.TITULO_AUSENTE, validSource);
        if (isGeneric(name, codigo)) return ResultAssessment.rejected(RejectionReason.PAGINA_GENERICA, validSource);
        TavilyProductMetadataExtractor.Metadata metadata = metadataExtractor.extract(result.title(), result.content(), codigo);
        int quality = identityTokens(name).size() * 2;
        if (containsEquivalentGtin(result.title(), codigo)) quality += 4;
        if (metadata.marca() != null) quality += 2;
        if (metadata.codigoReferencia() != null) quality += 3;
        if (metadata.aplicacao() != null) quality += 1;
        Candidate candidate = new Candidate(name, metadata, source, host(source), quality);
        return new ResultAssessment(candidate, validSource ? null : RejectionReason.URL_INVALIDA, validSource);
    }

    private Diagnostics diagnostics(List<ResultAssessment> assessments, Candidate anchor) {
        EnumMap<RejectionReason, Integer> counts = new EnumMap<>(RejectionReason.class);
        for (RejectionReason reason : RejectionReason.values()) counts.put(reason, 0);
        int accepted = 0;
        int validSources = 0;
        for (ResultAssessment assessment : assessments) {
            if (assessment.validSource()) validSources++;
            RejectionReason reason = assessment.rejectionReason();
            if (reason == null && anchor != null && !identitiesAgree(anchor, assessment.candidate())) {
                reason = RejectionReason.IDENTIDADE_CONFLITANTE;
            }
            if (reason == null) accepted++;
            else counts.compute(reason, (ignored, count) -> count + 1);
        }
        return new Diagnostics(accepted, assessments.size() - accepted, validSources, Map.copyOf(counts));
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

    record Evaluation(
            Confidence confidence,
            ProdutoSugestaoResponse suggestion,
            int accepted,
            int rejected,
            int received,
            int validSources,
            int consistent,
            Map<RejectionReason, Integer> rejectionCounts) {

        static Evaluation rejected(int received) {
            EnumMap<RejectionReason, Integer> counts = new EnumMap<>(RejectionReason.class);
            for (RejectionReason reason : RejectionReason.values()) counts.put(reason, 0);
            return new Evaluation(Confidence.REJEITADA, null, 0, received, received, 0, 0, Map.copyOf(counts));
        }

        static Evaluation rejected(int received, Diagnostics diagnostics) {
            return new Evaluation(Confidence.REJEITADA, null, diagnostics.accepted(), diagnostics.rejected(),
                    received, diagnostics.validSources(), 0, diagnostics.rejectionCounts());
        }

        String rejectionSummary() {
            return Arrays.stream(RejectionReason.values())
                    .map(reason -> reason + "=" + rejectionCounts.getOrDefault(reason, 0))
                    .collect(java.util.stream.Collectors.joining(","));
        }
    }

    private record Diagnostics(
            int accepted,
            int rejected,
            int validSources,
            Map<RejectionReason, Integer> rejectionCounts) {
    }

    private record ResultAssessment(
            Candidate candidate,
            RejectionReason rejectionReason,
            boolean validSource) {

        static ResultAssessment rejected(RejectionReason reason, boolean validSource) {
            return new ResultAssessment(null, reason, validSource);
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
