package br.com.saraivamotos.integration.upcitemdb;

public record UpcItemDbItem(
        String ean,
        String upc,
        String gtin,
        String title,
        String description,
        String brand,
        String model,
        String category) {
}
