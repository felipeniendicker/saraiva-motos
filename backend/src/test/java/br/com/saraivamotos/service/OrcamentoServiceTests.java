package br.com.saraivamotos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import br.com.saraivamotos.domain.Produto;
import br.com.saraivamotos.domain.StatusOrcamento;
import br.com.saraivamotos.domain.TipoItem;
import br.com.saraivamotos.dto.ItemOrcamentoRequest;
import br.com.saraivamotos.dto.OrcamentoRequest;
import br.com.saraivamotos.repository.ClienteRepository;
import br.com.saraivamotos.repository.OrcamentoRepository;
import br.com.saraivamotos.repository.ProdutoRepository;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OrcamentoServiceTests {
    @Mock OrcamentoRepository orcamentos;
    @Mock ClienteRepository clientes;
    @Mock ProdutoRepository produtos;
    @Mock OperacaoIdempotenteService operacoes;
    @Mock VendaService vendas;

    private OrcamentoService service;

    @BeforeEach
    void setup() {
        service = new OrcamentoService(orcamentos, clientes, produtos, operacoes, vendas);
        when(orcamentos.saveAndFlush(any())).thenAnswer(invocation -> {
            var orcamento = invocation.<br.com.saraivamotos.domain.Orcamento>getArgument(0);
            orcamento.setId(12L);
            orcamento.setVersao(0L);
            return orcamento;
        });
        when(orcamentos.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void criaOrcamentoComProdutoEServicoSemAlterarEstoque() {
        Produto produto = produto();
        when(produtos.findAllById(List.of(3L))).thenReturn(List.of(produto));
        OrcamentoRequest request = new OrcamentoRequest(null, List.of(
                new ItemOrcamentoRequest(TipoItem.PRODUTO, 3L, null, 2,
                        new BigDecimal("40.00"), new BigDecimal("40.00"), false),
                new ItemOrcamentoRequest(TipoItem.SERVICO, null, "Instalacao", 1,
                        new BigDecimal("20.00"), new BigDecimal("20.00"), true)),
                new BigDecimal("10.00"), LocalDate.now().plusDays(7),
                StatusOrcamento.EMITIDO, null, null);

        var response = service.criar(request, new AuthenticatedUser(7L, "operador@saraiva.test"));

        assertThat(response.numero()).isEqualTo("ORC-000012");
        assertThat(response.subtotal()).isEqualByComparingTo("100.00");
        assertThat(response.desconto()).isEqualByComparingTo("10.00");
        assertThat(response.total()).isEqualByComparingTo("90.00");
        assertThat(response.itens()).hasSize(2);
        assertThat(produto.getQuantidadeEstoque()).isEqualTo(5);
    }

    private Produto produto() {
        Produto produto = new Produto();
        produto.setId(3L);
        produto.setNome("Produto homologado");
        produto.setCodigoReferencia("PROD-3");
        produto.setPrecoVarejo(new BigDecimal("40.00"));
        produto.setPrecoRevenda(new BigDecimal("35.00"));
        produto.setQuantidadeEstoque(5);
        produto.setAtivo(true);
        return produto;
    }
}
