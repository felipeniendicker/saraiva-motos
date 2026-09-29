package br.com.saraivamotos.exception;

public class CodigoProdutoAmbiguoException extends RuntimeException {
    public CodigoProdutoAmbiguoException() {
        super("Mais de um produto possui essa referência. Use a busca manual.");
    }
}
