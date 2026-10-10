package br.com.saraivamotos.service;

import java.util.UUID;
import java.util.function.Supplier;

import br.com.saraivamotos.domain.OperacaoIdempotente;
import br.com.saraivamotos.dto.AjusteEstoqueRequest;
import br.com.saraivamotos.dto.EntradaEstoqueRequest;
import br.com.saraivamotos.dto.MovimentacaoEstoqueResponse;
import br.com.saraivamotos.dto.SaidaEstoqueRequest;
import br.com.saraivamotos.dto.VendaRequest;
import br.com.saraivamotos.dto.VendaResponse;
import br.com.saraivamotos.exception.ChaveIdempotenciaConflitanteException;
import br.com.saraivamotos.repository.OperacaoIdempotenteRepository;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class OperacaoIdempotenteService {
    private final OperacaoIdempotenteRepository repository;
    private final OperacaoIdempotenteTransaction transaction;
    private final RequestHashService hashes;
    private final VendaService vendaService;
    private final EstoqueService estoqueService;

    public OperacaoIdempotenteService(OperacaoIdempotenteRepository repository,
            OperacaoIdempotenteTransaction transaction, RequestHashService hashes,
            VendaService vendaService, EstoqueService estoqueService) {
        this.repository = repository;
        this.transaction = transaction;
        this.hashes = hashes;
        this.vendaService = vendaService;
        this.estoqueService = estoqueService;
    }

    public VendaResponse venda(String rawKey, VendaRequest request) {
        return venda(rawKey, request, null);
    }

    public VendaResponse venda(String rawKey, VendaRequest request, AuthenticatedUser user) {
        String chave = chave(rawKey);
        String hash = hashes.venda(request);
        return executar(chave, "VENDA", hash,
                () -> user == null
                        ? transaction.venda(chave, hash, request)
                        : transaction.venda(chave, hash, request, user),
                operacao -> {
                    if (operacao.getVendaId() == null) {
                        throw new IllegalStateException("A operação idempotente de venda não possui resultado.");
                    }
                    return vendaService.buscarPorId(operacao.getVendaId());
                });
    }

    public MovimentacaoEstoqueResponse entrada(String rawKey, EntradaEstoqueRequest request) {
        String chave = chave(rawKey);
        String hash = hashes.entrada(request);
        return executarMovimento(chave, "ESTOQUE_ENTRADA", hash,
                () -> transaction.entrada(chave, hash, request));
    }

    public MovimentacaoEstoqueResponse ajuste(String rawKey, AjusteEstoqueRequest request) {
        String chave = chave(rawKey);
        String hash = hashes.ajuste(request);
        return executarMovimento(chave, "ESTOQUE_AJUSTE", hash,
                () -> transaction.ajuste(chave, hash, request));
    }

    public MovimentacaoEstoqueResponse saida(String rawKey, SaidaEstoqueRequest request) {
        String chave = chave(rawKey);
        String hash = hashes.saida(request);
        return executarMovimento(chave, "ESTOQUE_SAIDA", hash,
                () -> transaction.saida(chave, hash, request));
    }

    private MovimentacaoEstoqueResponse executarMovimento(String chave, String tipo, String hash,
            Supplier<MovimentacaoEstoqueResponse> novaOperacao) {
        return executar(chave, tipo, hash, novaOperacao,
                operacao -> estoqueService.buscarMovimentacao(operacao.getMovimentacaoId()));
    }

    private <T> T executar(String chave, String tipo, String hash, Supplier<T> novaOperacao,
            java.util.function.Function<OperacaoIdempotente, T> resultadoExistente) {
        OperacaoIdempotente existente = repository.findById(chave).orElse(null);
        if (existente != null) return conferirEResolver(existente, tipo, hash, resultadoExistente);
        try {
            return novaOperacao.get();
        } catch (DataIntegrityViolationException exception) {
            OperacaoIdempotente concorrente = repository.findById(chave).orElse(null);
            if (concorrente == null) throw exception;
            return conferirEResolver(concorrente, tipo, hash, resultadoExistente);
        }
    }

    private <T> T conferirEResolver(OperacaoIdempotente operacao, String tipo, String hash,
            java.util.function.Function<OperacaoIdempotente, T> resolver) {
        if (!tipo.equals(operacao.getTipo()) || !hash.equals(operacao.getRequestHash())) {
            throw new ChaveIdempotenciaConflitanteException();
        }
        return resolver.apply(operacao);
    }

    private String chave(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) return UUID.randomUUID().toString();
        try {
            return UUID.fromString(rawKey.trim()).toString();
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("A chave de idempotência deve ser um UUID válido.");
        }
    }
}
