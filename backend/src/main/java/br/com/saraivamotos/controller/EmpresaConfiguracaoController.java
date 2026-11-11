package br.com.saraivamotos.controller;

import br.com.saraivamotos.dto.EmpresaConfiguracaoRequest;
import br.com.saraivamotos.dto.EmpresaConfiguracaoResponse;
import br.com.saraivamotos.service.EmpresaConfiguracaoService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/configuracoes/empresa")
public class EmpresaConfiguracaoController {
    private final EmpresaConfiguracaoService service;

    public EmpresaConfiguracaoController(EmpresaConfiguracaoService service) {
        this.service = service;
    }

    @GetMapping
    public EmpresaConfiguracaoResponse buscar() {
        return service.buscar();
    }

    @PutMapping
    public EmpresaConfiguracaoResponse atualizar(@Valid @RequestBody EmpresaConfiguracaoRequest request) {
        return service.atualizar(request);
    }
}
