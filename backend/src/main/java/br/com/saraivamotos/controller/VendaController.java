package br.com.saraivamotos.controller;

import java.time.LocalDate;
import java.util.List;

import br.com.saraivamotos.domain.StatusVenda;
import br.com.saraivamotos.dto.CancelamentoVendaRequest;
import br.com.saraivamotos.dto.VendaRequest;
import br.com.saraivamotos.dto.VendaResponse;
import br.com.saraivamotos.service.OperacaoIdempotenteService;
import br.com.saraivamotos.service.VendaService;
import br.com.saraivamotos.service.VendaCancelamentoService;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/vendas")
public class VendaController {
    private final VendaService service;
    private final OperacaoIdempotenteService operacoes;
    private final VendaCancelamentoService cancelamentos;
    public VendaController(VendaService service, OperacaoIdempotenteService operacoes, VendaCancelamentoService cancelamentos) {
        this.service = service;
        this.operacoes = operacoes;
        this.cancelamentos = cancelamentos;
    }

    @PostMapping
    public ResponseEntity<VendaResponse> criar(
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody VendaRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(operacoes.venda(idempotencyKey, request, user));
    }

    @GetMapping
    public List<VendaResponse> listar(@RequestParam(required = false) String numero,
            @RequestParam(required = false) StatusVenda status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicial,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFinal,
            @RequestParam(required = false) Long clienteId) {
        return service.listar(numero, status, dataInicial, dataFinal, clienteId);
    }

    @GetMapping("/{id}")
    public VendaResponse buscar(@PathVariable Long id) { return service.buscarPorId(id); }

    @PostMapping("/{id}/cancelar")
    public VendaResponse cancelar(@PathVariable Long id, @Valid @RequestBody CancelamentoVendaRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return cancelamentos.cancelar(id, request, user);
    }
}
