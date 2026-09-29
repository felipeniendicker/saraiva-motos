package br.com.saraivamotos.service;

import java.util.Optional;

import br.com.saraivamotos.dto.ProdutoSugestaoResponse;

public interface ProductLookupProvider {
    Optional<ProdutoSugestaoResponse> lookup(String codigo);
}
