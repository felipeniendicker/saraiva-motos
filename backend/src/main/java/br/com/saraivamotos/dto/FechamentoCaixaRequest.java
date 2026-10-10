package br.com.saraivamotos.dto;
import java.math.BigDecimal;
import jakarta.validation.constraints.*;
public record FechamentoCaixaRequest(@NotNull @DecimalMin("0.00") BigDecimal valorContado) {}
