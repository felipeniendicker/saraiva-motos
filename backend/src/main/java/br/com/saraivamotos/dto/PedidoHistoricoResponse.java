package br.com.saraivamotos.dto;

import java.time.LocalDateTime;

import br.com.saraivamotos.domain.PedidoHistoricoStatus;
import br.com.saraivamotos.domain.StatusPedido;

public record PedidoHistoricoResponse(
        Long id,
        StatusPedido statusAnterior,
        StatusPedido statusNovo,
        LocalDateTime dataHora,
        String operadorEmail,
        String observacao) {
    public static PedidoHistoricoResponse from(PedidoHistoricoStatus registro) {
        return new PedidoHistoricoResponse(registro.getId(), registro.getStatusAnterior(), registro.getStatusNovo(),
                registro.getDataHora(), registro.getOperadorEmail(), registro.getObservacao());
    }
}
