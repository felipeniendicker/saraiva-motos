CREATE TABLE produto (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(180) NOT NULL,
    codigo_referencia VARCHAR(100) NOT NULL,
    codigo_barras VARCHAR(32) NULL,
    marca VARCHAR(100) NULL,
    categoria VARCHAR(100) NULL,
    aplicacao VARCHAR(255) NULL,
    valor_custo DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    preco_varejo DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    preco_revenda DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    quantidade_estoque INT NOT NULL DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 0,
    observacoes TEXT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_cadastro DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_produto PRIMARY KEY (id),
    CONSTRAINT uk_produto_codigo_barras UNIQUE (codigo_barras),
    CONSTRAINT ck_produto_precos CHECK (
        valor_custo >= 0 AND preco_varejo >= 0 AND preco_revenda >= 0
    ),
    CONSTRAINT ck_produto_estoque CHECK (
        quantidade_estoque >= 0 AND estoque_minimo >= 0
    ),
    INDEX idx_produto_codigo_referencia (codigo_referencia),
    INDEX idx_produto_nome (nome)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE cliente (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nome_razao_social VARCHAR(180) NOT NULL,
    telefone VARCHAR(30) NULL,
    cpf_cnpj VARCHAR(20) NULL,
    tipo_cliente VARCHAR(30) NOT NULL,
    endereco VARCHAR(255) NULL,
    observacoes TEXT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_cadastro DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_cliente PRIMARY KEY (id),
    INDEX idx_cliente_nome_razao_social (nome_razao_social),
    INDEX idx_cliente_cpf_cnpj (cpf_cnpj)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE moto (
    id BIGINT NOT NULL AUTO_INCREMENT,
    cliente_id BIGINT NOT NULL,
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(120) NOT NULL,
    ano SMALLINT NULL,
    cilindrada VARCHAR(20) NULL,
    placa VARCHAR(10) NULL,
    observacoes TEXT NULL,
    CONSTRAINT pk_moto PRIMARY KEY (id),
    CONSTRAINT fk_moto_cliente FOREIGN KEY (cliente_id)
        REFERENCES cliente (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    INDEX idx_moto_cliente_id (cliente_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE venda (
    id BIGINT NOT NULL AUTO_INCREMENT,
    numero_venda VARCHAR(30) NOT NULL,
    cliente_id BIGINT NULL,
    cliente_nome VARCHAR(180) NULL,
    cliente_tipo VARCHAR(30) NULL,
    tipo_preco_utilizado VARCHAR(20) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    desconto DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    forma_pagamento VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    data_hora DATETIME(6) NOT NULL,
    observacoes TEXT NULL,
    data_cancelamento DATETIME(6) NULL,
    motivo_cancelamento TEXT NULL,
    CONSTRAINT pk_venda PRIMARY KEY (id),
    CONSTRAINT uk_venda_numero_venda UNIQUE (numero_venda),
    CONSTRAINT fk_venda_cliente FOREIGN KEY (cliente_id)
        REFERENCES cliente (id) ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_venda_valores CHECK (
        subtotal >= 0 AND desconto >= 0 AND total >= 0
    ),
    INDEX idx_venda_data_hora (data_hora),
    INDEX idx_venda_cliente_id (cliente_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE item_venda (
    id BIGINT NOT NULL AUTO_INCREMENT,
    venda_id BIGINT NOT NULL,
    produto_id BIGINT NOT NULL,
    codigo_produto VARCHAR(100) NOT NULL,
    descricao_produto VARCHAR(180) NOT NULL,
    quantidade INT NOT NULL,
    preco_original DECIMAL(15, 2) NOT NULL,
    preco_unitario DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    CONSTRAINT pk_item_venda PRIMARY KEY (id),
    CONSTRAINT fk_item_venda_venda FOREIGN KEY (venda_id)
        REFERENCES venda (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_item_venda_produto FOREIGN KEY (produto_id)
        REFERENCES produto (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_item_venda_quantidade CHECK (quantidade > 0),
    CONSTRAINT ck_item_venda_valores CHECK (
        preco_original >= 0 AND preco_unitario >= 0 AND subtotal >= 0
    ),
    INDEX idx_item_venda_venda_id (venda_id),
    INDEX idx_item_venda_produto_id (produto_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE movimentacao_estoque (
    id BIGINT NOT NULL AUTO_INCREMENT,
    produto_id BIGINT NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    quantidade INT NOT NULL,
    estoque_anterior INT NOT NULL,
    estoque_posterior INT NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    venda_id BIGINT NULL,
    data_hora DATETIME(6) NOT NULL,
    CONSTRAINT pk_movimentacao_estoque PRIMARY KEY (id),
    CONSTRAINT fk_movimentacao_produto FOREIGN KEY (produto_id)
        REFERENCES produto (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_movimentacao_venda FOREIGN KEY (venda_id)
        REFERENCES venda (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_movimentacao_quantidade CHECK (quantidade > 0),
    CONSTRAINT ck_movimentacao_estoque CHECK (
        estoque_anterior >= 0 AND estoque_posterior >= 0
    ),
    INDEX idx_movimentacao_produto_id (produto_id),
    INDEX idx_movimentacao_venda_id (venda_id),
    INDEX idx_movimentacao_data_hora (data_hora)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
