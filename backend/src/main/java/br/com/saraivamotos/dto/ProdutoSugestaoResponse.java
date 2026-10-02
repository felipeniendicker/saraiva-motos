package br.com.saraivamotos.dto;

public record ProdutoSugestaoResponse(
        String fonte,
        String codigoBarras,
        String nome,
        String marca,
        String categoria,
        String descricao,
        String aplicacao,
        String codigoReferencia) {
}
