package br.com.saraivamotos.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import br.com.saraivamotos.domain.FormaPagamento;
import br.com.saraivamotos.domain.Recebimento;

public record RecebimentoResponse(
        Long id,
        BigDecimal valor,
        FormaPagamento formaPagamento,
        LocalDateTime dataHora,
        String operadorEmail,
        Boolean estornado,
        LocalDateTime dataEstorno,
        String motivoEstorno,
        String operadorEstornoEmail) {

    public static RecebimentoResponse from(Recebimento recebimento) {
        return new RecebimentoResponse(
                recebimento.getId(),
                recebimento.getValor(),
                recebimento.getFormaPagamento(),
                recebimento.getDataHora(),
                recebimento.getOperadorEmail(),
                recebimento.getEstornado(),
                recebimento.getDataEstorno(),
                recebimento.getMotivoEstorno(),
                recebimento.getOperadorEstornoEmail());
    }
}
