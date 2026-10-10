package br.com.saraivamotos.controller;
import br.com.saraivamotos.dto.*;import br.com.saraivamotos.security.AuthenticatedUser;import br.com.saraivamotos.service.LeitorRemotoService;import jakarta.validation.Valid;import org.springframework.http.*;import org.springframework.security.core.annotation.AuthenticationPrincipal;import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/leitor")
public class LeitorRemotoController {private final LeitorRemotoService service;public LeitorRemotoController(LeitorRemotoService s){service=s;}
 @PostMapping("/sessoes") public LeitorPareamentoResponse criar(@AuthenticationPrincipal AuthenticatedUser u){return service.criar(u);}
 @GetMapping("/sessoes/{id}/leituras/proxima") public ResponseEntity<LeitorLeituraResponse> consumir(@PathVariable String id,@AuthenticationPrincipal AuthenticatedUser u){LeitorLeituraResponse r=service.consumir(id,u);return r==null?ResponseEntity.noContent().build():ResponseEntity.ok(r);}
 @DeleteMapping("/sessoes/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void encerrar(@PathVariable String id,@AuthenticationPrincipal AuthenticatedUser u){service.encerrar(id,u);}
 @GetMapping("/remoto/{token}") public LeitorStatusResponse status(@PathVariable String token){return service.status(token);}
 @PostMapping("/remoto/{token}/leituras") public LeitorLeituraResponse enviar(@PathVariable String token,@Valid @RequestBody LeitorEnvioRequest r){return service.enviar(token,r);}
}
