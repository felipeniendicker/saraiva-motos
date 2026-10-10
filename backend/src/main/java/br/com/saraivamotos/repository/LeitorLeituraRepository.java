package br.com.saraivamotos.repository;
import java.util.Optional;
import br.com.saraivamotos.domain.LeitorLeitura;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface LeitorLeituraRepository extends JpaRepository<LeitorLeitura,Long>{
 Optional<LeitorLeitura> findBySessaoIdAndEventoId(String sessaoId,String eventoId);
 @Query(value="SELECT * FROM leitor_leitura WHERE sessao_id=:sessao AND data_consumo IS NULL ORDER BY id LIMIT 1 FOR UPDATE",nativeQuery=true)
 Optional<LeitorLeitura> proximaPendente(@Param("sessao") String sessao);
}
