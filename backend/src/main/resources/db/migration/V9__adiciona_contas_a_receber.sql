ALTER TABLE venda
    ADD COLUMN condicao_pagamento VARCHAR(20) NOT NULL DEFAULT 'IMEDIATO' AFTER forma_pagamento,
    ADD COLUMN vencimento DATE NULL AFTER condicao_pagamento,
    ADD CONSTRAINT chk_venda_condicao_pagamento CHECK (condicao_pagamento IN ('IMEDIATO', 'A_PRAZO'));

CREATE TABLE conta_receber (
    id BIGINT NOT NULL AUTO_INCREMENT,
    venda_id BIGINT NOT NULL,
    cliente_id BIGINT NOT NULL,
    valor_original DECIMAL(15,2) NOT NULL,
    valor_recebido DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    saldo_pendente DECIMAL(15,2) NOT NULL,
    vencimento DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    data_criacao DATETIME(6) NOT NULL,
    data_quitacao DATETIME(6) NULL,
    versao BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT pk_conta_receber PRIMARY KEY (id),
    CONSTRAINT uk_conta_receber_venda UNIQUE (venda_id),
    CONSTRAINT fk_conta_receber_venda FOREIGN KEY (venda_id) REFERENCES venda (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_conta_receber_cliente FOREIGN KEY (cliente_id) REFERENCES cliente (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_conta_receber_status CHECK (status IN ('ABERTA','PARCIAL','QUITADA','CANCELADA')),
    CONSTRAINT chk_conta_receber_valores CHECK (valor_original >= 0 AND valor_recebido >= 0 AND saldo_pendente >= 0),
    INDEX idx_conta_receber_cliente (cliente_id),
    INDEX idx_conta_receber_vencimento (vencimento),
    INDEX idx_conta_receber_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recebimento (
    id BIGINT NOT NULL AUTO_INCREMENT,
    conta_receber_id BIGINT NOT NULL,
    caixa_id BIGINT NOT NULL,
    chave_idempotencia CHAR(36) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    forma_pagamento VARCHAR(30) NOT NULL,
    data_hora DATETIME(6) NOT NULL,
    operador_id BIGINT NOT NULL,
    operador_email VARCHAR(254) NOT NULL,
    estornado BOOLEAN NOT NULL DEFAULT FALSE,
    data_estorno DATETIME(6) NULL,
    motivo_estorno VARCHAR(1000) NULL,
    operador_estorno_id BIGINT NULL,
    operador_estorno_email VARCHAR(254) NULL,
    caixa_estorno_id BIGINT NULL,
    CONSTRAINT pk_recebimento PRIMARY KEY (id),
    CONSTRAINT uk_recebimento_chave UNIQUE (chave_idempotencia),
    CONSTRAINT fk_recebimento_conta FOREIGN KEY (conta_receber_id) REFERENCES conta_receber (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_recebimento_caixa FOREIGN KEY (caixa_id) REFERENCES caixa (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_recebimento_operador FOREIGN KEY (operador_id) REFERENCES usuario (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_recebimento_operador_estorno FOREIGN KEY (operador_estorno_id) REFERENCES usuario (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_recebimento_caixa_estorno FOREIGN KEY (caixa_estorno_id) REFERENCES caixa (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_recebimento_valor CHECK (valor > 0),
    INDEX idx_recebimento_conta_data (conta_receber_id,data_hora),
    INDEX idx_recebimento_caixa (caixa_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE caixa_movimentacao
    ADD COLUMN recebimento_id BIGINT NULL AFTER venda_id,
    ADD CONSTRAINT fk_caixa_movimentacao_recebimento FOREIGN KEY (recebimento_id) REFERENCES recebimento (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT uk_caixa_movimentacao_recebimento_tipo UNIQUE (recebimento_id,tipo);
