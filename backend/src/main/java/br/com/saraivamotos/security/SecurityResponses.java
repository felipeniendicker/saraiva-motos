package br.com.saraivamotos.security;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

public final class SecurityResponses {

    private SecurityResponses() {
    }

    public static AuthenticationEntryPoint unauthorized(ObjectMapper objectMapper) {
        return (request, response, exception) -> SecurityErrorWriter.write(
                response, objectMapper, 401, "Unauthorized", "Autenticação necessária.", request.getRequestURI());
    }

    public static AccessDeniedHandler forbidden(ObjectMapper objectMapper) {
        return (request, response, exception) -> SecurityErrorWriter.write(
                response, objectMapper, 403, "Forbidden", "Acesso negado.", request.getRequestURI());
    }
}
