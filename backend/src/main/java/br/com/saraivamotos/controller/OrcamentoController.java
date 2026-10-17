package br.com.saraivamotos.controller;

import java.util.List;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.security.AuthenticatedUser;
import br.com.saraivamotos.service.OrcamentoService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/orcamentos")
public class OrcamentoController {
    private final OrcamentoService service;public OrcamentoController(OrcamentoService service){this.service=service;}
    @GetMapping public List<OrcamentoResponse> listar(){return service.listar();}
    @GetMapping("/{id}") public OrcamentoResponse buscar(@PathVariable Long id){return service.buscar(id);}
    @PostMapping public ResponseEntity<OrcamentoResponse> criar(@Valid @RequestBody OrcamentoRequest request,@AuthenticationPrincipal AuthenticatedUser user){return ResponseEntity.status(201).body(service.criar(request,user));}
    @PutMapping("/{id}") public OrcamentoResponse atualizar(@PathVariable Long id,@Valid @RequestBody OrcamentoRequest request){return service.atualizar(id,request);}
    @PostMapping("/{id}/cancelar") public OrcamentoResponse cancelar(@PathVariable Long id,@Valid @RequestBody CancelamentoOrcamentoRequest request){return service.cancelar(id,request);}
    @PostMapping("/{id}/converter") public VendaResponse converter(@PathVariable Long id,@RequestHeader("Idempotency-Key") String key,@Valid @RequestBody ConversaoOrcamentoRequest request,@AuthenticationPrincipal AuthenticatedUser user){return service.converter(id,key,request,user);}
}
