package br.com.saraivamotos.service;

import java.time.LocalDateTime;

import br.com.saraivamotos.domain.EmpresaConfiguracao;
import br.com.saraivamotos.dto.EmpresaConfiguracaoRequest;
import br.com.saraivamotos.dto.EmpresaConfiguracaoResponse;
import br.com.saraivamotos.repository.EmpresaConfiguracaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmpresaConfiguracaoService {
    private static final long CONFIGURATION_ID = 1L;
    private static final String DEFAULT_TRADE_NAME = "SARAIVA MOTOS";
    private static final String DEFAULT_LEGAL_NAME = "SARAIVA MOTO PEÇAS";

    private final EmpresaConfiguracaoRepository repository;

    public EmpresaConfiguracaoService(EmpresaConfiguracaoRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public EmpresaConfiguracaoResponse buscar() {
        return EmpresaConfiguracaoResponse.from(repository.findById(CONFIGURATION_ID)
                .orElseGet(this::defaultConfiguration));
    }

    @Transactional
    public EmpresaConfiguracaoResponse atualizar(EmpresaConfiguracaoRequest request) {
        validarCnpj(request.cnpj());
        validarTelefone(request.telefone());

        EmpresaConfiguracao configuration = repository.findById(CONFIGURATION_ID)
                .orElseGet(this::defaultConfiguration);
        configuration.setNomeFantasia(request.nomeFantasia().trim());
        configuration.setRazaoSocial(request.razaoSocial().trim());
        configuration.setCnpj(optional(request.cnpj()));
        configuration.setTelefone(optional(request.telefone()));
        configuration.setEndereco(optional(request.endereco()));
        configuration.setEmail(optionalLowerCase(request.email()));
        configuration.setAtualizadoEm(LocalDateTime.now());
        return EmpresaConfiguracaoResponse.from(repository.save(configuration));
    }

    private EmpresaConfiguracao defaultConfiguration() {
        EmpresaConfiguracao configuration = new EmpresaConfiguracao();
        configuration.setId(CONFIGURATION_ID);
        configuration.setNomeFantasia(DEFAULT_TRADE_NAME);
        configuration.setRazaoSocial(DEFAULT_LEGAL_NAME);
        configuration.setAtualizadoEm(LocalDateTime.now());
        return configuration;
    }

    private void validarCnpj(String value) {
        if (value == null || value.isBlank()) return;
        if (!value.matches("[0-9./\\-\\s]+")) {
            throw new IllegalArgumentException("CNPJ inválido.");
        }
        String digits = digits(value);
        if (digits.length() != 14 || digits.chars().distinct().count() == 1
                || checkDigit(digits, 12) != digits.charAt(12) - '0'
                || checkDigit(digits, 13) != digits.charAt(13) - '0') {
            throw new IllegalArgumentException("CNPJ inválido.");
        }
    }

    private int checkDigit(String digits, int length) {
        int[] weights = length == 12
                ? new int[] {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
                : new int[] {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int sum = 0;
        for (int index = 0; index < length; index++) {
            sum += (digits.charAt(index) - '0') * weights[index];
        }
        int remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }

    private void validarTelefone(String value) {
        if (value == null || value.isBlank()) return;
        if (!value.matches("[0-9() +\\-\\s]+")) {
            throw new IllegalArgumentException("Telefone contém caracteres inválidos.");
        }
        int length = digits(value).length();
        if (length != 10 && length != 11) {
            throw new IllegalArgumentException("Telefone deve conter DDD e 10 ou 11 dígitos.");
        }
    }

    private String digits(String value) {
        return value.replaceAll("\\D", "");
    }

    private String optional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String optionalLowerCase(String value) {
        String normalized = optional(value);
        return normalized == null ? null : normalized.toLowerCase(java.util.Locale.ROOT);
    }
}
