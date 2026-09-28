package br.com.saraivamotos.dto;
import java.math.BigDecimal;
import java.util.List;
public record EstoqueRelatorioResponse(long produtosAtivos, long produtosEstoqueBaixo, long unidadesEstoque,
        BigDecimal valorEstoqueCusto, List<ProdutoResponse> produtos) {}
