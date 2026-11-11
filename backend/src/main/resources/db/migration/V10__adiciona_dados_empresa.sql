CREATE TABLE empresa_configuracao (
    id BIGINT NOT NULL,
    nome_fantasia VARCHAR(180) NOT NULL,
    razao_social VARCHAR(180) NOT NULL,
    cnpj VARCHAR(20) NULL,
    telefone VARCHAR(30) NULL,
    endereco VARCHAR(500) NULL,
    email VARCHAR(254) NULL,
    versao BIGINT NOT NULL DEFAULT 0,
    atualizado_em DATETIME(6) NOT NULL,
    CONSTRAINT pk_empresa_configuracao PRIMARY KEY (id),
    CONSTRAINT chk_empresa_configuracao_unica CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO empresa_configuracao (
    id, nome_fantasia, razao_social, cnpj, telefone, endereco, email, versao, atualizado_em
) VALUES (
    1, 'SARAIVA MOTOS', 'SARAIVA MOTO PEÇAS', NULL, NULL, NULL, NULL, 0, CURRENT_TIMESTAMP(6)
);
