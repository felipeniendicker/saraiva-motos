package br.com.saraivamotos.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Map;
import java.util.TimeZone;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.context.annotation.Import;

@JsonTest
@Import(BusinessTimeConfiguration.class)
class BusinessTimeConfigurationTests {
    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void configuraJvmParaOFusoDaLoja() {
        assertThat(TimeZone.getDefault().toZoneId()).isEqualTo(ZoneId.of("America/Sao_Paulo"));
    }

    @Test
    void serializaLocalDateTimeComOffsetSemAlterarOHorarioCivilHistorico() throws Exception {
        LocalDateTime historicalValue = LocalDateTime.of(2026, 10, 21, 10, 29);

        String json = objectMapper.writeValueAsString(Map.of("dataHora", historicalValue));

        assertThat(json).isEqualTo("{\"dataHora\":\"2026-10-21T10:29:00-03:00\"}");
    }

    @Test
    void criaNovosHorariosNoFusoDaLojaMesmoSeAJvmIniciouEmOutroFuso() {
        LocalDateTime generated = LocalDateTime.now();
        LocalDateTime businessNow = LocalDateTime.now(BusinessTimeConfiguration.BUSINESS_ZONE);

        assertThat(generated).isBetween(businessNow.minusSeconds(1), businessNow.plusSeconds(1));
    }

    @Test
    void naoAplicaFusoEmLocalDateNemAlteraInstant() throws Exception {
        String json = objectMapper.writeValueAsString(Map.of(
                "vencimento", LocalDate.of(2026, 10, 21),
                "instante", Instant.parse("2026-10-21T13:29:00Z")));

        assertThat(json).contains("\"vencimento\":\"2026-10-21\"");
        assertThat(json).contains("\"instante\":\"2026-10-21T13:29:00Z\"");
    }
}
