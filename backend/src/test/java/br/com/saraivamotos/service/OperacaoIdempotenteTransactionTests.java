package br.com.saraivamotos.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import br.com.saraivamotos.domain.CondicaoPagamento;
import br.com.saraivamotos.domain.FormaPagamento;
import br.com.saraivamotos.domain.OperacaoIdempotente;
import br.com.saraivamotos.dto.ItemVendaRequest;
import br.com.saraivamotos.dto.VendaRequest;
import br.com.saraivamotos.dto.VendaResponse;
import br.com.saraivamotos.repository.OperacaoIdempotenteRepository;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OperacaoIdempotenteTransactionTests {
    @Mock OperacaoIdempotenteRepository repository;
    @Mock VendaService vendas;
    @Mock EstoqueService estoque;
    @Mock CaixaService caixas;
    @Mock ContaReceberService contas;

    @Test
    void vendaAPrazoCriaTituloERegistraEntradaSomentePeloFluxoDeContas() {
        OperacaoIdempotenteTransaction transaction = new OperacaoIdempotenteTransaction(
                repository, vendas, estoque, caixas, contas);
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        VendaResponse response = org.mockito.Mockito.mock(VendaResponse.class);
        when(response.id()).thenReturn(30L);
        when(response.condicaoPagamento()).thenReturn(CondicaoPagamento.A_PRAZO);
        when(vendas.criar(any())).thenReturn(response);
        VendaRequest request = new VendaRequest(8L,
                List.of(new ItemVendaRequest(1L, 1, new BigDecimal("600.00"))), BigDecimal.ZERO, null,
                FormaPagamento.OUTRO, null, CondicaoPagamento.A_PRAZO, LocalDate.now().plusDays(30),
                new BigDecimal("200.00"), FormaPagamento.PIX);
        AuthenticatedUser operador = new AuthenticatedUser(7L, "operador@saraiva.test");

        transaction.venda("22678568-96ff-49c2-a812-3b160e19ad99", "hash", request, operador);

        verify(caixas).vincularVendaSemRecebimento(response);
        verify(contas).criarParaVenda(response, request, "22678568-96ff-49c2-a812-3b160e19ad99", operador);
        verify(caixas, never()).vincularVenda(any(), any());
    }
}
