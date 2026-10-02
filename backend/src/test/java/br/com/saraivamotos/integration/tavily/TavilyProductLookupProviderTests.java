package br.com.saraivamotos.integration.tavily;

import java.net.SocketTimeoutException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import br.com.saraivamotos.service.ProductLookupProviderUnavailableException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TavilyProductLookupProviderTests {

    private MockRestServiceServer server;
    private TavilyProductLookupProvider provider;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://tavily.test");
        server = MockRestServiceServer.bindTo(builder).build();
        provider = new TavilyProductLookupProvider(builder.build());
    }

    @Test
    void extractsConservativeSuggestionFromLiteralGtinEvidence() {
        server.expect(requestTo("https://tavily.test/search"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\\\"7898485619632\\\"")))
                .andRespond(withSuccess("""
                        {"results":[{"title":"Interruptor Chave de Luz Magnetron Honda Titan Fan - 7898485619632",
                        "url":"https://parts.test/item","content":"GTIN 7898485619632. Interruptor de luz Magnetron para Honda Titan e Fan.","score":0.91}]}
                        """, MediaType.APPLICATION_JSON));

        var suggestion = provider.lookup("7898485619632").orElseThrow();

        assertEquals("TAVILY", suggestion.fonte());
        assertEquals("7898485619632", suggestion.codigoBarras());
        assertTrue(suggestion.nome().contains("Interruptor"));
        assertTrue(suggestion.descricao().contains("Magnetron"));
        assertEquals("Magnetron", suggestion.marca());
        assertEquals("Elétrica", suggestion.categoria());
        server.verify();
    }

    @Test
    void genericBarcodePagesDoNotIdentifyProduct() {
        respond("""
                {"results":[{"title":"UPC Lookup","url":"https://generic.test","content":"Search any barcode including 000000736473","score":0.99}]}
                """);
        assertTrue(provider.lookup("000000736473").isEmpty());
    }

    @Test
    void emptyResultsMeanNotFound() {
        respond("{\"results\":[]}");
        assertTrue(provider.lookup("000000736473").isEmpty());
    }

    @Test
    void leadingZerosReachRequestIntact() {
        server.expect(requestTo("https://tavily.test/search"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("000000736473")))
                .andRespond(withSuccess("{\"results\":[]}", MediaType.APPLICATION_JSON));
        assertTrue(provider.lookup("000000736473").isEmpty());
    }

    @Test
    void rateLimitAndServerErrorAreSafeUnavailableStates() {
        server.expect(requestTo("https://tavily.test/search"))
                .andRespond(withStatus(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS));
        server.expect(requestTo("https://tavily.test/search")).andRespond(withServerError());

        assertThrows(ProductLookupProviderUnavailableException.class, () -> provider.lookup("7898485619632"));
        assertThrows(ProductLookupProviderUnavailableException.class, () -> provider.lookup("7898485619632"));
    }

    @Test
    void unexpectedSuccessfulResponseDoesNotCauseInternalError() {
        respond("{\"unexpected\":true}");
        assertTrue(provider.lookup("7898485619632").isEmpty());
    }

    @Test
    void invalidJsonAndTimeoutAreSafeUnavailableStates() {
        server.expect(requestTo("https://tavily.test/search"))
                .andRespond(withSuccess("not-json", MediaType.APPLICATION_JSON));
        assertThrows(ProductLookupProviderUnavailableException.class, () -> provider.lookup("7898485619632"));

        RestClient timeoutClient = RestClient.builder().baseUrl("https://tavily.test")
                .requestFactory((uri, method) -> { throw new SocketTimeoutException("timeout controlado"); })
                .build();
        assertThrows(ProductLookupProviderUnavailableException.class,
                () -> new TavilyProductLookupProvider(timeoutClient).lookup("7898485619632"));
    }

    @Test
    void ignoresPricesAndDoesNotInventFinancialOrStockData() {
        respond("""
                {"results":[{"title":"Peça Honda 7898485619632","content":"7898485619632 preço R$ 999, estoque 20","score":0.8}]}
                """);
        var suggestion = provider.lookup("7898485619632").orElseThrow();
        assertEquals("Peça Honda", suggestion.nome());
        assertNull(suggestion.marca());
        assertNull(suggestion.categoria());
        assertNull(suggestion.aplicacao());
    }

    private void respond(String json) {
        server.expect(requestTo("https://tavily.test/search"))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));
    }
}
