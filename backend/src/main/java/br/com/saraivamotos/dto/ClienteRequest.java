package br.com.saraivamotos.dto;

import br.com.saraivamotos.domain.TipoCliente;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ClienteRequest(
        @NotBlank @Size(max = 180) String nomeRazaoSocial,
        @Size(max = 30) String telefone,
        @Size(max = 20) String cpfCnpj,
        @NotNull TipoCliente tipoCliente,
        @Size(max = 255) String endereco,
        String observacoes) {}
