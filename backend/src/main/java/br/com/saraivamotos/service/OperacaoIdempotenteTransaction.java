package br.com.saraivamotos.service;

import java.time.LocalDateTime;

import br.com.saraivamotos.domain.OperacaoIdempotente;
import br.com.saraivamotos.dto.AjusteEstoqueRequest;
import br.com.saraivamotos.dto.EntradaEstoqueRequest;
import br.com.saraivamotos.dto.MovimentacaoEstoqueResponse;
import br.com.saraivamotos.dto.SaidaEstoqueRequest;
import br.com.saraivamotos.dto.VendaRequest;
import br.com.saraivamotos.dto.VendaResponse;
import br.com.saraivamotos.repository.OperacaoIdempotenteRepository;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OperacaoIdempotenteTransaction {
    private final OperacaoIdempotenteRepository repository;
    private final VendaService vendaService;
    private final EstoqueService estoqueService;
    private final CaixaService caixaService;

    public OperacaoIdempotenteTransaction(OperacaoIdempotenteRepository repository,
            VendaService vendaService, EstoqueService estoqueService, CaixaService caixaService) {
        this.repository = repository;
        this.vendaService = vendaService;
        this.estoqueService = estoqueService;
        this.caixaService = caixaService;
    }

    @Transactional
    public VendaResponse venda(String chave, String hash, VendaRequest request) {
        return venda(chave, hash, request, null);
    }

    @Transactional
    public VendaResponse venda(String chave, String hash, VendaRequest request, AuthenticatedUser user) {
        OperacaoIdempotente operacao = iniciar(chave, "VENDA", hash);
        VendaResponse response = vendaService.criar(request);
        if (user != null) caixaService.vincularVenda(response, user);
        operacao.setVendaId(response.id());
        repository.save(operacao);
        return response;
    }

    @Transactional
    public MovimentacaoEstoqueResponse entrada(String chave, String hash, EntradaEstoqueRequest request) {
        OperacaoIdempotente operacao = iniciar(chave, "ESTOQUE_ENTRADA", hash);
        MovimentacaoEstoqueResponse response = estoqueService.entrada(request);
        operacao.setMovimentacaoId(response.id());
        repository.save(operacao);
        return response;
    }

    @Transactional
    public MovimentacaoEstoqueResponse ajuste(String chave, String hash, AjusteEstoqueRequest request) {
        OperacaoIdempotente operacao = iniciar(chave, "ESTOQUE_AJUSTE", hash);
        MovimentacaoEstoqueResponse response = estoqueService.ajustar(request);
        operacao.setMovimentacaoId(response.id());
        repository.save(operacao);
        return response;
    }

    @Transactional
    public MovimentacaoEstoqueResponse saida(String chave, String hash, SaidaEstoqueRequest request) {
        OperacaoIdempotente operacao = iniciar(chave, "ESTOQUE_SAIDA", hash);
        MovimentacaoEstoqueResponse response = estoqueService.saida(request);
        operacao.setMovimentacaoId(response.id());
        repository.save(operacao);
        return response;
    }

    private OperacaoIdempotente iniciar(String chave, String tipo, String hash) {
        OperacaoIdempotente operacao = new OperacaoIdempotente();
        operacao.setChave(chave);
        operacao.setTipo(tipo);
        operacao.setRequestHash(hash);
        operacao.setDataCriacao(LocalDateTime.now());
        return repository.saveAndFlush(operacao);
    }
}
