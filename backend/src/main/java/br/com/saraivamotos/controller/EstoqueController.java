package br.com.saraivamotos.controller;

import java.util.List;

import br.com.saraivamotos.dto.AjusteEstoqueRequest;
import br.com.saraivamotos.dto.EntradaEstoqueRequest;
import br.com.saraivamotos.dto.MovimentacaoEstoqueResponse;
import br.com.saraivamotos.dto.SaidaEstoqueRequest;
import br.com.saraivamotos.service.EstoqueService;
import br.com.saraivamotos.service.OperacaoIdempotenteService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/estoque")
public class EstoqueController {

    private final EstoqueService service;
    private final OperacaoIdempotenteService operacoes;

    public EstoqueController(EstoqueService service, OperacaoIdempotenteService operacoes) {
        this.service = service;
        this.operacoes = operacoes;
    }

    @PostMapping("/entrada")
    public ResponseEntity<MovimentacaoEstoqueResponse> entrada(
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody EntradaEstoqueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(operacoes.entrada(idempotencyKey, request));
    }

    @PostMapping("/ajuste")
    public ResponseEntity<MovimentacaoEstoqueResponse> ajuste(
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody AjusteEstoqueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(operacoes.ajuste(idempotencyKey, request));
    }

    @PostMapping("/saida")
    public ResponseEntity<MovimentacaoEstoqueResponse> saida(
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody SaidaEstoqueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(operacoes.saida(idempotencyKey, request));
    }

    @GetMapping("/movimentacoes")
    public List<MovimentacaoEstoqueResponse> listarMovimentacoes(
            @RequestParam(required = false) Long produtoId) {
        return service.listarMovimentacoes(produtoId);
    }
}
