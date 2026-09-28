package br.com.saraivamotos.dto;

import br.com.saraivamotos.domain.Moto;

public record MotoResponse(Long id, Long clienteId, String marca, String modelo, Short ano,
        String cilindrada, String placa, String observacoes) {
    public static MotoResponse from(Moto m) {
        return new MotoResponse(m.getId(), m.getCliente().getId(), m.getMarca(), m.getModelo(), m.getAno(),
                m.getCilindrada(), m.getPlaca(), m.getObservacoes());
    }
}
