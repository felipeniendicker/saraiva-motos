package br.com.saraivamotos.dto;

import java.time.LocalDateTime;

import br.com.saraivamotos.domain.EmpresaConfiguracao;

public record EmpresaConfiguracaoResponse(
        String nomeFantasia,
        String razaoSocial,
        String cnpj,
        String telefone,
        String endereco,
        String email,
        LocalDateTime atualizadoEm) {

    public static EmpresaConfiguracaoResponse from(EmpresaConfiguracao configuration) {
        return new EmpresaConfiguracaoResponse(
                configuration.getNomeFantasia(),
                configuration.getRazaoSocial(),
                configuration.getCnpj(),
                configuration.getTelefone(),
                configuration.getEndereco(),
                configuration.getEmail(),
                configuration.getAtualizadoEm());
    }
}
