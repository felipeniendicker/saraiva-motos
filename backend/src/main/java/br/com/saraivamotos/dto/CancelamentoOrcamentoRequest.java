package br.com.saraivamotos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelamentoOrcamentoRequest(@NotBlank @Size(max=1000) String motivo) {}
