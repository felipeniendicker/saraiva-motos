package br.com.saraivamotos.dto;

import java.math.BigDecimal;

import br.com.saraivamotos.domain.TipoItem;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ItemVendaRequest(
        TipoItem tipoItem,
        Long produtoId,
        String descricao,
        @NotNull @Positive Integer quantidade,
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal precoUnitario,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal precoOriginal,
        Boolean precoAlteradoManualmente) {

    public ItemVendaRequest(Long produtoId, Integer quantidade, BigDecimal precoUnitario) {
        this(TipoItem.PRODUTO, produtoId, null, quantidade, precoUnitario, precoUnitario, true);
    }

    public ItemVendaRequest(Long produtoId, Integer quantidade, BigDecimal precoUnitario,
            BigDecimal precoOriginal, Boolean precoAlteradoManualmente) {
        this(TipoItem.PRODUTO, produtoId, null, quantidade, precoUnitario, precoOriginal, precoAlteradoManualmente);
    }
}
