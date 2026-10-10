ALTER TABLE item_venda
    ADD COLUMN preco_alterado_manualmente BOOLEAN NOT NULL DEFAULT FALSE AFTER preco_unitario;
