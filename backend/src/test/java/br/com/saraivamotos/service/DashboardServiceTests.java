package br.com.saraivamotos.service;
import java.math.BigDecimal;import java.time.LocalDateTime;import java.util.List;
import br.com.saraivamotos.domain.*;import br.com.saraivamotos.dto.DashboardResponse;import br.com.saraivamotos.repository.*;
import org.junit.jupiter.api.*;import org.junit.jupiter.api.extension.ExtendWith;import org.mockito.Mock;import org.mockito.junit.jupiter.MockitoExtension;import org.springframework.data.domain.Pageable;
import static org.junit.jupiter.api.Assertions.*;import static org.mockito.ArgumentMatchers.any;import static org.mockito.Mockito.*;
@ExtendWith(MockitoExtension.class)
class DashboardServiceTests{
 @Mock ProdutoRepository produtos;@Mock ClienteRepository clientes;@Mock VendaRepository vendas;@Mock MovimentacaoEstoqueRepository movimentos;DashboardService service;
 @BeforeEach void setup(){service=new DashboardService(produtos,clientes,vendas,movimentos);when(vendas.resumirConcluidas(null,null)).thenReturn(java.util.Collections.singletonList(new Object[]{2L,new BigDecimal("190.00"),new BigDecimal("10.00")}));}
 @Test void agregaSomenteIndicadoresFornecidosPelasQueries(){when(produtos.countByAtivoTrue()).thenReturn(3L);when(produtos.contarEstoqueBaixo()).thenReturn(1L);when(clientes.countByAtivoTrue()).thenReturn(4L);DashboardResponse r=service.consultar();assertEquals(3,r.totalProdutosAtivos());assertEquals(1,r.produtosEstoqueBaixo());assertEquals(4,r.totalClientesAtivos());assertEquals(2,r.vendasConcluidas());assertEquals(new BigDecimal("190.00"),r.faturamento());}
 @Test void retornaEstoqueBaixoAtivo(){Produto p=produto();when(produtos.buscarEstoqueBaixo()).thenReturn(List.of(p));assertEquals("Produto baixo",service.consultar().itensEstoqueBaixo().get(0).nome());}
 @Test void limitaEMantemOrdenacaoDasMovimentacoes(){MovimentacaoEstoque m=movimento();when(movimentos.findByOrderByDataHoraDescIdDesc(any(Pageable.class))).thenReturn(List.of(m));DashboardResponse r=service.consultar();assertEquals(1,r.movimentacoesRecentes().size());assertEquals(LocalDateTime.of(2026,9,28,12,0),r.movimentacoesRecentes().get(0).dataHora());verify(movimentos).findByOrderByDataHoraDescIdDesc(argThat(p->p.getPageSize()==6));}
 private Produto produto(){Produto p=new Produto();p.setId(1L);p.setNome("Produto baixo");p.setCodigoReferencia("P1");p.setValorCusto(BigDecimal.ONE);p.setPrecoVarejo(BigDecimal.TEN);p.setPrecoRevenda(BigDecimal.TEN);p.setQuantidadeEstoque(1);p.setEstoqueMinimo(1);p.setAtivo(true);p.setDataCadastro(LocalDateTime.now());return p;}
 private MovimentacaoEstoque movimento(){MovimentacaoEstoque m=new MovimentacaoEstoque();m.setId(1L);m.setProduto(produto());m.setTipo(TipoMovimentacaoEstoque.ENTRADA);m.setQuantidade(1);m.setEstoqueAnterior(0);m.setEstoquePosterior(1);m.setMotivo("Entrada");m.setDataHora(LocalDateTime.of(2026,9,28,12,0));return m;}
}
