package br.com.saraivamotos.controller;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import br.com.saraivamotos.config.SecurityConfig;
import br.com.saraivamotos.domain.Usuario;
import br.com.saraivamotos.dto.LoginResponse;
import br.com.saraivamotos.dto.UsuarioResponse;
import br.com.saraivamotos.exception.CredenciaisInvalidasException;
import br.com.saraivamotos.exception.GlobalExceptionHandler;
import br.com.saraivamotos.repository.UsuarioRepository;
import br.com.saraivamotos.security.JwtAuthenticationFilter;
import br.com.saraivamotos.security.JwtService;
import br.com.saraivamotos.service.AuthService;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {AuthController.class, HealthController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtService.class, GlobalExceptionHandler.class})
@TestPropertySource(properties = {
        "app.jwt.secret=test-secret-with-at-least-thirty-two-bytes",
        "app.jwt.expiration-ms=3600000",
        "app.cors.allowed-origins=http://localhost:5173,http://localhost:5174"
})
class AuthSecurityTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @MockitoBean private UsuarioRepository usuarioRepository;
    @MockitoBean private AuthService authService;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        usuario = new Usuario();
        usuario.setId(3L);
        usuario.setEmail("operador@saraiva.com");
        usuario.setAtivo(true);
    }

    @Test
    void loginIsPublicAndReturnsJwtWithoutPasswordData() throws Exception {
        when(authService.login(any())).thenReturn(new LoginResponse("jwt-token", new UsuarioResponse(3L, usuario.getEmail())));
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"operador@saraiva.com\",\"senha\":\"segredo\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token"))
                .andExpect(jsonPath("$.usuario.email").value(usuario.getEmail()))
                .andExpect(jsonPath("$.usuario.senha").doesNotExist())
                .andExpect(jsonPath("$.usuario.senhaHash").doesNotExist());
    }

    @Test
    void invalidCredentialsReturnEquivalentUnauthorizedResponse() throws Exception {
        when(authService.login(any())).thenThrow(new CredenciaisInvalidasException());
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ausente@saraiva.com\",\"senha\":\"errada\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Email ou senha inválidos."));
    }

    @Test
    void protectedEndpointWithoutTokenReturnsApiError401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void invalidTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer token-invalido"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validTokenReturnsCurrentUser() throws Exception {
        when(usuarioRepository.findById(3L)).thenReturn(Optional.of(usuario));
        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken(usuario)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.email").value(usuario.getEmail()))
                .andExpect(jsonPath("$.senhaHash").doesNotExist());
    }

    @Test
    void healthRemainsPublic() throws Exception {
        mockMvc.perform(get("/api/health")).andExpect(status().isOk());
    }

    @Test
    void corsPreflightAllowsBothDevelopmentOriginsAndAuthorizationHeader() throws Exception {
        for (String origin : new String[] {"http://localhost:5173", "http://localhost:5174"}) {
            mockMvc.perform(options("/api/auth/me")
                            .header(HttpHeaders.ORIGIN, origin)
                            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.GET.name())
                            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, HttpHeaders.AUTHORIZATION))
                    .andExpect(status().isOk())
                    .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin))
                    .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, containsString("Authorization")))
                    .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, not("*")));
        }
    }
}
