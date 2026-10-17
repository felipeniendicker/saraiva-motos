package br.com.saraivamotos.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import br.com.saraivamotos.domain.StatusOrcamento;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record OrcamentoRequest(
        Long clienteId,
        @NotEmpty List<@Valid ItemOrcamentoRequest> itens,
        @NotNull @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal descontoPercentual,
        @NotNull @FutureOrPresent LocalDate validade,
        @NotNull StatusOrcamento status,
        @Size(max=65535) String observacoes,
        Long versao) {}
