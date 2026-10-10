package br.com.saraivamotos.exception;

public class ChaveIdempotenciaConflitanteException extends RuntimeException {
    public ChaveIdempotenciaConflitanteException() {
        super("A chave de idempotência já foi utilizada em outra operação ou com conteúdo diferente.");
    }
}
