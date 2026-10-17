package br.com.saraivamotos.repository;

import java.util.List;
import java.util.Optional;
import br.com.saraivamotos.domain.Orcamento;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface OrcamentoRepository extends JpaRepository<Orcamento,Long> {
    @EntityGraph(attributePaths={"itens","itens.produto"}) List<Orcamento> findAllByOrderByDataEmissaoDescIdDesc();
    @EntityGraph(attributePaths={"itens","itens.produto"}) @Query("SELECT DISTINCT o FROM Orcamento o WHERE o.id=:id") Optional<Orcamento> buscarCompleto(@Param("id") Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @EntityGraph(attributePaths={"itens","itens.produto"}) @Query("SELECT DISTINCT o FROM Orcamento o WHERE o.id=:id") Optional<Orcamento> buscarParaAtualizar(@Param("id") Long id);
}
