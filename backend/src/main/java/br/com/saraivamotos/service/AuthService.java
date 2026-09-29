package br.com.saraivamotos.service;

import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.saraivamotos.domain.Usuario;
import br.com.saraivamotos.dto.LoginRequest;
import br.com.saraivamotos.dto.LoginResponse;
import br.com.saraivamotos.dto.UsuarioResponse;
import br.com.saraivamotos.exception.CredenciaisInvalidasException;
import br.com.saraivamotos.repository.UsuarioRepository;
import br.com.saraivamotos.security.JwtService;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByEmail(normalizeEmail(request.email()))
                .filter(found -> Boolean.TRUE.equals(found.getAtivo()))
                .filter(found -> passwordEncoder.matches(request.senha(), found.getSenhaHash()))
                .orElseThrow(CredenciaisInvalidasException::new);

        return new LoginResponse(jwtService.generateToken(usuario), toResponse(usuario));
    }

    public UsuarioResponse toResponse(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getEmail());
    }
}
