package br.com.saraivamotos.domain;

import java.time.LocalDateTime;

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
@Table(name = "pedido_historico_status")
public class PedidoHistoricoStatus {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "pedido_id", nullable = false)
    private Pedido pedido;
    @Enumerated(EnumType.STRING) @Column(name = "status_anterior", length = 20)
    private StatusPedido statusAnterior;
    @Enumerated(EnumType.STRING) @Column(name = "status_novo", nullable = false, length = 20)
    private StatusPedido statusNovo;
    @Column(name = "data_hora", nullable = false)
    private LocalDateTime dataHora;
    @Column(name = "operador_id", nullable = false)
    private Long operadorId;
    @Column(name = "operador_email", nullable = false, length = 254)
    private String operadorEmail;
    @Column(length = 1000)
    private String observacao;

    public Long getId() { return id; }
    public Pedido getPedido() { return pedido; }
    public void setPedido(Pedido pedido) { this.pedido = pedido; }
    public StatusPedido getStatusAnterior() { return statusAnterior; }
    public void setStatusAnterior(StatusPedido statusAnterior) { this.statusAnterior = statusAnterior; }
    public StatusPedido getStatusNovo() { return statusNovo; }
    public void setStatusNovo(StatusPedido statusNovo) { this.statusNovo = statusNovo; }
    public LocalDateTime getDataHora() { return dataHora; }
    public void setDataHora(LocalDateTime dataHora) { this.dataHora = dataHora; }
    public Long getOperadorId() { return operadorId; }
    public void setOperadorId(Long operadorId) { this.operadorId = operadorId; }
    public String getOperadorEmail() { return operadorEmail; }
    public void setOperadorEmail(String operadorEmail) { this.operadorEmail = operadorEmail; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
}
