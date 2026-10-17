package br.com.saraivamotos.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import br.com.saraivamotos.domain.FormaPagamento;
import br.com.saraivamotos.domain.StatusVenda;
import br.com.saraivamotos.domain.TipoPreco;
import br.com.saraivamotos.domain.CondicaoPagamento;
import br.com.saraivamotos.domain.Venda;

public record VendaResponse(
        Long id,
        String numeroVenda,
        LocalDateTime dataHora,
        StatusVenda status,
        Long clienteId,
        String clienteNome,
        String clienteTipo,
        TipoPreco tipoPrecoUtilizado,
        List<ItemVendaResponse> itens,
        BigDecimal subtotal,
        BigDecimal desconto,
        BigDecimal descontoPercentual,
        BigDecimal total,
        FormaPagamento formaPagamento,
        String observacoes,
        CondicaoPagamento condicaoPagamento,
        java.time.LocalDate vencimento,
        LocalDateTime dataCancelamento,
        String motivoCancelamento) {

    public VendaResponse(Long id,String numeroVenda,LocalDateTime dataHora,StatusVenda status,Long clienteId,
            String clienteNome,String clienteTipo,TipoPreco tipoPrecoUtilizado,List<ItemVendaResponse> itens,
            BigDecimal subtotal,BigDecimal desconto,BigDecimal descontoPercentual,BigDecimal total,
            FormaPagamento formaPagamento,String observacoes,LocalDateTime dataCancelamento,String motivoCancelamento){
        this(id,numeroVenda,dataHora,status,clienteId,clienteNome,clienteTipo,tipoPrecoUtilizado,itens,subtotal,
                desconto,descontoPercentual,total,formaPagamento,observacoes,CondicaoPagamento.IMEDIATO,null,
                dataCancelamento,motivoCancelamento);
    }

    public static VendaResponse from(Venda venda) {
        return new VendaResponse(venda.getId(), venda.getNumeroVenda(), venda.getDataHora(), venda.getStatus(),
                venda.getClienteId(), venda.getClienteNome(), venda.getClienteTipo(), venda.getTipoPrecoUtilizado(),
                venda.getItens().stream().map(ItemVendaResponse::from).toList(), venda.getSubtotal(),
                venda.getDesconto(), venda.getDescontoPercentual(), venda.getTotal(), venda.getFormaPagamento(), venda.getObservacoes(),
                venda.getCondicaoPagamento(), venda.getVencimento(),
                venda.getDataCancelamento(), venda.getMotivoCancelamento());
    }
}
