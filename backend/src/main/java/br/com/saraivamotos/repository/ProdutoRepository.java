package br.com.saraivamotos.repository;

import java.util.List;
import java.util.Optional;

import br.com.saraivamotos.domain.Produto;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {

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
