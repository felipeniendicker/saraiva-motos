package br.com.saraivamotos.dto;

import br.com.saraivamotos.domain.StatusPedido;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AlteracaoStatusPedidoRequest(
        @NotNull StatusPedido status,
        @Size(max = 1000) String observacao) {
}
