package br.com.saraivamotos.dto;

import java.math.BigDecimal;
import java.util.List;

import br.com.saraivamotos.domain.FormaPagamento;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record VendaRequest(
        Long clienteId,
        @NotEmpty List<@Valid ItemVendaRequest> itens,
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal desconto,
        @NotNull FormaPagamento formaPagamento,
        @Size(max = 65535) String observacoes) {
}
