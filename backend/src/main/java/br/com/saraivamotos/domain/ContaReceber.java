package br.com.saraivamotos.domain;
import java.math.BigDecimal;import java.time.*;import java.util.*;import jakarta.persistence.*;
@Entity @Table(name="conta_receber") public class ContaReceber{
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="venda_id",nullable=false,unique=true) private Long vendaId;@Column(name="cliente_id",nullable=false) private Long clienteId;
 @Column(name="valor_original",nullable=false,precision=15,scale=2) private BigDecimal valorOriginal;
 @Column(name="valor_recebido",nullable=false,precision=15,scale=2) private BigDecimal valorRecebido;
 @Column(name="saldo_pendente",nullable=false,precision=15,scale=2) private BigDecimal saldoPendente;
 @Column(nullable=false) private LocalDate vencimento;@Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private StatusContaReceber status;
 @Column(name="data_criacao",nullable=false) private LocalDateTime dataCriacao;@Column(name="data_quitacao") private LocalDateTime dataQuitacao;
 @Version @Column(nullable=false) private Long versao;
 @OneToMany(mappedBy="conta",fetch=FetchType.LAZY) private List<Recebimento> recebimentos=new ArrayList<>();
 public Long getId(){return id;}public Long getVendaId(){return vendaId;}public void setVendaId(Long v){vendaId=v;}public Long getClienteId(){return clienteId;}public void setClienteId(Long v){clienteId=v;}
 public BigDecimal getValorOriginal(){return valorOriginal;}public void setValorOriginal(BigDecimal v){valorOriginal=v;}public BigDecimal getValorRecebido(){return valorRecebido;}public void setValorRecebido(BigDecimal v){valorRecebido=v;}public BigDecimal getSaldoPendente(){return saldoPendente;}public void setSaldoPendente(BigDecimal v){saldoPendente=v;}
 public LocalDate getVencimento(){return vencimento;}public void setVencimento(LocalDate v){vencimento=v;}public StatusContaReceber getStatus(){return status;}public void setStatus(StatusContaReceber v){status=v;}public LocalDateTime getDataCriacao(){return dataCriacao;}public void setDataCriacao(LocalDateTime v){dataCriacao=v;}public LocalDateTime getDataQuitacao(){return dataQuitacao;}public void setDataQuitacao(LocalDateTime v){dataQuitacao=v;}public Long getVersao(){return versao;}public List<Recebimento> getRecebimentos(){return recebimentos;}
}
