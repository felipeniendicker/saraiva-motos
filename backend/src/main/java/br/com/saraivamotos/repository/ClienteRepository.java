package br.com.saraivamotos.repository;

import java.util.List;
import br.com.saraivamotos.domain.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    @Query("""
            SELECT c FROM Cliente c
            WHERE (:incluirInativos = true OR c.ativo = true)
              AND (:busca IS NULL
                OR LOWER(c.nomeRazaoSocial) LIKE LOWER(CONCAT('%', :busca, '%'))
                OR LOWER(COALESCE(c.telefone, '')) LIKE LOWER(CONCAT('%', :busca, '%'))
                OR LOWER(COALESCE(c.cpfCnpj, '')) LIKE LOWER(CONCAT('%', :busca, '%')))
            ORDER BY c.nomeRazaoSocial, c.id
            """)
    List<Cliente> buscar(@Param("busca") String busca, @Param("incluirInativos") boolean incluirInativos);
}
