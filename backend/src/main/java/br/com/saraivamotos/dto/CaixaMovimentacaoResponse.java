package br.com.saraivamotos.dto;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import br.com.saraivamotos.domain.*;
public record CaixaMovimentacaoResponse(Long id, TipoMovimentacaoCaixa tipo, BigDecimal valor,
        String descricao, Long vendaId, String operadorEmail, LocalDateTime dataHora) {
    public static CaixaMovimentacaoResponse from(CaixaMovimentacao m) {
        return new CaixaMovimentacaoResponse(m.getId(), m.getTipo(), m.getValor(), m.getDescricao(),
                m.getVendaId(), m.getOperadorEmail(), m.getDataHora());
    }
}
