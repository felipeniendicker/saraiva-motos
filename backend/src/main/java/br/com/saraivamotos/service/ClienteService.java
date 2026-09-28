package br.com.saraivamotos.service;

import java.time.LocalDateTime;
import java.util.List;
import br.com.saraivamotos.domain.Cliente;
import br.com.saraivamotos.dto.ClienteRequest;
import br.com.saraivamotos.dto.ClienteResponse;
import br.com.saraivamotos.exception.ClienteNaoEncontradoException;
import br.com.saraivamotos.repository.ClienteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClienteService {
    private final ClienteRepository repository;
    public ClienteService(ClienteRepository repository) { this.repository = repository; }

    @Transactional
    public ClienteResponse criar(ClienteRequest request) {
        Cliente cliente = new Cliente();
        aplicar(cliente, request);
        cliente.setAtivo(true);
        cliente.setDataCadastro(LocalDateTime.now());
        return ClienteResponse.from(repository.save(cliente));
    }
    @Transactional(readOnly = true)
    public List<ClienteResponse> listar(String busca, boolean incluirInativos) {
        return repository.buscar(opcional(busca), incluirInativos).stream().map(ClienteResponse::from).toList();
    }
    @Transactional(readOnly = true)
    public ClienteResponse buscar(Long id) { return ClienteResponse.from(encontrar(id)); }
    @Transactional
    public ClienteResponse atualizar(Long id, ClienteRequest request) {
        Cliente cliente = encontrar(id);
        aplicar(cliente, request);
        return ClienteResponse.from(repository.save(cliente));
    }
    @Transactional
    public ClienteResponse desativar(Long id) { return definirAtivo(id, false); }
    @Transactional
    public ClienteResponse reativar(Long id) { return definirAtivo(id, true); }

    private ClienteResponse definirAtivo(Long id, boolean ativo) {
        Cliente cliente = encontrar(id);
        cliente.setAtivo(ativo);
        return ClienteResponse.from(repository.save(cliente));
    }
    private Cliente encontrar(Long id) { return repository.findById(id).orElseThrow(() -> new ClienteNaoEncontradoException(id)); }
    private void aplicar(Cliente c, ClienteRequest r) {
        c.setNomeRazaoSocial(r.nomeRazaoSocial().trim());
        c.setTelefone(opcional(r.telefone())); c.setCpfCnpj(opcional(r.cpfCnpj()));
        c.setTipoCliente(r.tipoCliente()); c.setEndereco(opcional(r.endereco())); c.setObservacoes(opcional(r.observacoes()));
    }
    private String opcional(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
