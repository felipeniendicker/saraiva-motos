# Saraiva Motos

Sistema operacional da Saraiva Motos para atendimento e controle da loja.

O procedimento isolado de backup, restauracao, migrations MySQL 8, Railway e PWA esta em
[`docs/HOMOLOGACAO_RAILWAY.md`](docs/HOMOLOGACAO_RAILWAY.md).

As regras operacionais e o roteiro de homologacao do caixa e leitor por celular estao em
[`docs/CAIXA_E_LEITOR_REMOTO.md`](docs/CAIXA_E_LEITOR_REMOTO.md).

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

O frontend utiliza sempre a API Spring Boot. `VITE_API_URL` define o endereço do backend e possui `http://localhost:8080` como padrão local.

```powershell
cd demo
$env:VITE_API_URL = "http://localhost:8080"
npm run dev
```

Não há banco operacional, dados seed ou fallback em `localStorage`. A única persistência local é o JWT, na chave exclusiva `saraiva-motos-auth-token`; senhas nunca são armazenadas. Falhas da API tornam a operação temporariamente indisponível e são exibidas como erro.

Em produção, defina `VITE_API_URL` durante o build do frontend e `CORS_ALLOWED_ORIGINS` no backend com a origem HTTPS exata da interface. Não use `*`. O backend deve receber `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` e um `JWT_SECRET` exclusivo por variáveis do ambiente de implantação.

## Deploy / Produção

A arquitetura de produção mantém três recursos separados: frontend React/Vite, backend Spring Boot e banco MySQL persistente. O repositório não depende de uma plataforma específica e nenhum segredo deve ser incluído no bundle do frontend.

### Frontend

O frontend fica em `demo/`. Instale exatamente as versões do lockfile e gere os arquivos estáticos:

```powershell
cd demo
npm ci
$env:VITE_API_URL = "https://backend.example.com"
npm run build
```

O diretório publicado é `demo/dist`. `VITE_API_URL` deve conter a URL pública do backend, sem `/api` no final. Variáveis `VITE_*` são incorporadas ao bundle e, portanto, nunca devem conter senhas, tokens ou chaves privadas. O `HashRouter` permite servir as rotas pelo mesmo arquivo estático sem regras especiais de rewrite.

### Aplicativo instalável (PWA)

O build do frontend gera o manifest e o service worker do PWA “Saraiva Motos”. Em Chrome e Edge no Windows, a instalação pode ser iniciada pelo botão `Instalar Saraiva Motos` exibido quando o navegador informa que o aplicativo é instalável, ou pelo comando de instalação do próprio navegador.

O service worker mantém em cache somente o shell estático versionado do frontend. Requisições `GET` com caminho `/api/` usam exclusivamente a rede; requisições de escrita não são interceptadas. Portanto, vendas, estoque, clientes e autenticação não possuem fallback em cache e o sistema não oferece operação offline completa.

Uma nova versão fica aguardando confirmação do operador. O sistema só ativa a atualização e recarrega a página depois do clique em `Atualização disponível` e de uma confirmação explícita, que orienta a concluir qualquer venda em andamento primeiro.

### Backend

O backend fica em `backend/`, exige Java 17 e utiliza o Maven Wrapper:

```powershell
cd backend
.\mvnw.cmd clean package
java -jar target\saraiva-motos-0.0.1-SNAPSHOT.jar
```

Em sistemas Unix, use `./mvnw`. O serviço lê `PORT` fornecida pela plataforma e usa `8080` localmente. `SERVER_PORT` continua aceito como compatibilidade secundária. Configure o healthcheck HTTP como `GET /api/health`.

### Banco e migrations

Use MySQL persistente e informe uma URL JDBC no formato `jdbc:mysql://HOST:PORT/DATABASE`. O Flyway aplica automaticamente as migrations de `backend/src/main/resources/db/migration`; em seguida, o Hibernate valida o schema com `ddl-auto=validate`. Não utilize geração ou atualização automática de schema em produção.

### Segurança e primeiro acesso

Use um `JWT_SECRET` exclusivo, aleatório e com pelo menos 32 bytes. `INITIAL_USER_EMAIL` e `INITIAL_USER_PASSWORD` são necessários somente quando o primeiro usuário ainda não existe. O bootstrap é idempotente e não sobrescreve a senha de um usuário existente. Após confirmar o primeiro acesso, remova essas duas variáveis do ambiente ou mantenha-as protegidas no gerenciador de segredos da plataforma.

