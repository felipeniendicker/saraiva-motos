package br.com.saraivamotos.repository;

import java.util.List;
import java.util.Optional;

import br.com.saraivamotos.domain.Pedido;
import br.com.saraivamotos.domain.StatusPedido;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    Optional<Pedido> findByOrcamentoId(Long orcamentoId);

    @EntityGraph(attributePaths = {"itens", "itens.produto"})
    @Query("SELECT DISTINCT p FROM Pedido p WHERE p.id = :id")
    Optional<Pedido> buscarCompleto(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"itens", "itens.produto"})
    @Query("SELECT DISTINCT p FROM Pedido p WHERE p.id = :id")
    Optional<Pedido> buscarParaAtualizar(@Param("id") Long id);

    @EntityGraph(attributePaths = {"itens", "itens.produto"})
    @Query("""
            SELECT DISTINCT p FROM Pedido p
            WHERE (:busca IS NULL
                   OR LOWER(p.numero) LIKE LOWER(CONCAT('%', :busca, '%'))
                   OR LOWER(p.clienteNome) LIKE LOWER(CONCAT('%', :busca, '%')))
              AND (:status IS NULL OR p.status = :status)
            ORDER BY p.dataCriacao DESC, p.id DESC
            """)
    List<Pedido> buscar(@Param("busca") String busca, @Param("status") StatusPedido status);
}
