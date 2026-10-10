ALTER TABLE venda
    ADD COLUMN desconto_percentual DECIMAL(7, 4) NULL AFTER desconto;

ALTER TABLE venda
    ADD CONSTRAINT chk_venda_desconto_percentual
        CHECK (desconto_percentual IS NULL OR desconto_percentual BETWEEN 0 AND 100);
