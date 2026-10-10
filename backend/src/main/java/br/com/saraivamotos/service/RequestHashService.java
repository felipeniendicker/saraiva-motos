package br.com.saraivamotos.service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.stream.Collectors;

import br.com.saraivamotos.dto.AjusteEstoqueRequest;
import br.com.saraivamotos.dto.EntradaEstoqueRequest;
import br.com.saraivamotos.dto.ItemVendaRequest;
import br.com.saraivamotos.dto.SaidaEstoqueRequest;
import br.com.saraivamotos.dto.VendaRequest;
import org.springframework.stereotype.Component;

@Component
public class RequestHashService {
    public String venda(VendaRequest request) {
        String itens = request.itens().stream().map(this::item).collect(Collectors.joining(";"));
        return sha256("VENDA|" + value(request.clienteId()) + "|" + itens + "|"
                + decimal(request.desconto()) + "|" + decimal(request.descontoPercentual()) + "|"
                + value(request.formaPagamento()) + "|" + text(request.observacoes()));
    }

    public String entrada(EntradaEstoqueRequest request) {
        return sha256("ESTOQUE_ENTRADA|" + request.produtoId() + "|" + request.quantidade() + "|"
                + text(request.observacao()));
    }

    public String ajuste(AjusteEstoqueRequest request) {
        return sha256("ESTOQUE_AJUSTE|" + request.produtoId() + "|" + request.novoSaldo() + "|"
                + text(request.motivo()));
    }

    public String saida(SaidaEstoqueRequest request) {
        return sha256("ESTOQUE_SAIDA|" + request.produtoId() + "|" + request.quantidade() + "|"
                + text(request.motivo()));
    }

    private String item(ItemVendaRequest item) {
        return value(item.produtoId()) + "," + value(item.quantidade()) + "," + decimal(item.precoUnitario())
                + "," + decimal(item.precoOriginal()) + "," + value(item.precoAlteradoManualmente());
    }

    private String decimal(BigDecimal value) {
        return value == null ? "~" : value.stripTrailingZeros().toPlainString();
    }

    private String text(String value) {
        return value == null || value.isBlank() ? "~" : value.trim();
    }

    private String value(Object value) {
        return value == null ? "~" : value.toString();
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 não está disponível.", exception);
        }
    }
}
