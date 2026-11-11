package br.com.saraivamotos.controller;

import java.util.List;

import br.com.saraivamotos.domain.StatusPedido;
import br.com.saraivamotos.dto.AlteracaoStatusPedidoRequest;
import br.com.saraivamotos.dto.CancelamentoPedidoRequest;
import br.com.saraivamotos.dto.FinalizacaoPedidoRequest;
import br.com.saraivamotos.dto.PedidoResponse;
import br.com.saraivamotos.dto.VendaResponse;
import br.com.saraivamotos.security.AuthenticatedUser;
import br.com.saraivamotos.service.PedidoService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {
    private final PedidoService service;

    public PedidoController(PedidoService service) {
        this.service = service;
    }

    @GetMapping
    public List<PedidoResponse> listar(@RequestParam(required = false) String busca,
            @RequestParam(required = false) StatusPedido status) {
        return service.listar(busca, status);
    }

    @GetMapping("/{id}")
    public PedidoResponse buscar(@PathVariable Long id) {
        return service.buscar(id);
    }

    @PutMapping("/{id}/status")
    public PedidoResponse alterarStatus(@PathVariable Long id,
            @Valid @RequestBody AlteracaoStatusPedidoRequest request,
            @AuthenticationPrincipal AuthenticatedUser operador) {
        return service.alterarStatus(id, request, operador);
    }

    @PostMapping("/{id}/cancelar")
    public PedidoResponse cancelar(@PathVariable Long id,
            @Valid @RequestBody CancelamentoPedidoRequest request,
            @AuthenticationPrincipal AuthenticatedUser operador) {
        return service.cancelar(id, request, operador);
    }

    @PostMapping("/{id}/finalizar")
    public VendaResponse finalizar(@PathVariable Long id,
            @RequestHeader("Idempotency-Key") String chave,
            @Valid @RequestBody FinalizacaoPedidoRequest request,
            @AuthenticationPrincipal AuthenticatedUser operador) {
        return service.finalizar(id, chave, request, operador);
    }
}
