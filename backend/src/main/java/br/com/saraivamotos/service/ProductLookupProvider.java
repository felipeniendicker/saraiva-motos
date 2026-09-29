package br.com.saraivamotos.service;

import java.util.Optional;

import br.com.saraivamotos.dto.ProdutoSugestaoResponse;

public interface ProductLookupProvider {
    default boolean supports(String codigo) {
        return true;
    }

    Optional<ProdutoSugestaoResponse> lookup(String codigo);
}
