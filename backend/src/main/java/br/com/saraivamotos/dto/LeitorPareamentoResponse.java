package br.com.saraivamotos.dto;
import java.time.LocalDateTime;
public record LeitorPareamentoResponse(String sessaoId,String token,String url,String qrCodeDataUrl,LocalDateTime expiraEm){}
