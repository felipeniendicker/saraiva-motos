package br.com.saraivamotos.service;

import java.util.List;
import java.util.ArrayList;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.OrderComparator;
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

    private static final Logger LOGGER = LoggerFactory.getLogger(ProductLookupService.class);
    private final ProdutoRepository repository;
    private final List<ProductLookupProvider> providers;

    public ProductLookupService(ProdutoRepository repository, List<ProductLookupProvider> providers) {
        this.repository = repository;
        List<ProductLookupProvider> orderedProviders = new ArrayList<>(providers);
        OrderComparator.sort(orderedProviders);
        this.providers = List.copyOf(orderedProviders);
        String activeProviders = this.providers.isEmpty()
                ? "NENHUM"
                : this.providers.stream().map(this::providerName).collect(Collectors.joining(","));
        LOGGER.info("Providers de consulta de produtos ativos: {}", activeProviders);
    }

    @Transactional(readOnly = true)
    public ProdutoLookupResponse lookup(String codigo) {
        return lookup(codigo, false);
    }

    @Transactional(readOnly = true)
    public ProdutoLookupResponse lookup(String codigo, boolean forceRefresh) {
        String normalized = normalize(codigo);
        Produto local = repository.findByCodigoBarras(normalized).orElse(null);
        if (local == null) {
            local = GtinNormalizer.equivalents(normalized).stream()
                    .filter(candidate -> !candidate.equals(normalized))
                    .map(repository::findByCodigoBarras)
                    .flatMap(java.util.Optional::stream)
                    .findFirst().orElse(null);
        }
        if (local == null) {
            List<Produto> references = repository.findByCodigoReferenciaOrderByIdAsc(normalized);
            if (references.size() > 1) throw new CodigoProdutoAmbiguoException();
            local = references.stream().findFirst().orElse(null);
        }
        if (local != null) {
            return ProdutoLookupResponse.local(normalized, ProdutoResponse.from(local));
        }

        int attemptedProviders = 0;
        int normalResponses = 0;
        int unavailableResponses = 0;
        for (ProductLookupProvider provider : providers) {
            if (!provider.supports(normalized)) continue;
            String providerName = providerName(provider);
            boolean fallback = attemptedProviders > 0;
            attemptedProviders++;
            LOGGER.info("Consulta externa iniciada provider={} codigo={} fallback={}",
                    providerName, normalized, fallback);
            try {
                var suggestion = forceRefresh
                        ? provider.lookup(normalized, true)
                        : provider.lookup(normalized);
                normalResponses++;
                if (suggestion.isPresent()) {
                    ProdutoSugestaoResponse value = suggestion.get();
                    return ProdutoLookupResponse.externa(normalized, value);
                }
            } catch (ProductLookupProviderUnavailableException exception) {
                unavailableResponses++;
            }
        }
        if (normalResponses > 0) {
            LOGGER.info("Consulta externa finalizada codigo={} resultado=NAO_ENCONTRADO providersNormais={} providersIndisponiveis={}",
                    normalized, normalResponses, unavailableResponses);
            return ProdutoLookupResponse.naoEncontrado(normalized);
        }
        if (unavailableResponses > 0) {
            LOGGER.warn("Consulta externa finalizada codigo={} resultado=EXTERNO_INDISPONIVEL providersIndisponiveis={}",
                    normalized, unavailableResponses);
            return ProdutoLookupResponse.indisponivel(normalized);
        }
        return ProdutoLookupResponse.naoEncontrado(normalized);
    }

    private String providerName(ProductLookupProvider provider) {
        String name = provider.providerName();
        return name == null || name.isBlank() ? provider.getClass().getSimpleName() : name;
    }

    private String normalize(String codigo) {
        if (codigo == null || codigo.isBlank()) {
            throw new IllegalArgumentException("Informe um código de barras ou referência.");
        }
        return GtinNormalizer.normalizeInput(codigo);
    }
}
