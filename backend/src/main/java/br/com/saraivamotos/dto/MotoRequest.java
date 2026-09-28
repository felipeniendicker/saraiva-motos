package br.com.saraivamotos.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MotoRequest(
        @NotBlank @Size(max = 100) String marca,
        @NotBlank @Size(max = 120) String modelo,
        @Min(1900) @Max(2200) Short ano,
        @Size(max = 20) String cilindrada,
        @Size(max = 10) String placa,
        String observacoes) {}
