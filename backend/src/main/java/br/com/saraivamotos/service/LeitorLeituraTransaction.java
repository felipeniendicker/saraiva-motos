package br.com.saraivamotos.service;

import java.time.LocalDateTime;
import br.com.saraivamotos.domain.LeitorLeitura;
import br.com.saraivamotos.repository.LeitorLeituraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LeitorLeituraTransaction {
    private final LeitorLeituraRepository leituras;
    public LeitorLeituraTransaction(LeitorLeituraRepository leituras) { this.leituras = leituras; }
    @Transactional
    public LeitorLeitura criar(String sessaoId, String eventoId, String codigo) {
        LeitorLeitura leitura = new LeitorLeitura();
        leitura.setSessaoId(sessaoId); leitura.setEventoId(eventoId); leitura.setCodigo(codigo);
        leitura.setDataHora(LocalDateTime.now());
        return leituras.saveAndFlush(leitura);
    }
}
