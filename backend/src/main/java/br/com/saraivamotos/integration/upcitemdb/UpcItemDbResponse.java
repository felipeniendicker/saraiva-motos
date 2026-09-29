package br.com.saraivamotos.integration.upcitemdb;

import java.util.List;

public record UpcItemDbResponse(
        String code,
        Integer total,
        Integer offset,
        List<UpcItemDbItem> items) {
}
