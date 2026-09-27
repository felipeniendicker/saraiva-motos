package br.com.saraivamotos.repository;

import java.util.List;

import br.com.saraivamotos.domain.MovimentacaoEstoque;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MovimentacaoEstoqueRepository extends JpaRepository<MovimentacaoEstoque, Long> {

    @EntityGraph(attributePaths = "produto")
    List<MovimentacaoEstoque> findAllByOrderByDataHoraDescIdDesc();

    @EntityGraph(attributePaths = "produto")
    List<MovimentacaoEstoque> findByProdutoIdOrderByDataHoraDescIdDesc(Long produtoId);
}
