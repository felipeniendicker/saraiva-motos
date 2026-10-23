package br.com.saraivamotos.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ProdutoRequest(
        @NotBlank(message = "é obrigatório")
        @Size(max = 180, message = "deve ter no máximo 180 caracteres")
        String nome,

        @Size(max = 100, message = "deve ter no máximo 100 caracteres")
        String codigoReferencia,

        @Size(max = 32, message = "deve ter no máximo 32 caracteres")
        String codigoBarras,

        @Size(max = 100, message = "deve ter no máximo 100 caracteres")
        String marca,

        @Size(max = 100, message = "deve ter no máximo 100 caracteres")
        String categoria,

        @Size(max = 255, message = "deve ter no máximo 255 caracteres")
        String aplicacao,

        @NotNull(message = "é obrigatório")
        @DecimalMin(value = "0.00", message = "não pode ser negativo")
        BigDecimal valorCusto,

        @NotNull(message = "é obrigatório")
        @DecimalMin(value = "0.00", message = "não pode ser negativo")
        BigDecimal precoVarejo,

        @NotNull(message = "é obrigatório")
        @DecimalMin(value = "0.00", message = "não pode ser negativo")
        BigDecimal precoRevenda,

        @NotNull(message = "é obrigatório")
        @PositiveOrZero(message = "não pode ser negativa")
        @Digits(integer = 10, fraction = 0, message = "deve ser um número inteiro")
        @DecimalMax(value = "2147483647", message = "ultrapassa o limite suportado")
        BigDecimal quantidadeEstoque,

        @NotNull(message = "é obrigatório")
        @PositiveOrZero(message = "não pode ser negativo")
        Integer estoqueMinimo,

        String observacoes) {
}
