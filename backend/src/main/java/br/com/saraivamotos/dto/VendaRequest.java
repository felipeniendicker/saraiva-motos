package br.com.saraivamotos.dto;

import java.math.BigDecimal;
import java.util.List;
import java.time.LocalDate;

import br.com.saraivamotos.domain.FormaPagamento;
import br.com.saraivamotos.domain.CondicaoPagamento;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record VendaRequest(
        Long clienteId,
        @NotEmpty List<@Valid ItemVendaRequest> itens,
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal desconto,
        @DecimalMin(value = "0.00", inclusive = true) @DecimalMax(value = "100.00", inclusive = true) BigDecimal descontoPercentual,
        @NotNull FormaPagamento formaPagamento,
        @Size(max = 65535) String observacoes,
        CondicaoPagamento condicaoPagamento,
        LocalDate vencimento,
        @DecimalMin(value="0.00",inclusive=true) BigDecimal pagamentoInicial,
        FormaPagamento formaPagamentoInicial) {

    public VendaRequest(Long clienteId, List<ItemVendaRequest> itens, BigDecimal desconto,
            FormaPagamento formaPagamento, String observacoes) {
        this(clienteId, itens, desconto, null, formaPagamento, observacoes, CondicaoPagamento.IMEDIATO, null, null, null);
    }

    public VendaRequest(Long clienteId,List<ItemVendaRequest> itens,BigDecimal desconto,BigDecimal descontoPercentual,
            FormaPagamento formaPagamento,String observacoes){this(clienteId,itens,desconto,descontoPercentual,
            formaPagamento,observacoes,CondicaoPagamento.IMEDIATO,null,null,null);}
}
