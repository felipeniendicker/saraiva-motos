package br.com.saraivamotos.repository;

import java.util.List;
import java.util.Optional;

import br.com.saraivamotos.domain.Produto;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {

    long countByAtivoTrue();

    @Query("SELECT COUNT(p) FROM Produto p WHERE p.ativo = true AND p.quantidadeEstoque <= p.estoqueMinimo")
    long contarEstoqueBaixo();

    @Query("SELECT p FROM Produto p WHERE p.ativo = true AND p.quantidadeEstoque <= p.estoqueMinimo ORDER BY p.quantidadeEstoque, p.nome, p.id")
    List<Produto> buscarEstoqueBaixo();

    @Query("SELECT COALESCE(SUM(p.quantidadeEstoque), 0) FROM Produto p WHERE p.ativo = true")
    Long somarUnidadesAtivas();

    @Query("SELECT COALESCE(SUM(p.valorCusto * p.quantidadeEstoque), 0) FROM Produto p WHERE p.ativo = true")
    BigDecimal calcularValorEstoqueAtivo();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Produto p WHERE p.id = :id")
    Optional<Produto> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Produto p WHERE p.id IN :ids ORDER BY p.id")
    List<Produto> findAllByIdForUpdate(@Param("ids") List<Long> ids);

    Optional<Produto> findByCodigoBarras(String codigoBarras);

    Optional<Produto> findFirstByCodigoBarrasAndAtivoTrue(String codigoBarras);

    Optional<Produto> findFirstByCodigoReferenciaAndAtivoTrueOrderByIdAsc(String codigoReferencia);

    @Query("""
            SELECT p
            FROM Produto p
            WHERE (:incluirInativos = true OR p.ativo = true)
              AND (
                :busca IS NULL
                OR LOWER(p.nome) LIKE LOWER(CONCAT('%', :busca, '%'))
                OR LOWER(p.codigoReferencia) LIKE LOWER(CONCAT('%', :busca, '%'))
                OR LOWER(COALESCE(p.codigoBarras, '')) LIKE LOWER(CONCAT('%', :busca, '%'))
                OR LOWER(COALESCE(p.marca, '')) LIKE LOWER(CONCAT('%', :busca, '%'))
                OR LOWER(COALESCE(p.categoria, '')) LIKE LOWER(CONCAT('%', :busca, '%'))
                OR LOWER(COALESCE(p.aplicacao, '')) LIKE LOWER(CONCAT('%', :busca, '%'))
              )
            ORDER BY p.nome, p.id
            """)
    List<Produto> buscar(
            @Param("busca") String busca,
            @Param("incluirInativos") boolean incluirInativos);
}
