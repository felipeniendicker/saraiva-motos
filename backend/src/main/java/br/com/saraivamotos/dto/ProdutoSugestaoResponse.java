package br.com.saraivamotos.dto;

import java.util.List;

public record ProdutoSugestaoResponse(
        String fonte,
        String codigoBarras,
        String nome,
        String marca,
        String categoria,
        String descricao,
        String aplicacao,
        String codigoReferencia,
        String confianca,
        List<ProdutoFonteResponse> fontes) {

    public ProdutoSugestaoResponse(
            String fonte,
            String codigoBarras,
            String nome,
            String marca,
            String categoria,
            String descricao,
            String aplicacao,
            String codigoReferencia) {
        this(fonte, codigoBarras, nome, marca, categoria, descricao, aplicacao, codigoReferencia,
                "MEDIA", List.of());
    }

    public ProdutoSugestaoResponse {
        fontes = fontes == null ? List.of() : List.copyOf(fontes);
    }
}
