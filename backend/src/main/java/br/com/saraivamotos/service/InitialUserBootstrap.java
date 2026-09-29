package br.com.saraivamotos.service;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import br.com.saraivamotos.domain.Usuario;
import br.com.saraivamotos.repository.UsuarioRepository;

@Component
public class InitialUserBootstrap implements ApplicationRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final String initialEmail;
    private final String initialPassword;

    public InitialUserBootstrap(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.initial-user.email:}") String initialEmail,
            @Value("${app.initial-user.password:}") String initialPassword) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.initialEmail = initialEmail;
        this.initialPassword = initialPassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        boolean hasEmail = initialEmail != null && !initialEmail.isBlank();
        boolean hasPassword = initialPassword != null && !initialPassword.isBlank();
        if (!hasEmail && !hasPassword) {
            return;
        }
        if (!hasEmail || !hasPassword) {
            throw new IllegalStateException("INITIAL_USER_EMAIL e INITIAL_USER_PASSWORD devem ser informados juntos.");
        }

        String normalizedEmail = AuthService.normalizeEmail(initialEmail);
        if (usuarioRepository.findByEmail(normalizedEmail).isPresent()) {
            return;
        }

        Usuario usuario = new Usuario();
        usuario.setEmail(normalizedEmail);
        usuario.setSenhaHash(passwordEncoder.encode(initialPassword));
        usuario.setAtivo(true);
        usuario.setDataCadastro(LocalDateTime.now());
        usuarioRepository.save(usuario);
    }
}
