package br.com.saraivamotos;

import br.com.saraivamotos.repository.ProdutoRepository;
import br.com.saraivamotos.repository.MovimentacaoEstoqueRepository;
import br.com.saraivamotos.repository.VendaRepository;
import br.com.saraivamotos.repository.ClienteRepository;
import br.com.saraivamotos.repository.MotoRepository;
import br.com.saraivamotos.repository.UsuarioRepository;
import br.com.saraivamotos.repository.OperacaoIdempotenteRepository;
import br.com.saraivamotos.repository.CaixaRepository;
import br.com.saraivamotos.repository.CaixaMovimentacaoRepository;
import br.com.saraivamotos.repository.LeitorSessaoRepository;
import br.com.saraivamotos.repository.LeitorLeituraRepository;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import static org.mockito.Mockito.mock;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@Import(SaraivaMotosApplicationTests.RepositoryTestConfiguration.class)
class SaraivaMotosApplicationTests {

    @Test
    void contextLoads() {
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class RepositoryTestConfiguration {

        @Bean
        ProdutoRepository produtoRepository() {
            return mock(ProdutoRepository.class);
        }

        @Bean
        MovimentacaoEstoqueRepository movimentacaoEstoqueRepository() {
            return mock(MovimentacaoEstoqueRepository.class);
        }

        @Bean
        VendaRepository vendaRepository() {
            return mock(VendaRepository.class);
        }

        @Bean ClienteRepository clienteRepository() { return mock(ClienteRepository.class); }
        @Bean MotoRepository motoRepository() { return mock(MotoRepository.class); }
        @Bean UsuarioRepository usuarioRepository() { return mock(UsuarioRepository.class); }
        @Bean OperacaoIdempotenteRepository operacaoIdempotenteRepository() { return mock(OperacaoIdempotenteRepository.class); }
        @Bean CaixaRepository caixaRepository() { return mock(CaixaRepository.class); }
        @Bean CaixaMovimentacaoRepository caixaMovimentacaoRepository() { return mock(CaixaMovimentacaoRepository.class); }
        @Bean LeitorSessaoRepository leitorSessaoRepository() { return mock(LeitorSessaoRepository.class); }
        @Bean LeitorLeituraRepository leitorLeituraRepository() { return mock(LeitorLeituraRepository.class); }
    }
}
