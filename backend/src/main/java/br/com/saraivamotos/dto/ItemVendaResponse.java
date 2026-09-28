package br.com.saraivamotos.dto;

import java.math.BigDecimal;

import br.com.saraivamotos.domain.ItemVenda;

public record ItemVendaResponse(
        Long id,
        Long produtoId,
        String codigoProduto,
        String descricaoProduto,
        Integer quantidade,
        BigDecimal precoOriginal,
        BigDecimal precoUnitario,
        BigDecimal subtotal) {

    public static ItemVendaResponse from(ItemVenda item) {
        return new ItemVendaResponse(item.getId(), item.getProduto().getId(), item.getCodigoProduto(),
                item.getDescricaoProduto(), item.getQuantidade(), item.getPrecoOriginal(),
                item.getPrecoUnitario(), item.getSubtotal());
    }
}
