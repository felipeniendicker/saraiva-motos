package br.com.saraivamotos.controller;
import java.time.LocalDate;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.service.RelatorioService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/relatorios")
public class RelatorioController {
    private final RelatorioService service;
    public RelatorioController(RelatorioService service) { this.service = service; }
    @GetMapping("/vendas") public RelatorioVendasResponse vendas(
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate dataFim) { return service.vendas(dataInicio, dataFim); }
    @GetMapping("/estoque") public EstoqueRelatorioResponse estoque(@RequestParam(defaultValue="false") boolean incluirInativos) { return service.estoque(incluirInativos); }
}
