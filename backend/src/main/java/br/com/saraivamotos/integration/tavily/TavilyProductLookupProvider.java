package br.com.saraivamotos.integration.tavily;

import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import br.com.saraivamotos.dto.ProdutoSugestaoResponse;
import br.com.saraivamotos.service.ProductLookupProvider;
import br.com.saraivamotos.service.ProductLookupProviderUnavailableException;

public class TavilyProductLookupProvider implements ProductLookupProvider, Ordered {

    private static final Logger LOGGER = LoggerFactory.getLogger(TavilyProductLookupProvider.class);
    private static final Pattern BARCODE = Pattern.compile("\\d{8,14}");
    private static final Pattern GENERIC_TITLE = Pattern.compile(
            "(?i)^(?:online\\s+)?(?:upc|ean|gtin|barcode)(?:\\s+(?:code))?\\s+(?:lookup|search|checker).*$");
    private final RestClient client;
    private final TavilyProductMetadataExtractor metadataExtractor;

    public TavilyProductLookupProvider(RestClient client) {
        this.client = client;
        this.metadataExtractor = new TavilyProductMetadataExtractor();
    }

    @Override
    public int getOrder() {
        return 200;
    }

    @Override
    public boolean supports(String codigo) {
        return codigo != null && BARCODE.matcher(codigo).matches();
    }

    @Override
    public Optional<ProdutoSugestaoResponse> lookup(String codigo) {
        if (!supports(codigo)) return Optional.empty();
        try {
            TavilySearchResponse response = client.post()
                    .uri("/search")
                    .body(new TavilySearchRequest('"' + codigo + '"', "basic", 3, false, false))
                    .retrieve()
                    .body(TavilySearchResponse.class);
            return extractSuggestion(response, codigo);
        } catch (RestClientResponseException exception) {
            LOGGER.warn("Tavily indisponível para consulta do código {} (HTTP {})", codigo, exception.getStatusCode().value());
            throw new ProductLookupProviderUnavailableException("Tavily temporariamente indisponível.", exception);
        } catch (RestClientException | IllegalStateException exception) {
            LOGGER.warn("Falha de comunicação ou resposta inválida da Tavily para o código {}: {}", codigo, exception.getClass().getSimpleName());
            throw new ProductLookupProviderUnavailableException("Tavily temporariamente indisponível.", exception);
        }
    }

    private Optional<ProdutoSugestaoResponse> extractSuggestion(TavilySearchResponse response, String codigo) {
        if (response == null || response.results() == null) return Optional.empty();
        return response.results().stream()
                .filter(result -> isUsefulEvidence(result, codigo))
                .findFirst()
                .map(result -> {
                    TavilyProductMetadataExtractor.Metadata metadata = metadataExtractor.extract(
                            result.title(), result.content(), codigo);
                    return new ProdutoSugestaoResponse(
                            "TAVILY", codigo, metadataExtractor.sanitizeTitle(result.title(), codigo), metadata.marca(),
                            metadata.categoria(), metadata.descricao(), metadata.aplicacao(),
                            metadata.codigoReferencia());
                });
    }

    private boolean isUsefulEvidence(TavilySearchResult result, String codigo) {
        if (result == null) return false;
        String title = safe(result.title());
        String content = safe(result.content());
        boolean literalCode = title.contains(codigo) || content.contains(codigo);
        String normalizedTitle = title.replace(codigo, "").replaceAll("[-|:]+", " ").trim();
        return literalCode && !normalizedTitle.isBlank()
                && !GENERIC_TITLE.matcher(normalizedTitle.toLowerCase(Locale.ROOT)).matches();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
