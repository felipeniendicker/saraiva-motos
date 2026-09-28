package br.com.saraivamotos.dto;

import jakarta.validation.constraints.NotBlank;

public record CancelamentoVendaRequest(@NotBlank String motivo) {
}
