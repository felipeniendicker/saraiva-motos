package br.com.saraivamotos.dto;

import java.math.BigDecimal;

import br.com.saraivamotos.domain.ItemVenda;
import br.com.saraivamotos.domain.TipoItem;

public record ItemVendaResponse(
        Long id,
        TipoItem tipoItem,
        Long produtoId,
        String codigoProduto,
        String descricaoProduto,
        Integer quantidade,
        BigDecimal precoOriginal,
        BigDecimal precoUnitario,
        Boolean precoAlteradoManualmente,
        BigDecimal subtotal) {

    public static ItemVendaResponse from(ItemVenda item) {
        return new ItemVendaResponse(item.getId(), item.getTipoItem(),
                item.getProduto() == null ? null : item.getProduto().getId(), item.getCodigoProduto(),
                item.getDescricaoProduto(), item.getQuantidade(), item.getPrecoOriginal(),
                item.getPrecoUnitario(), item.getPrecoAlteradoManualmente(), item.getSubtotal());
    }
}
