package br.com.saraivamotos.dto;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import br.com.saraivamotos.domain.StatusCaixa;
public record CaixaResponse(Long id, StatusCaixa status, BigDecimal valorInicial, BigDecimal saldoEsperado,
        BigDecimal valorContado, BigDecimal diferenca, LocalDateTime dataAbertura, LocalDateTime dataFechamento,
        String operadorAberturaEmail, String operadorFechamentoEmail, BigDecimal totalDinheiro,
        BigDecimal totalPix, BigDecimal totalCartaoDebito, BigDecimal totalCartaoCredito, BigDecimal totalOutro,
        List<CaixaMovimentacaoResponse> movimentacoes) {}
