package br.com.saraivamotos.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import br.com.saraivamotos.domain.FormaPagamento;
import br.com.saraivamotos.domain.OperacaoIdempotente;
import br.com.saraivamotos.dto.ItemVendaRequest;
import br.com.saraivamotos.dto.EntradaEstoqueRequest;
import br.com.saraivamotos.dto.MovimentacaoEstoqueResponse;
import br.com.saraivamotos.dto.VendaRequest;
import br.com.saraivamotos.dto.VendaResponse;
import br.com.saraivamotos.exception.ChaveIdempotenciaConflitanteException;
import br.com.saraivamotos.repository.OperacaoIdempotenteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OperacaoIdempotenteServiceTests {
    private static final String KEY = "e7eb67b3-97a7-4779-aab3-62f5dc854f90";

    @Mock OperacaoIdempotenteRepository repository;
    @Mock OperacaoIdempotenteTransaction transaction;
    @Mock VendaService vendaService;
    @Mock EstoqueService estoqueService;
    private RequestHashService hashes;
    private OperacaoIdempotenteService service;

    @BeforeEach
    void setUp() {
        hashes = new RequestHashService();
        service = new OperacaoIdempotenteService(repository, transaction, hashes, vendaService, estoqueService);
    }

    @Test
    void reenvioAposTimeoutRetornaVendaOriginalSemNovaBaixa() {
        VendaRequest request = request(1);
        VendaResponse original = mock(VendaResponse.class);
        OperacaoIdempotente operacao = operacao("VENDA", hashes.venda(request), 42L);
        when(repository.findById(KEY)).thenReturn(Optional.of(operacao));
        when(vendaService.buscarPorId(42L)).thenReturn(original);

        assertEquals(original, service.venda(KEY, request));
        verify(transaction, never()).venda(any(), any(), any());
    }

    @Test
    void reutilizacaoDaChaveComConteudoDiferenteEhRejeitada() {
        OperacaoIdempotente operacao = operacao("VENDA", hashes.venda(request(1)), 42L);
        when(repository.findById(KEY)).thenReturn(Optional.of(operacao));

        assertThrows(ChaveIdempotenciaConflitanteException.class,
                () -> service.venda(KEY, request(2)));
        verify(vendaService, never()).buscarPorId(any());
    }

    @Test
    void movimentacaoDuplicadaRetornaMovimentoOriginalSemAlterarEstoqueNovamente() {
        EntradaEstoqueRequest request = new EntradaEstoqueRequest(1L, 3, "Nota 10");
        MovimentacaoEstoqueResponse original = mock(MovimentacaoEstoqueResponse.class);
        OperacaoIdempotente operacao = operacao("ESTOQUE_ENTRADA", hashes.entrada(request), null);
        operacao.setMovimentacaoId(10L);
        when(repository.findById(KEY)).thenReturn(Optional.of(operacao));
        when(estoqueService.buscarMovimentacao(10L)).thenReturn(original);

        assertEquals(original, service.entrada(KEY, request));
        verify(transaction, never()).entrada(any(), any(), any());
    }

    @Test
    void duasRequisicoesSimultaneasComMesmaChaveRecebemMesmoResultado() throws Exception {
        VendaRequest request = request(1);
        VendaResponse original = mock(VendaResponse.class);
        OperacaoIdempotente operacao = operacao("VENDA", hashes.venda(request), 42L);
        AtomicInteger lookups = new AtomicInteger();
        when(repository.findById(KEY)).thenAnswer(invocation ->
                lookups.incrementAndGet() <= 2 ? Optional.empty() : Optional.of(operacao));

        CountDownLatch entered = new CountDownLatch(2);
        AtomicInteger executions = new AtomicInteger();
        when(transaction.venda(KEY, hashes.venda(request), request)).thenAnswer(invocation -> {
            int execution = executions.incrementAndGet();
            entered.countDown();
            if (!entered.await(2, TimeUnit.SECONDS)) throw new AssertionError("requisições não concorreram");
            if (execution == 2) throw new DataIntegrityViolationException("chave duplicada");
            return original;
        });
        when(vendaService.buscarPorId(42L)).thenReturn(original);

        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> service.venda(KEY, request));
            var second = executor.submit(() -> service.venda(KEY, request));
            assertEquals(original, first.get(3, TimeUnit.SECONDS));
            assertEquals(original, second.get(3, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
        }
        assertEquals(2, executions.get());
    }

    private VendaRequest request(int quantidade) {
        return new VendaRequest(null,
                List.of(new ItemVendaRequest(1L, quantidade, new BigDecimal("25.50"),
                        new BigDecimal("25.50"), false)),
                BigDecimal.ZERO, FormaPagamento.PIX, null);
    }

    private OperacaoIdempotente operacao(String tipo, String hash, Long vendaId) {
        OperacaoIdempotente operacao = new OperacaoIdempotente();
        operacao.setChave(KEY);
        operacao.setTipo(tipo);
        operacao.setRequestHash(hash);
        operacao.setVendaId(vendaId);
        return operacao;
    }
}
