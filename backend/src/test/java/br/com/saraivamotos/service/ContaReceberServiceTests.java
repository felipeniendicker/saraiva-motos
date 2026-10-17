package br.com.saraivamotos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import br.com.saraivamotos.domain.ContaReceber;
import br.com.saraivamotos.domain.FormaPagamento;
import br.com.saraivamotos.domain.Recebimento;
import br.com.saraivamotos.domain.StatusContaReceber;
import br.com.saraivamotos.dto.RecebimentoRequest;
import br.com.saraivamotos.dto.EstornoRecebimentoRequest;
import br.com.saraivamotos.repository.ContaReceberRepository;
import br.com.saraivamotos.repository.RecebimentoRepository;
import br.com.saraivamotos.repository.VendaRepository;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ContaReceberServiceTests {
    @Mock ContaReceberRepository contas;
    @Mock RecebimentoRepository recebimentos;
    @Mock VendaRepository vendas;
    @Mock CaixaService caixas;

    private ContaReceberService service;
    private ContaReceber conta;
    private final AuthenticatedUser operador = new AuthenticatedUser(7L, "operador@saraiva.test");

    @BeforeEach
    void setup() {
        service = new ContaReceberService(contas, recebimentos, vendas, caixas);
        conta = Mockito.spy(new ContaReceber());
        conta.setValorOriginal(new BigDecimal("100.00"));
        conta.setValorRecebido(new BigDecimal("0.00"));
        conta.setSaldoPendente(new BigDecimal("100.00"));
        conta.setVencimento(LocalDate.now().plusDays(30));
        conta.setStatus(StatusContaReceber.ABERTA);
        conta.setDataCriacao(LocalDateTime.now());
    }

    @Test
    void pagamentoParcialReenviadoRetornaOriginalSemDuplicar() {
        when(conta.getId()).thenReturn(4L);
        String chave = UUID.randomUUID().toString();
        RecebimentoRequest request = new RecebimentoRequest(new BigDecimal("30.00"), FormaPagamento.PIX);
        when(recebimentos.findByChaveIdempotencia(chave)).thenReturn(Optional.empty());
        when(contas.buscarParaAtualizar(4L)).thenReturn(Optional.of(conta));
        when(caixas.registrarRecebimento(any(), any())).thenAnswer(invocation -> invocation.getArgument(0));

        var primeiro = service.registrar(4L, chave, request, operador);
        var persistido = org.mockito.ArgumentCaptor.forClass(Recebimento.class);
        verify(caixas).registrarRecebimento(persistido.capture(), any());
        when(recebimentos.findByChaveIdempotencia(chave)).thenReturn(Optional.of(persistido.getValue()));
        var repetido = service.registrar(4L, chave, request, operador);

        assertThat(primeiro.valor()).isEqualByComparingTo("30.00");
        assertThat(repetido.valor()).isEqualByComparingTo("30.00");
        assertThat(conta.getValorRecebido()).isEqualByComparingTo("30.00");
        assertThat(conta.getSaldoPendente()).isEqualByComparingTo("70.00");
        assertThat(conta.getStatus()).isEqualTo(StatusContaReceber.PARCIAL);
        verify(caixas, times(1)).registrarRecebimento(any(), any());
    }

    @Test
    void recusaPagamentoAcimaDoSaldo() {
        String chave = UUID.randomUUID().toString();
        when(recebimentos.findByChaveIdempotencia(chave)).thenReturn(Optional.empty());
        when(contas.buscarParaAtualizar(4L)).thenReturn(Optional.of(conta));

        assertThatThrownBy(() -> service.registrar(4L, chave,
                new RecebimentoRequest(new BigDecimal("100.01"), FormaPagamento.DINHEIRO), operador))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maior que o saldo");
        verify(caixas, times(0)).registrarRecebimento(any(), any());
    }

    @Test
    void estornoReabreSaldoEPreservaRecebimentoHistorico() {
        when(conta.getId()).thenReturn(4L);
        conta.setValorRecebido(new BigDecimal("100.00"));
        conta.setSaldoPendente(new BigDecimal("0.00"));
        conta.setStatus(StatusContaReceber.QUITADA);
        Recebimento recebimento = new Recebimento();
        recebimento.setConta(conta);
        recebimento.setValor(new BigDecimal("30.00"));
        recebimento.setFormaPagamento(FormaPagamento.DINHEIRO);
        recebimento.setDataHora(LocalDateTime.now());
        recebimento.setOperadorId(7L);
        recebimento.setOperadorEmail(operador.email());
        recebimento.setEstornado(false);
        when(recebimentos.buscarParaAtualizar(9L)).thenReturn(Optional.of(recebimento));
        when(contas.buscarParaAtualizar(4L)).thenReturn(Optional.of(conta));

        service.estornar(9L, new EstornoRecebimentoRequest("Correcao do recebimento"), operador);

        assertThat(recebimento.getEstornado()).isTrue();
        assertThat(conta.getValorRecebido()).isEqualByComparingTo("70.00");
        assertThat(conta.getSaldoPendente()).isEqualByComparingTo("30.00");
        assertThat(conta.getStatus()).isEqualTo(StatusContaReceber.PARCIAL);
        verify(caixas).registrarEstornoRecebimento(recebimento, operador);
        verify(recebimentos, times(0)).delete(any());
    }
}
