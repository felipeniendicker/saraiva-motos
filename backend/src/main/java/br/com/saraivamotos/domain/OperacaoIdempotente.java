package br.com.saraivamotos.domain;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "operacao_idempotente")
public class OperacaoIdempotente {
    @Id
    @Column(length = 36, columnDefinition = "CHAR(36)")
    private String chave;

    @Column(nullable = false, length = 30)
    private String tipo;

    @Column(name = "request_hash", nullable = false, length = 64, columnDefinition = "CHAR(64)")
    private String requestHash;

    @Column(name = "venda_id")
    private Long vendaId;

    @Column(name = "movimentacao_id")
    private Long movimentacaoId;

    @Column(name = "data_criacao", nullable = false)
    private LocalDateTime dataCriacao;

    public String getChave() { return chave; }
    public void setChave(String chave) { this.chave = chave; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getRequestHash() { return requestHash; }
    public void setRequestHash(String requestHash) { this.requestHash = requestHash; }
    public Long getVendaId() { return vendaId; }
    public void setVendaId(Long vendaId) { this.vendaId = vendaId; }
    public Long getMovimentacaoId() { return movimentacaoId; }
    public void setMovimentacaoId(Long movimentacaoId) { this.movimentacaoId = movimentacaoId; }
    public LocalDateTime getDataCriacao() { return dataCriacao; }
    public void setDataCriacao(LocalDateTime dataCriacao) { this.dataCriacao = dataCriacao; }
}
