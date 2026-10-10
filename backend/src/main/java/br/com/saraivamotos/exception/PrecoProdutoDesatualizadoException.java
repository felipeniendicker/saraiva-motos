package br.com.saraivamotos.exception;

public class PrecoProdutoDesatualizadoException extends RuntimeException {
    public PrecoProdutoDesatualizadoException(String produto) {
        super("O preço de " + produto + " foi alterado em outro computador. Revise os preços e confirme a venda novamente.");
    }
}
