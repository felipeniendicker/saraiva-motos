package br.com.saraivamotos.domain;

public enum TipoCliente {
    CLIENTE_COMUM(TipoPreco.VAREJO),
    OFICINA(TipoPreco.REVENDA),
    MECANICO(TipoPreco.REVENDA),
    MOTOPECA(TipoPreco.REVENDA),
    REVENDEDOR(TipoPreco.REVENDA);

    private final TipoPreco tipoPreco;

    TipoCliente(TipoPreco tipoPreco) { this.tipoPreco = tipoPreco; }
    public TipoPreco getTipoPreco() { return tipoPreco; }
}
