package br.com.saraivamotos.repository;
import java.util.Optional;
import br.com.saraivamotos.domain.LeitorSessao;
import org.springframework.data.jpa.repository.JpaRepository;
public interface LeitorSessaoRepository extends JpaRepository<LeitorSessao,String>{Optional<LeitorSessao> findByTokenHash(String hash);}
