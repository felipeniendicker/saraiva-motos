package br.com.saraivamotos.service;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

import br.com.saraivamotos.domain.LeitorLeitura;
import br.com.saraivamotos.domain.LeitorSessao;
import br.com.saraivamotos.dto.LeitorEnvioRequest;
import br.com.saraivamotos.dto.LeitorLeituraResponse;
import br.com.saraivamotos.dto.LeitorPareamentoResponse;
import br.com.saraivamotos.dto.LeitorStatusResponse;
import br.com.saraivamotos.repository.LeitorLeituraRepository;
import br.com.saraivamotos.repository.LeitorSessaoRepository;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LeitorRemotoService {
    private static final int SESSION_DURATION_MINUTES = 5;

    private final LeitorSessaoRepository sessoes;
    private final LeitorLeituraRepository leituras;
    private final LeitorLeituraTransaction leituraTransaction;
    private final QrCodeService qrCodes;
    private final String configuredFrontendUrl;
    private final SecureRandom random = new SecureRandom();

    public LeitorRemotoService(
            LeitorSessaoRepository sessoes,
            LeitorLeituraRepository leituras,
            LeitorLeituraTransaction leituraTransaction,
            QrCodeService qrCodes,
            @Value("${app.frontend.public-url:http://localhost:5173}") String frontendUrl) {
        this.sessoes = sessoes;
        this.leituras = leituras;
        this.leituraTransaction = leituraTransaction;
        this.qrCodes = qrCodes;
        this.configuredFrontendUrl = removeTrailingSlash(frontendUrl);
    }

    @Transactional
    public LeitorPareamentoResponse criar(AuthenticatedUser user, String requestOrigin) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        LocalDateTime now = LocalDateTime.now();

        LeitorSessao session = new LeitorSessao();
        session.setId(UUID.randomUUID().toString());
        session.setTokenHash(hash(token));
        session.setOperadorId(user.id());
        session.setOperadorEmail(user.email());
        session.setStatus("ATIVA");
        session.setDataCriacao(now);
        session.setDataExpiracao(now.plusMinutes(SESSION_DURATION_MINUTES));
        sessoes.save(session);

        String url = resolveFrontendUrl(requestOrigin) + "/#/leitor/" + token;
        return new LeitorPareamentoResponse(
                session.getId(), token, url, qrCodes.dataUrl(url), session.getDataExpiracao());
    }

    @Transactional(readOnly = true)
    public LeitorStatusResponse status(String token) {
        LeitorSessao session = porToken(token);
        return new LeitorStatusResponse(ativa(session), session.getDataExpiracao());
    }

    public LeitorLeituraResponse enviar(String token, LeitorEnvioRequest request) {
        LeitorSessao session = porToken(token);
        if (!ativa(session)) {
            throw new IllegalArgumentException("Pareamento expirado ou encerrado.");
        }
        validarCodigo(request.codigo());
        String eventId = uuid(request.eventoId());
        LeitorLeitura existing = leituras.findBySessaoIdAndEventoId(session.getId(), eventId).orElse(null);
        if (existing != null) {
            return resposta(existing);
        }
        try {
            return resposta(leituraTransaction.criar(session.getId(), eventId, request.codigo()));
        } catch (DataIntegrityViolationException conflict) {
            return resposta(leituras.findBySessaoIdAndEventoId(session.getId(), eventId)
                    .orElseThrow(() -> conflict));
        }
    }

    @Transactional
    public LeitorLeituraResponse consumir(String id, AuthenticatedUser user) {
        LeitorSessao session = propria(id, user);
        if (!ativa(session)) {
            return null;
        }
        LeitorLeitura reading = leituras.proximaPendente(id).orElse(null);
        if (reading == null) {
            return null;
        }
        reading.setDataConsumo(LocalDateTime.now());
        return resposta(leituras.save(reading));
    }

    @Transactional
    public void encerrar(String id, AuthenticatedUser user) {
        LeitorSessao session = propria(id, user);
        session.setStatus("ENCERRADA");
        sessoes.save(session);
    }

    private String resolveFrontendUrl(String requestOrigin) {
        String publicOrigin = validOrigin(requestOrigin);
        return publicOrigin != null ? publicOrigin : configuredFrontendUrl;
    }

    private String validOrigin(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            URI origin = URI.create(value.trim());
            String scheme = origin.getScheme() == null ? "" : origin.getScheme().toLowerCase(Locale.ROOT);
            String host = origin.getHost() == null ? "" : origin.getHost().toLowerCase(Locale.ROOT);
            boolean localHttp = "http".equals(scheme) && isLocalHost(host);
            boolean rootPath = origin.getPath() == null || origin.getPath().isBlank() || "/".equals(origin.getPath());
            if (!("https".equals(scheme) || localHttp)
                    || host.isBlank()
                    || !rootPath
                    || origin.getUserInfo() != null
                    || origin.getQuery() != null
                    || origin.getFragment() != null) {
                return null;
            }
            return removeTrailingSlash(origin.toString());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private boolean isLocalHost(String host) {
        return "localhost".equals(host) || "127.0.0.1".equals(host) || "::1".equals(host);
    }

    private String removeTrailingSlash(String value) {
        return value == null ? "" : value.trim().replaceAll("/+$", "");
    }

    private LeitorSessao propria(String id, AuthenticatedUser user) {
        return sessoes.findById(id)
                .filter(session -> session.getOperadorId().equals(user.id()))
                .orElseThrow(() -> new IllegalArgumentException("Sessao de leitor nao encontrada."));
    }

    private LeitorSessao porToken(String token) {
        return sessoes.findByTokenHash(hash(token))
                .orElseThrow(() -> new IllegalArgumentException("Pareamento invalido."));
    }

    private boolean ativa(LeitorSessao session) {
        return "ATIVA".equals(session.getStatus())
                && session.getDataExpiracao().isAfter(LocalDateTime.now());
    }

    private void validarCodigo(String code) {
        int sum = 0;
        for (int i = code.length() - 2, position = 1; i >= 0; i--, position++) {
            int number = code.charAt(i) - '0';
            sum += position % 2 == 1 ? number * 3 : number;
        }
        int checkDigit = (10 - (sum % 10)) % 10;
        if (checkDigit != code.charAt(code.length() - 1) - '0') {
            throw new IllegalArgumentException("Digito verificador do codigo invalido.");
        }
    }

    private String uuid(String value) {
        try {
            return UUID.fromString(value).toString();
        } catch (Exception exception) {
            throw new IllegalArgumentException("eventoId invalido.");
        }
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private LeitorLeituraResponse resposta(LeitorLeitura reading) {
        return new LeitorLeituraResponse(reading.getId(), reading.getCodigo(), reading.getDataHora());
    }
}
