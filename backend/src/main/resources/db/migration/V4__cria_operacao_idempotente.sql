CREATE TABLE operacao_idempotente (
    chave CHAR(36) NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    venda_id BIGINT NULL,
    movimentacao_id BIGINT NULL,
    data_criacao DATETIME(6) NOT NULL,
    CONSTRAINT pk_operacao_idempotente PRIMARY KEY (chave),
    CONSTRAINT fk_operacao_idempotente_venda FOREIGN KEY (venda_id)
        REFERENCES venda (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_operacao_idempotente_movimentacao FOREIGN KEY (movimentacao_id)
        REFERENCES movimentacao_estoque (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    INDEX idx_operacao_idempotente_data_criacao (data_criacao)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
