package br.com.saraivamotos.config;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import br.com.saraivamotos.integration.tavily.TavilyProductLookupProvider;

@Configuration
public class TavilyConfig {

    @Bean
    @ConditionalOnProperty(name = "app.tavily.enabled", havingValue = "true")
    TavilyProductLookupProvider tavilyProductLookupProvider(
            RestClient.Builder builder,
            @Value("${app.tavily.base-url}") String baseUrl,
            @Value("${app.tavily.api-key}") String apiKey,
            @Value("${app.tavily.connect-timeout:2500ms}") Duration connectTimeout,
            @Value("${app.tavily.read-timeout:4000ms}") Duration readTimeout) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);
        RestClient client = builder.baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Accept", "application/json")
                .defaultHeader("User-Agent", "Saraiva-Motos/1.0")
                .requestFactory(requestFactory)
                .build();
        return new TavilyProductLookupProvider(client);
    }
}
