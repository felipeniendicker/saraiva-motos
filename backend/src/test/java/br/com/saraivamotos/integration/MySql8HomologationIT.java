package br.com.saraivamotos.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import br.com.saraivamotos.domain.Cliente;
import br.com.saraivamotos.domain.CondicaoPagamento;
import br.com.saraivamotos.domain.FormaPagamento;
import br.com.saraivamotos.domain.Produto;
import br.com.saraivamotos.domain.StatusVenda;
import br.com.saraivamotos.domain.StatusOrcamento;
import br.com.saraivamotos.domain.TipoItem;
import br.com.saraivamotos.domain.TipoCliente;
import br.com.saraivamotos.domain.Usuario;
import br.com.saraivamotos.dto.AberturaCaixaRequest;
import br.com.saraivamotos.dto.FechamentoCaixaRequest;
import br.com.saraivamotos.dto.CaixaResponse;
import br.com.saraivamotos.dto.CancelamentoVendaRequest;
import br.com.saraivamotos.dto.EntradaEstoqueRequest;
import br.com.saraivamotos.dto.ItemVendaRequest;
import br.com.saraivamotos.dto.ItemOrcamentoRequest;
import br.com.saraivamotos.dto.MovimentacaoEstoqueResponse;
import br.com.saraivamotos.dto.OrcamentoRequest;
import br.com.saraivamotos.dto.OrcamentoResponse;
import br.com.saraivamotos.dto.ConversaoOrcamentoRequest;
import br.com.saraivamotos.dto.RecebimentoRequest;
import br.com.saraivamotos.dto.VendaRequest;
import br.com.saraivamotos.dto.VendaResponse;
import br.com.saraivamotos.exception.PrecoProdutoDesatualizadoException;
import br.com.saraivamotos.repository.ClienteRepository;
import br.com.saraivamotos.repository.ProdutoRepository;
import br.com.saraivamotos.repository.UsuarioRepository;
import br.com.saraivamotos.security.AuthenticatedUser;
import br.com.saraivamotos.service.CaixaService;
import br.com.saraivamotos.service.ContaReceberService;
import br.com.saraivamotos.service.OrcamentoService;
import br.com.saraivamotos.service.VendaCancelamentoService;
import br.com.saraivamotos.service.OperacaoIdempotenteService;
import br.com.saraivamotos.service.VendaService;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = {
        "app.initial-user.email=", "app.initial-user.password=",
        "app.upcitemdb.enabled=false", "app.tavily.enabled=false",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Testcontainers(disabledWithoutDocker = true)
@Execution(ExecutionMode.SAME_THREAD)
class MySql8HomologationIT {

    @Container
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0.36")
            .withDatabaseName("saraiva_homolog_test")
            .withUsername("saraiva_test")
            .withPassword("saraiva_test_password");

    @DynamicPropertySource
    static void configurarBanco(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.datasource.driver-class-name", MYSQL::getDriverClassName);
        registry.add("app.jwt.secret", () -> "homologation-test-secret-with-at-least-thirty-two-characters");
    }

    @Autowired private OperacaoIdempotenteService operacoes;
    @Autowired private VendaService vendas;
    @Autowired private ProdutoRepository produtos;
    @Autowired private ClienteRepository clientes;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private Flyway flyway;
    @Autowired private CaixaService caixas;
    @Autowired private VendaCancelamentoService cancelamentos;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private OrcamentoService orcamentos;
    @Autowired private ContaReceberService contasReceber;

    private ExecutorService executor;

    @BeforeEach
    void limparBancoDescartavel() {
        jdbc.execute("SET FOREIGN_KEY_CHECKS = 0");
        for (String tabela : List.of("leitor_leitura", "leitor_sessao", "caixa_movimentacao",
                "recebimento", "conta_receber", "item_orcamento", "orcamento",
                "operacao_idempotente", "movimentacao_estoque", "item_venda",
                "venda", "caixa", "moto", "cliente", "produto", "usuario")) {
            jdbc.execute("TRUNCATE TABLE " + tabela);
        }
        jdbc.execute("SET FOREIGN_KEY_CHECKS = 1");
        executor = Executors.newFixedThreadPool(2);
    }

    @AfterEach
    void encerrarExecutor() {
        executor.shutdownNow();
    }

    @Test
    void aplicaEValidaAsMigrationsV1AV9NoMySql8() {
        assertThat(jdbc.queryForObject("SELECT VERSION()", String.class)).startsWith("8.0.");
        assertThat(flyway.validateWithResult().validationSuccessful).isTrue();
        assertThat(jdbc.queryForList(
                "SELECT version FROM flyway_schema_history WHERE success = 1 ORDER BY installed_rank",
                String.class)).containsExactly("1", "2", "3", "4", "5", "6", "7", "8", "9");
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'venda'
                  AND column_name = 'desconto_percentual'
                """, Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'venda'
                  AND column_name = 'caixa_id' AND is_nullable = 'YES'
                """, Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.tables
                WHERE table_schema = DATABASE() AND table_name IN
                  ('caixa', 'caixa_movimentacao', 'leitor_sessao', 'leitor_leitura',
                   'orcamento', 'item_orcamento', 'conta_receber', 'recebimento')
                """, Integer.class)).isEqualTo(8);
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.table_constraints
                WHERE constraint_schema = DATABASE() AND table_name = 'venda'
                  AND constraint_name = 'chk_venda_desconto_percentual'
                """, Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'item_venda'
                  AND column_name = 'preco_alterado_manualmente'
                """, Integer.class)).isEqualTo(1);
    }

    @Test
    void reenvioDaVendaRetornaMesmoResultadoESoBaixaEstoqueUmaVez() {
        Produto produto = produto("KIT-1", "Kit transmissao", 10, "120.00", "100.00");
        VendaRequest request = venda(produto, 2, "120.00", "120.00", false, null);
        String chave = UUID.randomUUID().toString();

        VendaResponse primeira = operacoes.venda(chave, request);
        VendaResponse repetida = operacoes.venda(chave, request);

        assertThat(repetida.id()).isEqualTo(primeira.id());
        assertThat(estoque(produto)).isEqualTo(8);
        assertThat(contar("venda")).isEqualTo(1);
        assertThat(contarMovimentos("SAIDA_VENDA")).isEqualTo(1);
    }

    @Test
    void duasRequisicoesSimultaneasComMesmaChaveConvergemParaUmaVenda() throws Exception {
        Produto produto = produto("OLEO-1", "Oleo motor", 6, "35.00", "30.00");
        VendaRequest request = venda(produto, 1, "35.00", "35.00", false, null);
        String chave = UUID.randomUUID().toString();
        CountDownLatch partida = new CountDownLatch(1);
        Future<VendaResponse> primeira = executor.submit(() -> executarApos(partida, chave, request));
        Future<VendaResponse> segunda = executor.submit(() -> executarApos(partida, chave, request));

        partida.countDown();

        assertThat(primeira.get().id()).isEqualTo(segunda.get().id());
        assertThat(estoque(produto)).isEqualTo(5);
        assertThat(contar("venda")).isEqualTo(1);
        assertThat(contarMovimentos("SAIDA_VENDA")).isEqualTo(1);
    }

    @Test
    void vendasSimultaneasDistintasNaoConsomemOMesmoUltimoItem() throws Exception {
        Produto produto = produto("ULTIMO-1", "Ultima unidade", 1, "50.00", "45.00");
        VendaRequest request = venda(produto, 1, "50.00", "50.00", false, null);
        CountDownLatch partida = new CountDownLatch(1);
        Future<VendaResponse> primeira = executor.submit(
                () -> executarApos(partida, UUID.randomUUID().toString(), request));
        Future<VendaResponse> segunda = executor.submit(
                () -> executarApos(partida, UUID.randomUUID().toString(), request));

        partida.countDown();

        assertThat(resultado(primeira) + resultado(segunda)).isEqualTo(1);
        assertThat(estoque(produto)).isZero();
        assertThat(contar("venda")).isEqualTo(1);
        assertThat(contarMovimentos("SAIDA_VENDA")).isEqualTo(1);
        assertThat(contar("operacao_idempotente")).isEqualTo(1);
    }

    @Test
    void reenvioDeMovimentoDeEstoqueNaoDuplicaEntrada() {
        Produto produto = produto("PNEU-1", "Pneu", 2, "180.00", "160.00");
        EntradaEstoqueRequest request = new EntradaEstoqueRequest(produto.getId(), 3, "Compra homologacao");
        String chave = UUID.randomUUID().toString();

        MovimentacaoEstoqueResponse primeira = operacoes.entrada(chave, request);
        MovimentacaoEstoqueResponse repetida = operacoes.entrada(chave, request);

        assertThat(repetida.id()).isEqualTo(primeira.id());
        assertThat(estoque(produto)).isEqualTo(5);
        assertThat(contarMovimentos("ENTRADA")).isEqualTo(1);
    }

    @Test
    void cancelamentoRestauraEstoqueUmaUnicaVez() {
        Produto produto = produto("VELA-1", "Vela", 5, "25.00", "20.00");
        VendaResponse venda = operacoes.venda(UUID.randomUUID().toString(),
                venda(produto, 2, "25.00", "25.00", false, null));

        VendaResponse cancelada = vendas.cancelar(venda.id(), new CancelamentoVendaRequest("Teste homologacao"));

        assertThat(cancelada.status()).isEqualTo(StatusVenda.CANCELADA);
        assertThat(estoque(produto)).isEqualTo(5);
        assertThat(contarMovimentos("CANCELAMENTO_VENDA")).isEqualTo(1);
        assertThatThrownBy(() -> vendas.cancelar(venda.id(), new CancelamentoVendaRequest("Repetido")))
                .hasMessageContaining("cancelada");
        assertThat(estoque(produto)).isEqualTo(5);
        assertThat(contarMovimentos("CANCELAMENTO_VENDA")).isEqualTo(1);
    }

    @Test
    void precoAlteradoEmOutroComputadorExigeConfirmacaoEPreservaNegociacao() {
        Produto produto = produto("FILTRO-1", "Filtro", 4, "25.50", "22.00");
        VendaRequest rascunhoAntigo = venda(produto, 1, "25.50", "25.50", false, null);
        produto.setPrecoVarejo(new BigDecimal("30.00"));
        produtos.saveAndFlush(produto);

        assertThatThrownBy(() -> operacoes.venda(UUID.randomUUID().toString(), rascunhoAntigo))
                .isInstanceOf(PrecoProdutoDesatualizadoException.class);
        assertThat(contar("venda")).isZero();
        assertThat(estoque(produto)).isEqualTo(4);

        VendaResponse negociada = operacoes.venda(UUID.randomUUID().toString(),
                venda(produto, 1, "23.00", "25.50", true, null));
        assertThat(negociada.itens().get(0).precoOriginal()).isEqualByComparingTo("30.00");
        assertThat(negociada.itens().get(0).precoUnitario()).isEqualByComparingTo("23.00");
        assertThat(negociada.itens().get(0).precoAlteradoManualmente()).isTrue();
    }

    @Test
    void snapshotsHistoricosNaoMudamQuandoCadastrosSaoEditados() {
        Produto produto = produto("CORRENTE-ANTIGA", "Corrente original", 3, "90.00", "80.00");
        Cliente cliente = cliente("Oficina Original", TipoCliente.OFICINA);
        VendaResponse criada = operacoes.venda(UUID.randomUUID().toString(),
                venda(produto, 1, "80.00", "80.00", false, cliente));

        produto.setNome("Corrente renomeada");
        produto.setCodigoReferencia("CORRENTE-NOVA");
        produto.setPrecoRevenda(new BigDecimal("99.00"));
        produtos.saveAndFlush(produto);
        cliente.setNomeRazaoSocial("Oficina Renomeada");
        clientes.saveAndFlush(cliente);

        VendaResponse historica = vendas.buscarPorId(criada.id());
        assertThat(historica.clienteNome()).isEqualTo("Oficina Original");
        assertThat(historica.clienteTipo()).isEqualTo("OFICINA");
        assertThat(historica.itens().get(0).descricaoProduto()).isEqualTo("Corrente original");
        assertThat(historica.itens().get(0).codigoProduto()).isEqualTo("CORRENTE-ANTIGA");
        assertThat(historica.itens().get(0).precoOriginal()).isEqualByComparingTo("80.00");
        assertThat(historica.itens().get(0).precoUnitario()).isEqualByComparingTo("80.00");
    }

    @Test
    void caixaVinculaVendaDinheiroCalculaSaldoECancelaSemDuplicar() {
        AuthenticatedUser operador = operador();
        CaixaResponse caixa = caixas.abrir(new AberturaCaixaRequest(new BigDecimal("100.00")), operador);
        Produto produto = produto("CAIXA-1", "Produto caixa", 3, "50.00", "45.00");
        VendaResponse venda = operacoes.venda(UUID.randomUUID().toString(),
                venda(produto, 1, "50.00", "50.00", false, null), operador);

        assertThat(jdbc.queryForObject("SELECT caixa_id FROM venda WHERE id = ?", Long.class, venda.id()))
                .isEqualTo(caixa.id());
        assertThat(caixas.atual().saldoEsperado()).isEqualByComparingTo("150.00");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM caixa_movimentacao WHERE venda_id = ?", Integer.class, venda.id()))
                .isEqualTo(1);

        cancelamentos.cancelar(venda.id(), new CancelamentoVendaRequest("Devolucao homologacao"), operador);
        assertThat(caixas.atual().saldoEsperado()).isEqualByComparingTo("100.00");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM caixa_movimentacao WHERE venda_id = ?", Integer.class, venda.id()))
                .isEqualTo(2);
        CaixaResponse fechado = caixas.fechar(caixa.id(), new FechamentoCaixaRequest(new BigDecimal("100.00")), operador);
        assertThat(fechado.diferenca()).isEqualByComparingTo("0.00");
    }

    @Test
    void orcamentoNaoMovimentaEstoqueEConversaoCriaUmaUnicaVenda() {
        AuthenticatedUser operador = operador();
        caixas.abrir(new AberturaCaixaRequest(new BigDecimal("50.00")), operador);
        Produto produto = produto("ORC-1", "Produto orcado", 5, "40.00", "35.00");
        OrcamentoRequest request = new OrcamentoRequest(null, List.of(
                new ItemOrcamentoRequest(TipoItem.PRODUTO, produto.getId(), null, 2,
                        new BigDecimal("40.00"), new BigDecimal("40.00"), false),
                new ItemOrcamentoRequest(TipoItem.SERVICO, null, "Instalacao", 1,
                        new BigDecimal("20.00"), new BigDecimal("20.00"), false)),
                BigDecimal.ZERO, LocalDate.now().plusDays(7), StatusOrcamento.EMITIDO,
                "Homologacao", null);

        OrcamentoResponse criado = orcamentos.criar(request, operador);
        assertThat(estoque(produto)).isEqualTo(5);
        assertThat(contar("venda")).isZero();

        String chave = UUID.randomUUID().toString();
        VendaResponse primeira = orcamentos.converter(criado.id(), chave,
                new ConversaoOrcamentoRequest(FormaPagamento.PIX, null), operador);
        VendaResponse repetida = orcamentos.converter(criado.id(), chave,
                new ConversaoOrcamentoRequest(FormaPagamento.PIX, null), operador);

        assertThat(repetida.id()).isEqualTo(primeira.id());
        assertThat(estoque(produto)).isEqualTo(3);
        assertThat(contar("venda")).isEqualTo(1);
        assertThat(contarMovimentos("SAIDA_VENDA")).isEqualTo(1);
        assertThat(primeira.itens()).hasSize(2);
    }

    @Test
    void vendaAPrazoRecebeParcialmenteSemDuplicarPagamento() {
        AuthenticatedUser operador = operador();
        CaixaResponse caixa = caixas.abrir(new AberturaCaixaRequest(new BigDecimal("100.00")), operador);
        Produto produto = produto("PRAZO-1", "Produto a prazo", 3, "90.00", "80.00");
        Cliente cliente = cliente("Cliente a prazo", TipoCliente.CLIENTE_COMUM);
        VendaRequest request = new VendaRequest(cliente.getId(), List.of(new ItemVendaRequest(
                produto.getId(), 1, new BigDecimal("90.00"), new BigDecimal("90.00"), false)),
                BigDecimal.ZERO, null, FormaPagamento.OUTRO, "Venda a prazo",
                CondicaoPagamento.A_PRAZO, LocalDate.now().plusDays(30), BigDecimal.ZERO, null);

        operacoes.venda(UUID.randomUUID().toString(), request, operador);
        Long contaId = jdbc.queryForObject("SELECT id FROM conta_receber", Long.class);
        String chave = UUID.randomUUID().toString();
        var primeiro = contasReceber.registrar(contaId, chave,
                new RecebimentoRequest(new BigDecimal("30.00"), FormaPagamento.DINHEIRO), operador);
        var repetido = contasReceber.registrar(contaId, chave,
                new RecebimentoRequest(new BigDecimal("30.00"), FormaPagamento.DINHEIRO), operador);

        assertThat(repetido.id()).isEqualTo(primeiro.id());
        assertThat(jdbc.queryForObject("SELECT saldo_pendente FROM conta_receber WHERE id = ?",
                BigDecimal.class, contaId)).isEqualByComparingTo("60.00");
        assertThat(contar("recebimento")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM caixa_movimentacao WHERE recebimento_id = ?",
                Integer.class, primeiro.id())).isEqualTo(1);
        assertThat(caixas.atual().id()).isEqualTo(caixa.id());
        assertThat(caixas.atual().saldoEsperado()).isEqualByComparingTo("130.00");
    }

    private VendaResponse executarApos(CountDownLatch partida, String chave, VendaRequest request)
            throws InterruptedException {
        partida.await();
        return operacoes.venda(chave, request);
    }

    private int resultado(Future<VendaResponse> future) throws InterruptedException {
        try {
            future.get();
            return 1;
        } catch (ExecutionException expected) {
            return 0;
        }
    }

    private Produto produto(String codigo, String nome, int quantidade, String varejo, String revenda) {
        Produto produto = new Produto();
        produto.setCodigoReferencia(codigo);
        produto.setNome(nome);
        produto.setValorCusto(new BigDecimal("10.00"));
        produto.setPrecoVarejo(new BigDecimal(varejo));
        produto.setPrecoRevenda(new BigDecimal(revenda));
        produto.setQuantidadeEstoque(quantidade);
        produto.setEstoqueMinimo(1);
        produto.setAtivo(true);
        produto.setDataCadastro(LocalDateTime.now());
        return produtos.saveAndFlush(produto);
    }

    private Cliente cliente(String nome, TipoCliente tipo) {
        Cliente cliente = new Cliente();
        cliente.setNomeRazaoSocial(nome);
        cliente.setTipoCliente(tipo);
        cliente.setAtivo(true);
        cliente.setDataCadastro(LocalDateTime.now());
        return clientes.saveAndFlush(cliente);
    }

    private AuthenticatedUser operador() {
        Usuario usuario = new Usuario(); usuario.setEmail("operador-homolog@saraiva.test");
        usuario.setSenhaHash("hash-nao-utilizado-no-teste"); usuario.setAtivo(true);
        usuario.setDataCadastro(LocalDateTime.now()); usuario = usuarios.saveAndFlush(usuario);
        return new AuthenticatedUser(usuario.getId(), usuario.getEmail());
    }

    private VendaRequest venda(Produto produto, int quantidade, String praticado, String conhecido,
            boolean manual, Cliente cliente) {
        ItemVendaRequest item = new ItemVendaRequest(produto.getId(), quantidade,
                new BigDecimal(praticado), new BigDecimal(conhecido), manual);
        return new VendaRequest(cliente == null ? null : cliente.getId(), List.of(item), BigDecimal.ZERO,
                null, FormaPagamento.PIX, "Homologacao MySQL 8");
    }

    private int estoque(Produto produto) {
        return produtos.findById(produto.getId()).orElseThrow().getQuantidadeEstoque();
    }

    private int contar(String tabela) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + tabela, Integer.class);
    }

    private int contarMovimentos(String tipo) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM movimentacao_estoque WHERE tipo = ?", Integer.class, tipo);
    }
}
