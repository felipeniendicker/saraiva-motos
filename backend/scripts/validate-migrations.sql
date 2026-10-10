-- Execute somente em uma cópia temporária do banco de produção, nunca no banco real.
-- Após iniciar a aplicação contra a cópia, estas consultas validam V3 a V7.

SELECT VERSION() AS mysql_version;

SELECT installed_rank, version, description, checksum, success
FROM flyway_schema_history
ORDER BY installed_rank;

SELECT version, COUNT(*) AS quantidade
FROM flyway_schema_history
WHERE version IN ('3', '4', '5', '6', '7') AND success = TRUE
GROUP BY version
ORDER BY version;

SELECT table_name, column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND (
    (table_name = 'venda' AND column_name = 'desconto_percentual') OR
    (table_name = 'item_venda' AND column_name = 'preco_alterado_manualmente') OR
    table_name = 'operacao_idempotente'
  )
ORDER BY table_name, ordinal_position;

SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = DATABASE()
  AND constraint_name = 'chk_venda_desconto_percentual';

SELECT COUNT(*) AS vendas_existentes,
       SUM(desconto_percentual IS NULL) AS vendas_legadas_sem_percentual
FROM venda;

SELECT COUNT(*) AS itens_existentes,
       SUM(preco_alterado_manualmente = FALSE) AS itens_legados_preservados
FROM item_venda;

SELECT COUNT(*) AS movimentos_existentes FROM movimentacao_estoque;

SELECT COUNT(*) AS itens_orfaos
FROM item_venda i LEFT JOIN venda v ON v.id = i.venda_id
WHERE v.id IS NULL;

SELECT COUNT(*) AS movimentos_orfaos
FROM movimentacao_estoque m LEFT JOIN produto p ON p.id = m.produto_id
WHERE p.id IS NULL;

SELECT COUNT(*) AS operacoes_sem_resultado
FROM operacao_idempotente
WHERE (tipo = 'VENDA' AND (venda_id IS NULL OR movimentacao_id IS NOT NULL))
   OR (tipo LIKE 'ESTOQUE_%' AND (movimentacao_id IS NULL OR venda_id IS NOT NULL));

SELECT chave, COUNT(*) AS quantidade
FROM operacao_idempotente
GROUP BY chave
HAVING COUNT(*) > 1;

SELECT COUNT(*) AS vendas_com_total_inconsistente
FROM venda
WHERE total <> ROUND(subtotal - desconto, 2)
   OR desconto < 0 OR desconto > subtotal;

SELECT COUNT(*) AS itens_com_snapshot_incompleto
FROM item_venda
WHERE codigo_produto IS NULL OR codigo_produto = ''
   OR descricao_produto IS NULL OR descricao_produto = ''
   OR preco_unitario IS NULL OR subtotal IS NULL;

SELECT COUNT(*) AS movimentos_de_venda_orfaos
FROM movimentacao_estoque m
LEFT JOIN venda v ON v.id = m.venda_id
WHERE m.tipo IN ('SAIDA_VENDA', 'CANCELAMENTO_VENDA') AND v.id IS NULL;

SELECT COUNT(*) AS vendas_com_caixa_orfao
FROM venda v LEFT JOIN caixa c ON c.id = v.caixa_id
WHERE v.caixa_id IS NOT NULL AND c.id IS NULL;

SELECT COUNT(*) AS movimentos_caixa_orfaos
FROM caixa_movimentacao m LEFT JOIN caixa c ON c.id = m.caixa_id
WHERE c.id IS NULL;

SELECT COUNT(*) AS caixas_abertos FROM caixa WHERE status = 'ABERTO';

SELECT COUNT(*) AS leituras_remotas_orfas
FROM leitor_leitura l LEFT JOIN leitor_sessao s ON s.id = l.sessao_id
WHERE s.id IS NULL;
