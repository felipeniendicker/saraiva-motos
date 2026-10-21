package br.com.saraivamotos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import br.com.saraivamotos.config.BusinessTimeConfiguration;

@SpringBootApplication
public class SaraivaMotosApplication {

    public static void main(String[] args) {
        BusinessTimeConfiguration.applyDefaultTimeZone();
        SpringApplication.run(SaraivaMotosApplication.class, args);
    }
}
