package br.com.saraivamotos.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import br.com.saraivamotos.domain.ContaReceber;
import br.com.saraivamotos.domain.StatusContaReceber;
import br.com.saraivamotos.domain.Venda;

public record ContaReceberResponse(
        Long id,
        Long vendaId,
        String numeroVenda,
        LocalDateTime dataVenda,
        Long clienteId,
        String clienteNome,
        BigDecimal valorOriginal,
        BigDecimal valorRecebido,
        BigDecimal saldoPendente,
        LocalDate vencimento,
        String situacao,
        LocalDateTime dataCriacao,
        LocalDateTime dataQuitacao,
        String observacoes,
        List<RecebimentoResponse> recebimentos) {

    public static ContaReceberResponse from(ContaReceber conta, Venda venda) {
        boolean pendente = conta.getStatus() == StatusContaReceber.ABERTA
                || conta.getStatus() == StatusContaReceber.PARCIAL;
        String situacao = pendente && conta.getVencimento().isBefore(LocalDate.now())
                ? "VENCIDA"
                : conta.getStatus().name();

        return new ContaReceberResponse(
                conta.getId(),
                conta.getVendaId(),
                venda.getNumeroVenda(),
                venda.getDataHora(),
                conta.getClienteId(),
                venda.getClienteNome(),
                conta.getValorOriginal(),
                conta.getValorRecebido(),
                conta.getSaldoPendente(),
                conta.getVencimento(),
                situacao,
                conta.getDataCriacao(),
                conta.getDataQuitacao(),
                venda.getObservacoes(),
                conta.getRecebimentos().stream().map(RecebimentoResponse::from).toList());
    }
}
