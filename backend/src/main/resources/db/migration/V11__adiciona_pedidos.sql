CREATE TABLE pedido (
    id BIGINT NOT NULL AUTO_INCREMENT,
    numero VARCHAR(30) NOT NULL,
    cliente_id BIGINT NOT NULL,
    cliente_nome VARCHAR(180) NOT NULL,
    cliente_tipo VARCHAR(30) NOT NULL,
    orcamento_id BIGINT NULL,
    venda_id BIGINT NULL,
    tipo_preco_utilizado VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    desconto DECIMAL(15, 2) NOT NULL,
    desconto_percentual DECIMAL(7, 4) NOT NULL,
    total DECIMAL(15, 2) NOT NULL,
    data_criacao DATETIME(6) NOT NULL,
    data_atualizacao DATETIME(6) NOT NULL,
    previsao_retirada DATE NULL,
    observacoes TEXT NULL,
    operador_id BIGINT NOT NULL,
    operador_email VARCHAR(254) NOT NULL,
    versao BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT pk_pedido PRIMARY KEY (id),
    CONSTRAINT uk_pedido_numero UNIQUE (numero),
    CONSTRAINT uk_pedido_orcamento UNIQUE (orcamento_id),
    CONSTRAINT uk_pedido_venda UNIQUE (venda_id),
    CONSTRAINT fk_pedido_cliente FOREIGN KEY (cliente_id)
        REFERENCES cliente (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_pedido_orcamento FOREIGN KEY (orcamento_id)
        REFERENCES orcamento (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_pedido_venda FOREIGN KEY (venda_id)
        REFERENCES venda (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_pedido_operador FOREIGN KEY (operador_id)
        REFERENCES usuario (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_pedido_status CHECK (
        status IN ('PENDENTE', 'CONFIRMADO', 'PRONTO', 'FINALIZADO', 'CANCELADO')
    ),
    CONSTRAINT chk_pedido_valores CHECK (
        subtotal >= 0 AND desconto >= 0 AND total >= 0
        AND desconto_percentual BETWEEN 0 AND 100
    ),
    INDEX idx_pedido_cliente (cliente_id),
    INDEX idx_pedido_status (status),
    INDEX idx_pedido_data_criacao (data_criacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE item_pedido (
    id BIGINT NOT NULL AUTO_INCREMENT,
    pedido_id BIGINT NOT NULL,
    tipo_item VARCHAR(20) NOT NULL,
    produto_id BIGINT NULL,
    codigo_item VARCHAR(100) NOT NULL,
    descricao_item VARCHAR(180) NOT NULL,
    quantidade INT NOT NULL,
    preco_original DECIMAL(15, 2) NOT NULL,
    preco_unitario DECIMAL(15, 2) NOT NULL,
    preco_alterado_manualmente BOOLEAN NOT NULL DEFAULT FALSE,
    subtotal DECIMAL(15, 2) NOT NULL,
    CONSTRAINT pk_item_pedido PRIMARY KEY (id),
    CONSTRAINT fk_item_pedido_pedido FOREIGN KEY (pedido_id)
        REFERENCES pedido (id) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_item_pedido_produto FOREIGN KEY (produto_id)
        REFERENCES produto (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_item_pedido_tipo CHECK (tipo_item IN ('PRODUTO', 'SERVICO')),
    CONSTRAINT chk_item_pedido_quantidade CHECK (quantidade > 0),
    CONSTRAINT chk_item_pedido_valores CHECK (
        preco_original >= 0 AND preco_unitario >= 0 AND subtotal >= 0
    ),
    INDEX idx_item_pedido_pedido (pedido_id),
    INDEX idx_item_pedido_produto (produto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pedido_historico_status (
    id BIGINT NOT NULL AUTO_INCREMENT,
    pedido_id BIGINT NOT NULL,
    status_anterior VARCHAR(20) NULL,
    status_novo VARCHAR(20) NOT NULL,
    data_hora DATETIME(6) NOT NULL,
    operador_id BIGINT NOT NULL,
    operador_email VARCHAR(254) NOT NULL,
    observacao VARCHAR(1000) NULL,
    CONSTRAINT pk_pedido_historico_status PRIMARY KEY (id),
    CONSTRAINT fk_pedido_historico_pedido FOREIGN KEY (pedido_id)
        REFERENCES pedido (id) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_pedido_historico_operador FOREIGN KEY (operador_id)
        REFERENCES usuario (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_pedido_historico_status_anterior CHECK (
        status_anterior IS NULL OR status_anterior IN ('PENDENTE', 'CONFIRMADO', 'PRONTO', 'FINALIZADO', 'CANCELADO')
    ),
    CONSTRAINT chk_pedido_historico_status_novo CHECK (
        status_novo IN ('PENDENTE', 'CONFIRMADO', 'PRONTO', 'FINALIZADO', 'CANCELADO')
    ),
    INDEX idx_pedido_historico_pedido_data (pedido_id, data_hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
