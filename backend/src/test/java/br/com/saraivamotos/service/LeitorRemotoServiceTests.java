package br.com.saraivamotos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import br.com.saraivamotos.domain.LeitorLeitura;
import br.com.saraivamotos.domain.LeitorSessao;
import br.com.saraivamotos.dto.LeitorEnvioRequest;
import br.com.saraivamotos.dto.LeitorLeituraResponse;
import br.com.saraivamotos.dto.LeitorPareamentoResponse;
import br.com.saraivamotos.repository.LeitorLeituraRepository;
import br.com.saraivamotos.repository.LeitorSessaoRepository;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LeitorRemotoServiceTests {
    private static final String VALID_BARCODE = "7894900011517";

    @Mock private LeitorSessaoRepository sessoes;
    @Mock private LeitorLeituraRepository leituras;
    @Mock private LeitorLeituraTransaction leituraTransaction;
    @Mock private QrCodeService qrCodes;

    private LeitorRemotoService service;
    private final AuthenticatedUser user = new AuthenticatedUser(1L, "operador@test");

    @BeforeEach
    void setup() {
        service = new LeitorRemotoService(
                sessoes, leituras, leituraTransaction, qrCodes, "http://localhost:5173");
    }

    @Test
    void usaOrigemHttpsDoFrontendNoQrEmVezDoFallbackLocal() {
        when(qrCodes.dataUrl(anyString())).thenReturn("data:image/png;base64,abc");
        when(sessoes.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        LeitorPareamentoResponse response = service.criar(user, "https://saraiva-motos.up.railway.app");

        assertThat(response.token()).doesNotContain(".").hasSizeGreaterThan(40);
        assertThat(response.url()).startsWith("https://saraiva-motos.up.railway.app/#/leitor/");
        assertThat(response.url()).doesNotContain("localhost");
        assertThat(response.qrCodeDataUrl()).startsWith("data:image/png");

        ArgumentCaptor<LeitorSessao> sessionCaptor = ArgumentCaptor.forClass(LeitorSessao.class);
        verify(sessoes).save(sessionCaptor.capture());
        LeitorSessao saved = sessionCaptor.getValue();
        assertThat(saved.getTokenHash()).doesNotContain(response.token());
        assertThat(Duration.between(saved.getDataCriacao(), saved.getDataExpiracao()))
                .isEqualTo(Duration.ofMinutes(5));
    }

    @Test
    void ignoraOrigemInseguraOuComCaminhoEUsaConfiguracao() {
        LeitorRemotoService configuredService = new LeitorRemotoService(
                sessoes, leituras, leituraTransaction, qrCodes, "https://frontend.example/");
        when(qrCodes.dataUrl(anyString())).thenReturn("data:image/png;base64,abc");
        when(sessoes.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        LeitorPareamentoResponse insecure = configuredService.criar(user, "http://public.example");
        LeitorPareamentoResponse withPath = configuredService.criar(user, "https://attacker.example/capture");

        assertThat(insecure.url()).startsWith("https://frontend.example/#/leitor/");
        assertThat(withPath.url()).startsWith("https://frontend.example/#/leitor/");
    }

    @Test
    void rejeitaCodigoComDigitoVerificadorInvalido() {
        LeitorSessao session = activeSession();
        when(sessoes.findByTokenHash(anyString())).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.enviar(
                "token", new LeitorEnvioRequest("7894900011518", UUID.randomUUID().toString())))
                .hasMessageContaining("verificador");
        verify(leituraTransaction, never()).criar(anyString(), anyString(), anyString());
    }

    @Test
    void reenvioDoMesmoEventoNaoDuplicaLeitura() {
        LeitorSessao session = activeSession();
        LeitorLeitura existing = reading(session.getId(), "2d667c21-d005-4521-b011-8450f6c2dd87");
        when(sessoes.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        when(leituras.findBySessaoIdAndEventoId(eq(session.getId()), anyString()))
                .thenReturn(Optional.of(existing));

        LeitorLeituraResponse response = service.enviar(
                "token", new LeitorEnvioRequest(VALID_BARCODE, existing.getEventoId()));

        assertThat(response.codigo()).isEqualTo(VALID_BARCODE);
        verify(leituraTransaction, never()).criar(anyString(), anyString(), anyString());
    }

    @Test
    void codigoEnviadoPeloCelularFicaDisponivelParaOComputadorDaSessao() {
        LeitorSessao session = activeSession();
        String eventId = UUID.randomUUID().toString();
        LeitorLeitura created = reading(session.getId(), eventId);
        when(sessoes.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        when(leituras.findBySessaoIdAndEventoId(session.getId(), eventId)).thenReturn(Optional.empty());
        when(leituraTransaction.criar(session.getId(), eventId, VALID_BARCODE)).thenReturn(created);
        when(sessoes.findById(session.getId())).thenReturn(Optional.of(session));
        when(leituras.proximaPendente(session.getId())).thenReturn(Optional.of(created));
        when(leituras.save(created)).thenReturn(created);

        service.enviar("token", new LeitorEnvioRequest(VALID_BARCODE, eventId));
        LeitorLeituraResponse consumed = service.consumir(session.getId(), user);

        assertThat(consumed.codigo()).isEqualTo(VALID_BARCODE);
        assertThat(created.getDataConsumo()).isNotNull();
    }

    @Test
    void sessaoExpiradaNaoAceitaNemEntregaLeituras() {
        LeitorSessao expired = activeSession();
        expired.setDataExpiracao(LocalDateTime.now().minusSeconds(1));
        when(sessoes.findByTokenHash(anyString())).thenReturn(Optional.of(expired));
        when(sessoes.findById(expired.getId())).thenReturn(Optional.of(expired));

        assertThat(service.status("token").ativo()).isFalse();
        assertThatThrownBy(() -> service.enviar(
                "token", new LeitorEnvioRequest(VALID_BARCODE, UUID.randomUUID().toString())))
                .hasMessageContaining("expirado ou encerrado");
        assertThat(service.consumir(expired.getId(), user)).isNull();
        verify(leituraTransaction, never()).criar(anyString(), anyString(), anyString());
        verify(leituras, never()).proximaPendente(anyString());
    }

    @Test
    void encerrarInvalidaImediatamenteOTokenDaSessao() {
        LeitorSessao session = activeSession();
        when(sessoes.findById(session.getId())).thenReturn(Optional.of(session));
        when(sessoes.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        when(sessoes.save(session)).thenReturn(session);

        service.encerrar(session.getId(), user);

        assertThat(session.getStatus()).isEqualTo("ENCERRADA");
        assertThat(service.status("token").ativo()).isFalse();
        assertThatThrownBy(() -> service.enviar(
                "token", new LeitorEnvioRequest(VALID_BARCODE, UUID.randomUUID().toString())))
                .hasMessageContaining("expirado ou encerrado");
    }

    private LeitorSessao activeSession() {
        LeitorSessao session = new LeitorSessao();
        session.setId(UUID.randomUUID().toString());
        session.setTokenHash("hash");
        session.setOperadorId(user.id());
        session.setOperadorEmail(user.email());
        session.setStatus("ATIVA");
        session.setDataCriacao(LocalDateTime.now());
        session.setDataExpiracao(LocalDateTime.now().plusMinutes(3));
        return session;
    }

    private LeitorLeitura reading(String sessionId, String eventId) {
        LeitorLeitura reading = new LeitorLeitura();
        reading.setSessaoId(sessionId);
        reading.setEventoId(eventId);
        reading.setCodigo(VALID_BARCODE);
        reading.setDataHora(LocalDateTime.now());
        return reading;
    }
}
