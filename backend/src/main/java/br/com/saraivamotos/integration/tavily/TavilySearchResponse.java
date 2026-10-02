package br.com.saraivamotos.integration.tavily;

import java.util.List;

public record TavilySearchResponse(List<TavilySearchResult> results) {
}
