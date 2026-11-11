ALTER TABLE orcamento
    ADD COLUMN forma_pagamento_prevista VARCHAR(30) NULL AFTER total,
    ADD COLUMN condicao_pagamento_prevista VARCHAR(20) NOT NULL DEFAULT 'IMEDIATO' AFTER forma_pagamento_prevista,
    ADD COLUMN vencimento_previsto DATE NULL AFTER condicao_pagamento_prevista,
    ADD COLUMN entrada_prevista DECIMAL(15, 2) NOT NULL DEFAULT 0.00 AFTER vencimento_previsto,
    ADD COLUMN forma_pagamento_entrada_prevista VARCHAR(30) NULL AFTER entrada_prevista,
    ADD CONSTRAINT chk_orcamento_condicao_pagamento_prevista CHECK (
        condicao_pagamento_prevista IN ('IMEDIATO', 'A_PRAZO')
    ),
    ADD CONSTRAINT chk_orcamento_entrada_prevista CHECK (entrada_prevista >= 0);

ALTER TABLE pedido
    ADD COLUMN forma_pagamento_prevista VARCHAR(30) NULL AFTER total,
    ADD COLUMN condicao_pagamento_prevista VARCHAR(20) NOT NULL DEFAULT 'IMEDIATO' AFTER forma_pagamento_prevista,
    ADD COLUMN vencimento_previsto DATE NULL AFTER condicao_pagamento_prevista,
    ADD COLUMN entrada_prevista DECIMAL(15, 2) NOT NULL DEFAULT 0.00 AFTER vencimento_previsto,
    ADD COLUMN forma_pagamento_entrada_prevista VARCHAR(30) NULL AFTER entrada_prevista,
    ADD CONSTRAINT chk_pedido_condicao_pagamento_prevista CHECK (
        condicao_pagamento_prevista IN ('IMEDIATO', 'A_PRAZO')
    ),
    ADD CONSTRAINT chk_pedido_entrada_prevista CHECK (entrada_prevista >= 0);
