package br.com.saraivamotos.service;

import java.util.List;
import br.com.saraivamotos.domain.Cliente;
import br.com.saraivamotos.domain.Moto;
import br.com.saraivamotos.dto.MotoRequest;
import br.com.saraivamotos.dto.MotoResponse;
import br.com.saraivamotos.exception.ClienteNaoEncontradoException;
import br.com.saraivamotos.exception.MotoNaoEncontradaException;
import br.com.saraivamotos.exception.OperacaoClienteInvalidaException;
import br.com.saraivamotos.repository.ClienteRepository;
import br.com.saraivamotos.repository.MotoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MotoService {
    private final MotoRepository motos;
    private final ClienteRepository clientes;
    public MotoService(MotoRepository motos, ClienteRepository clientes) { this.motos = motos; this.clientes = clientes; }
    @Transactional
    public MotoResponse criar(Long clienteId, MotoRequest request) {
        Cliente cliente = clienteAtivo(clienteId);
        Moto moto = new Moto(); moto.setCliente(cliente); aplicar(moto, request);
        return MotoResponse.from(motos.save(moto));
    }
    @Transactional(readOnly = true)
    public List<MotoResponse> listar(Long clienteId) {
        if (!clientes.existsById(clienteId)) throw new ClienteNaoEncontradoException(clienteId);
        return motos.findByClienteIdOrderById(clienteId).stream().map(MotoResponse::from).toList();
    }
    @Transactional
    public MotoResponse atualizar(Long id, MotoRequest request) {
        Moto moto = encontrar(id);
        if (!Boolean.TRUE.equals(moto.getCliente().getAtivo())) throw new OperacaoClienteInvalidaException("Não é possível alterar motos de cliente inativo.");
        aplicar(moto, request); return MotoResponse.from(motos.save(moto));
    }
    @Transactional
    public void remover(Long id) { motos.delete(encontrar(id)); }
    private Cliente clienteAtivo(Long id) {
        Cliente c = clientes.findById(id).orElseThrow(() -> new ClienteNaoEncontradoException(id));
        if (!Boolean.TRUE.equals(c.getAtivo())) throw new OperacaoClienteInvalidaException("Não é possível cadastrar moto para cliente inativo.");
        return c;
    }
    private Moto encontrar(Long id) { return motos.findById(id).orElseThrow(() -> new MotoNaoEncontradaException(id)); }
    private void aplicar(Moto m, MotoRequest r) {
        m.setMarca(r.marca().trim()); m.setModelo(r.modelo().trim()); m.setAno(r.ano());
        m.setCilindrada(opcional(r.cilindrada())); m.setPlaca(opcional(r.placa())); m.setObservacoes(opcional(r.observacoes()));
    }
    private String opcional(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
