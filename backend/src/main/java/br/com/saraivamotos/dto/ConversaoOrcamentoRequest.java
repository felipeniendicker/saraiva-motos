package br.com.saraivamotos.dto;

import br.com.saraivamotos.domain.FormaPagamento;
import br.com.saraivamotos.domain.CondicaoPagamento;
import java.math.BigDecimal;
import java.time.LocalDate;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ConversaoOrcamentoRequest(
        @NotNull FormaPagamento formaPagamento,
        CondicaoPagamento condicaoPagamento,
        LocalDate vencimento,
        @DecimalMin("0.00") BigDecimal pagamentoInicial,
        FormaPagamento formaPagamentoInicial,
        @Size(max=65535) String observacoes) {
    public ConversaoOrcamentoRequest(FormaPagamento formaPagamento,String observacoes){
        this(formaPagamento,CondicaoPagamento.IMEDIATO,null,null,null,observacoes);
    }
}
