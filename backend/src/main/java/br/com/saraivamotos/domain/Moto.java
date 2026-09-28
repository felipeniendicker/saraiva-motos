package br.com.saraivamotos.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "moto")
public class Moto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;
    @Column(nullable = false, length = 100) private String marca;
    @Column(nullable = false, length = 120) private String modelo;
    private Short ano;
    @Column(length = 20) private String cilindrada;
    @Column(length = 10) private String placa;
    @Column(columnDefinition = "TEXT") private String observacoes;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente valor) { cliente = valor; }
    public String getMarca() { return marca; }
    public void setMarca(String valor) { marca = valor; }
    public String getModelo() { return modelo; }
    public void setModelo(String valor) { modelo = valor; }
    public Short getAno() { return ano; }
    public void setAno(Short valor) { ano = valor; }
    public String getCilindrada() { return cilindrada; }
    public void setCilindrada(String valor) { cilindrada = valor; }
    public String getPlaca() { return placa; }
    public void setPlaca(String valor) { placa = valor; }
    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String valor) { observacoes = valor; }
}
