package br.com.saraivamotos.integration.tavily;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TavilySearchRequest(
        String query,
        @JsonProperty("search_depth") String searchDepth,
        @JsonProperty("max_results") int maxResults,
        @JsonProperty("include_answer") boolean includeAnswer,
        @JsonProperty("include_raw_content") boolean includeRawContent) {
}
