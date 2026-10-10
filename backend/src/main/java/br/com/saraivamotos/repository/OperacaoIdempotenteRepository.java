package br.com.saraivamotos.repository;

import br.com.saraivamotos.domain.OperacaoIdempotente;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OperacaoIdempotenteRepository extends JpaRepository<OperacaoIdempotente, String> {
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(o) FROM OperacaoIdempotente o WHERE o.vendaId IS NULL AND o.movimentacaoId IS NULL")
    long countPendentes();
}