Configure `CORS_ALLOWED_ORIGINS` com a origem HTTPS exata do frontend. Para mais de uma origem, use uma lista separada por vírgulas, sem curingas.

### Checklist de variáveis

| Variável | Serviço | Obrigatória | Finalidade |
| --- | --- | --- | --- |
| `VITE_API_URL` | frontend/build | sim | URL pública do backend, sem `/api` |
| `PORT` | backend | conforme plataforma | Porta HTTP fornecida pelo ambiente |
| `DB_URL` | backend | sim | URL JDBC do MySQL persistente |
| `DB_USERNAME` | backend | sim | Usuário do banco |
| `DB_PASSWORD` | backend | sim | Senha do banco |
| `JWT_SECRET` | backend | sim | Assinatura dos tokens JWT; mínimo de 32 bytes |
| `JWT_EXPIRATION_MS` | backend | não | Duração do token; padrão de 8 horas |
| `INITIAL_USER_EMAIL` | backend | no primeiro bootstrap | E-mail do primeiro usuário |
| `INITIAL_USER_PASSWORD` | backend | no primeiro bootstrap | Senha inicial do primeiro usuário |
| `CORS_ALLOWED_ORIGINS` | backend | sim | Origens permitidas do frontend |
| `FRONTEND_PUBLIC_URL` | backend | sim para leitor remoto | URL HTTPS do frontend usada no QR Code temporário |
| `UPCITEMDB_ENABLED` | backend | não | Habilita ou desabilita o provider UPCitemdb |
| `UPCITEMDB_BASE_URL` | backend | não | URL base do UPCitemdb |
| `UPCITEMDB_CONNECT_TIMEOUT` | backend | não | Timeout de conexão do UPCitemdb |
| `UPCITEMDB_READ_TIMEOUT` | backend | não | Timeout de leitura do UPCitemdb |
| `TAVILY_ENABLED` | backend | não | Habilita ou desabilita o fallback Tavily |
| `TAVILY_API_KEY` | backend | quando Tavily ativo | Chave privada da Tavily, somente no backend |
| `TAVILY_BASE_URL` | backend | não | URL base da Tavily |
| `TAVILY_CONNECT_TIMEOUT` | backend | não | Timeout de conexão da Tavily |
| `TAVILY_READ_TIMEOUT` | backend | não | Timeout de leitura da Tavily |

O arquivo `.env.example` contém apenas placeholders de documentação. Copie os nomes necessários para o gerenciador de variáveis da plataforma; não versione arquivos `.env` preenchidos.

## Autenticação

O acesso ao modo backend exige e-mail e senha. `POST /api/auth/login` e `GET /api/health` são públicos; `/api/auth/me` e todos os módulos operacionais exigem `Authorization: Bearer <token>`. O token é stateless, expira por padrão após 8 horas e não possui refresh token. O logout remove o token no frontend.

Esta etapa não possui cadastro público, recuperação de senha, perfis, cargos ou permissões diferentes. Todo usuário ativo autenticado acessa os mesmos módulos.

## Compatibilidade legada

A arquitetura operacional possui uma única fonte de verdade: frontend React → backend Spring Boot → MySQL. Orçamentos, Oficina/Serviços, Fornecedores e Faturamento não fazem parte do sistema atual.

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

### Fallback de pesquisa com Tavily

Quando o MySQL e o UPCitemdb não identificam um código, o backend pode consultar a API oficial Tavily Search como segundo fallback. Configure `TAVILY_ENABLED=true` e forneça `TAVILY_API_KEY` exclusivamente no ambiente do backend. O provider vem desabilitado por padrão e a chave nunca é enviada ao frontend.

A Tavily utiliza busca básica, poucos resultados e somente aceita evidências que contenham literalmente o GTIN. Páginas genéricas de consulta de UPC/EAN são ignoradas. O resultado é apenas uma sugestão sujeita à confirmação humana; custo, preços e estoque nunca são obtidos da pesquisa externa. Timeout, limites, falhas HTTP e respostas inesperadas mantêm o cadastro manual disponível.

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
