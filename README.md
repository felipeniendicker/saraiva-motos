# Saraiva Motos

Sistema operacional da Saraiva Motos para atendimento e controle da loja.

## Módulos atuais

- Dashboard;
- Vendas e cancelamentos;
- Produtos / Peças;
- Estoque e movimentações;
- Clientes e Motos;
- Relatórios.

O frontend usa React/Vite, o backend usa Java 17 e Spring Boot, e a persistência real é feita no MySQL. O Flyway controla o schema e o Hibernate usa `ddl-auto=validate`.

## Execução local

O backend recebe `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` e, opcionalmente, `CORS_ALLOWED_ORIGINS` pelo ambiente. Nenhuma credencial deve ser versionada.

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

O frontend recebe:

- `VITE_BACKEND_API_ENABLED=true` para utilizar exclusivamente API/MySQL;
- `VITE_API_URL`, cujo padrão local é `http://localhost:8080`.

```powershell
cd demo
$env:VITE_BACKEND_API_ENABLED = "true"
$env:VITE_API_URL = "http://localhost:8080"
npm run dev
```

No modo backend não há leitura, escrita, sincronização ou fallback para `localStorage`, e nenhum dado seed é inicializado. Falhas da API são exibidas como erro.

## Compatibilidade legada

O modo `VITE_BACKEND_API_ENABLED=false` permanece temporariamente para testes e demonstração isolada dos seis módulos atuais. Somente esse modo utiliza `storage.js`, `seed.js` e `localStorage`. Orçamentos, Oficina/Serviços, Fornecedores e Faturamento não fazem parte do sistema atual e foram removidos.

## Dashboard e relatórios

O Dashboard apresenta totais gerais de produtos e clientes ativos, estoque baixo, vendas concluídas, faturamento e seis movimentações recentes. Relatórios oferecem período opcional, ticket médio, descontos, ranking baseado nos snapshots dos itens e valor de custo do estoque ativo.

Vendas canceladas permanecem no histórico, mas não entram em faturamento, quantidade operacional, ticket médio ou ranking. O ranking soma subtotais dos itens antes do desconto global, pois não existe rateio por item.

## Validação

```powershell
cd backend
.\mvnw.cmd clean test
.\mvnw.cmd package

cd ..\demo
npm test -- --run
npm run build
```

Não há autenticação nesta versão. A separação React → API → Services → Repositories → MySQL permite acrescentar Spring Security/JWT posteriormente sem alterar a persistência dos módulos operacionais.
