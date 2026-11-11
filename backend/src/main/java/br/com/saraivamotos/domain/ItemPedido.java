package br.com.saraivamotos.domain;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "item_pedido")
public class ItemPedido {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "pedido_id", nullable = false)
    private Pedido pedido;
    @Enumerated(EnumType.STRING) @Column(name = "tipo_item", nullable = false, length = 20)
    private TipoItem tipoItem;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "produto_id")
    private Produto produto;
    @Column(name = "codigo_item", nullable = false, length = 100)
    private String codigoItem;
    @Column(name = "descricao_item", nullable = false, length = 180)
    private String descricaoItem;
    @Column(nullable = false)
    private Integer quantidade;
    @Column(name = "preco_original", nullable = false, precision = 15, scale = 2)
    private BigDecimal precoOriginal;
    @Column(name = "preco_unitario", nullable = false, precision = 15, scale = 2)
    private BigDecimal precoUnitario;
    @Column(name = "preco_alterado_manualmente", nullable = false)
    private Boolean precoAlteradoManualmente;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal subtotal;

    public Long getId() { return id; }
    public Pedido getPedido() { return pedido; }
    public void setPedido(Pedido pedido) { this.pedido = pedido; }
    public TipoItem getTipoItem() { return tipoItem; }
    public void setTipoItem(TipoItem tipoItem) { this.tipoItem = tipoItem; }
    public Produto getProduto() { return produto; }
    public void setProduto(Produto produto) { this.produto = produto; }
    public String getCodigoItem() { return codigoItem; }
    public void setCodigoItem(String codigoItem) { this.codigoItem = codigoItem; }
    public String getDescricaoItem() { return descricaoItem; }
    public void setDescricaoItem(String descricaoItem) { this.descricaoItem = descricaoItem; }
    public Integer getQuantidade() { return quantidade; }
    public void setQuantidade(Integer quantidade) { this.quantidade = quantidade; }
    public BigDecimal getPrecoOriginal() { return precoOriginal; }
    public void setPrecoOriginal(BigDecimal precoOriginal) { this.precoOriginal = precoOriginal; }
    public BigDecimal getPrecoUnitario() { return precoUnitario; }
    public void setPrecoUnitario(BigDecimal precoUnitario) { this.precoUnitario = precoUnitario; }
    public Boolean getPrecoAlteradoManualmente() { return precoAlteradoManualmente; }
    public void setPrecoAlteradoManualmente(Boolean precoAlteradoManualmente) { this.precoAlteradoManualmente = precoAlteradoManualmente; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
}
