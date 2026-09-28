package br.com.saraivamotos.exception;

public class ClienteNaoEncontradoException extends RuntimeException {
    public ClienteNaoEncontradoException(Long id) { super("Cliente não encontrado para o id " + id + "."); }
}
