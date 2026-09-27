package br.com.saraivamotos;

import br.com.saraivamotos.repository.ProdutoRepository;
import br.com.saraivamotos.repository.MovimentacaoEstoqueRepository;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import static org.mockito.Mockito.mock;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
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
    }
}
