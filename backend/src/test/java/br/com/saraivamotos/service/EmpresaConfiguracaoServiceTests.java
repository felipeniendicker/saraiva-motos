package br.com.saraivamotos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import br.com.saraivamotos.domain.EmpresaConfiguracao;
import br.com.saraivamotos.dto.EmpresaConfiguracaoRequest;
import br.com.saraivamotos.dto.EmpresaConfiguracaoResponse;
import br.com.saraivamotos.repository.EmpresaConfiguracaoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class EmpresaConfiguracaoServiceTests {
    @Mock private EmpresaConfiguracaoRepository repository;
    private EmpresaConfiguracaoService service;

    @BeforeEach
    void setUp() {
        service = new EmpresaConfiguracaoService(repository);
    }

    @Test
    void consultaPreservaNomesAtuaisQuandoAindaNaoExisteRegistro() {
        when(repository.findById(1L)).thenReturn(Optional.empty());

        EmpresaConfiguracaoResponse response = service.buscar();

        assertThat(response.nomeFantasia()).isEqualTo("SARAIVA MOTOS");
        assertThat(response.razaoSocial()).isEqualTo("SARAIVA MOTO PEÇAS");
        assertThat(response.cnpj()).isNull();
    }

    @Test
    void atualizaEPersisteDadosNormalizadosNaConfiguracaoUnica() {
        when(repository.findById(1L)).thenReturn(Optional.of(configuration()));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        EmpresaConfiguracaoResponse response = service.atualizar(validRequest());

        ArgumentCaptor<EmpresaConfiguracao> captor = ArgumentCaptor.forClass(EmpresaConfiguracao.class);
        verify(repository).save(captor.capture());
        EmpresaConfiguracao saved = captor.getValue();
        assertThat(saved.getId()).isEqualTo(1L);
        assertThat(saved.getNomeFantasia()).isEqualTo("Saraiva Motos Centro");
        assertThat(saved.getEmail()).isEqualTo("contato@saraiva.com.br");
        assertThat(saved.getAtualizadoEm()).isNotNull();
        assertThat(response.cnpj()).isEqualTo("11.222.333/0001-81");
    }

    @Test
    void camposOpcionaisVaziosSaoPersistidosComoNulos() {
        when(repository.findById(1L)).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        EmpresaConfiguracaoResponse response = service.atualizar(new EmpresaConfiguracaoRequest(
                "SARAIVA MOTOS", "SARAIVA MOTO PEÇAS", "", "", "", ""));

        assertThat(response.cnpj()).isNull();
        assertThat(response.telefone()).isNull();
        assertThat(response.endereco()).isNull();
        assertThat(response.email()).isNull();
    }

    @Test
    void rejeitaCnpjComDigitoVerificadorInvalido() {
        EmpresaConfiguracaoRequest request = new EmpresaConfiguracaoRequest(
                "Saraiva", "Saraiva Ltda", "11.222.333/0001-82", "(11) 99999-9999", null, null);

        assertThatThrownBy(() -> service.atualizar(request)).hasMessage("CNPJ inválido.");
        verify(repository, never()).save(any());
    }

    @Test
    void rejeitaTelefoneSemDddOuComQuantidadeInvalida() {
        EmpresaConfiguracaoRequest request = new EmpresaConfiguracaoRequest(
                "Saraiva", "Saraiva Ltda", null, "9999-9999", null, null);

        assertThatThrownBy(() -> service.atualizar(request)).hasMessageContaining("DDD");
        verify(repository, never()).save(any());
    }

    private EmpresaConfiguracaoRequest validRequest() {
        return new EmpresaConfiguracaoRequest(
                " Saraiva Motos Centro ",
                " Saraiva Moto Peças Ltda ",
                "11.222.333/0001-81",
                "(11) 99999-9999",
                "Rua das Motos, 100",
                " CONTATO@SARAIVA.COM.BR ");
    }

    private EmpresaConfiguracao configuration() {
        EmpresaConfiguracao configuration = new EmpresaConfiguracao();
        configuration.setId(1L);
        configuration.setNomeFantasia("SARAIVA MOTOS");
        configuration.setRazaoSocial("SARAIVA MOTO PEÇAS");
        return configuration;
    }
}
