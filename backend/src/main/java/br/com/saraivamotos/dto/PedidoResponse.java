package br.com.saraivamotos.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import br.com.saraivamotos.domain.Pedido;
import br.com.saraivamotos.domain.StatusPedido;
import br.com.saraivamotos.domain.TipoPreco;
import br.com.saraivamotos.domain.CondicaoPagamento;
import br.com.saraivamotos.domain.FormaPagamento;

public record PedidoResponse(
        Long id,
        String numero,
        Long clienteId,
        String clienteNome,
        String clienteTipo,
        Long orcamentoId,
        Long vendaId,
        TipoPreco tipoPrecoUtilizado,
        StatusPedido status,
        BigDecimal subtotal,
        BigDecimal desconto,
        BigDecimal descontoPercentual,
        BigDecimal total,
        FormaPagamento formaPagamentoPrevista,
        CondicaoPagamento condicaoPagamentoPrevista,
        LocalDate vencimentoPrevisto,
        BigDecimal entradaPrevista,
        FormaPagamento formaPagamentoEntradaPrevista,
        LocalDateTime dataCriacao,
        LocalDateTime dataAtualizacao,
        LocalDate previsaoRetirada,
        String observacoes,
        String operadorEmail,
        Long versao,
        List<ItemPedidoResponse> itens,
        List<PedidoHistoricoResponse> historico) {
    public static PedidoResponse from(Pedido pedido) {
        return new PedidoResponse(pedido.getId(), pedido.getNumero(), pedido.getClienteId(), pedido.getClienteNome(),
                pedido.getClienteTipo(), pedido.getOrcamentoId(), pedido.getVendaId(), pedido.getTipoPrecoUtilizado(),
                pedido.getStatus(), pedido.getSubtotal(), pedido.getDesconto(), pedido.getDescontoPercentual(),
                pedido.getTotal(), pedido.getFormaPagamentoPrevista(), pedido.getCondicaoPagamentoPrevista(),
                pedido.getVencimentoPrevisto(), pedido.getEntradaPrevista(), pedido.getFormaPagamentoEntradaPrevista(),
                pedido.getDataCriacao(), pedido.getDataAtualizacao(), pedido.getPrevisaoRetirada(),
                pedido.getObservacoes(), pedido.getOperadorEmail(), pedido.getVersao(),
                pedido.getItens().stream().map(ItemPedidoResponse::from).toList(),
                pedido.getHistorico().stream().map(PedidoHistoricoResponse::from).toList());
    }
}
