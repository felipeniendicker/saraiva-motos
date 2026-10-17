package br.com.saraivamotos.integration.tavily;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import br.com.saraivamotos.dto.ProdutoSugestaoResponse;
import br.com.saraivamotos.service.GtinNormalizer;
import br.com.saraivamotos.service.ProductLookupProvider;
import br.com.saraivamotos.service.ProductLookupProviderUnavailableException;

public class TavilyProductLookupProvider implements ProductLookupProvider, Ordered {
    private static final Logger LOGGER = LoggerFactory.getLogger(TavilyProductLookupProvider.class);
    private static final Pattern BARCODE = Pattern.compile("\\d{8,14}");
    private static final int MAX_CACHE_ENTRIES = 512;
    private static final Duration DEFAULT_POSITIVE_TTL = Duration.ofHours(6);
    private static final Duration DEFAULT_NEGATIVE_TTL = Duration.ofMinutes(30);

    private final RestClient client;
    private final TavilyProductEvidenceEvaluator evidenceEvaluator;
    private final Duration positiveTtl;
    private final Duration negativeTtl;
    private final Clock clock;
    private final Map<String, CachedLookup> cache = new ConcurrentHashMap<>();
    private final Map<String, CompletableFuture<Optional<ProdutoSugestaoResponse>>> inFlight = new ConcurrentHashMap<>();

    public TavilyProductLookupProvider(RestClient client) {
        this(client, DEFAULT_POSITIVE_TTL, DEFAULT_NEGATIVE_TTL, Clock.systemUTC());
    }

    public TavilyProductLookupProvider(RestClient client, Duration positiveTtl, Duration negativeTtl) {
        this(client, positiveTtl, negativeTtl, Clock.systemUTC());
    }

    TavilyProductLookupProvider(RestClient client, Duration positiveTtl, Duration negativeTtl, Clock clock) {
        this.client = client;
        this.positiveTtl = positiveTtl;
        this.negativeTtl = negativeTtl;
        this.clock = clock;
        this.evidenceEvaluator = new TavilyProductEvidenceEvaluator(new TavilyProductMetadataExtractor());
    }

    @Override public int getOrder() { return 200; }
    @Override public String providerName() { return "TAVILY"; }

    @Override
    public boolean supports(String codigo) {
        return codigo != null && BARCODE.matcher(codigo).matches();
    }

    @Override
    public Optional<ProdutoSugestaoResponse> lookup(String codigo) {
        return lookup(codigo, false);
    }

    @Override
    public Optional<ProdutoSugestaoResponse> lookup(String codigo, boolean forceRefresh) {
        if (!supports(codigo)) return Optional.empty();
        Instant now = clock.instant();
        if (!forceRefresh) {
            CachedLookup cached = cache.get(codigo);
            if (cached != null && now.isBefore(cached.expiresAt())) {
                LOGGER.info("Consulta provider=TAVILY codigo={} origem=CACHE resultado={}", codigo, resultName(cached.result()));
                return cached.result();
            }
            if (cached != null) cache.remove(codigo, cached);
        }

        CompletableFuture<Optional<ProdutoSugestaoResponse>> ownFuture = new CompletableFuture<>();
        CompletableFuture<Optional<ProdutoSugestaoResponse>> running = inFlight.putIfAbsent(codigo, ownFuture);
        if (running != null) {
            LOGGER.info("Consulta provider=TAVILY codigo={} origem=REQUISICAO_EM_ANDAMENTO resultado=AGUARDANDO", codigo);
            return await(running);
        }
        try {
            Optional<ProdutoSugestaoResponse> result = performLookup(codigo);
            cache(codigo, result, now);
            ownFuture.complete(result);
            return result;
        } catch (RuntimeException exception) {
            ownFuture.completeExceptionally(exception);
            throw exception;
        } finally {
            inFlight.remove(codigo, ownFuture);
        }
    }

    private Optional<ProdutoSugestaoResponse> performLookup(String codigo) {
        try {
            String searchCode = GtinNormalizer.equivalents(codigo).stream()
                    .filter(value -> value.length() == 13)
                    .findFirst().orElse(codigo);
            TavilySearchResponse response = client.post().uri("/search")
                    .body(new TavilySearchRequest('"' + searchCode + '"', "basic", 8, false, false))
                    .retrieve().body(TavilySearchResponse.class);
            TavilyProductEvidenceEvaluator.Evaluation evaluation = evidenceEvaluator.evaluate(
                    response == null ? null : response.results(), codigo);
            Optional<ProdutoSugestaoResponse> result = evaluation.confidence()
                    == TavilyProductEvidenceEvaluator.Confidence.REJEITADA
                    ? Optional.empty() : Optional.of(evaluation.suggestion());
            LOGGER.info("Consulta provider=TAVILY codigo={} httpStatus=200 resultado={} confianca={} evidenciasAceitas={} fontesConsistentes={}",
                    codigo, resultName(result), evaluation.confidence(), evaluation.accepted(), evaluation.consistent());
            return result;
        } catch (RestClientResponseException exception) {
            LOGGER.warn("Consulta provider=TAVILY codigo={} httpStatus={} resultado=INDISPONIVEL",
                    codigo, exception.getStatusCode().value());
            throw new ProductLookupProviderUnavailableException("Tavily temporariamente indisponível.", exception);
        } catch (RestClientException | IllegalStateException exception) {
            LOGGER.warn("Consulta provider=TAVILY codigo={} httpStatus=SEM_RESPOSTA resultado=INDISPONIVEL falha={}",
                    codigo, exception.getClass().getSimpleName());
            throw new ProductLookupProviderUnavailableException("Tavily temporariamente indisponível.", exception);
        }
    }

    private Optional<ProdutoSugestaoResponse> await(CompletableFuture<Optional<ProdutoSugestaoResponse>> future) {
        try {
            return future.join();
        } catch (CompletionException exception) {
            if (exception.getCause() instanceof ProductLookupProviderUnavailableException unavailable) throw unavailable;
            throw exception;
        }
    }

    private void cache(String codigo, Optional<ProdutoSugestaoResponse> result, Instant now) {
        Duration ttl = result.isPresent() ? positiveTtl : negativeTtl;
        if (ttl.isZero() || ttl.isNegative()) return;
        if (cache.size() >= MAX_CACHE_ENTRIES && !cache.containsKey(codigo)) {
            cache.entrySet().removeIf(entry -> !now.isBefore(entry.getValue().expiresAt()));
            if (cache.size() >= MAX_CACHE_ENTRIES) cache.keySet().stream().findFirst().ifPresent(cache::remove);
        }
        cache.put(codigo, new CachedLookup(result, now.plus(ttl)));
    }

    private String resultName(Optional<ProdutoSugestaoResponse> result) {
        return result.isPresent() ? "ENCONTRADO" : "NAO_ENCONTRADO";
    }

    private record CachedLookup(Optional<ProdutoSugestaoResponse> result, Instant expiresAt) { }
}
