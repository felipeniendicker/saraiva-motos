package br.com.saraivamotos.security;

import java.io.IOException;
import java.time.Instant;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.MediaType;

import br.com.saraivamotos.exception.ApiError;

final class SecurityErrorWriter {

    private SecurityErrorWriter() {
    }

    static void write(
            HttpServletResponse response,
            ObjectMapper objectMapper,
            int status,
            String error,
            String message,
            String path) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(), new ApiError(Instant.now(), status, error, message, path));
    }
}
