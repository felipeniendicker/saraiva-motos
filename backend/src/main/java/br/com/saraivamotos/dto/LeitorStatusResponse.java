package br.com.saraivamotos.dto;
import java.time.LocalDateTime;
public record LeitorStatusResponse(boolean ativo,LocalDateTime expiraEm){}
