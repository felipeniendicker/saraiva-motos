package br.com.saraivamotos.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record EntradaEstoqueRequest(
        @NotNull(message = "é obrigatório")
        Long produtoId,

        @NotNull(message = "é obrigatória")
        @Positive(message = "deve ser maior que zero")
        Integer quantidade,

        @Size(max = 255, message = "deve ter no máximo 255 caracteres")
        String observacao) {
}
