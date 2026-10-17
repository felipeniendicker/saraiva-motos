package br.com.saraivamotos.domain;
import java.math.BigDecimal;import java.time.LocalDateTime;import jakarta.persistence.*;
@Entity @Table(name="recebimento") public class Recebimento{
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;@ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="conta_receber_id",nullable=false) private ContaReceber conta;
 @Column(name="caixa_id",nullable=false) private Long caixaId;@Column(name="chave_idempotencia",nullable=false,unique=true,length=36,columnDefinition="CHAR(36)") private String chaveIdempotencia;
 @Column(name="request_hash",nullable=false,length=64,columnDefinition="CHAR(64)") private String requestHash;@Column(nullable=false,precision=15,scale=2) private BigDecimal valor;
 @Enumerated(EnumType.STRING) @Column(name="forma_pagamento",nullable=false,length=30) private FormaPagamento formaPagamento;@Column(name="data_hora",nullable=false) private LocalDateTime dataHora;
 @Column(name="operador_id",nullable=false) private Long operadorId;@Column(name="operador_email",nullable=false,length=254) private String operadorEmail;
 @Column(nullable=false) private Boolean estornado=false;@Column(name="data_estorno") private LocalDateTime dataEstorno;@Column(name="motivo_estorno",length=1000) private String motivoEstorno;
 @Column(name="operador_estorno_id") private Long operadorEstornoId;@Column(name="operador_estorno_email",length=254) private String operadorEstornoEmail;
 @Column(name="caixa_estorno_id") private Long caixaEstornoId;
 public Long getId(){return id;}public ContaReceber getConta(){return conta;}public void setConta(ContaReceber v){conta=v;}public Long getCaixaId(){return caixaId;}public void setCaixaId(Long v){caixaId=v;}public String getChaveIdempotencia(){return chaveIdempotencia;}public void setChaveIdempotencia(String v){chaveIdempotencia=v;}public String getRequestHash(){return requestHash;}public void setRequestHash(String v){requestHash=v;}
 public BigDecimal getValor(){return valor;}public void setValor(BigDecimal v){valor=v;}public FormaPagamento getFormaPagamento(){return formaPagamento;}public void setFormaPagamento(FormaPagamento v){formaPagamento=v;}public LocalDateTime getDataHora(){return dataHora;}public void setDataHora(LocalDateTime v){dataHora=v;}public Long getOperadorId(){return operadorId;}public void setOperadorId(Long v){operadorId=v;}public String getOperadorEmail(){return operadorEmail;}public void setOperadorEmail(String v){operadorEmail=v;}
 public Boolean getEstornado(){return estornado;}public void setEstornado(Boolean v){estornado=v;}public LocalDateTime getDataEstorno(){return dataEstorno;}public void setDataEstorno(LocalDateTime v){dataEstorno=v;}public String getMotivoEstorno(){return motivoEstorno;}public void setMotivoEstorno(String v){motivoEstorno=v;}public Long getOperadorEstornoId(){return operadorEstornoId;}public void setOperadorEstornoId(Long v){operadorEstornoId=v;}public String getOperadorEstornoEmail(){return operadorEstornoEmail;}public void setOperadorEstornoEmail(String v){operadorEstornoEmail=v;}
 public Long getCaixaEstornoId(){return caixaEstornoId;}public void setCaixaEstornoId(Long v){caixaEstornoId=v;}
}
