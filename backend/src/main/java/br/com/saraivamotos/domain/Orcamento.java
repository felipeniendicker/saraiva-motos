package br.com.saraivamotos.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import jakarta.persistence.*;

@Entity @Table(name = "orcamento")
public class Orcamento {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,unique=true,length=30) private String numero;
    @Column(name="cliente_id") private Long clienteId;
    @Column(name="cliente_nome",length=180) private String clienteNome;
    @Column(name="cliente_tipo",length=30) private String clienteTipo;
    @Enumerated(EnumType.STRING) @Column(name="tipo_preco_utilizado",nullable=false,length=20) private TipoPreco tipoPrecoUtilizado;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private StatusOrcamento status;
    @Column(name="data_emissao",nullable=false) private LocalDateTime dataEmissao;
    @Column(name="data_atualizacao",nullable=false) private LocalDateTime dataAtualizacao;
    @Column(nullable=false) private LocalDate validade;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal subtotal;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal desconto;
    @Column(name="desconto_percentual",nullable=false,precision=7,scale=4) private BigDecimal descontoPercentual;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal total;
    @Column(columnDefinition="TEXT") private String observacoes;
    @Column(name="operador_id",nullable=false) private Long operadorId;
    @Column(name="operador_email",nullable=false,length=254) private String operadorEmail;
    @Column(name="venda_id") private Long vendaId;
    @Column(name="data_cancelamento") private LocalDateTime dataCancelamento;
    @Column(name="motivo_cancelamento",length=1000) private String motivoCancelamento;
    @Version @Column(nullable=false) private Long versao;
    @OneToMany(mappedBy="orcamento",cascade=CascadeType.ALL,orphanRemoval=true,fetch=FetchType.LAZY)
    private List<ItemOrcamento> itens=new ArrayList<>();
    public void adicionarItem(ItemOrcamento item){itens.add(item);item.setOrcamento(this);}
    public Long getId(){return id;} public void setId(Long v){id=v;} public String getNumero(){return numero;} public void setNumero(String v){numero=v;}
    public Long getClienteId(){return clienteId;} public void setClienteId(Long v){clienteId=v;} public String getClienteNome(){return clienteNome;} public void setClienteNome(String v){clienteNome=v;}
    public String getClienteTipo(){return clienteTipo;} public void setClienteTipo(String v){clienteTipo=v;} public TipoPreco getTipoPrecoUtilizado(){return tipoPrecoUtilizado;} public void setTipoPrecoUtilizado(TipoPreco v){tipoPrecoUtilizado=v;}
    public StatusOrcamento getStatus(){return status;} public void setStatus(StatusOrcamento v){status=v;} public LocalDateTime getDataEmissao(){return dataEmissao;} public void setDataEmissao(LocalDateTime v){dataEmissao=v;}
    public LocalDateTime getDataAtualizacao(){return dataAtualizacao;} public void setDataAtualizacao(LocalDateTime v){dataAtualizacao=v;} public LocalDate getValidade(){return validade;} public void setValidade(LocalDate v){validade=v;}
    public BigDecimal getSubtotal(){return subtotal;} public void setSubtotal(BigDecimal v){subtotal=v;} public BigDecimal getDesconto(){return desconto;} public void setDesconto(BigDecimal v){desconto=v;}
    public BigDecimal getDescontoPercentual(){return descontoPercentual;} public void setDescontoPercentual(BigDecimal v){descontoPercentual=v;} public BigDecimal getTotal(){return total;} public void setTotal(BigDecimal v){total=v;}
    public String getObservacoes(){return observacoes;} public void setObservacoes(String v){observacoes=v;} public Long getOperadorId(){return operadorId;} public void setOperadorId(Long v){operadorId=v;}
    public String getOperadorEmail(){return operadorEmail;} public void setOperadorEmail(String v){operadorEmail=v;} public Long getVendaId(){return vendaId;} public void setVendaId(Long v){vendaId=v;}
    public LocalDateTime getDataCancelamento(){return dataCancelamento;} public void setDataCancelamento(LocalDateTime v){dataCancelamento=v;} public String getMotivoCancelamento(){return motivoCancelamento;} public void setMotivoCancelamento(String v){motivoCancelamento=v;}
    public Long getVersao(){return versao;} public void setVersao(Long v){versao=v;} public List<ItemOrcamento> getItens(){return itens;} public void setItens(List<ItemOrcamento> v){itens=v;}
}
