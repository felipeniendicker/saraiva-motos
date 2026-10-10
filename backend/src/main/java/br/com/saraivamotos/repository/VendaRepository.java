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
    @Query("SELECT v.formaPagamento, COALESCE(SUM(v.total), 0) FROM Venda v WHERE v.caixaId = :caixaId AND v.status = br.com.saraivamotos.domain.StatusVenda.CONCLUIDA GROUP BY v.formaPagamento")
    List<Object[]> totaisPorFormaNoCaixa(@Param("caixaId") Long caixaId);
    @Query("""
            SELECT COUNT(v), COALESCE(SUM(v.total), 0), COALESCE(SUM(v.desconto), 0)
            FROM Venda v WHERE v.status = br.com.saraivamotos.domain.StatusVenda.CONCLUIDA
              AND (:inicio IS NULL OR v.dataHora >= :inicio) AND (:fim IS NULL OR v.dataHora < :fim)
            """)
    List<Object[]> resumirConcluidas(@Param("inicio") LocalDateTime inicio, @Param("fim") LocalDateTime fim);

    @Query("""
            SELECT COALESCE(SUM(i.quantidade), 0) FROM ItemVenda i
            WHERE i.venda.status = br.com.saraivamotos.domain.StatusVenda.CONCLUIDA
              AND (:inicio IS NULL OR i.venda.dataHora >= :inicio) AND (:fim IS NULL OR i.venda.dataHora < :fim)
            """)
    Long somarItensConcluidos(@Param("inicio") LocalDateTime inicio, @Param("fim") LocalDateTime fim);

    @Query("""
            SELECT i.produto.id, i.descricaoProduto, i.codigoProduto, SUM(i.quantidade), SUM(i.subtotal)
            FROM ItemVenda i WHERE i.venda.status = br.com.saraivamotos.domain.StatusVenda.CONCLUIDA
              AND (:inicio IS NULL OR i.venda.dataHora >= :inicio) AND (:fim IS NULL OR i.venda.dataHora < :fim)
            GROUP BY i.produto.id, i.descricaoProduto, i.codigoProduto
            ORDER BY SUM(i.quantidade) DESC, i.descricaoProduto ASC, i.produto.id ASC
            """)
    List<Object[]> rankingProdutos(@Param("inicio") LocalDateTime inicio, @Param("fim") LocalDateTime fim);
    @EntityGraph(attributePaths = {"itens", "itens.produto"})
    @Query("SELECT DISTINCT v FROM Venda v WHERE v.id = :id")
    Optional<Venda> buscarCompletaPorId(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"itens", "itens.produto"})
    @Query("SELECT DISTINCT v FROM Venda v WHERE v.id = :id")
    Optional<Venda> buscarCompletaPorIdParaAtualizar(@Param("id") Long id);

    @EntityGraph(attributePaths = {"itens", "itens.produto"})
    List<Venda> findByClienteIdOrderByDataHoraDescIdDesc(Long clienteId);

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
