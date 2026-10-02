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

- `VITE_BACKEND_API_ENABLED` é habilitado por padrão; use `false` somente para executar deliberadamente o modo legado isolado;
- `VITE_API_URL`, cujo padrão local é `http://localhost:8080`.

```powershell
cd demo
$env:VITE_API_URL = "http://localhost:8080"
npm run dev
```

No modo backend não há leitura, escrita, sincronização ou fallback do banco operacional em `localStorage`, e nenhum dado seed é inicializado. A única persistência local é o JWT, na chave exclusiva `saraiva-motos-auth-token`; senhas nunca são armazenadas. Falhas da API são exibidas como erro.

Em produção, defina `VITE_API_URL` durante o build do frontend e `CORS_ALLOWED_ORIGINS` no backend com a origem HTTPS exata da interface. Não use `*`. O backend deve receber `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` e um `JWT_SECRET` exclusivo por variáveis do ambiente de implantação.

## Autenticação

O acesso ao modo backend exige e-mail e senha. `POST /api/auth/login` e `GET /api/health` são públicos; `/api/auth/me` e todos os módulos operacionais exigem `Authorization: Bearer <token>`. O token é stateless, expira por padrão após 8 horas e não possui refresh token. O logout remove o token no frontend.

Esta etapa não possui cadastro público, recuperação de senha, perfis, cargos ou permissões diferentes. Todo usuário ativo autenticado acessa os mesmos módulos.

## Compatibilidade legada

O modo `VITE_BACKEND_API_ENABLED=false` permanece temporariamente para testes e demonstração isolada dos seis módulos atuais. Somente esse modo utiliza `storage.js`, `seed.js` e `localStorage`. Orçamentos, Oficina/Serviços, Fornecedores e Faturamento não fazem parte do sistema atual e foram removidos.

## Dashboard e relatórios

O Dashboard apresenta totais gerais de produtos e clientes ativos, estoque baixo, vendas concluídas, faturamento e seis movimentações recentes. Relatórios oferecem período opcional, ticket médio, descontos, ranking baseado nos snapshots dos itens e valor de custo do estoque ativo.

Vendas canceladas permanecem no histórico, mas não entram em faturamento, quantidade operacional, ticket médio ou ranking. O ranking soma subtotais dos itens antes do desconto global, pois não existe rateio por item.

## Código de barras e leitor USB

`codigoReferencia` e `codigoBarras` permanecem campos separados e textuais; zeros à esquerda são preservados. No PDV e em Produtos, um leitor USB HID funciona como teclado: mantenha o campo de código focado, faça a leitura e o Enter executará somente a consulta.

O PDV consulta primeiro o cadastro local pelo código de barras exato e depois pela referência exata. Produto ativo com estoque é adicionado ao carrinho; leituras repetidas incrementam a mesma linha dentro do saldo disponível. Produtos inativos, sem estoque ou inexistentes produzem mensagens específicas. Em Produtos, um código existente apresenta o cadastro e um código desconhecido oferece “Cadastrar com este código”, sem salvar automaticamente.

`GET /api/produtos/codigo/{codigo}` continua sendo a consulta operacional local de produto ativo. `GET /api/produtos/lookup/{codigo}` fornece resultado estruturado e usa uma estratégia local-first: procura no MySQL por código de barras e referência e só consulta uma fonte externa quando não encontra cadastro local. O endpoint continua protegido por JWT e o antigo mock não participa do fluxo de produção.

### Consulta auxiliar no UPCitemdb

O UPCitemdb é um provider auxiliar e experimental para identificar códigos desconhecidos. A integração usa o endpoint gratuito oficial `https://api.upcitemdb.com/prod/trial/lookup`, que não exige cadastro ou chave, respeitando os limites publicados pelo serviço. Somente códigos numéricos de 8 a 14 dígitos são enviados; referências internas alfanuméricas continuam restritas à consulta local. A API externa nunca é chamada para um produto já cadastrado.

Configuração opcional do backend:

- `UPCITEMDB_ENABLED=true` habilita o provider (padrão de desenvolvimento);
- `UPCITEMDB_ENABLED=false` desabilita qualquer consulta externa sem afetar o lookup local;
- `UPCITEMDB_BASE_URL` altera a URL base, principalmente para testes controlados;
- `UPCITEMDB_CONNECT_TIMEOUT=2500ms` define o timeout de conexão;
- `UPCITEMDB_READ_TIMEOUT=4000ms` define o timeout de leitura.

Não há retry automático nem tentativa de contornar o limite gratuito. HTTP 429, erros externos, timeout, falha de rede e resposta inválida produzem um fallback seguro para cadastro manual. Assim, a operação e as vendas de itens cadastrados não dependem da internet nem do UPCitemdb.

Uma resposta externa é sempre exibida como sugestão não confirmada. Podem ser sugeridos código de barras, nome, marca, categoria, descrição e modelo/aplicação quando efetivamente retornados. Imagens, ofertas e preços da internet são ignorados e não há download ou persistência de arquivos. Custo, preço de varejo, preço de revenda, estoque, estoque mínimo e margem continuam sendo informados e revisados pelo funcionário. A sugestão não é salva automaticamente e não pode entrar no carrinho antes de virar um Produto real no MySQL.

Para medir a cobertura real em motopeças, separe uma amostra de 20 a 30 produtos da loja e registre: total consultado, encontrado ou não encontrado, resultado correto e resultado incorreto/incompleto. Calcule a taxa de localização (`encontrados / total`) e a taxa de resultado útil (`corretos / total`). A base é genérica, portanto esse teste é necessário antes de qualquer conclusão sobre cobertura. A interface de providers permite adicionar futuramente uma integração oficial do Mercado Livre sem reescrever Produtos ou PDV; ela não faz parte desta etapa e scraping não deve ser usado.

Não há IA, câmera, OCR, WebUSB, acesso serial, Redis ou cache distribuído nesta implementação.

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
