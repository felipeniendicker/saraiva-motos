package br.com.saraivamotos.integration.upcitemdb;

import java.util.Optional;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import br.com.saraivamotos.dto.ProdutoSugestaoResponse;
import br.com.saraivamotos.service.ProductLookupProvider;
import br.com.saraivamotos.service.ProductLookupProviderUnavailableException;

public class UpcItemDbProductLookupProvider implements ProductLookupProvider {

    private static final Logger LOGGER = LoggerFactory.getLogger(UpcItemDbProductLookupProvider.class);
    private static final Pattern BARCODE = Pattern.compile("\\d{8,14}");
    private final RestClient client;

    public UpcItemDbProductLookupProvider(RestClient client) {
        this.client = client;
    }

    @Override
    public boolean supports(String codigo) {
        return codigo != null && BARCODE.matcher(codigo).matches();
    }

    @Override
    public Optional<ProdutoSugestaoResponse> lookup(String codigo) {
        if (!supports(codigo)) return Optional.empty();

        try {
            UpcItemDbResponse response = client.get()
                    .uri(uriBuilder -> uriBuilder.path("/lookup").queryParam("upc", codigo).build())
                    .retrieve()
                    .body(UpcItemDbResponse.class);
            Optional<ProdutoSugestaoResponse> result = firstSuggestion(response, codigo);
            LOGGER.info("Provider UPCITEMDB consultado para código {}: {}", codigo,
                    result.isPresent() ? "encontrado" : "não encontrado");
            return result;
        } catch (HttpClientErrorException exception) {
            HttpStatusCode status = exception.getStatusCode();
            if (status.value() == 404 || status.value() == 400) {
                LOGGER.info("Provider UPCITEMDB não encontrou o código {} (HTTP {})", codigo, status.value());
                return Optional.empty();
            }
            if (status.value() == 429) {
                LOGGER.warn("Provider UPCITEMDB indisponível por limite de requisições para o código {}", codigo);
                throw new ProductLookupProviderUnavailableException("Limite do provider externo atingido.", exception);
            }
            LOGGER.warn("Provider UPCITEMDB respondeu HTTP {} para o código {}", status.value(), codigo);
            throw new ProductLookupProviderUnavailableException("Falha no provider externo.", exception);
        } catch (RestClientException exception) {
            LOGGER.warn("Falha de comunicação ou resposta inválida do provider UPCITEMDB para o código {}: {}",
                    codigo, exception.getClass().getSimpleName());
            throw new ProductLookupProviderUnavailableException("Provider externo indisponível.", exception);
        } catch (RuntimeException exception) {
            LOGGER.warn("Resposta inesperada do provider UPCITEMDB para o código {}: {}",
                    codigo, exception.getClass().getSimpleName());
            throw new ProductLookupProviderUnavailableException("Resposta inválida do provider externo.", exception);
        }
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
                blankToNull(item.model())));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
