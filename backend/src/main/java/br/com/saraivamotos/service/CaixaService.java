package br.com.saraivamotos.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import br.com.saraivamotos.domain.*;
import br.com.saraivamotos.dto.*;
import br.com.saraivamotos.exception.OperacaoCaixaInvalidaException;
import br.com.saraivamotos.repository.*;
import br.com.saraivamotos.security.AuthenticatedUser;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CaixaService {
    private final CaixaRepository caixas;
    private final CaixaMovimentacaoRepository movimentos;
    private final VendaRepository vendas;
    private final OperacaoIdempotenteRepository operacoes;
    private final RecebimentoRepository recebimentos;

    public CaixaService(CaixaRepository caixas, CaixaMovimentacaoRepository movimentos,
            VendaRepository vendas, OperacaoIdempotenteRepository operacoes, RecebimentoRepository recebimentos) {
        this.caixas = caixas; this.movimentos = movimentos; this.vendas = vendas; this.operacoes = operacoes;this.recebimentos=recebimentos;
    }

    @Transactional
    public CaixaResponse abrir(AberturaCaixaRequest request, AuthenticatedUser user) {
        if (caixas.findFirstByStatus(StatusCaixa.ABERTO).isPresent())
            throw new OperacaoCaixaInvalidaException("Ja existe um caixa aberto.");
        Caixa caixa = new Caixa();
        caixa.setStatus(StatusCaixa.ABERTO);
        caixa.setValorInicial(dinheiro(request.valorInicial()));
        caixa.setDataAbertura(LocalDateTime.now());
        caixa.setOperadorAberturaId(user.id());
        caixa.setOperadorAberturaEmail(user.email());
        try { return resposta(caixas.saveAndFlush(caixa)); }
        catch (DataIntegrityViolationException e) { throw new OperacaoCaixaInvalidaException("Ja existe um caixa aberto."); }
    }

    @Transactional(readOnly = true)
    public CaixaResponse atual() {
        return caixas.findFirstByStatus(StatusCaixa.ABERTO).map(this::resposta).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<CaixaResponse> historico() {
        return caixas.findTop30ByOrderByDataAberturaDesc().stream().map(this::resposta).toList();
    }

    @Transactional
    public CaixaMovimentacaoResponse movimentar(Long caixaId, String rawKey, MovimentacaoCaixaRequest request,
            AuthenticatedUser user) {
        if (request.tipo() != TipoMovimentacaoCaixa.ENTRADA_AVULSA && request.tipo() != TipoMovimentacaoCaixa.SAIDA_AVULSA)
            throw new OperacaoCaixaInvalidaException("Somente entradas e saidas avulsas podem ser registradas manualmente.");
        String chave = uuid(rawKey);
        String hash = hash(caixaId + "|" + request.tipo() + "|" + dinheiro(request.valor()) + "|" + request.descricao().trim());
        CaixaMovimentacao existente = movimentos.findByChaveIdempotencia(chave).orElse(null);
        if (existente != null) return movimentoExistente(existente, hash);
        Caixa caixa = caixas.findByIdForUpdate(caixaId)
                .orElseThrow(() -> new OperacaoCaixaInvalidaException("Caixa nao encontrado."));
        if (caixa.getStatus() != StatusCaixa.ABERTO)
            throw new OperacaoCaixaInvalidaException("O caixa informado nao esta aberto.");
        // Outra requisicao com a mesma chave pode ter concluido enquanto esta aguardava
        // o lock do caixa. A segunda consulta evita responder erro e, principalmente,
        // evita uma segunda movimentacao em execucoes concorrentes.
        existente = movimentos.findByChaveIdempotencia(chave).orElse(null);
        if (existente != null) return movimentoExistente(existente, hash);
        return CaixaMovimentacaoResponse.from(salvarMovimento(caixa.getId(), request.tipo(), request.valor(),
                request.descricao().trim(), null, chave, hash, user));
    }

    @Transactional
    public CaixaResponse fechar(Long id, FechamentoCaixaRequest request, AuthenticatedUser user) {
        Caixa caixa = caixas.findByIdForUpdate(id).orElseThrow(() -> new OperacaoCaixaInvalidaException("Caixa nao encontrado."));
        if (caixa.getStatus() != StatusCaixa.ABERTO)
            throw new OperacaoCaixaInvalidaException("O caixa ja esta fechado.");
        if (operacoes.countPendentes() > 0)
            throw new OperacaoCaixaInvalidaException("Existem operacoes comerciais pendentes; o caixa nao pode ser fechado.");
        Map<FormaPagamento, BigDecimal> totais = totais(caixa.getId());
        BigDecimal esperado = saldoEsperado(caixa);
        BigDecimal contado = dinheiro(request.valorContado());
        caixa.setStatus(StatusCaixa.FECHADO);
        caixa.setDataFechamento(LocalDateTime.now());
        caixa.setOperadorFechamentoId(user.id());
        caixa.setOperadorFechamentoEmail(user.email());
        caixa.setValorContado(contado);
        caixa.setSaldoEsperadoFechamento(esperado);
        caixa.setDiferencaFechamento(dinheiro(contado.subtract(esperado)));
        caixa.setTotalDinheiro(totais.get(FormaPagamento.DINHEIRO));
        caixa.setTotalPix(totais.get(FormaPagamento.PIX));
        caixa.setTotalCartaoDebito(totais.get(FormaPagamento.CARTAO_DEBITO));
        caixa.setTotalCartaoCredito(totais.get(FormaPagamento.CARTAO_CREDITO));
        caixa.setTotalOutro(totais.get(FormaPagamento.OUTRO));
        return resposta(caixas.save(caixa));
    }

    @Transactional
    public void vincularVenda(VendaResponse response, AuthenticatedUser user) {
        Caixa caixa = caixaAbertoBloqueado();
        Venda venda = vendas.findById(response.id()).orElseThrow();
        venda.setCaixaId(caixa.getId());
        vendas.save(venda);
        if (response.formaPagamento() == FormaPagamento.DINHEIRO) {
            String chave = UUID.nameUUIDFromBytes(("CAIXA-VENDA-" + response.id()).getBytes(StandardCharsets.UTF_8)).toString();
            salvarMovimento(caixa.getId(), TipoMovimentacaoCaixa.VENDA_DINHEIRO, response.total(),
                    "Venda " + response.numeroVenda(), response.id(), chave, hash("VENDA|" + response.id()), user);
        }
    }

    @Transactional
    public void vincularVendaSemRecebimento(VendaResponse response){Caixa caixa=caixaAbertoBloqueado();Venda venda=vendas.findById(response.id()).orElseThrow();venda.setCaixaId(caixa.getId());vendas.save(venda);}

    @Transactional
    public Recebimento registrarRecebimento(Recebimento recebimento,AuthenticatedUser user){
        Caixa caixa=caixaAbertoBloqueado();recebimento.setCaixaId(caixa.getId());Recebimento salvo=recebimentos.saveAndFlush(recebimento);
        if(salvo.getFormaPagamento()==FormaPagamento.DINHEIRO){String chave=UUID.nameUUIDFromBytes(("CAIXA-RECEBIMENTO-"+salvo.getId()).getBytes(StandardCharsets.UTF_8)).toString();
            CaixaMovimentacao movimento=salvarMovimento(caixa.getId(),TipoMovimentacaoCaixa.RECEBIMENTO_DINHEIRO,salvo.getValor(),"Recebimento da venda "+salvo.getConta().getVendaId(),null,chave,hash("RECEBIMENTO|"+salvo.getId()),user);movimento.setRecebimentoId(salvo.getId());movimentos.save(movimento);}return salvo;}

    @Transactional
    public void registrarEstornoRecebimento(Recebimento recebimento,AuthenticatedUser user){Caixa caixa=caixaAbertoBloqueado();recebimento.setCaixaEstornoId(caixa.getId());recebimentos.save(recebimento);
        if(recebimento.getFormaPagamento()==FormaPagamento.DINHEIRO){String chave=UUID.nameUUIDFromBytes(("CAIXA-ESTORNO-RECEBIMENTO-"+recebimento.getId()).getBytes(StandardCharsets.UTF_8)).toString();
            if(movimentos.findByChaveIdempotencia(chave).isPresent())return;CaixaMovimentacao movimento=salvarMovimento(caixa.getId(),TipoMovimentacaoCaixa.ESTORNO_RECEBIMENTO_DINHEIRO,recebimento.getValor(),"Estorno de recebimento da venda "+recebimento.getConta().getVendaId(),null,chave,hash("ESTORNO-RECEBIMENTO|"+recebimento.getId()),user);movimento.setRecebimentoId(recebimento.getId());movimentos.save(movimento);}}

    @Transactional
    public void registrarCancelamento(VendaResponse response, AuthenticatedUser user) {
        if (response.formaPagamento() != FormaPagamento.DINHEIRO) return;
        Caixa caixa = caixaAbertoBloqueado();
        String chave = UUID.nameUUIDFromBytes(("CAIXA-CANCELAMENTO-" + response.id()).getBytes(StandardCharsets.UTF_8)).toString();
        if (movimentos.findByChaveIdempotencia(chave).isPresent()) return;
        salvarMovimento(caixa.getId(), TipoMovimentacaoCaixa.DEVOLUCAO_VENDA_DINHEIRO, response.total(),
                "Devolucao da venda " + response.numeroVenda(), response.id(), chave,
                hash("CANCELAMENTO|" + response.id()), user);
    }

    private Caixa caixaAbertoBloqueado() {
        return caixas.findByStatusForUpdate(StatusCaixa.ABERTO)
                .orElseThrow(() -> new OperacaoCaixaInvalidaException("Abra o caixa antes de realizar esta operacao."));
    }
    private CaixaMovimentacaoResponse movimentoExistente(CaixaMovimentacao existente, String hash) {
        if (!hash.equals(existente.getRequestHash()))
            throw new OperacaoCaixaInvalidaException("A chave de idempotencia ja foi usada com outro conteudo.");
        return CaixaMovimentacaoResponse.from(existente);
    }
    private CaixaMovimentacao salvarMovimento(Long caixaId, TipoMovimentacaoCaixa tipo, BigDecimal valor,
            String descricao, Long vendaId, String chave, String requestHash, AuthenticatedUser user) {
        CaixaMovimentacao m = new CaixaMovimentacao(); m.setCaixaId(caixaId); m.setTipo(tipo);
        m.setValor(dinheiro(valor)); m.setDescricao(descricao); m.setVendaId(vendaId);
        m.setChaveIdempotencia(chave); m.setRequestHash(requestHash); m.setOperadorId(user.id());
        m.setOperadorEmail(user.email()); m.setDataHora(LocalDateTime.now());
        return movimentos.saveAndFlush(m);
    }
    private CaixaResponse resposta(Caixa c) {
        Map<FormaPagamento, BigDecimal> t = totais(c.getId());
        List<CaixaMovimentacao> registros = movimentos.findByCaixaIdOrderByDataHoraDescIdDesc(c.getId());
        ResumoMovimentos resumo = resumir(registros);
        BigDecimal esperado = c.getStatus() == StatusCaixa.FECHADO
                ? c.getSaldoEsperadoFechamento()
                : dinheiro(c.getValorInicial().add(resumo.saldoFisico()));
        BigDecimal recebido = t.values().stream().reduce(BigDecimal.ZERO.setScale(2), BigDecimal::add);
        BigDecimal estornos = dinheiro(resumo.estornos().add(zero(recebimentos.totalEstornosNoCaixa(c.getId()))));
        BigDecimal liquido = dinheiro(recebido.subtract(estornos));
        return new CaixaResponse(c.getId(), c.getStatus(), c.getValorInicial(), esperado, c.getValorContado(),
                c.getDiferencaFechamento(), c.getDataAbertura(), c.getDataFechamento(), c.getOperadorAberturaEmail(),
                c.getOperadorFechamentoEmail(), t.get(FormaPagamento.DINHEIRO), t.get(FormaPagamento.PIX),
                t.get(FormaPagamento.CARTAO_DEBITO), t.get(FormaPagamento.CARTAO_CREDITO), t.get(FormaPagamento.OUTRO),
                dinheiro(recebido), estornos, liquido, resumo.entradasAvulsas(), resumo.saidasAvulsas(),
                registros.stream().map(CaixaMovimentacaoResponse::from).toList());
    }
    private BigDecimal saldoEsperado(Caixa c) {
        return dinheiro(c.getValorInicial().add(resumir(
                movimentos.findByCaixaIdOrderByDataHoraDescIdDesc(c.getId())).saldoFisico()));
    }
    private Map<FormaPagamento, BigDecimal> totais(Long caixaId) {
        Map<FormaPagamento, BigDecimal> r = zeros();
        vendas.totaisPorFormaNoCaixa(caixaId).forEach(row -> r.put((FormaPagamento) row[0], dinheiro((BigDecimal) row[1])));
        recebimentos.totaisPorFormaNoCaixa(caixaId).forEach(row -> r.merge((FormaPagamento)row[0],dinheiro((BigDecimal)row[1]),BigDecimal::add));
        return r;
    }
    private ResumoMovimentos resumir(List<CaixaMovimentacao> registros) {
        BigDecimal saldoFisico = BigDecimal.ZERO.setScale(2);
        BigDecimal estornos = BigDecimal.ZERO.setScale(2);
        BigDecimal entradas = BigDecimal.ZERO.setScale(2);
        BigDecimal saidas = BigDecimal.ZERO.setScale(2);
        for (CaixaMovimentacao movimento : registros) {
            BigDecimal valor = zero(movimento.getValor());
            switch (movimento.getTipo()) {
                case ENTRADA_AVULSA -> { entradas = entradas.add(valor); saldoFisico = saldoFisico.add(valor); }
                case SAIDA_AVULSA -> { saidas = saidas.add(valor); saldoFisico = saldoFisico.subtract(valor); }
                case VENDA_DINHEIRO -> saldoFisico = saldoFisico.add(valor);
                case DEVOLUCAO_VENDA_DINHEIRO -> { estornos = estornos.add(valor); saldoFisico = saldoFisico.subtract(valor); }
                case RECEBIMENTO_DINHEIRO -> saldoFisico = saldoFisico.add(valor);
                case ESTORNO_RECEBIMENTO_DINHEIRO -> saldoFisico = saldoFisico.subtract(valor);
            }
        }
        return new ResumoMovimentos(dinheiro(saldoFisico), dinheiro(estornos), dinheiro(entradas), dinheiro(saidas));
    }
    private Map<FormaPagamento, BigDecimal> zeros() { Map<FormaPagamento, BigDecimal> r = new EnumMap<>(FormaPagamento.class); for (FormaPagamento f:FormaPagamento.values()) r.put(f, BigDecimal.ZERO.setScale(2)); return r; }
    private BigDecimal zero(BigDecimal v){return v == null ? BigDecimal.ZERO.setScale(2) : v;}
    private BigDecimal dinheiro(BigDecimal v){return v.setScale(2, RoundingMode.HALF_UP);}
    private String uuid(String raw){try{return UUID.fromString(raw).toString();}catch(Exception e){throw new IllegalArgumentException("Idempotency-Key deve ser um UUID valido.");}}
    private String hash(String value){try{byte[] b=MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));return java.util.HexFormat.of().formatHex(b);}catch(Exception e){throw new IllegalStateException(e);}}
    private record ResumoMovimentos(BigDecimal saldoFisico, BigDecimal estornos,
            BigDecimal entradasAvulsas, BigDecimal saidasAvulsas) {}
}
