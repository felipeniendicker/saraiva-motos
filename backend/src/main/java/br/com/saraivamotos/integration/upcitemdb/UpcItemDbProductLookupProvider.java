package br.com.saraivamotos.integration.upcitemdb;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.core.Ordered;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import br.com.saraivamotos.dto.ProdutoSugestaoResponse;
import br.com.saraivamotos.service.ProductLookupProvider;
import br.com.saraivamotos.service.ProductLookupProviderUnavailableException;

public class UpcItemDbProductLookupProvider implements ProductLookupProvider, Ordered {

    private static final Logger LOGGER = LoggerFactory.getLogger(UpcItemDbProductLookupProvider.class);
    private static final Pattern BARCODE = Pattern.compile("\\d{8,14}");
    private static final int MAX_CACHE_ENTRIES = 512;
    private static final Duration DEFAULT_CACHE_TTL = Duration.ofMinutes(5);
    private static final Duration DEFAULT_RATE_LIMIT_COOLDOWN = Duration.ofMinutes(1);
    private final RestClient client;
    private final Duration cacheTtl;
    private final Duration rateLimitCooldown;
    private final Clock clock;
    private final Map<String, CachedLookup> cache = new ConcurrentHashMap<>();
    private final AtomicReference<Instant> rateLimitedUntil = new AtomicReference<>(Instant.EPOCH);

    public UpcItemDbProductLookupProvider(RestClient client) {
        this(client, DEFAULT_CACHE_TTL, DEFAULT_RATE_LIMIT_COOLDOWN, Clock.systemUTC());
    }

    public UpcItemDbProductLookupProvider(RestClient client, Duration cacheTtl, Duration rateLimitCooldown) {
        this(client, cacheTtl, rateLimitCooldown, Clock.systemUTC());
    }

    UpcItemDbProductLookupProvider(RestClient client, Duration cacheTtl, Duration rateLimitCooldown, Clock clock) {
        this.client = client;
        this.cacheTtl = cacheTtl;
        this.rateLimitCooldown = rateLimitCooldown;
        this.clock = clock;
    }

    @Override
    public int getOrder() {
        return 100;
    }

    @Override
    public String providerName() {
        return "UPCITEMDB";
    }

    @Override
    public boolean supports(String codigo) {
        return codigo != null && BARCODE.matcher(codigo).matches();
    }

    @Override
    public Optional<ProdutoSugestaoResponse> lookup(String codigo) {
        if (!supports(codigo)) return Optional.empty();

        Instant now = clock.instant();
        CachedLookup cached = cache.get(codigo);
        if (cached != null && now.isBefore(cached.expiresAt())) {
            LOGGER.info("Consulta provider=UPCITEMDB codigo={} origem=CACHE resultado={}",
                    codigo, resultName(cached.suggestion()));
            return cached.suggestion();
        }
        if (cached != null) cache.remove(codigo, cached);

        Instant limitedUntil = rateLimitedUntil.get();
        if (now.isBefore(limitedUntil)) {
            LOGGER.info("Consulta provider=UPCITEMDB codigo={} origem=COOLDOWN resultado=INDISPONIVEL", codigo);
            throw new ProductLookupProviderUnavailableException("UPCitemdb em intervalo temporário após limite de requisições.");
        }

        try {
            UpcItemDbResponse response = client.get()
                    .uri(uriBuilder -> uriBuilder.path("/lookup").queryParam("upc", codigo).build())
                    .retrieve()
                    .body(UpcItemDbResponse.class);
            Optional<ProdutoSugestaoResponse> result = firstSuggestion(response, codigo);
            cache(codigo, result, now);
            LOGGER.info("Consulta provider=UPCITEMDB codigo={} httpStatus=200 resultado={}",
                    codigo, resultName(result));
            return result;
        } catch (RestClientResponseException exception) {
            HttpStatusCode status = exception.getStatusCode();
            if (status.value() == 404 || status.value() == 400) {
                Optional<ProdutoSugestaoResponse> result = Optional.empty();
                cache(codigo, result, now);
                LOGGER.info("Consulta provider=UPCITEMDB codigo={} httpStatus={} resultado=NAO_ENCONTRADO",
                        codigo, status.value());
                return Optional.empty();
            }
            if (status.value() == 429) {
                rateLimitedUntil.accumulateAndGet(now.plus(rateLimitCooldown),
                        (current, candidate) -> current.isAfter(candidate) ? current : candidate);
                LOGGER.warn("Consulta provider=UPCITEMDB codigo={} httpStatus=429 resultado=INDISPONIVEL motivo=LIMITE_REQUISICOES",
                        codigo);
                throw new ProductLookupProviderUnavailableException("Limite do provider externo atingido.", exception);
            }
            LOGGER.warn("Consulta provider=UPCITEMDB codigo={} httpStatus={} resultado=INDISPONIVEL",
                    codigo, status.value());
            throw new ProductLookupProviderUnavailableException("Falha no provider externo.", exception);
        } catch (RestClientException exception) {
            LOGGER.warn("Consulta provider=UPCITEMDB codigo={} httpStatus=SEM_RESPOSTA resultado=INDISPONIVEL falha={}",
                    codigo, exception.getClass().getSimpleName());
            throw new ProductLookupProviderUnavailableException("Provider externo indisponível.", exception);
        } catch (RuntimeException exception) {
            LOGGER.warn("Consulta provider=UPCITEMDB codigo={} httpStatus=200 resultado=INDISPONIVEL falha={}",
                    codigo, exception.getClass().getSimpleName());
            throw new ProductLookupProviderUnavailableException("Resposta inválida do provider externo.", exception);
        }
    }

    private void cache(String codigo, Optional<ProdutoSugestaoResponse> suggestion, Instant now) {
        if (cacheTtl.isZero() || cacheTtl.isNegative()) return;
        if (cache.size() >= MAX_CACHE_ENTRIES && !cache.containsKey(codigo)) {
            cache.entrySet().removeIf(entry -> !now.isBefore(entry.getValue().expiresAt()));
            if (cache.size() >= MAX_CACHE_ENTRIES) {
                cache.keySet().stream().findFirst().ifPresent(cache::remove);
            }
        }
        cache.put(codigo, new CachedLookup(suggestion, now.plus(cacheTtl)));
    }

    private String resultName(Optional<ProdutoSugestaoResponse> result) {
        return result.isPresent() ? "ENCONTRADO" : "NAO_ENCONTRADO";
    }

    private Optional<ProdutoSugestaoResponse> firstSuggestion(UpcItemDbResponse response, String codigo) {
        if (response == null || response.items() == null || response.items().isEmpty()) return Optional.empty();
        UpcItemDbItem item = response.items().get(0);
        if (item == null) return Optional.empty();
        return Optional.of(new ProdutoSugestaoResponse(
                "UPCITEMDB",
                codigo,
                blankToNull(item.title()),
                blankToNull(item.brand()),
                blankToNull(item.category()),
                blankToNull(item.description()),
                blankToNull(item.model()),
                null));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record CachedLookup(Optional<ProdutoSugestaoResponse> suggestion, Instant expiresAt) {
    }
}
