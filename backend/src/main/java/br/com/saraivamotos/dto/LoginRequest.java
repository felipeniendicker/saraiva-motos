package br.com.saraivamotos.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "é obrigatório") @Email(message = "deve ser válido") String email,
        @NotBlank(message = "é obrigatória") String senha) {
}
