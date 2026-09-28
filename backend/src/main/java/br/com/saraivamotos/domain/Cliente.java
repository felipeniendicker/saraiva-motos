package br.com.saraivamotos.domain;

import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity
@Table(name = "cliente")
public class Cliente {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "nome_razao_social", nullable = false, length = 180)
    private String nomeRazaoSocial;
    @Column(length = 30) private String telefone;
    @Column(name = "cpf_cnpj", length = 20) private String cpfCnpj;
    @Enumerated(EnumType.STRING) @Column(name = "tipo_cliente", nullable = false, length = 30)
    private TipoCliente tipoCliente;
    @Column(length = 255) private String endereco;
    @Column(columnDefinition = "TEXT") private String observacoes;
    @Column(nullable = false) private Boolean ativo;
    @Column(name = "data_cadastro", nullable = false, updatable = false)
    private LocalDateTime dataCadastro;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNomeRazaoSocial() { return nomeRazaoSocial; }
    public void setNomeRazaoSocial(String valor) { nomeRazaoSocial = valor; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String valor) { telefone = valor; }
    public String getCpfCnpj() { return cpfCnpj; }
    public void setCpfCnpj(String valor) { cpfCnpj = valor; }
    public TipoCliente getTipoCliente() { return tipoCliente; }
    public void setTipoCliente(TipoCliente valor) { tipoCliente = valor; }
    public String getEndereco() { return endereco; }
    public void setEndereco(String valor) { endereco = valor; }
    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String valor) { observacoes = valor; }
    public Boolean getAtivo() { return ativo; }
    public void setAtivo(Boolean valor) { ativo = valor; }
    public LocalDateTime getDataCadastro() { return dataCadastro; }
    public void setDataCadastro(LocalDateTime valor) { dataCadastro = valor; }
}
