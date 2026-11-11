package br.com.saraivamotos.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import br.com.saraivamotos.domain.StatusOrcamento;
import br.com.saraivamotos.domain.CondicaoPagamento;
import br.com.saraivamotos.domain.FormaPagamento;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record OrcamentoRequest(
        Long clienteId,
        @NotEmpty List<@Valid ItemOrcamentoRequest> itens,
        @NotNull @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal descontoPercentual,
        @NotNull @FutureOrPresent LocalDate validade,
        @NotNull StatusOrcamento status,
        @Size(max=65535) String observacoes,
        Long versao,
        FormaPagamento formaPagamentoPrevista,
        CondicaoPagamento condicaoPagamentoPrevista,
        LocalDate vencimentoPrevisto,
        @DecimalMin("0.00") BigDecimal entradaPrevista,
        FormaPagamento formaPagamentoEntradaPrevista) {
    public OrcamentoRequest(Long clienteId,List<ItemOrcamentoRequest> itens,BigDecimal descontoPercentual,
            LocalDate validade,StatusOrcamento status,String observacoes,Long versao){
        this(clienteId,itens,descontoPercentual,validade,status,observacoes,versao,null,
                CondicaoPagamento.IMEDIATO,null,BigDecimal.ZERO,null);
    }
}
