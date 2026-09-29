package br.com.saraivamotos.config;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import br.com.saraivamotos.integration.upcitemdb.UpcItemDbProductLookupProvider;

@Configuration
public class UpcItemDbConfig {

    @Bean
    @ConditionalOnProperty(name = "app.upcitemdb.enabled", havingValue = "true", matchIfMissing = true)
    UpcItemDbProductLookupProvider upcItemDbProductLookupProvider(
            RestClient.Builder builder,
            @Value("${app.upcitemdb.base-url}") String baseUrl,
            @Value("${app.upcitemdb.connect-timeout:2500ms}") Duration connectTimeout,
            @Value("${app.upcitemdb.read-timeout:4000ms}") Duration readTimeout) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);
        RestClient client = builder
                .baseUrl(baseUrl)
                .defaultHeader("Accept", "application/json")
                .defaultHeader("User-Agent", "Saraiva-Motos/1.0")
                .requestFactory(requestFactory)
                .build();
        return new UpcItemDbProductLookupProvider(client);
    }
}
