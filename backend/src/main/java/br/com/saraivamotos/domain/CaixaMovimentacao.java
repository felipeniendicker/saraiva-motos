package br.com.saraivamotos.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity @Table(name = "caixa_movimentacao")
public class CaixaMovimentacao {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name="caixa_id", nullable=false) private Long caixaId;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=40) private TipoMovimentacaoCaixa tipo;
    @Column(nullable=false, precision=15, scale=2) private BigDecimal valor;
    @Column(nullable=false, length=255) private String descricao;
    @Column(name="venda_id") private Long vendaId;
    @Column(name="chave_idempotencia", nullable=false, unique=true, length=36) private String chaveIdempotencia;
    @Column(name="request_hash", nullable=false, length=64) private String requestHash;
    @Column(name="operador_id", nullable=false) private Long operadorId;
    @Column(name="operador_email", nullable=false, length=254) private String operadorEmail;
    @Column(name="data_hora", nullable=false) private LocalDateTime dataHora;
    public Long getId(){return id;} public void setId(Long v){id=v;}
    public Long getCaixaId(){return caixaId;} public void setCaixaId(Long v){caixaId=v;}
    public TipoMovimentacaoCaixa getTipo(){return tipo;} public void setTipo(TipoMovimentacaoCaixa v){tipo=v;}
    public BigDecimal getValor(){return valor;} public void setValor(BigDecimal v){valor=v;}
    public String getDescricao(){return descricao;} public void setDescricao(String v){descricao=v;}
    public Long getVendaId(){return vendaId;} public void setVendaId(Long v){vendaId=v;}
    public String getChaveIdempotencia(){return chaveIdempotencia;} public void setChaveIdempotencia(String v){chaveIdempotencia=v;}
    public String getRequestHash(){return requestHash;} public void setRequestHash(String v){requestHash=v;}
    public Long getOperadorId(){return operadorId;} public void setOperadorId(Long v){operadorId=v;}
    public String getOperadorEmail(){return operadorEmail;} public void setOperadorEmail(String v){operadorEmail=v;}
    public LocalDateTime getDataHora(){return dataHora;} public void setDataHora(LocalDateTime v){dataHora=v;}
}
