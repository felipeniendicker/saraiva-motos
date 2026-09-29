package br.com.saraivamotos.controller;

import java.util.List;

import br.com.saraivamotos.dto.ProdutoRequest;
import br.com.saraivamotos.dto.ProdutoResponse;
import br.com.saraivamotos.dto.ProdutoLookupResponse;
import br.com.saraivamotos.service.ProductLookupService;
import br.com.saraivamotos.service.ProdutoService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/produtos")
public class ProdutoController {

    private final ProdutoService service;
    private final ProductLookupService lookupService;

    public ProdutoController(ProdutoService service, ProductLookupService lookupService) {
        this.service = service;
        this.lookupService = lookupService;
    }

    @PostMapping
    public ResponseEntity<ProdutoResponse> criar(@Valid @RequestBody ProdutoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(request));
    }

    @GetMapping
    public List<ProdutoResponse> listar(
            @RequestParam(required = false) String busca,
            @RequestParam(defaultValue = "false") boolean incluirInativos) {
        return service.listar(busca, incluirInativos);
    }

    @GetMapping("/{id}")
    public ProdutoResponse buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    @GetMapping("/codigo/{codigo}")
    public ProdutoResponse buscarPorCodigo(@PathVariable String codigo) {
        return service.buscarPorCodigo(codigo);
    }

    @GetMapping("/lookup/{codigo}")
    public ProdutoLookupResponse lookup(@PathVariable String codigo) {
        return lookupService.lookup(codigo);
    }

    @PutMapping("/{id}")
    public ProdutoResponse atualizar(
            @PathVariable Long id,
            @Valid @RequestBody ProdutoRequest request) {
        return service.atualizar(id, request);
    }

    @PatchMapping("/{id}/desativar")
    public ProdutoResponse desativar(@PathVariable Long id) {
        return service.desativar(id);
    }

    @PatchMapping("/{id}/reativar")
    public ProdutoResponse reativar(@PathVariable Long id) {
        return service.reativar(id);
    }
}
