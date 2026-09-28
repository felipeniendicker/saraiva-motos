package br.com.saraivamotos.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import br.com.saraivamotos.domain.StatusVenda;
import br.com.saraivamotos.domain.Venda;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VendaRepository extends JpaRepository<Venda, Long> {
    @EntityGraph(attributePaths = {"itens", "itens.produto"})
    @Query("SELECT DISTINCT v FROM Venda v WHERE v.id = :id")
    Optional<Venda> buscarCompletaPorId(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"itens", "itens.produto"})
    @Query("SELECT DISTINCT v FROM Venda v WHERE v.id = :id")
    Optional<Venda> buscarCompletaPorIdParaAtualizar(@Param("id") Long id);

    @EntityGraph(attributePaths = {"itens", "itens.produto"})
    @Query("""
            SELECT DISTINCT v FROM Venda v
            WHERE (:numero IS NULL OR LOWER(v.numeroVenda) LIKE LOWER(CONCAT('%', :numero, '%')))
              AND (:status IS NULL OR v.status = :status)
              AND (:inicio IS NULL OR v.dataHora >= :inicio)
              AND (:fim IS NULL OR v.dataHora < :fim)
            ORDER BY v.dataHora DESC, v.id DESC
            """)
    List<Venda> buscar(@Param("numero") String numero, @Param("status") StatusVenda status,
            @Param("inicio") LocalDateTime inicio, @Param("fim") LocalDateTime fim);
}
