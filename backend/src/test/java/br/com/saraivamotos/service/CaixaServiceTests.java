package br.com.saraivamotos.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import br.com.saraivamotos.domain.*;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.exception.OperacaoCaixaInvalidaException;
import br.com.saraivamotos.repository.*;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CaixaServiceTests {
    @Mock CaixaRepository caixas; @Mock CaixaMovimentacaoRepository movimentos;
    @Mock VendaRepository vendas; @Mock OperacaoIdempotenteRepository operacoes;
    CaixaService service; AuthenticatedUser user = new AuthenticatedUser(7L,"operador@saraiva.test");
    @BeforeEach void setup(){service=new CaixaService(caixas,movimentos,vendas,operacoes);lenient().when(vendas.totaisPorFormaNoCaixa(anyLong())).thenReturn(List.of());lenient().when(movimentos.findByCaixaIdOrderByDataHoraDescIdDesc(anyLong())).thenReturn(List.of());}

    @Test void abreCaixaComOperadorEValorInicial(){
        when(caixas.findFirstByStatus(StatusCaixa.ABERTO)).thenReturn(Optional.empty());
        when(caixas.saveAndFlush(any())).thenAnswer(i->{Caixa c=i.getArgument(0);c.setId(1L);return c;});
        when(movimentos.saldoMovimentos(1L)).thenReturn(BigDecimal.ZERO);
        CaixaResponse response=service.abrir(new AberturaCaixaRequest(new BigDecimal("100")),user);
        assertThat(response.status()).isEqualTo(StatusCaixa.ABERTO);assertThat(response.saldoEsperado()).isEqualByComparingTo("100.00");assertThat(response.operadorAberturaEmail()).isEqualTo(user.email());
    }

    @Test void vinculaVendaDinheiroEGeraUmUnicoMovimentoFisico(){
        Caixa caixa=aberto(); Venda venda=new Venda();venda.setId(10L);
        when(caixas.findByStatusForUpdate(StatusCaixa.ABERTO)).thenReturn(Optional.of(caixa));when(vendas.findById(10L)).thenReturn(Optional.of(venda));
        when(movimentos.saveAndFlush(any())).thenAnswer(i->i.getArgument(0));
        service.vincularVenda(vendaResponse(FormaPagamento.DINHEIRO),user);
        assertThat(venda.getCaixaId()).isEqualTo(1L);ArgumentCaptor<CaixaMovimentacao> captor=ArgumentCaptor.forClass(CaixaMovimentacao.class);verify(movimentos).saveAndFlush(captor.capture());assertThat(captor.getValue().getTipo()).isEqualTo(TipoMovimentacaoCaixa.VENDA_DINHEIRO);assertThat(captor.getValue().getValor()).isEqualByComparingTo("50.00");
    }

    @Test void pixVinculaVendaSemAlterarDinheiroFisico(){
        Caixa caixa=aberto();Venda venda=new Venda();venda.setId(10L);when(caixas.findByStatusForUpdate(StatusCaixa.ABERTO)).thenReturn(Optional.of(caixa));when(vendas.findById(10L)).thenReturn(Optional.of(venda));
        service.vincularVenda(vendaResponse(FormaPagamento.PIX),user);
        assertThat(venda.getCaixaId()).isEqualTo(1L);verify(movimentos,never()).saveAndFlush(any());
    }

    @Test void fechamentoDuplicadoERecusado(){Caixa c=aberto();c.setStatus(StatusCaixa.FECHADO);when(caixas.findByIdForUpdate(1L)).thenReturn(Optional.of(c));assertThatThrownBy(()->service.fechar(1L,new FechamentoCaixaRequest(BigDecimal.TEN),user)).isInstanceOf(OperacaoCaixaInvalidaException.class).hasMessageContaining("fechado");}

    @Test void naoFechaComOperacaoPendente(){Caixa c=aberto();when(caixas.findByIdForUpdate(1L)).thenReturn(Optional.of(c));when(operacoes.countPendentes()).thenReturn(1L);assertThatThrownBy(()->service.fechar(1L,new FechamentoCaixaRequest(BigDecimal.TEN),user)).hasMessageContaining("pendentes");verify(caixas,never()).save(any());}

    @Test void reenvioConcorrenteDeMovimentoRetornaOriginalSemDuplicar(){
        String chave="0e72d6f2-b411-49cb-82cc-6023acdebf87";
        MovimentacaoCaixaRequest request=new MovimentacaoCaixaRequest(TipoMovimentacaoCaixa.ENTRADA_AVULSA,new BigDecimal("25.00"),"Troco adicional");
        CaixaMovimentacao original=new CaixaMovimentacao();original.setId(9L);original.setCaixaId(1L);original.setTipo(request.tipo());original.setValor(request.valor());original.setDescricao(request.descricao());original.setChaveIdempotencia(chave);original.setRequestHash(hashMovimento(request));original.setOperadorId(user.id());original.setOperadorEmail(user.email());original.setDataHora(LocalDateTime.now());
        when(movimentos.findByChaveIdempotencia(chave)).thenReturn(Optional.empty(),Optional.of(original));
        when(caixas.findByStatusForUpdate(StatusCaixa.ABERTO)).thenReturn(Optional.of(aberto()));

        CaixaMovimentacaoResponse response=service.movimentar(chave,request,user);

        assertThat(response.id()).isEqualTo(9L);verify(movimentos,never()).saveAndFlush(any());
    }

    private Caixa aberto(){Caixa c=new Caixa();c.setId(1L);c.setStatus(StatusCaixa.ABERTO);c.setValorInicial(new BigDecimal("100.00"));c.setDataAbertura(LocalDateTime.now());c.setOperadorAberturaId(7L);c.setOperadorAberturaEmail(user.email());return c;}
    private String hashMovimento(MovimentacaoCaixaRequest request){
        String value=request.tipo()+"|"+request.valor().setScale(2)+"|"+request.descricao().trim();
        try{return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));}
        catch(Exception e){throw new IllegalStateException(e);}
    }
    private VendaResponse vendaResponse(FormaPagamento forma){return new VendaResponse(10L,"000010",LocalDateTime.now(),StatusVenda.CONCLUIDA,null,null,null,TipoPreco.VAREJO,List.of(),new BigDecimal("50"),BigDecimal.ZERO,null,new BigDecimal("50"),forma,null,null,null);}
}
