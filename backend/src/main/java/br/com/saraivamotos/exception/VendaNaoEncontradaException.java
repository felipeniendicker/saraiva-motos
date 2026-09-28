package br.com.saraivamotos.exception;

public class VendaNaoEncontradaException extends RuntimeException {
    public VendaNaoEncontradaException(Long id) {
        super("Venda não encontrada para o id " + id + ".");
    }
}
