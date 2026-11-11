package br.com.saraivamotos.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmpresaConfiguracaoRequest(
        @NotBlank(message = "é obrigatório") @Size(max = 180) String nomeFantasia,
        @NotBlank(message = "é obrigatória") @Size(max = 180) String razaoSocial,
        @Size(max = 20) String cnpj,
        @Size(max = 30) String telefone,
        @Size(max = 500) String endereco,
        @Email(message = "deve ser válido") @Size(max = 254) String email) {
}
