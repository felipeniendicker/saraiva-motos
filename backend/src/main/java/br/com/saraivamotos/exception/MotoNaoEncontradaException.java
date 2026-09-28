package br.com.saraivamotos.exception;

public class MotoNaoEncontradaException extends RuntimeException {
    public MotoNaoEncontradaException(Long id) { super("Moto não encontrada para o id " + id + "."); }
}
