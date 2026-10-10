package br.com.saraivamotos.service;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import br.com.saraivamotos.domain.*;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.repository.*;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
@Service
public class LeitorRemotoService {
 private final LeitorSessaoRepository sessoes; private final LeitorLeituraRepository leituras; private final LeitorLeituraTransaction leituraTransaction; private final QrCodeService qrCodes; private final String frontendUrl; private final SecureRandom random=new SecureRandom();
 public LeitorRemotoService(LeitorSessaoRepository s,LeitorLeituraRepository l,LeitorLeituraTransaction leituraTransaction,QrCodeService qrCodes,@Value("${app.frontend.public-url:http://localhost:5173}")String url){sessoes=s;leituras=l;this.leituraTransaction=leituraTransaction;this.qrCodes=qrCodes;frontendUrl=url.replaceAll("/+$","");}
 @Transactional public LeitorPareamentoResponse criar(AuthenticatedUser user){byte[] bytes=new byte[32];random.nextBytes(bytes);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);LeitorSessao s=new LeitorSessao();s.setId(UUID.randomUUID().toString());s.setTokenHash(hash(token));s.setOperadorId(user.id());s.setOperadorEmail(user.email());s.setStatus("ATIVA");s.setDataCriacao(LocalDateTime.now());s.setDataExpiracao(LocalDateTime.now().plusMinutes(5));sessoes.save(s);String url=frontendUrl+"/#/leitor/"+token;return new LeitorPareamentoResponse(s.getId(),token,url,qrCodes.dataUrl(url),s.getDataExpiracao());}
 @Transactional(readOnly=true) public LeitorStatusResponse status(String token){LeitorSessao s=porToken(token);return new LeitorStatusResponse(ativa(s),s.getDataExpiracao());}
 public LeitorLeituraResponse enviar(String token,LeitorEnvioRequest r){LeitorSessao s=porToken(token);if(!ativa(s))throw new IllegalArgumentException("Pareamento expirado ou encerrado.");validarCodigo(r.codigo());String evento=uuid(r.eventoId());LeitorLeitura existente=leituras.findBySessaoIdAndEventoId(s.getId(),evento).orElse(null);if(existente!=null)return resposta(existente);try{return resposta(leituraTransaction.criar(s.getId(),evento,r.codigo()));}catch(DataIntegrityViolationException conflito){return resposta(leituras.findBySessaoIdAndEventoId(s.getId(),evento).orElseThrow(()->conflito));}}
 @Transactional public LeitorLeituraResponse consumir(String id,AuthenticatedUser user){LeitorSessao s=propria(id,user);if(!ativa(s))return null;LeitorLeitura l=leituras.proximaPendente(id).orElse(null);if(l==null)return null;l.setDataConsumo(LocalDateTime.now());return resposta(leituras.save(l));}
 @Transactional public void encerrar(String id,AuthenticatedUser user){LeitorSessao s=propria(id,user);s.setStatus("ENCERRADA");sessoes.save(s);}
 private LeitorSessao propria(String id,AuthenticatedUser u){return sessoes.findById(id).filter(s->s.getOperadorId().equals(u.id())).orElseThrow(()->new IllegalArgumentException("Sessao de leitor nao encontrada."));}
 private LeitorSessao porToken(String t){return sessoes.findByTokenHash(hash(t)).orElseThrow(()->new IllegalArgumentException("Pareamento invalido."));}
 private boolean ativa(LeitorSessao s){return "ATIVA".equals(s.getStatus())&&s.getDataExpiracao().isAfter(LocalDateTime.now());}
 private void validarCodigo(String c){int sum=0;for(int i=c.length()-2,pos=1;i>=0;i--,pos++){int n=c.charAt(i)-'0';sum+=pos%2==1?n*3:n;}int dig=(10-(sum%10))%10;if(dig!=c.charAt(c.length()-1)-'0')throw new IllegalArgumentException("Digito verificador do codigo invalido.");}
 private String uuid(String v){try{return UUID.fromString(v).toString();}catch(Exception e){throw new IllegalArgumentException("eventoId invalido.");}}
 private String hash(String v){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(v.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 private LeitorLeituraResponse resposta(LeitorLeitura l){return new LeitorLeituraResponse(l.getId(),l.getCodigo(),l.getDataHora());}
}
