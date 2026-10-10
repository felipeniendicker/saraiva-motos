package br.com.saraivamotos.domain;
import java.time.LocalDateTime;
import jakarta.persistence.*;
@Entity @Table(name="leitor_sessao")
public class LeitorSessao {
 @Id @Column(length=36,columnDefinition="CHAR(36)") private String id;
 @Column(name="token_hash",nullable=false,unique=true,length=64,columnDefinition="CHAR(64)") private String tokenHash;
 @Column(name="operador_id",nullable=false) private Long operadorId;
 @Column(name="operador_email",nullable=false,length=254) private String operadorEmail;
 @Column(nullable=false,length=20) private String status;
 @Column(name="data_criacao",nullable=false) private LocalDateTime dataCriacao;
 @Column(name="data_expiracao",nullable=false) private LocalDateTime dataExpiracao;
 public String getId(){return id;} public void setId(String v){id=v;} public String getTokenHash(){return tokenHash;} public void setTokenHash(String v){tokenHash=v;}
 public Long getOperadorId(){return operadorId;} public void setOperadorId(Long v){operadorId=v;} public String getOperadorEmail(){return operadorEmail;} public void setOperadorEmail(String v){operadorEmail=v;}
 public String getStatus(){return status;} public void setStatus(String v){status=v;} public LocalDateTime getDataCriacao(){return dataCriacao;} public void setDataCriacao(LocalDateTime v){dataCriacao=v;}
 public LocalDateTime getDataExpiracao(){return dataExpiracao;} public void setDataExpiracao(LocalDateTime v){dataExpiracao=v;}
}
