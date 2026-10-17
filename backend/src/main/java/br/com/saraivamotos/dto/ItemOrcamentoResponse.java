package br.com.saraivamotos.dto;

import java.math.BigDecimal;
import br.com.saraivamotos.domain.*;

public record ItemOrcamentoResponse(Long id,TipoItem tipoItem,Long produtoId,String codigoItem,
        String descricaoItem,Integer quantidade,BigDecimal precoOriginal,BigDecimal precoUnitario,
        Boolean precoAlteradoManualmente,BigDecimal subtotal) {
    public static ItemOrcamentoResponse from(ItemOrcamento i){return new ItemOrcamentoResponse(i.getId(),i.getTipoItem(),
            i.getProduto()==null?null:i.getProduto().getId(),i.getCodigoItem(),i.getDescricaoItem(),i.getQuantidade(),
            i.getPrecoOriginal(),i.getPrecoUnitario(),i.getPrecoAlteradoManualmente(),i.getSubtotal());}
}
