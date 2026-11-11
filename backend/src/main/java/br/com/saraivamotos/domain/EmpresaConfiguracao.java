package br.com.saraivamotos.domain;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "empresa_configuracao")
public class EmpresaConfiguracao {
    @Id
    private Long id;

    @Column(name = "nome_fantasia", nullable = false, length = 180)
    private String nomeFantasia;

    @Column(name = "razao_social", nullable = false, length = 180)
    private String razaoSocial;

    @Column(length = 20)
    private String cnpj;

    @Column(length = 30)
    private String telefone;

    @Column(length = 500)
    private String endereco;

    @Column(length = 254)
    private String email;

    @Version
    @Column(nullable = false)
    private Long versao;

    @Column(name = "atualizado_em", nullable = false)
    private LocalDateTime atualizadoEm;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNomeFantasia() { return nomeFantasia; }
    public void setNomeFantasia(String nomeFantasia) { this.nomeFantasia = nomeFantasia; }
    public String getRazaoSocial() { return razaoSocial; }
    public void setRazaoSocial(String razaoSocial) { this.razaoSocial = razaoSocial; }
    public String getCnpj() { return cnpj; }
    public void setCnpj(String cnpj) { this.cnpj = cnpj; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public Long getVersao() { return versao; }
    public void setVersao(Long versao) { this.versao = versao; }
    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
    public void setAtualizadoEm(LocalDateTime atualizadoEm) { this.atualizadoEm = atualizadoEm; }
}
