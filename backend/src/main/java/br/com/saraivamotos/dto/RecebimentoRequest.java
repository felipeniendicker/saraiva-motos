package br.com.saraivamotos.dto;import java.math.BigDecimal;import br.com.saraivamotos.domain.FormaPagamento;import jakarta.validation.constraints.*;
public record RecebimentoRequest(@NotNull @DecimalMin("0.01") BigDecimal valor,@NotNull FormaPagamento formaPagamento){}
