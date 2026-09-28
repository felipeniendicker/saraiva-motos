package br.com.saraivamotos.dto;
import java.time.LocalDate;
import java.util.List;
public record RelatorioVendasResponse(LocalDate dataInicio, LocalDate dataFim, ResumoVendasResponse resumo,
        List<ProdutoVendidoResponse> produtosMaisVendidos, List<VendaResponse> vendas) {}
