package br.com.saraivamotos.config;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.TimeZone;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class BusinessTimeConfiguration {
    public static final ZoneId BUSINESS_ZONE = ZoneId.of("America/Sao_Paulo");

    public static void applyDefaultTimeZone() {
        TimeZone.setDefault(TimeZone.getTimeZone(BUSINESS_ZONE));
    }

    @PostConstruct
    void configureJvmTimeZone() {
        applyDefaultTimeZone();
    }

    @Bean
    Jackson2ObjectMapperBuilderCustomizer businessLocalDateTimeSerializer() {
        return builder -> builder.serializerByType(LocalDateTime.class, new JsonSerializer<LocalDateTime>() {
            @Override
            public void serialize(LocalDateTime value, JsonGenerator generator, SerializerProvider serializers)
                    throws IOException {
                generator.writeString(value.atZone(BUSINESS_ZONE)
                        .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
            }
        });
    }
}
