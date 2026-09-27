package br.com.saraivamotos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record AjusteEstoqueRequest(
        @NotNull(message = "é obrigatório")
        Long produtoId,

        @NotNull(message = "é obrigatório")
        @PositiveOrZero(message = "não pode ser negativo")
        Integer novoSaldo,

        @NotBlank(message = "é obrigatório")
        @Size(max = 255, message = "deve ter no máximo 255 caracteres")
        String motivo) {
}
