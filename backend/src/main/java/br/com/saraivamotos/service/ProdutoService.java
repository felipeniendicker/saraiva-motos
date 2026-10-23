package br.com.saraivamotos.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import br.com.saraivamotos.domain.Produto;
import br.com.saraivamotos.dto.EntradaEstoqueRequest;
import br.com.saraivamotos.dto.ProdutoRequest;
import br.com.saraivamotos.dto.ProdutoResponse;
import br.com.saraivamotos.exception.CodigoBarrasDuplicadoException;
import br.com.saraivamotos.exception.CodigoProdutoAmbiguoException;
import br.com.saraivamotos.exception.ProdutoNaoEncontradoException;
import br.com.saraivamotos.repository.ProdutoRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProdutoService {

    private final ProdutoRepository repository;
    private final EstoqueService estoqueService;

    public ProdutoService(ProdutoRepository repository, EstoqueService estoqueService) {
        this.repository = repository;
        this.estoqueService = estoqueService;
    }

    @Transactional
    public ProdutoResponse criar(ProdutoRequest request) {
        int quantidadeInicial = validarQuantidadeInicial(request.quantidadeEstoque());
        Produto produto = new Produto();
        aplicarDados(produto, request);
        produto.setQuantidadeEstoque(0);
        validarCodigoBarras(produto.getCodigoBarras(), null);
        produto.setAtivo(true);
        produto.setDataCadastro(LocalDateTime.now());
        Produto produtoSalvo = repository.save(produto);
        if (quantidadeInicial > 0) {
            estoqueService.registrarEntradaInicial(
                    produtoSalvo,
                    new EntradaEstoqueRequest(produtoSalvo.getId(), quantidadeInicial, "Estoque inicial do cadastro"));
        }
        return ProdutoResponse.from(produtoSalvo);
    }

    private int validarQuantidadeInicial(BigDecimal quantidade) {
        if (quantidade == null || quantidade.signum() < 0) {
            throw new IllegalArgumentException("A quantidade inicial não pode ser negativa.");
        }
        try {
            return quantidade.intValueExact();
        } catch (ArithmeticException exception) {
            throw new IllegalArgumentException(
                    "A quantidade inicial deve ser um número inteiro dentro do limite suportado.");
        }
    }

    @Transactional(readOnly = true)
    public List<ProdutoResponse> listar(String busca, boolean incluirInativos) {
        String buscaNormalizada = normalizarOpcional(busca);
        return repository.buscar(buscaNormalizada, incluirInativos).stream()
                .map(ProdutoResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProdutoResponse buscarPorId(Long id) {
        return ProdutoResponse.from(encontrarPorId(id));
    }

    @Transactional(readOnly = true)
    public ProdutoResponse buscarPorCodigo(String codigo) {
        String codigoNormalizado = normalizarObrigatorio(codigo);
        Produto produto = repository.findFirstByCodigoBarrasAndAtivoTrue(codigoNormalizado)
                .orElseGet(() -> buscarReferenciaAtivaSemAmbiguidade(codigoNormalizado));
        return ProdutoResponse.from(produto);
    }

    private Produto buscarReferenciaAtivaSemAmbiguidade(String codigo) {
        List<Produto> encontrados = repository.findByCodigoReferenciaAndAtivoTrueOrderByIdAsc(codigo);
        if (encontrados.size() > 1) {
            throw new CodigoProdutoAmbiguoException();
        }
        return encontrados.stream().findFirst().orElseThrow(() -> new ProdutoNaoEncontradoException(
                "Produto ativo não encontrado para o código informado."));
    }

    @Transactional
    public ProdutoResponse atualizar(Long id, ProdutoRequest request) {
        Produto produto = encontrarPorIdParaAtualizar(id);
        Integer estoqueAtual = produto.getQuantidadeEstoque();
        String codigoBarras = normalizarCodigoBarras(request.codigoBarras());
        validarCodigoBarras(codigoBarras, id);
        aplicarDados(produto, request);
        produto.setQuantidadeEstoque(estoqueAtual);
        return ProdutoResponse.from(repository.save(produto));
    }

    @Transactional
    public ProdutoResponse desativar(Long id) {
        Produto produto = encontrarPorIdParaAtualizar(id);
        produto.setAtivo(false);
        return ProdutoResponse.from(repository.save(produto));
    }

    @Transactional
    public ProdutoResponse reativar(Long id) {
        Produto produto = encontrarPorIdParaAtualizar(id);
        produto.setAtivo(true);
        return ProdutoResponse.from(repository.save(produto));
    }

    private Produto encontrarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ProdutoNaoEncontradoException(
                        "Produto não encontrado para o id " + id + "."));
    }

    private Produto encontrarPorIdParaAtualizar(Long id) {
        return repository.findByIdForUpdate(id)
                .orElseThrow(() -> new ProdutoNaoEncontradoException(
                        "Produto não encontrado para o id " + id + "."));
    }

    private void validarCodigoBarras(String codigoBarras, Long produtoId) {
        if (codigoBarras == null) {
            return;
        }

        repository.findByCodigoBarras(codigoBarras)
                .filter(produto -> !produto.getId().equals(produtoId))
                .ifPresent(produto -> {
                    throw new CodigoBarrasDuplicadoException();
                });
    }

    private void aplicarDados(Produto produto, ProdutoRequest request) {
        produto.setNome(request.nome().trim());
        produto.setCodigoReferencia(normalizarReferencia(request.codigoReferencia()));
        produto.setCodigoBarras(normalizarCodigoBarras(request.codigoBarras()));
        produto.setMarca(normalizarOpcional(request.marca()));
        produto.setCategoria(normalizarOpcional(request.categoria()));
        produto.setAplicacao(normalizarOpcional(request.aplicacao()));
        produto.setValorCusto(request.valorCusto());
        produto.setPrecoVarejo(request.precoVarejo());
        produto.setPrecoRevenda(request.precoRevenda());
        produto.setEstoqueMinimo(request.estoqueMinimo());
        produto.setObservacoes(normalizarOpcional(request.observacoes()));
    }

    private String normalizarReferencia(String value) {
        String normalized = normalizarOpcional(value);
        return normalized == null ? "" : normalized;
    }

    private String normalizarObrigatorio(String value) {
        String normalized = normalizarOpcional(value);
        if (normalized == null) {
            throw new ProdutoNaoEncontradoException("Código de produto não informado.");
        }
        return normalized;
    }

    private String normalizarOpcional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizarCodigoBarras(String value) {
        String normalized = normalizarOpcional(value);
        return normalized == null ? null : normalized.replaceAll("\\s+", "");
    }
}
