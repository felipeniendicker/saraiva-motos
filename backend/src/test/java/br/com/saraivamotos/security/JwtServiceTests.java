package br.com.saraivamotos.security;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import br.com.saraivamotos.domain.Usuario;
import io.jsonwebtoken.ExpiredJwtException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtServiceTests {

    private static final String SECRET = "test-secret-with-at-least-thirty-two-bytes";

    @Test
    void validTokenIdentifiesUser() {
        JwtService service = new JwtService(SECRET, 60000, Clock.fixed(Instant.parse("2026-09-28T12:00:00Z"), ZoneOffset.UTC));
        Usuario usuario = user(12L);
        assertEquals(12L, service.extractUserId(service.generateToken(usuario)));
    }

    @Test
    void expiredTokenIsRejected() {
        JwtService issuer = new JwtService(SECRET, 1000, Clock.fixed(Instant.parse("2026-09-28T12:00:00Z"), ZoneOffset.UTC));
        String token = issuer.generateToken(user(12L));
        JwtService verifier = new JwtService(SECRET, 1000, Clock.fixed(Instant.parse("2026-09-28T12:01:00Z"), ZoneOffset.UTC));
        assertThrows(ExpiredJwtException.class, () -> verifier.extractUserId(token));
    }

    private Usuario user(Long id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        return usuario;
    }
}
