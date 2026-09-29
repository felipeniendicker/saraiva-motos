package br.com.saraivamotos.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import br.com.saraivamotos.domain.Usuario;
import br.com.saraivamotos.dto.LoginRequest;
import br.com.saraivamotos.exception.CredenciaisInvalidasException;
import br.com.saraivamotos.repository.UsuarioRepository;
import br.com.saraivamotos.security.JwtService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTests {

    private static final String SECRET = "test-secret-with-at-least-thirty-two-bytes";
    @Mock private UsuarioRepository repository;
    private BCryptPasswordEncoder encoder;
    private AuthService service;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        encoder = new BCryptPasswordEncoder();
        JwtService jwtService = new JwtService(SECRET, 3600000);
        service = new AuthService(repository, encoder, jwtService);
        usuario = new Usuario();
        usuario.setId(7L);
        usuario.setEmail("operador@saraiva.com");
        usuario.setSenhaHash(encoder.encode("senha-correta"));
        usuario.setAtivo(true);
        usuario.setDataCadastro(LocalDateTime.now());
    }

    @Test
    void logsInWithNormalizedEmailAndReturnsMinimalUser() {
        when(repository.findByEmail("operador@saraiva.com")).thenReturn(Optional.of(usuario));
        var response = service.login(new LoginRequest(" Operador@SARAIVA.com ", "senha-correta"));
        assertFalse(response.token().isBlank());
        assertEquals(7L, response.usuario().id());
        assertEquals("operador@saraiva.com", response.usuario().email());
    }

    @Test
    void rejectsWrongPassword() {
        when(repository.findByEmail("operador@saraiva.com")).thenReturn(Optional.of(usuario));
        assertThrows(CredenciaisInvalidasException.class,
                () -> service.login(new LoginRequest("operador@saraiva.com", "errada")));
    }

    @Test
    void rejectsUnknownEmail() {
        when(repository.findByEmail("ausente@saraiva.com")).thenReturn(Optional.empty());
        assertThrows(CredenciaisInvalidasException.class,
                () -> service.login(new LoginRequest("ausente@saraiva.com", "qualquer")));
    }

    @Test
    void rejectsInactiveUser() {
        usuario.setAtivo(false);
        when(repository.findByEmail("operador@saraiva.com")).thenReturn(Optional.of(usuario));
        assertThrows(CredenciaisInvalidasException.class,
                () -> service.login(new LoginRequest("operador@saraiva.com", "senha-correta")));
    }
}
