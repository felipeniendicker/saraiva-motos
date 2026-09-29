package br.com.saraivamotos.controller;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import br.com.saraivamotos.dto.ProdutoResponse;
import br.com.saraivamotos.exception.CodigoBarrasDuplicadoException;
import br.com.saraivamotos.exception.GlobalExceptionHandler;
import br.com.saraivamotos.exception.ProdutoNaoEncontradoException;
import br.com.saraivamotos.service.ProdutoService;
import br.com.saraivamotos.service.ProductLookupService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ProdutoControllerTests {

    @Mock
    private ProdutoService service;
    @Mock
    private ProductLookupService lookupService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new ProdutoController(service, lookupService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void cadastroValidoRetornaCreated() throws Exception {
        when(service.criar(any())).thenReturn(response());

        mockMvc.perform(post("/api/produtos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.nome").value("Pastilha de freio"));
    }

    @Test
    void nomeObrigatorioRetornaBadRequest() throws Exception {
        assertInvalid(payloadWith("\"nome\":\"Pastilha de freio\"", "\"nome\":\" \""));
    }

    @Test
    void custoNegativoRetornaBadRequest() throws Exception {
        assertInvalid(payloadWith("\"valorCusto\":10.00", "\"valorCusto\":-0.01"));
    }

    @Test
    void varejoNegativoRetornaBadRequest() throws Exception {
        assertInvalid(payloadWith("\"precoVarejo\":25.50", "\"precoVarejo\":-0.01"));
    }

    @Test
    void revendaNegativaRetornaBadRequest() throws Exception {
        assertInvalid(payloadWith("\"precoRevenda\":20.00", "\"precoRevenda\":-0.01"));
    }

    @Test
    void estoqueNegativoRetornaBadRequest() throws Exception {
        assertInvalid(payloadWith("\"quantidadeEstoque\":5", "\"quantidadeEstoque\":-1"));
    }

    @Test
    void estoqueMinimoNegativoRetornaBadRequest() throws Exception {
        assertInvalid(payloadWith("\"estoqueMinimo\":2", "\"estoqueMinimo\":-1"));
    }

    @Test
    void idInexistenteRetornaNotFound() throws Exception {
        when(service.buscarPorId(99L)).thenThrow(new ProdutoNaoEncontradoException("Produto não encontrado."));

        mockMvc.perform(get("/api/produtos/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void codigoDuplicadoRetornaConflict() throws Exception {
        when(service.criar(any())).thenThrow(new CodigoBarrasDuplicadoException());

        mockMvc.perform(post("/api/produtos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void jsonInvalidoRetornaBadRequestSemExporDetalhesInternos() throws Exception {
        mockMvc.perform(post("/api/produtos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Corpo da requisição inválido."));
    }

    private void assertInvalid(String payload) throws Exception {
        mockMvc.perform(post("/api/produtos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    private String payloadWith(String oldValue, String newValue) {
        return validPayload().replace(oldValue, newValue);
    }

    private String validPayload() {
        return """
                {
                  "nome":"Pastilha de freio",
                  "codigoReferencia":"REF-01",
                  "codigoBarras":"00123456",
                  "marca":"Cobreq",
                  "categoria":"Freios",
                  "aplicacao":"Honda CG 160",
                  "valorCusto":10.00,
                  "precoVarejo":25.50,
                  "precoRevenda":20.00,
                  "quantidadeEstoque":5,
                  "estoqueMinimo":2,
                  "observacoes":"Teste"
                }
                """;
    }

    private ProdutoResponse response() {
        return new ProdutoResponse(
                1L,
                "Pastilha de freio",
                "REF-01",
                "00123456",
                "Cobreq",
                "Freios",
                "Honda CG 160",
                new BigDecimal("10.00"),
                new BigDecimal("25.50"),
                new BigDecimal("20.00"),
                5,
                2,
                "Teste",
                true,
                LocalDateTime.of(2026, 9, 27, 9, 0));
    }
}
