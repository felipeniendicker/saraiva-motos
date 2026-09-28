package br.com.saraivamotos.dto;
import java.math.BigDecimal;
public record ResumoVendasResponse(long quantidadeVendas, BigDecimal faturamento, BigDecimal ticketMedio,
        BigDecimal descontosConcedidos, long itensVendidos) {}
