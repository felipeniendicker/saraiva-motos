package br.com.saraivamotos.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import br.com.saraivamotos.domain.Cliente;
import br.com.saraivamotos.domain.CondicaoPagamento;
import br.com.saraivamotos.domain.FormaPagamento;
import br.com.saraivamotos.domain.Produto;
import br.com.saraivamotos.domain.StatusContaReceber;
import br.com.saraivamotos.domain.StatusOrcamento;
import br.com.saraivamotos.domain.StatusVenda;
import br.com.saraivamotos.domain.TipoCliente;
import br.com.saraivamotos.domain.TipoItem;
import br.com.saraivamotos.domain.Usuario;
import br.com.saraivamotos.dto.AberturaCaixaRequest;
import br.com.saraivamotos.dto.CancelamentoVendaRequest;
import br.com.saraivamotos.dto.ConversaoOrcamentoRequest;
import br.com.saraivamotos.dto.EstornoRecebimentoRequest;
import br.com.saraivamotos.dto.FechamentoCaixaRequest;
import br.com.saraivamotos.dto.ItemOrcamentoRequest;
import br.com.saraivamotos.dto.ItemVendaRequest;
import br.com.saraivamotos.dto.OrcamentoRequest;
import br.com.saraivamotos.dto.RecebimentoRequest;
import br.com.saraivamotos.dto.VendaRequest;
import br.com.saraivamotos.repository.ClienteRepository;
import br.com.saraivamotos.repository.ProdutoRepository;
import br.com.saraivamotos.repository.UsuarioRepository;
import br.com.saraivamotos.security.AuthenticatedUser;
import br.com.saraivamotos.service.CaixaService;
import br.com.saraivamotos.service.ContaReceberService;
import br.com.saraivamotos.service.OperacaoIdempotenteService;
import br.com.saraivamotos.service.OrcamentoService;
import br.com.saraivamotos.service.VendaCancelamentoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK, properties = {
        "app.initial-user.email=", "app.initial-user.password=",
        "app.upcitemdb.enabled=false", "app.tavily.enabled=false",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@EnabledIfEnvironmentVariable(named = "SARAIVA_LOCAL_DB_HOMOLOGATION", matches = "true")
class LocalBackupHomologationIT {
    @Autowired JdbcTemplate jdbc;
    @Autowired ProdutoRepository produtos;
    @Autowired ClienteRepository clientes;
    @Autowired UsuarioRepository usuarios;
    @Autowired CaixaService caixas;
    @Autowired OrcamentoService orcamentos;
    @Autowired OperacaoIdempotenteService operacoes;
    @Autowired ContaReceberService contas;
    @Autowired VendaCancelamentoService cancelamentos;

    @Test
    @Transactional
    void homologaFluxosFinanceirosComRollbackIntegral() {
        assertThat(jdbc.queryForObject("SELECT DATABASE()", String.class))
                .isEqualTo("saraiva_backup_teste");
        assertThat(jdbc.queryForObject(
                "SELECT MAX(CAST(version AS UNSIGNED)) FROM flyway_schema_history WHERE success=1",
                Integer.class)).isEqualTo(9);

        AuthenticatedUser operador = operador();
        var caixa = caixas.abrir(new AberturaCaixaRequest(new BigDecimal("100.00")), operador);
        Produto produto = produto();
        Cliente cliente = cliente();

        var orcamento = orcamentos.criar(new OrcamentoRequest(cliente.getId(), List.of(
                new ItemOrcamentoRequest(TipoItem.PRODUTO, produto.getId(), null, 2,
                        new BigDecimal("100.00"), new BigDecimal("100.00"), false),
                new ItemOrcamentoRequest(TipoItem.SERVICO, null, "Instalacao homologacao", 1,
                        new BigDecimal("20.00"), new BigDecimal("20.00"), true)),
                new BigDecimal("10.00"), LocalDate.now().plusDays(7),
                StatusOrcamento.EMITIDO, "Teste transacional", null), operador);
        assertThat(estoque(produto)).isEqualTo(20);

        String chaveConversao = UUID.randomUUID().toString();
        var vendaConvertida = orcamentos.converter(orcamento.id(), chaveConversao,
                new ConversaoOrcamentoRequest(FormaPagamento.PIX, null), operador);
        var conversaoRepetida = orcamentos.converter(orcamento.id(), chaveConversao,
                new ConversaoOrcamentoRequest(FormaPagamento.PIX, null), operador);
        assertThat(conversaoRepetida.id()).isEqualTo(vendaConvertida.id());
        assertThat(vendaConvertida.itens()).hasSize(2);
        assertThat(estoque(produto)).isEqualTo(18);

        VendaRequest vendaAPrazo = new VendaRequest(cliente.getId(), List.of(
                new ItemVendaRequest(produto.getId(), 1, new BigDecimal("100.00"),
                        new BigDecimal("100.00"), false)),
                BigDecimal.ZERO, null, FormaPagamento.OUTRO, "Credito homologacao",
                CondicaoPagamento.A_PRAZO, LocalDate.now().plusDays(30),
                new BigDecimal("20.00"), FormaPagamento.PIX);
        var credito = operacoes.venda(UUID.randomUUID().toString(), vendaAPrazo, operador);
        var conta = contas.listar().stream()
                .filter(item -> item.vendaId().equals(credito.id())).findFirst().orElseThrow();
        assertThat(conta.valorRecebido()).isEqualByComparingTo("20.00");
        assertThat(conta.saldoPendente()).isEqualByComparingTo("80.00");

        String chaveParcial = UUID.randomUUID().toString();
        var parcial = contas.registrar(conta.id(), chaveParcial,
                new RecebimentoRequest(new BigDecimal("30.00"), FormaPagamento.DINHEIRO), operador);
        var parcialRepetido = contas.registrar(conta.id(), chaveParcial,
                new RecebimentoRequest(new BigDecimal("30.00"), FormaPagamento.DINHEIRO), operador);
        assertThat(parcialRepetido.id()).isEqualTo(parcial.id());
        contas.registrar(conta.id(), UUID.randomUUID().toString(),
                new RecebimentoRequest(new BigDecimal("50.00"), FormaPagamento.PIX), operador);

        var quitada = contas.listar().stream()
                .filter(item -> item.id().equals(conta.id())).findFirst().orElseThrow();
        assertThat(quitada.situacao()).isEqualTo(StatusContaReceber.QUITADA.name());
        assertThat(quitada.saldoPendente()).isEqualByComparingTo("0.00");
        assertThatThrownBy(() -> cancelamentos.cancelar(credito.id(),
                new CancelamentoVendaRequest("Cancelamento antes dos estornos"), operador))
                .hasMessageContaining("Estorne os pagamentos");

        List<Long> recebimentos = jdbc.queryForList(
                "SELECT id FROM recebimento WHERE conta_receber_id = ? ORDER BY id",
                Long.class, conta.id());
        assertThat(recebimentos).hasSize(3);
        for (Long recebimentoId : recebimentos) {
            contas.estornar(recebimentoId,
                    new EstornoRecebimentoRequest("Estorno da homologacao"), operador);
        }
        var creditoCancelado = cancelamentos.cancelar(credito.id(),
                new CancelamentoVendaRequest("Cancelamento apos estornos"), operador);
        var conversaoCancelada = cancelamentos.cancelar(vendaConvertida.id(),
                new CancelamentoVendaRequest("Cancelamento da conversao"), operador);
        assertThat(creditoCancelado.status()).isEqualTo(StatusVenda.CANCELADA);
        assertThat(conversaoCancelada.status()).isEqualTo(StatusVenda.CANCELADA);
        assertThat(estoque(produto)).isEqualTo(20);

        var fechado = caixas.fechar(caixa.id(),
                new FechamentoCaixaRequest(new BigDecimal("100.00")), operador);
        assertThat(fechado.saldoEsperado()).isEqualByComparingTo("100.00");
        assertThat(fechado.diferenca()).isEqualByComparingTo("0.00");
    }

    private AuthenticatedUser operador() {
        Usuario usuario = new Usuario();
        usuario.setEmail("homologacao-" + UUID.randomUUID() + "@saraiva.test");
        usuario.setSenhaHash("hash-nao-utilizado");
        usuario.setAtivo(true);
        usuario.setDataCadastro(LocalDateTime.now());
        usuario = usuarios.saveAndFlush(usuario);
        return new AuthenticatedUser(usuario.getId(), usuario.getEmail());
    }

    private Produto produto() {
        Produto produto = new Produto();
        produto.setCodigoReferencia("HOMOLOG-" + UUID.randomUUID());
        produto.setNome("Produto descartavel de homologacao");
        produto.setValorCusto(new BigDecimal("50.00"));
        produto.setPrecoVarejo(new BigDecimal("100.00"));
        produto.setPrecoRevenda(new BigDecimal("90.00"));
        produto.setQuantidadeEstoque(20);
        produto.setEstoqueMinimo(1);
        produto.setAtivo(true);
        produto.setDataCadastro(LocalDateTime.now());
        return produtos.saveAndFlush(produto);
    }

    private Cliente cliente() {
        Cliente cliente = new Cliente();
        cliente.setNomeRazaoSocial("Cliente descartavel de homologacao");
        cliente.setTipoCliente(TipoCliente.CLIENTE_COMUM);
        cliente.setAtivo(true);
        cliente.setDataCadastro(LocalDateTime.now());
        return clientes.saveAndFlush(cliente);
    }

    private int estoque(Produto produto) {
        return produtos.findById(produto.getId()).orElseThrow().getQuantidadeEstoque();
    }
}
