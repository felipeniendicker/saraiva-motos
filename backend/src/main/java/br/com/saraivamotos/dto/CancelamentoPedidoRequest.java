package br.com.saraivamotos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelamentoPedidoRequest(@NotBlank @Size(max = 1000) String motivo) {
}
