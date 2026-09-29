package br.com.saraivamotos.service;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import br.com.saraivamotos.domain.Usuario;
import br.com.saraivamotos.repository.UsuarioRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InitialUserBootstrapTests {

    @Mock private UsuarioRepository repository;
    private BCryptPasswordEncoder encoder;

    @BeforeEach
    void setUp() {
        encoder = new BCryptPasswordEncoder();
    }

    @Test
    void createsNormalizedInitialUserWithBCryptPassword() throws Exception {
        when(repository.findByEmail("operador@saraiva.com")).thenReturn(Optional.empty());
        InitialUserBootstrap bootstrap = new InitialUserBootstrap(
                repository, encoder, " Operador@Saraiva.COM ", "senha-temporaria");

        bootstrap.run(new DefaultApplicationArguments());

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(repository).save(captor.capture());
        Usuario saved = captor.getValue();
        assertEquals("operador@saraiva.com", saved.getEmail());
        assertNotEquals("senha-temporaria", saved.getSenhaHash());
        assertTrue(encoder.matches("senha-temporaria", saved.getSenhaHash()));
        assertTrue(saved.getAtivo());
    }

    @Test
    void doesNotOverwriteExistingUser() throws Exception {
        Usuario existing = new Usuario();
        when(repository.findByEmail("operador@saraiva.com")).thenReturn(Optional.of(existing));
        InitialUserBootstrap bootstrap = new InitialUserBootstrap(
                repository, encoder, "operador@saraiva.com", "outra-senha");

        bootstrap.run(new DefaultApplicationArguments());

        verify(repository, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
