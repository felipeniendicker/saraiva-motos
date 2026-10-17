package br.com.saraivamotos.repository;import java.util.*;import br.com.saraivamotos.domain.Recebimento;import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;
public interface RecebimentoRepository extends JpaRepository<Recebimento,Long>{
 Optional<Recebimento> findByChaveIdempotencia(String chave);
 @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)@Query("SELECT r FROM Recebimento r WHERE r.id=:id")Optional<Recebimento> buscarParaAtualizar(@Param("id")Long id);
 @Query("SELECT r.formaPagamento,COALESCE(SUM(r.valor),0) FROM Recebimento r WHERE r.caixaId=:caixaId GROUP BY r.formaPagamento")List<Object[]> totaisPorFormaNoCaixa(@Param("caixaId")Long caixaId);
 @Query("SELECT COALESCE(SUM(r.valor),0) FROM Recebimento r WHERE r.caixaEstornoId=:caixaId AND r.estornado=true")java.math.BigDecimal totalEstornosNoCaixa(@Param("caixaId")Long caixaId);
 @Query("SELECT r.formaPagamento,COALESCE(SUM(r.valor),0) FROM Recebimento r WHERE (:inicio IS NULL OR r.dataHora>=:inicio) AND (:fim IS NULL OR r.dataHora<:fim) GROUP BY r.formaPagamento")List<Object[]> totaisPorPeriodo(@Param("inicio")java.time.LocalDateTime inicio,@Param("fim")java.time.LocalDateTime fim);
 @Query("SELECT COALESCE(SUM(r.valor),0) FROM Recebimento r WHERE r.estornado=true AND (:inicio IS NULL OR r.dataEstorno>=:inicio) AND (:fim IS NULL OR r.dataEstorno<:fim)")java.math.BigDecimal estornosPorPeriodo(@Param("inicio")java.time.LocalDateTime inicio,@Param("fim")java.time.LocalDateTime fim);
}
