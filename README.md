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

O backend recebe `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET` e, opcionalmente, `JWT_EXPIRATION_MS` e `CORS_ALLOWED_ORIGINS` pelo ambiente. `JWT_SECRET` deve ter pelo menos 32 bytes. Nenhuma credencial deve ser versionada.

Para criar o primeiro usuário, defina temporariamente `INITIAL_USER_EMAIL` e `INITIAL_USER_PASSWORD` antes da primeira inicialização. O e-mail é normalizado e a senha é armazenada com BCrypt. O bootstrap é idempotente: se o e-mail já existir, sua senha não será sobrescrita. Depois da criação, as duas variáveis podem ser removidas do ambiente.

```powershell
cd backend
$env:JWT_SECRET = "defina-um-segredo-local-com-pelo-menos-32-bytes"
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

No modo backend não há leitura, escrita, sincronização ou fallback do banco operacional em `localStorage`, e nenhum dado seed é inicializado. A única persistência local é o JWT, na chave exclusiva `saraiva-motos-auth-token`; senhas nunca são armazenadas. Falhas da API são exibidas como erro.

## Autenticação

O acesso ao modo backend exige e-mail e senha. `POST /api/auth/login` e `GET /api/health` são públicos; `/api/auth/me` e todos os módulos operacionais exigem `Authorization: Bearer <token>`. O token é stateless, expira por padrão após 8 horas e não possui refresh token. O logout remove o token no frontend.

Esta etapa não possui cadastro público, recuperação de senha, perfis, cargos ou permissões diferentes. Todo usuário ativo autenticado acessa os mesmos módulos.

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

A autenticação usa Spring Security, BCrypt e JWT sem alterar a persistência ou as regras dos módulos operacionais.
