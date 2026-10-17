package br.com.saraivamotos.dto;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import br.com.saraivamotos.domain.*;

public record OrcamentoResponse(Long id,String numero,Long clienteId,String clienteNome,String clienteTipo,
        TipoPreco tipoPrecoUtilizado,StatusOrcamento status,LocalDateTime dataEmissao,LocalDateTime dataAtualizacao,
        LocalDate validade,BigDecimal subtotal,BigDecimal desconto,BigDecimal descontoPercentual,BigDecimal total,
        String observacoes,String operadorEmail,Long vendaId,LocalDateTime dataCancelamento,String motivoCancelamento,
        Long versao,List<ItemOrcamentoResponse> itens) {
    public static OrcamentoResponse from(Orcamento o){return new OrcamentoResponse(o.getId(),o.getNumero(),o.getClienteId(),
            o.getClienteNome(),o.getClienteTipo(),o.getTipoPrecoUtilizado(),o.getStatus(),o.getDataEmissao(),o.getDataAtualizacao(),
            o.getValidade(),o.getSubtotal(),o.getDesconto(),o.getDescontoPercentual(),o.getTotal(),o.getObservacoes(),
            o.getOperadorEmail(),o.getVendaId(),o.getDataCancelamento(),o.getMotivoCancelamento(),o.getVersao(),
            o.getItens().stream().map(ItemOrcamentoResponse::from).toList());}
}
