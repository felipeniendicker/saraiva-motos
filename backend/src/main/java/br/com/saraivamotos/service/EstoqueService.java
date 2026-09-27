package br.com.saraivamotos.service;

import java.time.LocalDateTime;
import java.util.List;

import br.com.saraivamotos.domain.MovimentacaoEstoque;
import br.com.saraivamotos.domain.Produto;
import br.com.saraivamotos.domain.TipoMovimentacaoEstoque;
import br.com.saraivamotos.dto.AjusteEstoqueRequest;
import br.com.saraivamotos.dto.EntradaEstoqueRequest;
import br.com.saraivamotos.dto.MovimentacaoEstoqueResponse;
import br.com.saraivamotos.exception.OperacaoEstoqueInvalidaException;
import br.com.saraivamotos.exception.ProdutoNaoEncontradoException;
import br.com.saraivamotos.repository.MovimentacaoEstoqueRepository;
import br.com.saraivamotos.repository.ProdutoRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EstoqueService {

    private final ProdutoRepository produtoRepository;
    private final MovimentacaoEstoqueRepository movimentacaoRepository;

    public EstoqueService(
            ProdutoRepository produtoRepository,
            MovimentacaoEstoqueRepository movimentacaoRepository) {
        this.produtoRepository = produtoRepository;
        this.movimentacaoRepository = movimentacaoRepository;
    }

    @Transactional
    public MovimentacaoEstoqueResponse entrada(EntradaEstoqueRequest request) {
        validarQuantidadeEntrada(request.quantidade());
        Produto produto = buscarProdutoParaMovimentacao(request.produtoId());
        int saldoAnterior = produto.getQuantidadeEstoque();
        int saldoPosterior;
        try {
            saldoPosterior = Math.addExact(saldoAnterior, request.quantidade());
        } catch (ArithmeticException exception) {
            throw new IllegalArgumentException("A quantidade informada ultrapassa o limite suportado.");
        }

        return registrar(
                produto,
                TipoMovimentacaoEstoque.ENTRADA,
                request.quantidade(),
                saldoAnterior,
                saldoPosterior,
                normalizarMotivoEntrada(request.observacao()));
    }

    @Transactional
    public MovimentacaoEstoqueResponse ajustar(AjusteEstoqueRequest request) {
        validarAjuste(request);
        Produto produto = buscarProdutoParaMovimentacao(request.produtoId());
        int saldoAnterior = produto.getQuantidadeEstoque();
        int saldoPosterior = request.novoSaldo();
        long diferenca = (long) saldoPosterior - saldoAnterior;

        if (diferenca == 0) {
            throw new OperacaoEstoqueInvalidaException(
                    "O novo saldo é igual ao estoque atual; nenhuma movimentação foi criada.");
        }
        if (Math.abs(diferenca) > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("A diferença de estoque ultrapassa o limite suportado.");
        }

        TipoMovimentacaoEstoque tipo = diferenca > 0
                ? TipoMovimentacaoEstoque.AJUSTE_ENTRADA
                : TipoMovimentacaoEstoque.AJUSTE_SAIDA;

        return registrar(
                produto,
                tipo,
                (int) Math.abs(diferenca),
                saldoAnterior,
                saldoPosterior,
                request.motivo().trim());
    }

    @Transactional(readOnly = true)
    public List<MovimentacaoEstoqueResponse> listarMovimentacoes(Long produtoId) {
        List<MovimentacaoEstoque> movimentacoes = produtoId == null
                ? movimentacaoRepository.findAllByOrderByDataHoraDescIdDesc()
                : movimentacaoRepository.findByProdutoIdOrderByDataHoraDescIdDesc(produtoId);
        return movimentacoes.stream().map(MovimentacaoEstoqueResponse::from).toList();
    }

    private MovimentacaoEstoqueResponse registrar(
            Produto produto,
            TipoMovimentacaoEstoque tipo,
            int quantidade,
            int saldoAnterior,
            int saldoPosterior,
            String motivo) {
        MovimentacaoEstoque movimentacao = new MovimentacaoEstoque();
        movimentacao.setProduto(produto);
        movimentacao.setTipo(tipo);
        movimentacao.setQuantidade(quantidade);
        movimentacao.setEstoqueAnterior(saldoAnterior);
        movimentacao.setEstoquePosterior(saldoPosterior);
        movimentacao.setMotivo(motivo);
        movimentacao.setVendaId(null);
        movimentacao.setDataHora(LocalDateTime.now());

        MovimentacaoEstoque movimentacaoSalva = movimentacaoRepository.save(movimentacao);
        produto.setQuantidadeEstoque(saldoPosterior);
        produtoRepository.save(produto);
        return MovimentacaoEstoqueResponse.from(movimentacaoSalva);
    }

    private Produto buscarProdutoParaMovimentacao(Long produtoId) {
        Produto produto = produtoRepository.findByIdForUpdate(produtoId)
                .orElseThrow(() -> new ProdutoNaoEncontradoException(
                        "Produto não encontrado para o id " + produtoId + "."));
        if (!Boolean.TRUE.equals(produto.getAtivo())) {
            throw new OperacaoEstoqueInvalidaException(
                    "Não é possível movimentar o estoque de um produto inativo.");
        }
        return produto;
    }

    private void validarQuantidadeEntrada(Integer quantidade) {
        if (quantidade == null || quantidade <= 0) {
            throw new IllegalArgumentException("A quantidade da entrada deve ser maior que zero.");
        }
    }

    private void validarAjuste(AjusteEstoqueRequest request) {
        if (request.novoSaldo() == null || request.novoSaldo() < 0) {
            throw new IllegalArgumentException("O novo saldo não pode ser negativo.");
        }
        if (request.motivo() == null || request.motivo().isBlank()) {
            throw new IllegalArgumentException("O motivo do ajuste é obrigatório.");
        }
    }

    private String normalizarMotivoEntrada(String observacao) {
        return observacao == null || observacao.isBlank()
                ? "Entrada manual"
                : observacao.trim();
    }
}
