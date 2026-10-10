package br.com.saraivamotos.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import br.com.saraivamotos.domain.CaixaMovimentacao;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CaixaMovimentacaoRepository extends JpaRepository<CaixaMovimentacao, Long> {
    Optional<CaixaMovimentacao> findByChaveIdempotencia(String chave);
    List<CaixaMovimentacao> findByCaixaIdOrderByDataHoraDescIdDesc(Long caixaId);
    @Query("""
        SELECT COALESCE(SUM(CASE WHEN m.tipo IN (
          br.com.saraivamotos.domain.TipoMovimentacaoCaixa.ENTRADA_AVULSA,
          br.com.saraivamotos.domain.TipoMovimentacaoCaixa.VENDA_DINHEIRO)
          THEN m.valor ELSE -m.valor END), 0)
        FROM CaixaMovimentacao m WHERE m.caixaId = :caixaId
        """)
    BigDecimal saldoMovimentos(@Param("caixaId") Long caixaId);
}
