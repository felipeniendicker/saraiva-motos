package br.com.saraivamotos.controller;
import java.util.List;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.security.AuthenticatedUser;
import br.com.saraivamotos.service.CaixaService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/caixas")
public class CaixaController {
    private final CaixaService service; public CaixaController(CaixaService service){this.service=service;}
    @GetMapping("/atual") public ResponseEntity<CaixaResponse> atual(){CaixaResponse c=service.atual();return c==null?ResponseEntity.noContent().build():ResponseEntity.ok(c);}
    @GetMapping public List<CaixaResponse> historico(){return service.historico();}
    @PostMapping public ResponseEntity<CaixaResponse> abrir(@Valid @RequestBody AberturaCaixaRequest r,@AuthenticationPrincipal AuthenticatedUser u){return ResponseEntity.status(201).body(service.abrir(r,u));}
    @PostMapping("/{id}/movimentacoes") public CaixaMovimentacaoResponse movimentar(@PathVariable Long id,@RequestHeader("Idempotency-Key") String key,@Valid @RequestBody MovimentacaoCaixaRequest r,@AuthenticationPrincipal AuthenticatedUser u){CaixaResponse atual=service.atual();if(atual==null||!atual.id().equals(id))throw new br.com.saraivamotos.exception.OperacaoCaixaInvalidaException("Caixa aberto nao corresponde ao informado.");return service.movimentar(key,r,u);}
    @PostMapping("/{id}/fechar") public CaixaResponse fechar(@PathVariable Long id,@Valid @RequestBody FechamentoCaixaRequest r,@AuthenticationPrincipal AuthenticatedUser u){return service.fechar(id,r,u);}
}
