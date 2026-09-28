package br.com.saraivamotos.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import br.com.saraivamotos.domain.*;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.exception.ClienteNaoEncontradoException;
import br.com.saraivamotos.repository.ClienteRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClienteServiceTests {
    @Mock ClienteRepository repository;
    ClienteService service;
    @BeforeEach void setup() { service = new ClienteService(repository); lenient().when(repository.save(any())).thenAnswer(i -> i.getArgument(0)); }

    @ParameterizedTest @EnumSource(TipoCliente.class)
    void cadastraTodosOsTipos(TipoCliente tipo) {
        ClienteResponse r = service.criar(request(tipo));
        assertEquals(tipo, r.tipoCliente()); assertTrue(r.ativo()); assertNotNull(r.dataCadastro());
    }
    @Test void consultaPorId() { Cliente c = cliente(true); when(repository.findById(1L)).thenReturn(Optional.of(c)); assertEquals("Cliente Teste", service.buscar(1L).nomeRazaoSocial()); }
    @Test void inexistenteRetornaErro() { when(repository.findById(9L)).thenReturn(Optional.empty()); assertThrows(ClienteNaoEncontradoException.class, () -> service.buscar(9L)); }
    @Test void listaAtivosComBusca() { when(repository.buscar("123", false)).thenReturn(List.of(cliente(true))); assertEquals(1, service.listar(" 123 ", false).size()); }
    @Test void incluiInativos() { when(repository.buscar(null, true)).thenReturn(List.of(cliente(false))); assertFalse(service.listar(null, true).get(0).ativo()); }
    @Test void atualizacaoPreservaCadastroEAtivo() {
        Cliente c = cliente(false); LocalDateTime data = c.getDataCadastro(); when(repository.findById(1L)).thenReturn(Optional.of(c));
        ClienteResponse r = service.atualizar(1L, new ClienteRequest("Novo", null, null, TipoCliente.OFICINA, null, null));
        assertEquals(data, r.dataCadastro()); assertFalse(r.ativo()); assertEquals("Novo", r.nomeRazaoSocial());
    }
    @Test void desativaEReativa() {
        Cliente c = cliente(true); when(repository.findById(1L)).thenReturn(Optional.of(c)); assertFalse(service.desativar(1L).ativo()); assertTrue(service.reativar(1L).ativo());
    }
    private ClienteRequest request(TipoCliente t) { return new ClienteRequest(" Cliente Teste ", " 11 ", "001", t, null, null); }
    private Cliente cliente(boolean ativo) { Cliente c = new Cliente(); c.setId(1L); c.setNomeRazaoSocial("Cliente Teste"); c.setTipoCliente(TipoCliente.CLIENTE_COMUM); c.setAtivo(ativo); c.setDataCadastro(LocalDateTime.now().minusDays(1)); return c; }
}
