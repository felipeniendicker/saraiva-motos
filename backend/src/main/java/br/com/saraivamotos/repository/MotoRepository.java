package br.com.saraivamotos.repository;

import java.util.List;
import br.com.saraivamotos.domain.Moto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MotoRepository extends JpaRepository<Moto, Long> {
    List<Moto> findByClienteIdOrderById(Long clienteId);
}
