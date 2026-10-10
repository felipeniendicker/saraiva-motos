package br.com.saraivamotos.dto;
import jakarta.validation.constraints.*;
public record LeitorEnvioRequest(@NotBlank @Pattern(regexp="\\d{8}|\\d{12}|\\d{13}") String codigo,@NotBlank String eventoId){}
