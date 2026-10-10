package br.com.saraivamotos.dto;
import java.math.BigDecimal;
import br.com.saraivamotos.domain.TipoMovimentacaoCaixa;
import jakarta.validation.constraints.*;
public record MovimentacaoCaixaRequest(
        @NotNull TipoMovimentacaoCaixa tipo,
        @NotNull @DecimalMin(value="0.01") BigDecimal valor,
        @NotBlank @Size(max=255) String descricao) {}
