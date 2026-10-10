package br.com.saraivamotos.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.LocalDateTime;
import java.util.*;
import br.com.saraivamotos.domain.*;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.repository.*;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LeitorRemotoServiceTests {
 @Mock LeitorSessaoRepository sessoes; @Mock LeitorLeituraRepository leituras; @Mock LeitorLeituraTransaction leituraTransaction; @Mock QrCodeService qrCodes;
 LeitorRemotoService service; AuthenticatedUser user=new AuthenticatedUser(1L,"operador@test");
 @BeforeEach void setup(){service=new LeitorRemotoService(sessoes,leituras,leituraTransaction,qrCodes,"https://homolog.example");}
 @Test void criaTokenTemporarioSemJwtEGeraQrLocal(){when(qrCodes.dataUrl(anyString())).thenReturn("data:image/png;base64,abc");when(sessoes.save(any())).thenAnswer(i->i.getArgument(0));LeitorPareamentoResponse r=service.criar(user);assertThat(r.token()).doesNotContain(".").hasSizeGreaterThan(40);assertThat(r.url()).startsWith("https://homolog.example/#/leitor/");assertThat(r.qrCodeDataUrl()).startsWith("data:image/png");ArgumentCaptor<LeitorSessao> c=ArgumentCaptor.forClass(LeitorSessao.class);verify(sessoes).save(c.capture());assertThat(c.getValue().getTokenHash()).doesNotContain(r.token());}
 @Test void rejeitaCodigoComDigitoVerificadorInvalido(){LeitorSessao s=ativa();when(sessoes.findByTokenHash(anyString())).thenReturn(Optional.of(s));assertThatThrownBy(()->service.enviar("token",new LeitorEnvioRequest("7894900011518",UUID.randomUUID().toString()))).hasMessageContaining("verificador");verify(leituraTransaction,never()).criar(anyString(),anyString(),anyString());}
 @Test void reenvioDoMesmoEventoNaoDuplicaLeitura(){LeitorSessao s=ativa();LeitorLeitura existente=new LeitorLeitura();existente.setSessaoId(s.getId());existente.setEventoId("2d667c21-d005-4521-b011-8450f6c2dd87");existente.setCodigo("7894900011517");existente.setDataHora(LocalDateTime.now());when(sessoes.findByTokenHash(anyString())).thenReturn(Optional.of(s));when(leituras.findBySessaoIdAndEventoId(eq(s.getId()),anyString())).thenReturn(Optional.of(existente));LeitorLeituraResponse r=service.enviar("token",new LeitorEnvioRequest("7894900011517",existente.getEventoId()));assertThat(r.codigo()).isEqualTo("7894900011517");verify(leituraTransaction,never()).criar(anyString(),anyString(),anyString());}
 private LeitorSessao ativa(){LeitorSessao s=new LeitorSessao();s.setId(UUID.randomUUID().toString());s.setTokenHash("hash");s.setOperadorId(1L);s.setOperadorEmail(user.email());s.setStatus("ATIVA");s.setDataCriacao(LocalDateTime.now());s.setDataExpiracao(LocalDateTime.now().plusMinutes(3));return s;}
}
