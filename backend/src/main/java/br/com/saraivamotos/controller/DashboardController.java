package br.com.saraivamotos.controller;
import br.com.saraivamotos.dto.DashboardResponse;
import br.com.saraivamotos.service.DashboardService;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService service;
    public DashboardController(DashboardService service) { this.service = service; }
    @GetMapping public DashboardResponse consultar() { return service.consultar(); }
}
