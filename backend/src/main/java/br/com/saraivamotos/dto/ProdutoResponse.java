package br.com.saraivamotos.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import br.com.saraivamotos.domain.Produto;

public record ProdutoResponse(
        Long id,
        String nome,
        String codigoReferencia,
        String codigoBarras,
        String marca,
        String categoria,
        String aplicacao,
        BigDecimal valorCusto,
        BigDecimal precoVarejo,
        BigDecimal precoRevenda,
        Integer quantidadeEstoque,
        Integer estoqueMinimo,
        String observacoes,
        Boolean ativo,
        LocalDateTime dataCadastro) {

    public static ProdutoResponse from(Produto produto) {
        return new ProdutoResponse(
                produto.getId(),
                produto.getNome(),
                produto.getCodigoReferencia(),
                produto.getCodigoBarras(),
                produto.getMarca(),
                produto.getCategoria(),
                produto.getAplicacao(),
                produto.getValorCusto(),
                produto.getPrecoVarejo(),
                produto.getPrecoRevenda(),
                produto.getQuantidadeEstoque(),
                produto.getEstoqueMinimo(),
                produto.getObservacoes(),
                produto.getAtivo(),
                produto.getDataCadastro());
    }
}
