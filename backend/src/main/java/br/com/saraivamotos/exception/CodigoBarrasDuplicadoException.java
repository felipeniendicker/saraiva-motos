package br.com.saraivamotos.exception;

public class CodigoBarrasDuplicadoException extends RuntimeException {

    public CodigoBarrasDuplicadoException() {
        super("Código de barras já cadastrado.");
    }
}
