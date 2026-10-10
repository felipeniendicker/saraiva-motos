package br.com.saraivamotos.repository;

import java.util.List;
import java.util.Optional;
import br.com.saraivamotos.domain.Caixa;
import br.com.saraivamotos.domain.StatusCaixa;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CaixaRepository extends JpaRepository<Caixa, Long> {
    Optional<Caixa> findFirstByStatus(StatusCaixa status);
    List<Caixa> findTop30ByOrderByDataAberturaDesc();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Caixa c WHERE c.status = :status")
    Optional<Caixa> findByStatusForUpdate(@Param("status") StatusCaixa status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Caixa c WHERE c.id = :id")
    Optional<Caixa> findByIdForUpdate(@Param("id") Long id);
}
