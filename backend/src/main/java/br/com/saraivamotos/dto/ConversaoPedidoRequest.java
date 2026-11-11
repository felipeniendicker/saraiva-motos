package br.com.saraivamotos.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Size;

public record ConversaoPedidoRequest(
        @FutureOrPresent LocalDate previsaoRetirada,
        @Size(max = 65535) String observacoes) {
}
