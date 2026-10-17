package br.com.saraivamotos.dto;import jakarta.validation.constraints.*;public record EstornoRecebimentoRequest(@NotBlank @Size(max=1000)String motivo){}
