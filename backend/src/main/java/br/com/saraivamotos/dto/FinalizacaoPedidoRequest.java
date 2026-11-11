package br.com.saraivamotos.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import br.com.saraivamotos.domain.CondicaoPagamento;
import br.com.saraivamotos.domain.FormaPagamento;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FinalizacaoPedidoRequest(
        @NotNull FormaPagamento formaPagamento,
        CondicaoPagamento condicaoPagamento,
        LocalDate vencimento,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal pagamentoInicial,
        FormaPagamento formaPagamentoInicial,
        @Size(max = 65535) String observacoes) {
}
