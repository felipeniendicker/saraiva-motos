package br.com.saraivamotos.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.Optional;

import br.com.saraivamotos.config.SecurityConfig;
import br.com.saraivamotos.domain.Usuario;
import br.com.saraivamotos.dto.EmpresaConfiguracaoResponse;
import br.com.saraivamotos.exception.GlobalExceptionHandler;
import br.com.saraivamotos.repository.UsuarioRepository;
import br.com.saraivamotos.security.JwtAuthenticationFilter;
import br.com.saraivamotos.security.JwtService;
import br.com.saraivamotos.service.EmpresaConfiguracaoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(EmpresaConfiguracaoController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtService.class, GlobalExceptionHandler.class})
@TestPropertySource(properties = {
        "app.jwt.secret=test-secret-with-at-least-thirty-two-bytes",
        "app.jwt.expiration-ms=3600000",
        "app.cors.allowed-origins=http://localhost:5173"
})
class EmpresaConfiguracaoSecurityTests {
    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @MockitoBean private UsuarioRepository usuarioRepository;
    @MockitoBean private EmpresaConfiguracaoService service;

    private Usuario usuario;

    @BeforeEach
    void setUp() {
        usuario = new Usuario();
        usuario.setId(3L);
        usuario.setEmail("operador@saraiva.com");
        usuario.setAtivo(true);
    }

    @Test
    void consultaEAtualizacaoExigemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/configuracoes/empresa")).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/configuracoes/empresa")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nomeFantasia\":\"Saraiva\",\"razaoSocial\":\"Saraiva Ltda\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void operadorAutenticadoPodeConsultarEAtualizar() throws Exception {
        when(usuarioRepository.findById(3L)).thenReturn(Optional.of(usuario));
        when(service.buscar()).thenReturn(new EmpresaConfiguracaoResponse(
                "SARAIVA MOTOS", "SARAIVA MOTO PEÇAS", null, null, null, null, LocalDateTime.now()));
        String authorization = "Bearer " + jwtService.generateToken(usuario);

        mockMvc.perform(get("/api/configuracoes/empresa").header(HttpHeaders.AUTHORIZATION, authorization))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomeFantasia").value("SARAIVA MOTOS"));

        mockMvc.perform(put("/api/configuracoes/empresa")
                        .header(HttpHeaders.AUTHORIZATION, authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nomeFantasia\":\"Saraiva\",\"razaoSocial\":\"Saraiva Ltda\",\"email\":\"invalido\"}"))
                .andExpect(status().isBadRequest());

        when(service.atualizar(any())).thenReturn(new EmpresaConfiguracaoResponse(
                "Saraiva", "Saraiva Ltda", null, null, null, null, LocalDateTime.now()));
        mockMvc.perform(put("/api/configuracoes/empresa")
                        .header(HttpHeaders.AUTHORIZATION, authorization)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nomeFantasia\":\"Saraiva\",\"razaoSocial\":\"Saraiva Ltda\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.razaoSocial").value("Saraiva Ltda"));
    }
}
