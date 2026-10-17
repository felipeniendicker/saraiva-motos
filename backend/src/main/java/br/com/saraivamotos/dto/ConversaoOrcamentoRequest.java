package br.com.saraivamotos.dto;

import br.com.saraivamotos.domain.FormaPagamento;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ConversaoOrcamentoRequest(@NotNull FormaPagamento formaPagamento,@Size(max=65535) String observacoes) {}
