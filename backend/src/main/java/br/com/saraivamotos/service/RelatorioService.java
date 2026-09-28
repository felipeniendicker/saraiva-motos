package br.com.saraivamotos.service;

import java.math.*;
import java.time.*;
import java.util.List;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RelatorioService {
    private final VendaRepository vendas;
    private final ProdutoRepository produtos;
    public RelatorioService(VendaRepository vendas, ProdutoRepository produtos) { this.vendas = vendas; this.produtos = produtos; }

    @Transactional(readOnly = true)
    public RelatorioVendasResponse vendas(LocalDate dataInicio, LocalDate dataFim) {
        validarPeriodo(dataInicio, dataFim);
        LocalDateTime inicio = dataInicio == null ? null : dataInicio.atStartOfDay();
        LocalDateTime fim = dataFim == null ? null : dataFim.plusDays(1).atStartOfDay();
        Object[] agregado = vendas.resumirConcluidas(inicio, fim).get(0);
        long quantidade = ((Number) agregado[0]).longValue();
        BigDecimal faturamento = dinheiro((BigDecimal) agregado[1]);
        BigDecimal descontos = dinheiro((BigDecimal) agregado[2]);
        BigDecimal ticket = quantidade == 0 ? BigDecimal.ZERO.setScale(2) : faturamento.divide(BigDecimal.valueOf(quantidade), 2, RoundingMode.HALF_UP);
        long itens = vendas.somarItensConcluidos(inicio, fim);
        ResumoVendasResponse resumo = new ResumoVendasResponse(quantidade, faturamento, ticket, descontos, itens);
        List<ProdutoVendidoResponse> ranking = vendas.rankingProdutos(inicio, fim).stream().map(linha ->
                new ProdutoVendidoResponse(((Number) linha[0]).longValue(), (String) linha[1], (String) linha[2],
                        ((Number) linha[3]).longValue(), dinheiro((BigDecimal) linha[4]))).toList();
        return new RelatorioVendasResponse(dataInicio, dataFim, resumo, ranking,
                vendas.buscar(null, null, inicio, fim).stream().map(VendaResponse::from).toList());
    }

    @Transactional(readOnly = true)
    public EstoqueRelatorioResponse estoque(boolean incluirInativos) {
        return new EstoqueRelatorioResponse(produtos.countByAtivoTrue(), produtos.contarEstoqueBaixo(),
                produtos.somarUnidadesAtivas(), dinheiro(produtos.calcularValorEstoqueAtivo()),
                produtos.buscar(null, incluirInativos).stream().map(ProdutoResponse::from).toList());
    }
    private void validarPeriodo(LocalDate inicio, LocalDate fim) {
        if (inicio != null && fim != null && fim.isBefore(inicio)) throw new IllegalArgumentException("A data final não pode ser anterior à data inicial.");
    }
    private BigDecimal dinheiro(BigDecimal valor) { return (valor == null ? BigDecimal.ZERO : valor).setScale(2, RoundingMode.HALF_UP); }
}
