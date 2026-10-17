package br.com.saraivamotos.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

import br.com.saraivamotos.domain.ContaReceber;
import br.com.saraivamotos.domain.Recebimento;
import br.com.saraivamotos.domain.StatusContaReceber;
import br.com.saraivamotos.dto.ContaReceberResponse;
import br.com.saraivamotos.dto.EstornoRecebimentoRequest;
import br.com.saraivamotos.dto.RecebimentoRequest;
import br.com.saraivamotos.dto.RecebimentoResponse;
import br.com.saraivamotos.dto.VendaRequest;
import br.com.saraivamotos.dto.VendaResponse;
import br.com.saraivamotos.repository.ContaReceberRepository;
import br.com.saraivamotos.repository.RecebimentoRepository;
import br.com.saraivamotos.repository.VendaRepository;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContaReceberService {
    private final ContaReceberRepository contas;
    private final RecebimentoRepository recebimentos;
    private final VendaRepository vendas;
    private final CaixaService caixas;

    public ContaReceberService(ContaReceberRepository contas, RecebimentoRepository recebimentos,
            VendaRepository vendas, CaixaService caixas) {
        this.contas = contas;
        this.recebimentos = recebimentos;
        this.vendas = vendas;
        this.caixas = caixas;
    }

    @Transactional
    public ContaReceber criarParaVenda(VendaResponse venda, VendaRequest request, String chaveVenda,
            AuthenticatedUser operador) {
        ContaReceber conta = new ContaReceber();
        conta.setVendaId(venda.id());
        conta.setClienteId(venda.clienteId());
        conta.setValorOriginal(dinheiro(venda.total()));
        conta.setValorRecebido(zero());
        conta.setSaldoPendente(dinheiro(venda.total()));
        conta.setVencimento(request.vencimento());
        conta.setStatus(StatusContaReceber.ABERTA);
        conta.setDataCriacao(LocalDateTime.now());
        conta = contas.saveAndFlush(conta);

        BigDecimal pagamentoInicial = request.pagamentoInicial() == null
                ? zero() : dinheiro(request.pagamentoInicial());
        if (pagamentoInicial.signum() > 0) {
            String chave = UUID.nameUUIDFromBytes(
                    ("INICIAL|" + chaveVenda).getBytes(StandardCharsets.UTF_8)).toString();
            registrarInterno(conta, chave,
                    new RecebimentoRequest(pagamentoInicial, request.formaPagamentoInicial()), operador);
        }
        return conta;
    }

    @Transactional(readOnly = true)
    public List<ContaReceberResponse> listar() {
        return contas.findAllByOrderByVencimentoAscIdAsc().stream()
                .map(conta -> ContaReceberResponse.from(conta,
                        vendas.findById(conta.getVendaId()).orElseThrow()))
                .toList();
    }

    @Transactional
    public RecebimentoResponse registrar(Long contaId, String chaveInformada, RecebimentoRequest request,
            AuthenticatedUser operador) {
        String chave = uuid(chaveInformada);
        String requestHash = hashPagamento(contaId, request);
        Recebimento existente = recebimentos.findByChaveIdempotencia(chave).orElse(null);
        if (existente != null) return validarExistente(existente, requestHash);

        ContaReceber conta = contas.buscarParaAtualizar(contaId)
                .orElseThrow(() -> new IllegalArgumentException("Conta a receber nao encontrada."));
        existente = recebimentos.findByChaveIdempotencia(chave).orElse(null);
        if (existente != null) return validarExistente(existente, requestHash);
        return RecebimentoResponse.from(registrarInterno(conta, chave, request, operador));
    }

    @Transactional
    public RecebimentoResponse estornar(Long recebimentoId, EstornoRecebimentoRequest request,
            AuthenticatedUser operador) {
        Recebimento recebimento = recebimentos.buscarParaAtualizar(recebimentoId)
                .orElseThrow(() -> new IllegalArgumentException("Recebimento nao encontrado."));
        if (Boolean.TRUE.equals(recebimento.getEstornado())) return RecebimentoResponse.from(recebimento);

        ContaReceber conta = contas.buscarParaAtualizar(recebimento.getConta().getId()).orElseThrow();
        recebimento.setEstornado(true);
        recebimento.setDataEstorno(LocalDateTime.now());
        recebimento.setMotivoEstorno(request.motivo().trim());
        recebimento.setOperadorEstornoId(operador.id());
        recebimento.setOperadorEstornoEmail(operador.email());
        conta.setValorRecebido(dinheiro(conta.getValorRecebido().subtract(recebimento.getValor())));
        conta.setSaldoPendente(dinheiro(conta.getSaldoPendente().add(recebimento.getValor())));
        atualizarStatus(conta);
        caixas.registrarEstornoRecebimento(recebimento, operador);
        contas.save(conta);
        return RecebimentoResponse.from(recebimento);
    }

    @Transactional(readOnly = true)
    public boolean possuiRecebimentosAtivos(Long vendaId) {
        return contas.findByVendaId(vendaId)
                .map(conta -> conta.getValorRecebido().signum() > 0)
                .orElse(false);
    }

    @Transactional
    public void prepararCancelamento(Long vendaId) {
        ContaReceber localizada = contas.findByVendaId(vendaId).orElse(null);
        if (localizada == null) return;
        ContaReceber conta = contas.buscarParaAtualizar(localizada.getId()).orElseThrow();
        if (conta.getValorRecebido().signum() > 0) {
            throw new IllegalArgumentException(
                    "Estorne os pagamentos recebidos antes de cancelar a venda a prazo.");
        }
        conta.setStatus(StatusContaReceber.CANCELADA);
        contas.save(conta);
    }

    private Recebimento registrarInterno(ContaReceber conta, String chave, RecebimentoRequest request,
            AuthenticatedUser operador) {
        if (conta.getStatus() == StatusContaReceber.CANCELADA) {
            throw new IllegalArgumentException("Conta cancelada nao aceita pagamentos.");
        }
        BigDecimal valor = dinheiro(request.valor());
        if (valor.compareTo(conta.getSaldoPendente()) > 0) {
            throw new IllegalArgumentException("O pagamento nao pode ser maior que o saldo pendente.");
        }

        Recebimento recebimento = new Recebimento();
        recebimento.setConta(conta);
        recebimento.setChaveIdempotencia(chave);
        recebimento.setRequestHash(hashPagamento(conta.getId(), request));
        recebimento.setValor(valor);
        recebimento.setFormaPagamento(request.formaPagamento());
        recebimento.setDataHora(LocalDateTime.now());
        recebimento.setOperadorId(operador.id());
        recebimento.setOperadorEmail(operador.email());
        recebimento = caixas.registrarRecebimento(recebimento, operador);

        conta.setValorRecebido(dinheiro(conta.getValorRecebido().add(valor)));
        conta.setSaldoPendente(dinheiro(conta.getSaldoPendente().subtract(valor)));
        atualizarStatus(conta);
        contas.save(conta);
        return recebimento;
    }

    private void atualizarStatus(ContaReceber conta) {
        if (conta.getSaldoPendente().signum() == 0) {
            conta.setStatus(StatusContaReceber.QUITADA);
            conta.setDataQuitacao(LocalDateTime.now());
        } else if (conta.getValorRecebido().signum() > 0) {
            conta.setStatus(StatusContaReceber.PARCIAL);
            conta.setDataQuitacao(null);
        } else {
            conta.setStatus(StatusContaReceber.ABERTA);
            conta.setDataQuitacao(null);
        }
    }

    private RecebimentoResponse validarExistente(Recebimento recebimento, String requestHash) {
        if (!requestHash.equals(recebimento.getRequestHash())) {
            throw new IllegalArgumentException(
                    "A chave de idempotencia ja foi usada com outro pagamento.");
        }
        return RecebimentoResponse.from(recebimento);
    }

    private String hashPagamento(Long contaId, RecebimentoRequest request) {
        return sha256(contaId + "|" + dinheiro(request.valor()) + "|" + request.formaPagamento());
    }

    private BigDecimal dinheiro(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal zero() {
        return BigDecimal.ZERO.setScale(2);
    }

    private String uuid(String valor) {
        try {
            return UUID.fromString(valor).toString();
        } catch (Exception exception) {
            throw new IllegalArgumentException("Idempotency-Key deve ser UUID valido.");
        }
    }

    private String sha256(String valor) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(valor.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
