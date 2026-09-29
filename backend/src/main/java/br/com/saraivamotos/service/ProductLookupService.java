package br.com.saraivamotos.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.saraivamotos.domain.Produto;
import br.com.saraivamotos.dto.ProdutoLookupResponse;
import br.com.saraivamotos.dto.ProdutoResponse;
import br.com.saraivamotos.dto.ProdutoSugestaoResponse;
import br.com.saraivamotos.exception.CodigoProdutoAmbiguoException;
import br.com.saraivamotos.repository.ProdutoRepository;

@Service
public class ProductLookupService {

    private final ProdutoRepository repository;
    private final List<ProductLookupProvider> providers;

    public ProductLookupService(ProdutoRepository repository, List<ProductLookupProvider> providers) {
        this.repository = repository;
        this.providers = List.copyOf(providers);
    }

    @Transactional(readOnly = true)
    public ProdutoLookupResponse lookup(String codigo) {
        String normalized = normalize(codigo);
        Produto local = repository.findByCodigoBarras(normalized).orElse(null);
        if (local == null) {
            List<Produto> references = repository.findByCodigoReferenciaOrderByIdAsc(normalized);
            if (references.size() > 1) throw new CodigoProdutoAmbiguoException();
            local = references.stream().findFirst().orElse(null);
        }
        if (local != null) {
            return ProdutoLookupResponse.local(normalized, ProdutoResponse.from(local));
        }

        for (ProductLookupProvider provider : providers) {
            var suggestion = provider.lookup(normalized);
            if (suggestion.isPresent()) {
                ProdutoSugestaoResponse value = suggestion.get();
                return ProdutoLookupResponse.externa(normalized, value);
            }
        }
        return ProdutoLookupResponse.naoEncontrado(normalized);
    }

    private String normalize(String codigo) {
        if (codigo == null || codigo.isBlank()) {
            throw new IllegalArgumentException("Informe um código de barras ou referência.");
        }
        return codigo.trim().replaceAll("\\s+", "");
    }
}
