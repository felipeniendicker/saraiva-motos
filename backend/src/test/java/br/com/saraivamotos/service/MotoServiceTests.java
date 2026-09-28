package br.com.saraivamotos.service;

import java.util.*;
import br.com.saraivamotos.domain.*;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.exception.*;
import br.com.saraivamotos.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MotoServiceTests {
    @Mock MotoRepository motos; @Mock ClienteRepository clientes; MotoService service;
    @BeforeEach void setup() { service = new MotoService(motos, clientes); }
    @Test void clienteSemMotos() { when(clientes.existsById(1L)).thenReturn(true); when(motos.findByClienteIdOrderById(1L)).thenReturn(List.of()); assertTrue(service.listar(1L).isEmpty()); }
    @Test void cadastraMoto() { Cliente c = cliente(true); when(clientes.findById(1L)).thenReturn(Optional.of(c)); when(motos.save(any())).thenAnswer(i -> { Moto m=i.getArgument(0);m.setId(2L);return m;}); assertEquals("Honda", service.criar(1L, request()).marca()); }
    @Test void listaVarias() { when(clientes.existsById(1L)).thenReturn(true); when(motos.findByClienteIdOrderById(1L)).thenReturn(List.of(moto(), moto())); assertEquals(2, service.listar(1L).size()); }
    @Test void clienteInexistente() { when(clientes.findById(9L)).thenReturn(Optional.empty()); assertThrows(ClienteNaoEncontradoException.class, () -> service.criar(9L, request())); }
    @Test void clienteInativoImpedeCadastro() { when(clientes.findById(1L)).thenReturn(Optional.of(cliente(false))); assertThrows(OperacaoClienteInvalidaException.class, () -> service.criar(1L, request())); }
    @Test void atualizaMoto() { Moto m=moto(); when(motos.findById(2L)).thenReturn(Optional.of(m)); when(motos.save(m)).thenReturn(m); assertEquals("Honda", service.atualizar(2L, request()).marca()); }
    @Test void removeFisicamente() { Moto m=moto(); when(motos.findById(2L)).thenReturn(Optional.of(m)); service.remover(2L); verify(motos).delete(m); }
    private Cliente cliente(boolean ativo) { Cliente c=new Cliente();c.setId(1L);c.setAtivo(ativo);return c; }
    private Moto moto() { Moto m=new Moto();m.setId(2L);m.setCliente(cliente(true));m.setMarca("Yamaha");m.setModelo("Factor");return m; }
    private MotoRequest request() { return new MotoRequest("Honda", "CG", (short)2024, "160", "ABC1D23", null); }
}
