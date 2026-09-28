package br.com.saraivamotos.controller;

import br.com.saraivamotos.dto.MotoRequest;
import br.com.saraivamotos.dto.MotoResponse;
import br.com.saraivamotos.service.MotoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/motos")
public class MotoController {
    private final MotoService service;
    public MotoController(MotoService service) { this.service = service; }
    @PutMapping("/{id}") public MotoResponse atualizar(@PathVariable Long id, @Valid @RequestBody MotoRequest request) { return service.atualizar(id, request); }
    @DeleteMapping("/{id}") public ResponseEntity<Void> remover(@PathVariable Long id) { service.remover(id); return ResponseEntity.noContent().build(); }
}
