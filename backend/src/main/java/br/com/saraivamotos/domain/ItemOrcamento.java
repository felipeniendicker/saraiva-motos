package br.com.saraivamotos.domain;

import java.math.BigDecimal;
import jakarta.persistence.*;

@Entity @Table(name="item_orcamento")
public class ItemOrcamento {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="orcamento_id",nullable=false) private Orcamento orcamento;
    @Enumerated(EnumType.STRING) @Column(name="tipo_item",nullable=false,length=20) private TipoItem tipoItem;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="produto_id") private Produto produto;
    @Column(name="codigo_item",nullable=false,length=100) private String codigoItem;
    @Column(name="descricao_item",nullable=false,length=180) private String descricaoItem;
    @Column(nullable=false) private Integer quantidade;
    @Column(name="preco_original",nullable=false,precision=15,scale=2) private BigDecimal precoOriginal;
    @Column(name="preco_unitario",nullable=false,precision=15,scale=2) private BigDecimal precoUnitario;
    @Column(name="preco_alterado_manualmente",nullable=false) private Boolean precoAlteradoManualmente;
    @Column(nullable=false,precision=15,scale=2) private BigDecimal subtotal;
    public Long getId(){return id;} public Orcamento getOrcamento(){return orcamento;} public void setOrcamento(Orcamento v){orcamento=v;}
    public TipoItem getTipoItem(){return tipoItem;} public void setTipoItem(TipoItem v){tipoItem=v;} public Produto getProduto(){return produto;} public void setProduto(Produto v){produto=v;}
    public String getCodigoItem(){return codigoItem;} public void setCodigoItem(String v){codigoItem=v;} public String getDescricaoItem(){return descricaoItem;} public void setDescricaoItem(String v){descricaoItem=v;}
    public Integer getQuantidade(){return quantidade;} public void setQuantidade(Integer v){quantidade=v;} public BigDecimal getPrecoOriginal(){return precoOriginal;} public void setPrecoOriginal(BigDecimal v){precoOriginal=v;}
    public BigDecimal getPrecoUnitario(){return precoUnitario;} public void setPrecoUnitario(BigDecimal v){precoUnitario=v;} public Boolean getPrecoAlteradoManualmente(){return precoAlteradoManualmente;} public void setPrecoAlteradoManualmente(Boolean v){precoAlteradoManualmente=v;}
    public BigDecimal getSubtotal(){return subtotal;} public void setSubtotal(BigDecimal v){subtotal=v;}
}
