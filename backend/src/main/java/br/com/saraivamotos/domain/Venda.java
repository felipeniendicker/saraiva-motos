package br.com.saraivamotos.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "venda")
public class Venda {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "caixa_id")
    private Long caixaId;
    @Column(name = "numero_venda", nullable = false, unique = true, length = 30)
    private String numeroVenda;
    @Column(name = "cliente_id")
    private Long clienteId;
    @Column(name = "cliente_nome", length = 180)
    private String clienteNome;
    @Column(name = "cliente_tipo", length = 30)
    private String clienteTipo;
    @Enumerated(EnumType.STRING) @Column(name = "tipo_preco_utilizado", nullable = false, length = 20)
    private TipoPreco tipoPrecoUtilizado;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal subtotal;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal desconto;
    @Column(name = "desconto_percentual", precision = 7, scale = 4)
    private BigDecimal descontoPercentual;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal total;
    @Enumerated(EnumType.STRING) @Column(name = "forma_pagamento", nullable = false, length = 30)
    private FormaPagamento formaPagamento;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private StatusVenda status;
    @Column(name = "data_hora", nullable = false)
    private LocalDateTime dataHora;
    @Column(columnDefinition = "TEXT")
    private String observacoes;
    @Column(name = "data_cancelamento")
    private LocalDateTime dataCancelamento;
    @Column(name = "motivo_cancelamento", columnDefinition = "TEXT")
    private String motivoCancelamento;
    @OneToMany(mappedBy = "venda", cascade = CascadeType.ALL, orphanRemoval = false, fetch = FetchType.LAZY)
    private List<ItemVenda> itens = new ArrayList<>();

    public void adicionarItem(ItemVenda item) { itens.add(item); item.setVenda(this); }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getCaixaId() { return caixaId; }
    public void setCaixaId(Long caixaId) { this.caixaId = caixaId; }
    public String getNumeroVenda() { return numeroVenda; }
    public void setNumeroVenda(String numeroVenda) { this.numeroVenda = numeroVenda; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public String getClienteNome() { return clienteNome; }
    public void setClienteNome(String clienteNome) { this.clienteNome = clienteNome; }
    public String getClienteTipo() { return clienteTipo; }
    public void setClienteTipo(String clienteTipo) { this.clienteTipo = clienteTipo; }
    public TipoPreco getTipoPrecoUtilizado() { return tipoPrecoUtilizado; }
    public void setTipoPrecoUtilizado(TipoPreco tipoPrecoUtilizado) { this.tipoPrecoUtilizado = tipoPrecoUtilizado; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getDesconto() { return desconto; }
    public void setDesconto(BigDecimal desconto) { this.desconto = desconto; }
    public BigDecimal getDescontoPercentual() { return descontoPercentual; }
    public void setDescontoPercentual(BigDecimal descontoPercentual) { this.descontoPercentual = descontoPercentual; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public FormaPagamento getFormaPagamento() { return formaPagamento; }
    public void setFormaPagamento(FormaPagamento formaPagamento) { this.formaPagamento = formaPagamento; }
    public StatusVenda getStatus() { return status; }
    public void setStatus(StatusVenda status) { this.status = status; }
    public LocalDateTime getDataHora() { return dataHora; }
    public void setDataHora(LocalDateTime dataHora) { this.dataHora = dataHora; }
    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String observacoes) { this.observacoes = observacoes; }
    public LocalDateTime getDataCancelamento() { return dataCancelamento; }
    public void setDataCancelamento(LocalDateTime dataCancelamento) { this.dataCancelamento = dataCancelamento; }
    public String getMotivoCancelamento() { return motivoCancelamento; }
    public void setMotivoCancelamento(String motivoCancelamento) { this.motivoCancelamento = motivoCancelamento; }
    public List<ItemVenda> getItens() { return itens; }
    public void setItens(List<ItemVenda> itens) { this.itens = itens; }
}
