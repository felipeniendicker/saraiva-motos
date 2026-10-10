CREATE TABLE caixa (
    id BIGINT NOT NULL AUTO_INCREMENT,
    status VARCHAR(20) NOT NULL,
    valor_inicial DECIMAL(15, 2) NOT NULL,
    data_abertura DATETIME(6) NOT NULL,
    operador_abertura_id BIGINT NOT NULL,
    operador_abertura_email VARCHAR(254) NOT NULL,
    data_fechamento DATETIME(6) NULL,
    operador_fechamento_id BIGINT NULL,
    operador_fechamento_email VARCHAR(254) NULL,
    valor_contado DECIMAL(15, 2) NULL,
    saldo_esperado_fechamento DECIMAL(15, 2) NULL,
    diferenca_fechamento DECIMAL(15, 2) NULL,
    total_dinheiro DECIMAL(15, 2) NULL,
    total_pix DECIMAL(15, 2) NULL,
    total_cartao_debito DECIMAL(15, 2) NULL,
    total_cartao_credito DECIMAL(15, 2) NULL,
    total_outro DECIMAL(15, 2) NULL,
    chave_aberto TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'ABERTO' THEN 1 ELSE NULL END) STORED,
    CONSTRAINT pk_caixa PRIMARY KEY (id),
    CONSTRAINT fk_caixa_operador_abertura FOREIGN KEY (operador_abertura_id) REFERENCES usuario (id),
    CONSTRAINT fk_caixa_operador_fechamento FOREIGN KEY (operador_fechamento_id) REFERENCES usuario (id),
    CONSTRAINT chk_caixa_status CHECK (status IN ('ABERTO', 'FECHADO')),
    CONSTRAINT chk_caixa_valor_inicial CHECK (valor_inicial >= 0),
    CONSTRAINT uk_caixa_unico_aberto UNIQUE (chave_aberto),
    INDEX idx_caixa_data_abertura (data_abertura)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

ALTER TABLE venda
    ADD COLUMN caixa_id BIGINT NULL AFTER id,
    ADD CONSTRAINT fk_venda_caixa FOREIGN KEY (caixa_id) REFERENCES caixa (id),
    ADD INDEX idx_venda_caixa (caixa_id);

CREATE TABLE caixa_movimentacao (
    id BIGINT NOT NULL AUTO_INCREMENT,
    caixa_id BIGINT NOT NULL,
    tipo VARCHAR(40) NOT NULL,
    valor DECIMAL(15, 2) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    venda_id BIGINT NULL,
    chave_idempotencia CHAR(36) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    operador_id BIGINT NOT NULL,
    operador_email VARCHAR(254) NOT NULL,
    data_hora DATETIME(6) NOT NULL,
    CONSTRAINT pk_caixa_movimentacao PRIMARY KEY (id),
    CONSTRAINT fk_caixa_movimentacao_caixa FOREIGN KEY (caixa_id) REFERENCES caixa (id),
    CONSTRAINT fk_caixa_movimentacao_venda FOREIGN KEY (venda_id) REFERENCES venda (id),
    CONSTRAINT fk_caixa_movimentacao_operador FOREIGN KEY (operador_id) REFERENCES usuario (id),
    CONSTRAINT chk_caixa_movimentacao_valor CHECK (valor > 0),
    CONSTRAINT uk_caixa_movimentacao_chave UNIQUE (chave_idempotencia),
    CONSTRAINT uk_caixa_movimentacao_venda_tipo UNIQUE (venda_id, tipo),
    INDEX idx_caixa_movimentacao_caixa_data (caixa_id, data_hora)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
