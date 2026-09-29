package br.com.saraivamotos.controller;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.saraivamotos.dto.LoginRequest;
import br.com.saraivamotos.dto.LoginResponse;
import br.com.saraivamotos.dto.UsuarioResponse;
import br.com.saraivamotos.security.AuthenticatedUser;
import br.com.saraivamotos.service.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public UsuarioResponse me(@AuthenticationPrincipal AuthenticatedUser user) {
        return new UsuarioResponse(user.id(), user.email());
    }
}
