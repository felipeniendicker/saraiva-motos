package br.com.saraivamotos.service;

import java.math.BigDecimal;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {
    private final ProdutoRepository produtos;
    private final ClienteRepository clientes;
    private final VendaRepository vendas;
    private final MovimentacaoEstoqueRepository movimentacoes;
    public DashboardService(ProdutoRepository produtos, ClienteRepository clientes, VendaRepository vendas,
            MovimentacaoEstoqueRepository movimentacoes) {
        this.produtos = produtos; this.clientes = clientes; this.vendas = vendas; this.movimentacoes = movimentacoes;
    }
    @Transactional(readOnly = true)
    public DashboardResponse consultar() {
        Object[] resumo = vendas.resumirConcluidas(null, null).get(0);
        return new DashboardResponse(produtos.countByAtivoTrue(), produtos.contarEstoqueBaixo(),
                clientes.countByAtivoTrue(), numero(resumo[0]).longValue(), decimal(resumo[1]),
                movimentacoes.findByOrderByDataHoraDescIdDesc(PageRequest.of(0, 6)).stream().map(MovimentacaoEstoqueResponse::from).toList(),
                produtos.buscarEstoqueBaixo().stream().map(ProdutoResponse::from).toList());
    }
    private Number numero(Object valor) { return valor == null ? 0L : (Number) valor; }
    private BigDecimal decimal(Object valor) { return valor == null ? BigDecimal.ZERO : (BigDecimal) valor; }
}
