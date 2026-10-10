package br.com.saraivamotos.domain;
import java.time.LocalDateTime;
import jakarta.persistence.*;
@Entity @Table(name="leitor_leitura",uniqueConstraints=@UniqueConstraint(columnNames={"sessao_id","evento_id"}))
public class LeitorLeitura {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(name="sessao_id",nullable=false,length=36) private String sessaoId;
 @Column(name="evento_id",nullable=false,length=36) private String eventoId;
 @Column(nullable=false,length=14) private String codigo;
 @Column(name="data_hora",nullable=false) private LocalDateTime dataHora;
 @Column(name="data_consumo") private LocalDateTime dataConsumo;
 public Long getId(){return id;} public String getSessaoId(){return sessaoId;} public void setSessaoId(String v){sessaoId=v;} public String getEventoId(){return eventoId;} public void setEventoId(String v){eventoId=v;}
 public String getCodigo(){return codigo;} public void setCodigo(String v){codigo=v;} public LocalDateTime getDataHora(){return dataHora;} public void setDataHora(LocalDateTime v){dataHora=v;} public LocalDateTime getDataConsumo(){return dataConsumo;} public void setDataConsumo(LocalDateTime v){dataConsumo=v;}
}
