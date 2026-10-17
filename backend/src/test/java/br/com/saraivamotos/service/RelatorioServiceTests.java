package br.com.saraivamotos.service;
import java.math.BigDecimal;import java.time.*;import java.util.List;import java.util.Collections;
import br.com.saraivamotos.domain.*;import br.com.saraivamotos.dto.*;import br.com.saraivamotos.repository.*;
import org.junit.jupiter.api.*;import org.junit.jupiter.api.extension.ExtendWith;import org.mockito.Mock;import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.*;import static org.mockito.Mockito.*;
@ExtendWith(MockitoExtension.class)
class RelatorioServiceTests{
 @Mock VendaRepository vendas;@Mock ProdutoRepository produtos;RelatorioService service;
 @Mock RecebimentoRepository recebimentos;@Mock ContaReceberRepository contas;@Mock CaixaMovimentacaoRepository movimentos;
 @BeforeEach void setup(){service=new RelatorioService(vendas,produtos,recebimentos,contas,movimentos);}
 @Test void periodoSemVendasRetornaZeros(){stubResumo(0,"0.00","0.00",0);RelatorioVendasResponse r=service.vendas(null,null);assertEquals(0,r.resumo().quantidadeVendas());assertEquals(new BigDecimal("0.00"),r.resumo().ticketMedio());}
 @Test void calculaFaturamentoTicketDescontoEItens(){stubResumo(2,"180.00","20.00",3);ResumoVendasResponse r=service.vendas(null,null).resumo();assertEquals(new BigDecimal("90.00"),r.ticketMedio());assertEquals(new BigDecimal("20.00"),r.descontosConcedidos());assertEquals(3,r.itensVendidos());}
 @Test void converteDatasParaInicioInclusivoEFimExclusivo(){stubResumo(0,"0","0",0);service.vendas(LocalDate.of(2026,9,1),LocalDate.of(2026,9,30));verify(vendas).resumirConcluidas(LocalDateTime.of(2026,9,1,0,0),LocalDateTime.of(2026,10,1,0,0));}
 @Test void rejeitaIntervaloInvalido(){assertThrows(IllegalArgumentException.class,()->service.vendas(LocalDate.of(2026,9,2),LocalDate.of(2026,9,1)));verifyNoInteractions(vendas);}
 @Test void rankingUsaSnapshotQuantidadeEPrecoPraticado(){stubResumo(1,"75","0",1);when(vendas.rankingProdutos(null,null)).thenReturn(Collections.singletonList(new Object[]{1L,"Descrição histórica","REF",1L,new BigDecimal("75.00")}));ProdutoVendidoResponse p=service.vendas(null,null).produtosMaisVendidos().get(0);assertEquals("Descrição histórica",p.descricao());assertEquals(new BigDecimal("75.00"),p.valorVendido());}
 @Test void listagemPodeConterCanceladaSemMudarResumo(){stubResumo(1,"100","0",1);Venda cancelada=new Venda();cancelada.setId(1L);cancelada.setNumeroVenda("000001");cancelada.setStatus(StatusVenda.CANCELADA);cancelada.setSubtotal(BigDecimal.TEN);cancelada.setDesconto(BigDecimal.ZERO);cancelada.setTotal(BigDecimal.TEN);cancelada.setTipoPrecoUtilizado(TipoPreco.VAREJO);cancelada.setFormaPagamento(FormaPagamento.PIX);cancelada.setDataHora(LocalDateTime.now());when(vendas.buscar(null,null,null,null)).thenReturn(List.of(cancelada));RelatorioVendasResponse r=service.vendas(null,null);assertEquals(StatusVenda.CANCELADA,r.vendas().get(0).status());assertEquals(1,r.resumo().quantidadeVendas());}
 @Test void estoqueUsaPosicaoAtualEValorDeCustoDosAtivos(){when(produtos.countByAtivoTrue()).thenReturn(2L);when(produtos.contarEstoqueBaixo()).thenReturn(1L);when(produtos.somarUnidadesAtivas()).thenReturn(7L);when(produtos.calcularValorEstoqueAtivo()).thenReturn(new BigDecimal("350.00"));when(produtos.buscar(null,false)).thenReturn(List.of());EstoqueRelatorioResponse r=service.estoque(false);assertEquals(7,r.unidadesEstoque());assertEquals(new BigDecimal("350.00"),r.valorEstoqueCusto());assertEquals(1,r.produtosEstoqueBaixo());}
 @Test void financeiroSeparaVendidoRecebidoPendenteEEstornos(){
  when(vendas.totaisImediatosPorPeriodo(null,null)).thenReturn(Collections.singletonList(new Object[]{FormaPagamento.PIX,new BigDecimal("100.00")}));
  when(recebimentos.totaisPorPeriodo(null,null)).thenReturn(Collections.singletonList(new Object[]{FormaPagamento.DINHEIRO,new BigDecimal("30.00")}));
  when(recebimentos.estornosPorPeriodo(null,null)).thenReturn(new BigDecimal("5.00"));
  when(movimentos.devolucoesVendasPorPeriodo(null,null)).thenReturn(new BigDecimal("10.00"));
  when(contas.totalPendente()).thenReturn(new BigDecimal("70.00"));when(contas.totalVencido()).thenReturn(new BigDecimal("20.00"));
  when(vendas.resumirConcluidas(null,null)).thenReturn(Collections.singletonList(new Object[]{2L,new BigDecimal("200.00"),BigDecimal.ZERO}));
  RelatorioFinanceiroResponse r=service.financeiro(null,null);
  assertEquals(new BigDecimal("200.00"),r.totalVendido());assertEquals(new BigDecimal("130.00"),r.totalRecebido());
  assertEquals(new BigDecimal("15.00"),r.totalEstornos());assertEquals(new BigDecimal("115.00"),r.totalRecebidoLiquido());
  assertEquals(new BigDecimal("70.00"),r.totalPendente());assertEquals(new BigDecimal("20.00"),r.totalVencido());
 }
 private void stubResumo(long q,String f,String d,long itens){when(vendas.resumirConcluidas(nullable(LocalDateTime.class),nullable(LocalDateTime.class))).thenReturn(Collections.singletonList(new Object[]{q,new BigDecimal(f),new BigDecimal(d)}));when(vendas.somarItensConcluidos(nullable(LocalDateTime.class),nullable(LocalDateTime.class))).thenReturn(itens);when(vendas.rankingProdutos(nullable(LocalDateTime.class),nullable(LocalDateTime.class))).thenReturn(List.of());when(vendas.buscar(isNull(),isNull(),nullable(LocalDateTime.class),nullable(LocalDateTime.class))).thenReturn(List.of());}
}
