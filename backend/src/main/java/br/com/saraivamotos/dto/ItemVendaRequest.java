package br.com.saraivamotos.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ItemVendaRequest(
        @NotNull Long produtoId,
        @NotNull @Positive Integer quantidade,
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal precoUnitario) {
}
