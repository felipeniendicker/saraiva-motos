package br.com.saraivamotos.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import br.com.saraivamotos.integration.tavily.TavilyProductLookupProvider;

import static org.assertj.core.api.Assertions.assertThat;

class TavilyConfigTests {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withInitializer(context -> context.getBeanFactory().setConversionService(
                    org.springframework.boot.convert.ApplicationConversionService.getSharedInstance()))
            .withBean(org.springframework.web.client.RestClient.Builder.class, org.springframework.web.client.RestClient::builder)
            .withUserConfiguration(TavilyConfig.class)
            .withPropertyValues(
                    "app.tavily.base-url=https://tavily.test",
                    "app.tavily.api-key=test-only",
                    "app.tavily.connect-timeout=1s",
                    "app.tavily.read-timeout=1s");

    @Test
    void disabledProviderIsNotCreated() {
        runner.withPropertyValues("app.tavily.enabled=false")
                .run(context -> assertThat(context).doesNotHaveBean(TavilyProductLookupProvider.class));
    }

    @Test
    void enabledProviderIsCreatedOnlyInBackend() {
        runner.withPropertyValues("app.tavily.enabled=true")
                .run(context -> assertThat(context).hasSingleBean(TavilyProductLookupProvider.class));
    }

    @Test
    void enabledProviderRequiresApiKey() {
        runner.withPropertyValues(
                        "app.tavily.enabled=true",
                        "app.tavily.api-key=")
                .run(context -> assertThat(context).hasFailed());
    }
}
