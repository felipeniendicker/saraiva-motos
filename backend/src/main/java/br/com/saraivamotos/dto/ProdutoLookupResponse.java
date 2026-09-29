package br.com.saraivamotos.dto;

public record ProdutoLookupResponse(
        boolean encontrado,
        String origem,
        boolean cadastradoLocalmente,
        String codigoConsultado,
        ProdutoResponse produto,
        ProdutoSugestaoResponse sugestao,
        String mensagem) {

    public static ProdutoLookupResponse local(String codigo, ProdutoResponse produto) {
        return new ProdutoLookupResponse(true, "LOCAL", true, codigo, produto, null, null);
    }

    public static ProdutoLookupResponse externa(String codigo, ProdutoSugestaoResponse sugestao) {
        return new ProdutoLookupResponse(true, sugestao.fonte(), false, codigo, null, sugestao, null);
    }

    public static ProdutoLookupResponse naoEncontrado(String codigo) {
        return new ProdutoLookupResponse(false, "NAO_ENCONTRADO", false, codigo, null, null, null);
    }

    public static ProdutoLookupResponse indisponivel(String codigo) {
        return new ProdutoLookupResponse(false, "EXTERNO_INDISPONIVEL", false, codigo, null, null,
                "Consulta externa temporariamente indisponível. Você ainda pode cadastrar o produto manualmente.");
    }
}
