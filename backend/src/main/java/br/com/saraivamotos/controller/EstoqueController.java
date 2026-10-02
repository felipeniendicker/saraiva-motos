package br.com.saraivamotos.controller;

import java.util.List;

import br.com.saraivamotos.dto.AjusteEstoqueRequest;
import br.com.saraivamotos.dto.EntradaEstoqueRequest;
import br.com.saraivamotos.dto.MovimentacaoEstoqueResponse;
import br.com.saraivamotos.dto.SaidaEstoqueRequest;
import br.com.saraivamotos.service.EstoqueService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/estoque")
public class EstoqueController {

    private final EstoqueService service;

    public EstoqueController(EstoqueService service) {
        this.service = service;
    }

    @PostMapping("/entrada")
    public ResponseEntity<MovimentacaoEstoqueResponse> entrada(
            @Valid @RequestBody EntradaEstoqueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.entrada(request));
    }

    @PostMapping("/ajuste")
    public ResponseEntity<MovimentacaoEstoqueResponse> ajuste(
            @Valid @RequestBody AjusteEstoqueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.ajustar(request));
    }

    @PostMapping("/saida")
    public ResponseEntity<MovimentacaoEstoqueResponse> saida(
            @Valid @RequestBody SaidaEstoqueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.saida(request));
    }

    @GetMapping("/movimentacoes")
    public List<MovimentacaoEstoqueResponse> listarMovimentacoes(
            @RequestParam(required = false) Long produtoId) {
        return service.listarMovimentacoes(produtoId);
    }
}
