package br.com.saraivamotos.integration.upcitemdb;

import java.net.SocketTimeoutException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import br.com.saraivamotos.service.ProductLookupProviderUnavailableException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class UpcItemDbProductLookupProviderTests {

    private MockRestServiceServer server;
    private UpcItemDbProductLookupProvider provider;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://provider.test");
        server = MockRestServiceServer.bindTo(builder).build();
        provider = new UpcItemDbProductLookupProvider(builder.build());
    }

    @Test
    void mapsFoundProductAndOnlyAllowedFields() {
        server.expect(once(), requestTo("https://provider.test/lookup?upc=0885909950805"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        {"code":"OK","total":1,"offset":0,"items":[{
                          "ean":"0885909950805","upc":"885909950805","gtin":"00885909950805",
                          "title":"Produto teste","description":"Descrição externa","brand":"Marca X",
                          "model":"Modelo 10","category":"Categoria X","images":["https://image.test/a.jpg"],
                          "lowest_recorded_price":999,"offers":[{"price":999}]
                        }]}
                        """, MediaType.APPLICATION_JSON));

        var suggestion = provider.lookup("0885909950805").orElseThrow();

        assertEquals("UPCITEMDB", suggestion.fonte());
        assertEquals("0885909950805", suggestion.codigoBarras());
        assertEquals("Produto teste", suggestion.nome());
        assertEquals("Marca X", suggestion.marca());
        assertEquals("Categoria X", suggestion.categoria());
        assertEquals("Descrição externa", suggestion.descricao());
        assertEquals("Modelo 10", suggestion.aplicacao());
        server.verify();
    }

    @Test
    void preservesLeadingZeros() {
        server.expect(requestTo("https://provider.test/lookup?upc=00123456"))
                .andRespond(withSuccess("{\"code\":\"OK\",\"total\":1,\"items\":[{\"title\":\"Item\"}]}", MediaType.APPLICATION_JSON));
        assertEquals("00123456", provider.lookup("00123456").orElseThrow().codigoBarras());
    }

    @Test
    void acceptsMissingOptionalBrandAndDescription() {
        server.expect(requestTo("https://provider.test/lookup?upc=7891234567895"))
                .andRespond(withSuccess("{\"code\":\"OK\",\"total\":1,\"items\":[{\"title\":\"Item\"}]}", MediaType.APPLICATION_JSON));
        var suggestion = provider.lookup("7891234567895").orElseThrow();
        assertNull(suggestion.marca());
        assertNull(suggestion.descricao());
    }

    @Test
    void emptyItemsMeansNotFound() {
        server.expect(requestTo("https://provider.test/lookup?upc=7891234567895"))
                .andRespond(withSuccess("{\"code\":\"OK\",\"total\":0,\"items\":[]}", MediaType.APPLICATION_JSON));
        assertTrue(provider.lookup("7891234567895").isEmpty());
    }

    @Test
    void reportedLeadingZeroGtinNotFoundDoesNotBecomeServerError() {
        server.expect(requestTo("https://provider.test/lookup?upc=000000736473"))
                .andRespond(withSuccess("{\"code\":\"OK\",\"total\":0,\"offset\":0,\"items\":[]}", MediaType.APPLICATION_JSON));

        assertTrue(provider.lookup("000000736473").isEmpty());
        server.verify();
    }

    @Test
    void nullItemInSuccessfulResponseIsTreatedAsNotFound() {
        server.expect(requestTo("https://provider.test/lookup?upc=000000736473"))
                .andRespond(withSuccess("{\"code\":\"OK\",\"total\":1,\"items\":[null]}", MediaType.APPLICATION_JSON));

        assertTrue(provider.lookup("000000736473").isEmpty());
    }

    @Test
    void notFoundAndBadRequestMeanNoSuggestion() {
        server.expect(requestTo("https://provider.test/lookup?upc=7891234567895"))
                .andRespond(withStatus(org.springframework.http.HttpStatus.NOT_FOUND));
        server.expect(requestTo("https://provider.test/lookup?upc=7891234567895")).andRespond(withBadRequest());

        assertTrue(provider.lookup("7891234567895").isEmpty());
        assertTrue(provider.lookup("7891234567895").isEmpty());
    }

    @Test
    void rateLimitMeansTemporarilyUnavailableWithoutRetry() {
        server.expect(once(), requestTo("https://provider.test/lookup?upc=7891234567895"))
                .andRespond(withStatus(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS));
        assertThrows(ProductLookupProviderUnavailableException.class, () -> provider.lookup("7891234567895"));
        server.verify();
    }

    @Test
    void otherClientErrorMeansTemporarilyUnavailable() {
        server.expect(requestTo("https://provider.test/lookup?upc=7891234567895"))
                .andRespond(withStatus(org.springframework.http.HttpStatus.FORBIDDEN));
        assertThrows(ProductLookupProviderUnavailableException.class, () -> provider.lookup("7891234567895"));
    }

    @Test
    void serverErrorMeansTemporarilyUnavailable() {
        server.expect(requestTo("https://provider.test/lookup?upc=7891234567895")).andRespond(withServerError());
        assertThrows(ProductLookupProviderUnavailableException.class, () -> provider.lookup("7891234567895"));
    }

    @Test
    void invalidJsonMeansTemporarilyUnavailable() {
        server.expect(requestTo("https://provider.test/lookup?upc=7891234567895"))
                .andRespond(withSuccess("not-json", MediaType.APPLICATION_JSON));
        assertThrows(ProductLookupProviderUnavailableException.class, () -> provider.lookup("7891234567895"));
    }

    @Test
    void connectionFailureMeansTemporarilyUnavailable() {
        var disconnected = new UpcItemDbProductLookupProvider(RestClient.builder().baseUrl("http://127.0.0.1:1").build());
        assertThrows(ProductLookupProviderUnavailableException.class, () -> disconnected.lookup("7891234567895"));
    }

    @Test
    void timeoutMeansTemporarilyUnavailable() {
        RestClient timedOutClient = RestClient.builder()
                .baseUrl("https://provider.test")
                .requestFactory((uri, method) -> {
                    throw new SocketTimeoutException("timeout controlado");
                })
                .build();
        var timedOutProvider = new UpcItemDbProductLookupProvider(timedOutClient);
        assertThrows(ProductLookupProviderUnavailableException.class,
                () -> timedOutProvider.lookup("7891234567895"));
    }

    @Test
    void rejectsInternalReferencesWithoutHttpCall() {
        assertFalse(provider.supports("PF-001"));
        assertFalse(provider.supports("REF123"));
        assertTrue(provider.lookup("PF-001").isEmpty());
        server.verify();
    }

    @Test
    void acceptsNumericBarcodeLengthsWithoutCheckDigitOverRestriction() {
        assertTrue(provider.supports("00123456"));
        assertTrue(provider.supports("123456789012"));
        assertTrue(provider.supports("1234567890123"));
        assertTrue(provider.supports("12345678901234"));
        assertFalse(provider.supports("1234567"));
        assertFalse(provider.supports("123456789012345"));
    }
}
