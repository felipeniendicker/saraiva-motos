CREATE TABLE leitor_sessao (
    id CHAR(36) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    operador_id BIGINT NOT NULL,
    operador_email VARCHAR(254) NOT NULL,
    status VARCHAR(20) NOT NULL,
    data_criacao DATETIME(6) NOT NULL,
    data_expiracao DATETIME(6) NOT NULL,
    CONSTRAINT pk_leitor_sessao PRIMARY KEY (id),
    CONSTRAINT uk_leitor_sessao_token UNIQUE (token_hash),
    CONSTRAINT fk_leitor_sessao_operador FOREIGN KEY (operador_id) REFERENCES usuario (id),
    CONSTRAINT chk_leitor_sessao_status CHECK (status IN ('ATIVA', 'ENCERRADA')),
    INDEX idx_leitor_sessao_expiracao (data_expiracao)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE leitor_leitura (
    id BIGINT NOT NULL AUTO_INCREMENT,
    sessao_id CHAR(36) NOT NULL,
    evento_id CHAR(36) NOT NULL,
    codigo VARCHAR(14) NOT NULL,
    data_hora DATETIME(6) NOT NULL,
    data_consumo DATETIME(6) NULL,
    CONSTRAINT pk_leitor_leitura PRIMARY KEY (id),
    CONSTRAINT fk_leitor_leitura_sessao FOREIGN KEY (sessao_id) REFERENCES leitor_sessao (id),
    CONSTRAINT uk_leitor_leitura_evento UNIQUE (sessao_id, evento_id),
    INDEX idx_leitor_leitura_pendente (sessao_id, data_consumo, id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
