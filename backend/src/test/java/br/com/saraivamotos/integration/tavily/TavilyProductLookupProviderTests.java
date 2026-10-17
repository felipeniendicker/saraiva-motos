package br.com.saraivamotos.integration.tavily;

import java.net.SocketTimeoutException;
import java.io.IOException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

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
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
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
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"max_results\":8")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"country\":\"brazil\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"language\":\"pt\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"exact_match\":true")))
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
        assertEquals("MEDIA", suggestion.confianca());
        assertEquals("https://parts.test/item", suggestion.fontes().get(0).url());
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
    void zeroPaddedGtin14UsesEquivalentGtin13InSingleSearch() {
        server.expect(requestTo("https://tavily.test/search"))
                .andExpect(jsonPath("$.query").value("7908006704133"))
                .andRespond(withSuccess("{\"results\":[]}", MediaType.APPLICATION_JSON));
        assertTrue(provider.lookup("07908006704133").isEmpty());
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
    void authenticationAndAuthorizationErrorsAreSafeUnavailableStates() {
        server.expect(requestTo("https://tavily.test/search"))
                .andRespond(withStatus(org.springframework.http.HttpStatus.UNAUTHORIZED));
        server.expect(requestTo("https://tavily.test/search"))
                .andRespond(withStatus(org.springframework.http.HttpStatus.FORBIDDEN));

        assertThrows(ProductLookupProviderUnavailableException.class, () -> provider.lookup("7898635121541"));
        assertThrows(ProductLookupProviderUnavailableException.class, () -> provider.lookup("7898635121541"));
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
        assertNull(suggestion.descricao());
    }

    @Test
    void positiveAndNegativeResultsUseCacheButManualRefreshBypassesIt() {
        respond("""
                {"results":[{"title":"Motor de partida Starke CG 160 7908006704133","url":"https://parts.test/a",
                "content":"EAN: 7908006704133 Marca: Starke Código do fabricante (MPN): MA0007","score":0.1}]}
                """);
        respond("{\"results\":[]}");

        assertTrue(provider.lookup("7908006704133").isPresent());
        assertTrue(provider.lookup("7908006704133").isPresent());
        assertTrue(provider.lookup("7908006704133", true).isEmpty());
        assertTrue(provider.lookup("7908006704133").isEmpty());
        server.verify();
    }

    @Test
    void simultaneousRequestsForSameGtinShareOneExternalCall() throws Exception {
        CountDownLatch requestStarted = new CountDownLatch(1);
        CountDownLatch releaseResponse = new CountDownLatch(1);
        server.expect(requestTo("https://tavily.test/search")).andRespond(request -> {
            requestStarted.countDown();
            try {
                assertTrue(releaseResponse.await(2, TimeUnit.SECONDS));
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IOException("Teste interrompido", exception);
            }
            return withSuccess("{\"results\":[]}", MediaType.APPLICATION_JSON).createResponse(request);
        });

        CompletableFuture<?> first = CompletableFuture.supplyAsync(() -> provider.lookup("7908006704133"));
        assertTrue(requestStarted.await(2, TimeUnit.SECONDS));
        CompletableFuture<?> second = CompletableFuture.supplyAsync(() -> provider.lookup("7908006704133"));
        releaseResponse.countDown();

        CompletableFuture.allOf(first, second).get(3, TimeUnit.SECONDS);
        server.verify();
    }

    private void respond(String json) {
        server.expect(requestTo("https://tavily.test/search"))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));
    }
}
