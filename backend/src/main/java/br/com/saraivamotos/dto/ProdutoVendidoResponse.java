package br.com.saraivamotos.dto;
import java.math.BigDecimal;
public record ProdutoVendidoResponse(Long produtoId, String descricao, String codigoProduto,
        long quantidadeVendida, BigDecimal valorVendido) {}
