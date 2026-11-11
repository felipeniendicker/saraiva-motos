package br.com.saraivamotos.controller;

import br.com.saraivamotos.dto.LeitorEnvioRequest;
import br.com.saraivamotos.dto.LeitorLeituraResponse;
import br.com.saraivamotos.dto.LeitorPareamentoResponse;
import br.com.saraivamotos.dto.LeitorStatusResponse;
import br.com.saraivamotos.security.AuthenticatedUser;
import br.com.saraivamotos.service.LeitorRemotoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leitor")
public class LeitorRemotoController {
    private final LeitorRemotoService service;

    public LeitorRemotoController(LeitorRemotoService service) {
        this.service = service;
    }

    @PostMapping("/sessoes")
    public LeitorPareamentoResponse criar(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestHeader(value = HttpHeaders.ORIGIN, required = false) String frontendOrigin) {
        return service.criar(user, frontendOrigin);
    }

    @GetMapping("/sessoes/{id}/leituras/proxima")
    public ResponseEntity<LeitorLeituraResponse> consumir(
            @PathVariable String id,
            @AuthenticationPrincipal AuthenticatedUser user) {
        LeitorLeituraResponse response = service.consumir(id, user);
        return response == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(response);
    }

    @DeleteMapping("/sessoes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void encerrar(@PathVariable String id, @AuthenticationPrincipal AuthenticatedUser user) {
        service.encerrar(id, user);
    }

    @GetMapping("/remoto/{token}")
    public LeitorStatusResponse status(@PathVariable String token) {
        return service.status(token);
    }

    @PostMapping("/remoto/{token}/leituras")
    public LeitorLeituraResponse enviar(
            @PathVariable String token,
            @Valid @RequestBody LeitorEnvioRequest request) {
        return service.enviar(token, request);
    }
}
