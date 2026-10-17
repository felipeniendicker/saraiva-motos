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
    private final RecebimentoRepository recebimentos;private final ContaReceberRepository contas;private final CaixaMovimentacaoRepository movimentos;
    public RelatorioService(VendaRepository vendas, ProdutoRepository produtos,RecebimentoRepository recebimentos,ContaReceberRepository contas,CaixaMovimentacaoRepository movimentos) { this.vendas = vendas; this.produtos = produtos;this.recebimentos=recebimentos;this.contas=contas;this.movimentos=movimentos; }

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
    @Transactional(readOnly=true) public RelatorioFinanceiroResponse financeiro(LocalDate dataInicio,LocalDate dataFim){validarPeriodo(dataInicio,dataFim);LocalDateTime inicio=dataInicio==null?null:dataInicio.atStartOfDay();LocalDateTime fim=dataFim==null?null:dataFim.plusDays(1).atStartOfDay();java.util.Map<br.com.saraivamotos.domain.FormaPagamento,BigDecimal> totais=new java.util.EnumMap<>(br.com.saraivamotos.domain.FormaPagamento.class);for(var f:br.com.saraivamotos.domain.FormaPagamento.values())totais.put(f,BigDecimal.ZERO.setScale(2));vendas.totaisImediatosPorPeriodo(inicio,fim).forEach(r->totais.merge((br.com.saraivamotos.domain.FormaPagamento)r[0],dinheiro((BigDecimal)r[1]),BigDecimal::add));recebimentos.totaisPorPeriodo(inicio,fim).forEach(r->totais.merge((br.com.saraivamotos.domain.FormaPagamento)r[0],dinheiro((BigDecimal)r[1]),BigDecimal::add));BigDecimal recebido=dinheiro(totais.values().stream().reduce(BigDecimal.ZERO,BigDecimal::add));BigDecimal estornos=dinheiro(recebimentos.estornosPorPeriodo(inicio,fim).add(movimentos.devolucoesVendasPorPeriodo(inicio,fim)));Object[] agregado=vendas.resumirConcluidas(inicio,fim).get(0);return new RelatorioFinanceiroResponse(dataInicio,dataFim,dinheiro((BigDecimal)agregado[1]),recebido,totais.get(br.com.saraivamotos.domain.FormaPagamento.DINHEIRO),totais.get(br.com.saraivamotos.domain.FormaPagamento.PIX),totais.get(br.com.saraivamotos.domain.FormaPagamento.CARTAO_DEBITO),totais.get(br.com.saraivamotos.domain.FormaPagamento.CARTAO_CREDITO),totais.get(br.com.saraivamotos.domain.FormaPagamento.OUTRO),dinheiro(contas.totalPendente()),dinheiro(contas.totalVencido()),estornos,dinheiro(recebido.subtract(estornos)));}
    private void validarPeriodo(LocalDate inicio, LocalDate fim) {
        if (inicio != null && fim != null && fim.isBefore(inicio)) throw new IllegalArgumentException("A data final não pode ser anterior à data inicial.");
    }
    private BigDecimal dinheiro(BigDecimal valor) { return (valor == null ? BigDecimal.ZERO : valor).setScale(2, RoundingMode.HALF_UP); }
}
