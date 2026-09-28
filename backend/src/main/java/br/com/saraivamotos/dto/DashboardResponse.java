package br.com.saraivamotos.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardResponse(long totalProdutosAtivos, long produtosEstoqueBaixo,
        long totalClientesAtivos, long vendasConcluidas, BigDecimal faturamento,
        List<MovimentacaoEstoqueResponse> movimentacoesRecentes, List<ProdutoResponse> itensEstoqueBaixo) {}
