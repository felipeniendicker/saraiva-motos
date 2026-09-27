package br.com.saraivamotos.dto;

import java.time.LocalDateTime;

import br.com.saraivamotos.domain.MovimentacaoEstoque;
import br.com.saraivamotos.domain.TipoMovimentacaoEstoque;

public record MovimentacaoEstoqueResponse(
        Long id,
        Long produtoId,
        String produtoNome,
        TipoMovimentacaoEstoque tipo,
        Integer quantidade,
        Integer saldoAnterior,
        Integer saldoPosterior,
        LocalDateTime dataHora,
        String motivo,
        Long vendaId) {

    public static MovimentacaoEstoqueResponse from(MovimentacaoEstoque movimentacao) {
        return new MovimentacaoEstoqueResponse(
                movimentacao.getId(),
                movimentacao.getProduto().getId(),
                movimentacao.getProduto().getNome(),
                movimentacao.getTipo(),
                movimentacao.getQuantidade(),
                movimentacao.getEstoqueAnterior(),
                movimentacao.getEstoquePosterior(),
                movimentacao.getDataHora(),
                movimentacao.getMotivo(),
                movimentacao.getVendaId());
    }
}
