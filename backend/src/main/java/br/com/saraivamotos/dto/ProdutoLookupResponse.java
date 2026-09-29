package br.com.saraivamotos.dto;

public record ProdutoLookupResponse(
        boolean encontrado,
        String origem,
        boolean cadastradoLocalmente,
        String codigoConsultado,
        ProdutoResponse produto,
        ProdutoSugestaoResponse sugestao) {

    public static ProdutoLookupResponse local(String codigo, ProdutoResponse produto) {
        return new ProdutoLookupResponse(true, "LOCAL", true, codigo, produto, null);
    }

    public static ProdutoLookupResponse externa(String codigo, ProdutoSugestaoResponse sugestao) {
        return new ProdutoLookupResponse(true, sugestao.fonte(), false, codigo, null, sugestao);
    }

    public static ProdutoLookupResponse naoEncontrado(String codigo) {
        return new ProdutoLookupResponse(false, "NAO_ENCONTRADO", false, codigo, null, null);
    }
}
