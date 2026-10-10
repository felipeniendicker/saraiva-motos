package br.com.saraivamotos.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity @Table(name = "caixa")
public class Caixa {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private StatusCaixa status;
    @Column(name = "valor_inicial", nullable = false, precision = 15, scale = 2) private BigDecimal valorInicial;
    @Column(name = "data_abertura", nullable = false) private LocalDateTime dataAbertura;
    @Column(name = "operador_abertura_id", nullable = false) private Long operadorAberturaId;
    @Column(name = "operador_abertura_email", nullable = false, length = 254) private String operadorAberturaEmail;
    @Column(name = "data_fechamento") private LocalDateTime dataFechamento;
    @Column(name = "operador_fechamento_id") private Long operadorFechamentoId;
    @Column(name = "operador_fechamento_email", length = 254) private String operadorFechamentoEmail;
    @Column(name = "valor_contado", precision = 15, scale = 2) private BigDecimal valorContado;
    @Column(name = "saldo_esperado_fechamento", precision = 15, scale = 2) private BigDecimal saldoEsperadoFechamento;
    @Column(name = "diferenca_fechamento", precision = 15, scale = 2) private BigDecimal diferencaFechamento;
    @Column(name = "total_dinheiro", precision = 15, scale = 2) private BigDecimal totalDinheiro;
    @Column(name = "total_pix", precision = 15, scale = 2) private BigDecimal totalPix;
    @Column(name = "total_cartao_debito", precision = 15, scale = 2) private BigDecimal totalCartaoDebito;
    @Column(name = "total_cartao_credito", precision = 15, scale = 2) private BigDecimal totalCartaoCredito;
    @Column(name = "total_outro", precision = 15, scale = 2) private BigDecimal totalOutro;
    public Long getId(){return id;} public void setId(Long v){id=v;}
    public StatusCaixa getStatus(){return status;} public void setStatus(StatusCaixa v){status=v;}
    public BigDecimal getValorInicial(){return valorInicial;} public void setValorInicial(BigDecimal v){valorInicial=v;}
    public LocalDateTime getDataAbertura(){return dataAbertura;} public void setDataAbertura(LocalDateTime v){dataAbertura=v;}
    public Long getOperadorAberturaId(){return operadorAberturaId;} public void setOperadorAberturaId(Long v){operadorAberturaId=v;}
    public String getOperadorAberturaEmail(){return operadorAberturaEmail;} public void setOperadorAberturaEmail(String v){operadorAberturaEmail=v;}
    public LocalDateTime getDataFechamento(){return dataFechamento;} public void setDataFechamento(LocalDateTime v){dataFechamento=v;}
    public Long getOperadorFechamentoId(){return operadorFechamentoId;} public void setOperadorFechamentoId(Long v){operadorFechamentoId=v;}
    public String getOperadorFechamentoEmail(){return operadorFechamentoEmail;} public void setOperadorFechamentoEmail(String v){operadorFechamentoEmail=v;}
    public BigDecimal getValorContado(){return valorContado;} public void setValorContado(BigDecimal v){valorContado=v;}
    public BigDecimal getSaldoEsperadoFechamento(){return saldoEsperadoFechamento;} public void setSaldoEsperadoFechamento(BigDecimal v){saldoEsperadoFechamento=v;}
    public BigDecimal getDiferencaFechamento(){return diferencaFechamento;} public void setDiferencaFechamento(BigDecimal v){diferencaFechamento=v;}
    public BigDecimal getTotalDinheiro(){return totalDinheiro;} public void setTotalDinheiro(BigDecimal v){totalDinheiro=v;}
    public BigDecimal getTotalPix(){return totalPix;} public void setTotalPix(BigDecimal v){totalPix=v;}
    public BigDecimal getTotalCartaoDebito(){return totalCartaoDebito;} public void setTotalCartaoDebito(BigDecimal v){totalCartaoDebito=v;}
    public BigDecimal getTotalCartaoCredito(){return totalCartaoCredito;} public void setTotalCartaoCredito(BigDecimal v){totalCartaoCredito=v;}
    public BigDecimal getTotalOutro(){return totalOutro;} public void setTotalOutro(BigDecimal v){totalOutro=v;}
}
