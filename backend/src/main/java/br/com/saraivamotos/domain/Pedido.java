package br.com.saraivamotos.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
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
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "pedido")
public class Pedido {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 30)
    private String numero;
    @Column(name = "cliente_id", nullable = false)
    private Long clienteId;
    @Column(name = "cliente_nome", nullable = false, length = 180)
    private String clienteNome;
    @Column(name = "cliente_tipo", nullable = false, length = 30)
    private String clienteTipo;
    @Column(name = "orcamento_id", unique = true)
    private Long orcamentoId;
    @Column(name = "venda_id", unique = true)
    private Long vendaId;
    @Enumerated(EnumType.STRING) @Column(name = "tipo_preco_utilizado", nullable = false, length = 20)
    private TipoPreco tipoPrecoUtilizado;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private StatusPedido status;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal subtotal;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal desconto;
    @Column(name = "desconto_percentual", nullable = false, precision = 7, scale = 4)
    private BigDecimal descontoPercentual;
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal total;
    @Enumerated(EnumType.STRING) @Column(name = "forma_pagamento_prevista", length = 30)
    private FormaPagamento formaPagamentoPrevista;
    @Enumerated(EnumType.STRING) @Column(name = "condicao_pagamento_prevista", nullable = false, length = 20)
    private CondicaoPagamento condicaoPagamentoPrevista = CondicaoPagamento.IMEDIATO;
    @Column(name = "vencimento_previsto")
    private LocalDate vencimentoPrevisto;
    @Column(name = "entrada_prevista", nullable = false, precision = 15, scale = 2)
    private BigDecimal entradaPrevista = BigDecimal.ZERO.setScale(2);
    @Enumerated(EnumType.STRING) @Column(name = "forma_pagamento_entrada_prevista", length = 30)
    private FormaPagamento formaPagamentoEntradaPrevista;
    @Column(name = "data_criacao", nullable = false)
    private LocalDateTime dataCriacao;
    @Column(name = "data_atualizacao", nullable = false)
    private LocalDateTime dataAtualizacao;
    @Column(name = "previsao_retirada")
    private LocalDate previsaoRetirada;
    @Column(columnDefinition = "TEXT")
    private String observacoes;
    @Column(name = "operador_id", nullable = false)
    private Long operadorId;
    @Column(name = "operador_email", nullable = false, length = 254)
    private String operadorEmail;
    @Version @Column(nullable = false)
    private Long versao;
    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ItemPedido> itens = new ArrayList<>();
    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("dataHora ASC, id ASC")
    private List<PedidoHistoricoStatus> historico = new ArrayList<>();

    public void adicionarItem(ItemPedido item) { itens.add(item); item.setPedido(this); }
    public void adicionarHistorico(PedidoHistoricoStatus registro) { historico.add(registro); registro.setPedido(this); }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public String getClienteNome() { return clienteNome; }
    public void setClienteNome(String clienteNome) { this.clienteNome = clienteNome; }
    public String getClienteTipo() { return clienteTipo; }
    public void setClienteTipo(String clienteTipo) { this.clienteTipo = clienteTipo; }
    public Long getOrcamentoId() { return orcamentoId; }
    public void setOrcamentoId(Long orcamentoId) { this.orcamentoId = orcamentoId; }
    public Long getVendaId() { return vendaId; }
    public void setVendaId(Long vendaId) { this.vendaId = vendaId; }
    public TipoPreco getTipoPrecoUtilizado() { return tipoPrecoUtilizado; }
    public void setTipoPrecoUtilizado(TipoPreco tipoPrecoUtilizado) { this.tipoPrecoUtilizado = tipoPrecoUtilizado; }
    public StatusPedido getStatus() { return status; }
    public void setStatus(StatusPedido status) { this.status = status; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getDesconto() { return desconto; }
    public void setDesconto(BigDecimal desconto) { this.desconto = desconto; }
    public BigDecimal getDescontoPercentual() { return descontoPercentual; }
    public void setDescontoPercentual(BigDecimal descontoPercentual) { this.descontoPercentual = descontoPercentual; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public FormaPagamento getFormaPagamentoPrevista() { return formaPagamentoPrevista; }
    public void setFormaPagamentoPrevista(FormaPagamento valor) { formaPagamentoPrevista = valor; }
    public CondicaoPagamento getCondicaoPagamentoPrevista() { return condicaoPagamentoPrevista; }
    public void setCondicaoPagamentoPrevista(CondicaoPagamento valor) { condicaoPagamentoPrevista = valor; }
    public LocalDate getVencimentoPrevisto() { return vencimentoPrevisto; }
    public void setVencimentoPrevisto(LocalDate valor) { vencimentoPrevisto = valor; }
    public BigDecimal getEntradaPrevista() { return entradaPrevista; }
    public void setEntradaPrevista(BigDecimal valor) { entradaPrevista = valor; }
    public FormaPagamento getFormaPagamentoEntradaPrevista() { return formaPagamentoEntradaPrevista; }
    public void setFormaPagamentoEntradaPrevista(FormaPagamento valor) { formaPagamentoEntradaPrevista = valor; }
    public LocalDateTime getDataCriacao() { return dataCriacao; }
    public void setDataCriacao(LocalDateTime dataCriacao) { this.dataCriacao = dataCriacao; }
    public LocalDateTime getDataAtualizacao() { return dataAtualizacao; }
    public void setDataAtualizacao(LocalDateTime dataAtualizacao) { this.dataAtualizacao = dataAtualizacao; }
    public LocalDate getPrevisaoRetirada() { return previsaoRetirada; }
    public void setPrevisaoRetirada(LocalDate previsaoRetirada) { this.previsaoRetirada = previsaoRetirada; }
    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String observacoes) { this.observacoes = observacoes; }
    public Long getOperadorId() { return operadorId; }
    public void setOperadorId(Long operadorId) { this.operadorId = operadorId; }
    public String getOperadorEmail() { return operadorEmail; }
    public void setOperadorEmail(String operadorEmail) { this.operadorEmail = operadorEmail; }
    public Long getVersao() { return versao; }
    public List<ItemPedido> getItens() { return itens; }
    public List<PedidoHistoricoStatus> getHistorico() { return historico; }
}
