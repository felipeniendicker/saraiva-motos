package br.com.saraivamotos.dto;

import java.math.BigDecimal;

import br.com.saraivamotos.domain.ItemPedido;
import br.com.saraivamotos.domain.TipoItem;

public record ItemPedidoResponse(
        Long id,
        TipoItem tipoItem,
        Long produtoId,
        String codigoItem,
        String descricaoItem,
        Integer quantidade,
        BigDecimal precoOriginal,
        BigDecimal precoUnitario,
        Boolean precoAlteradoManualmente,
        BigDecimal subtotal) {
    public static ItemPedidoResponse from(ItemPedido item) {
        return new ItemPedidoResponse(item.getId(), item.getTipoItem(),
                item.getProduto() == null ? null : item.getProduto().getId(), item.getCodigoItem(),
                item.getDescricaoItem(), item.getQuantidade(), item.getPrecoOriginal(), item.getPrecoUnitario(),
                item.getPrecoAlteradoManualmente(), item.getSubtotal());
    }
}
