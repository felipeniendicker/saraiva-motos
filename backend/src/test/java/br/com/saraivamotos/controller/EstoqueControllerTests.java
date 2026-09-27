package br.com.saraivamotos.controller;

import java.time.LocalDateTime;
import java.util.List;

import br.com.saraivamotos.domain.TipoMovimentacaoEstoque;
import br.com.saraivamotos.dto.MovimentacaoEstoqueResponse;
import br.com.saraivamotos.exception.GlobalExceptionHandler;
import br.com.saraivamotos.exception.OperacaoEstoqueInvalidaException;
import br.com.saraivamotos.exception.ProdutoNaoEncontradoException;
import br.com.saraivamotos.service.EstoqueService;

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
class EstoqueControllerTests {

    @Mock
    private EstoqueService service;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new EstoqueController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void entradaValidaRetornaCreated() throws Exception {
        when(service.entrada(any())).thenReturn(response(TipoMovimentacaoEstoque.ENTRADA, 8));

        mockMvc.perform(post("/api/estoque/entrada")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"produtoId\":1,\"quantidade\":3,\"observacao\":\"Compra\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipo").value("ENTRADA"))
                .andExpect(jsonPath("$.saldoPosterior").value(8));
    }

    @Test
    void entradaZeroRetornaBadRequest() throws Exception {
        mockMvc.perform(post("/api/estoque/entrada")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"produtoId\":1,\"quantidade\":0}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void entradaSemProdutoRetornaBadRequest() throws Exception {
        mockMvc.perform(post("/api/estoque/entrada")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantidade\":2}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void ajusteValidoRetornaCreated() throws Exception {
        when(service.ajustar(any())).thenReturn(response(TipoMovimentacaoEstoque.AJUSTE_SAIDA, 2));

        mockMvc.perform(post("/api/estoque/ajuste")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"produtoId\":1,\"novoSaldo\":2,\"motivo\":\"Contagem\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipo").value("AJUSTE_SAIDA"));
    }

    @Test
    void ajusteNegativoRetornaBadRequest() throws Exception {
        mockMvc.perform(post("/api/estoque/ajuste")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"produtoId\":1,\"novoSaldo\":-1,\"motivo\":\"Contagem\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void ajusteSemMotivoRetornaBadRequest() throws Exception {
        mockMvc.perform(post("/api/estoque/ajuste")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"produtoId\":1,\"novoSaldo\":2,\"motivo\":\" \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void produtoInexistenteRetornaNotFound() throws Exception {
        when(service.entrada(any())).thenThrow(new ProdutoNaoEncontradoException("Produto não encontrado."));

        mockMvc.perform(post("/api/estoque/entrada")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"produtoId\":99,\"quantidade\":1}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void operacaoInvalidaRetornaConflict() throws Exception {
        when(service.ajustar(any())).thenThrow(new OperacaoEstoqueInvalidaException("Sem alteração."));

        mockMvc.perform(post("/api/estoque/ajuste")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"produtoId\":1,\"novoSaldo\":5,\"motivo\":\"Contagem\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void listaHistoricoGeralEFiltrado() throws Exception {
        when(service.listarMovimentacoes(null)).thenReturn(List.of(response(TipoMovimentacaoEstoque.ENTRADA, 8)));
        when(service.listarMovimentacoes(1L)).thenReturn(List.of(response(TipoMovimentacaoEstoque.ENTRADA, 8)));

        mockMvc.perform(get("/api/estoque/movimentacoes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].produtoNome").value("Pastilha de freio"));
        mockMvc.perform(get("/api/estoque/movimentacoes?produtoId=1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].produtoId").value(1));
    }

    private MovimentacaoEstoqueResponse response(TipoMovimentacaoEstoque tipo, int saldoPosterior) {
        return new MovimentacaoEstoqueResponse(10L, 1L, "Pastilha de freio", tipo, 3, 5,
                saldoPosterior, LocalDateTime.of(2026, 9, 27, 10, 0), "Teste", null);
    }
}
