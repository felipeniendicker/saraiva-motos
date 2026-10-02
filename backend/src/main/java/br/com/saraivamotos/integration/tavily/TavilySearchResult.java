package br.com.saraivamotos.integration.tavily;

public record TavilySearchResult(String title, String url, String content, Double score) {
}
