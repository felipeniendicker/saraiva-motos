package br.com.saraivamotos.dto;
import java.math.BigDecimal;
import jakarta.validation.constraints.*;
public record AberturaCaixaRequest(@NotNull @DecimalMin("0.00") BigDecimal valorInicial) {}
