package br.com.saraivamotos.service;

public class ProductLookupProviderUnavailableException extends RuntimeException {
    public ProductLookupProviderUnavailableException(String message) {
        super(message);
    }

    public ProductLookupProviderUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
