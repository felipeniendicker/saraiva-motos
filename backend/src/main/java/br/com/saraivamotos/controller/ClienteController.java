package br.com.saraivamotos.controller;

import java.util.List;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.service.*;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {
    private final ClienteService clientes;
    private final MotoService motos;
    public ClienteController(ClienteService clientes, MotoService motos) { this.clientes = clientes; this.motos = motos; }
    @PostMapping public ResponseEntity<ClienteResponse> criar(@Valid @RequestBody ClienteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clientes.criar(request));
    }
    @GetMapping public List<ClienteResponse> listar(@RequestParam(required = false) String busca,
            @RequestParam(defaultValue = "false") boolean incluirInativos) { return clientes.listar(busca, incluirInativos); }
    @GetMapping("/{id}") public ClienteResponse buscar(@PathVariable Long id) { return clientes.buscar(id); }
    @PutMapping("/{id}") public ClienteResponse atualizar(@PathVariable Long id, @Valid @RequestBody ClienteRequest request) { return clientes.atualizar(id, request); }
    @PatchMapping("/{id}/desativar") public ClienteResponse desativar(@PathVariable Long id) { return clientes.desativar(id); }
    @PatchMapping("/{id}/reativar") public ClienteResponse reativar(@PathVariable Long id) { return clientes.reativar(id); }
    @PostMapping("/{clienteId}/motos") public ResponseEntity<MotoResponse> criarMoto(@PathVariable Long clienteId, @Valid @RequestBody MotoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(motos.criar(clienteId, request));
    }
    @GetMapping("/{clienteId}/motos") public List<MotoResponse> listarMotos(@PathVariable Long clienteId) { return motos.listar(clienteId); }
}
