package br.com.saraivamotos.dto;

import java.math.BigDecimal;
import br.com.saraivamotos.domain.TipoItem;
import jakarta.validation.constraints.*;

public record ItemOrcamentoRequest(
        @NotNull TipoItem tipoItem,
        Long produtoId,
        @Size(max=180) String descricao,
        @NotNull @Positive Integer quantidade,
        @NotNull @DecimalMin("0.00") BigDecimal precoUnitario,
        @DecimalMin("0.00") BigDecimal precoOriginal,
        Boolean precoAlteradoManualmente) {}
