package br.com.saraivamotos.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WebConfigTests {

    @Test
    void acceptsExplicitOrigins() {
        assertThatNoException().isThrownBy(() -> new WebConfig(
                "http://localhost:5174,https://frontend.example.com"));
    }

    @Test
    void rejectsWildcardOrigin() {
        assertThatThrownBy(() -> new WebConfig("*"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("origens explícitas");
    }
}
