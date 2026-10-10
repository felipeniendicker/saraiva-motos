# Homologacao segura antes da publicacao no Railway

Este procedimento valida uma copia isolada. Ele nao autoriza acesso automatico ao banco real, deploy, commit ou execucao de migrations em producao.

## 1. Separacao obrigatoria dos ambientes

Use recursos distintos para homologacao:

- um banco MySQL 8 descartavel, com nome contendo `homolog`, `staging`, `test`, `teste`, `temp` ou `sandbox`;
- um backend de homologacao apontando somente para esse banco;
- um frontend de homologacao com URL e dominio diferentes dos usados pelo cliente;
- credenciais, `JWT_SECRET` e usuario inicial exclusivos de homologacao.

Nunca copie referencias de variaveis do MySQL de producao para o backend de homologacao. Antes de iniciar qualquer servico, confira host, porta, nome do banco e dominio exibidos no Railway.

## 2. Revisao da configuracao atual

### Backend

O arquivo `backend/railway.json` usa RAILPACK, executa `bash mvnw -DskipTests package`, inicia o JAR com Java 17 e verifica `GET /api/health`. A aplicacao respeita `PORT`, executa Flyway com `validate-on-migrate=true` e deixa o Hibernate apenas validar o schema.

No Railway, configure o Root Directory como `/backend` e o caminho do arquivo de configuracao como `/backend/railway.json`, se o servico usar a raiz do monorepo. Confira o comando efetivo na tela de detalhes de cada deployment.

### Frontend

O Railpack instala as dependencias em sua etapa propria; `demo/railway.json` executa apenas `npm run build` e depois `npm start`. O start usa o servidor estatico `serve`, escuta `0.0.0.0:$PORT` e possui fallback SPA. Nao usa `vite preview`.

Configure o Root Directory como `/demo`, o config path como `/demo/railway.json` e `VITE_API_URL` com a URL HTTPS publica do backend, sem `/api` no final. Essa variavel e incorporada durante o build; alterá-la exige novo build do frontend.

### Observacao sobre Railway

Em 9 de outubro de 2026, a documentacao do Railway informa que Config as Code (`railway.json`) continua funcionando para servicos legados, mas esta descontinuado e tem encerramento anunciado para 1 de dezembro de 2026. A migracao para o mecanismo atual de Infrastructure as Code deve ser planejada separadamente; nao faz parte desta homologacao e os dois arquivos existentes nao foram alterados.

## 3. Variaveis da homologacao

Backend:

```text
DB_URL=jdbc:mysql://HOST_PRIVADO:3306/BANCO_HOMOLOG?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Sao_Paulo
DB_USERNAME=usuario_homolog
DB_PASSWORD=senha_homolog
JWT_SECRET=segredo-exclusivo-com-32-bytes-ou-mais
CORS_ALLOWED_ORIGINS=https://frontend-homolog.example
INITIAL_USER_EMAIL=usuario-homolog@example.com
INITIAL_USER_PASSWORD=senha-inicial-temporaria
```

Frontend, durante o build:

```text
VITE_API_URL=https://backend-homolog.example
VITE_APP_VERSION=homolog-AAAA-MM-DD.N
```

No Railway, monte `DB_URL`, `DB_USERNAME` e `DB_PASSWORD` a partir de referencias do servico MySQL de homologacao. Nao use `MYSQL_URL` diretamente se ela nao estiver no formato JDBC esperado pelo Spring.

Remova `INITIAL_USER_EMAIL` e `INITIAL_USER_PASSWORD` depois de validar o primeiro acesso. Nenhuma senha deve ser salva em arquivo ou terminal compartilhado.

## 4. Inventario e checksums antes da migration

Os scripts exigem MySQL Client 8 no computador do operador. A senha pode ser digitada de forma oculta ou fornecida temporariamente em `SARAIVA_DB_PASSWORD`.

Gerar um manifesto SHA-256 dos arquivos locais:

```powershell
cd backend
.\scripts\migration-file-manifest.ps1
```

O SHA-256 comprova a identidade dos arquivos, mas nao e o checksum do Flyway. O valor na coluna `flyway_schema_history.checksum` e CRC32 calculado pelo Flyway. A validacao autoritativa e `Flyway.validate`, exercitada pela suite Testcontainers e pelo `validate-on-migrate` da aplicacao.

Inspecionar versao, historico, checksums e integridade de um banco explicitamente informado:

```powershell
cd backend
.\scripts\inspect-mysql.ps1 -HostName HOST -Port 3306 -Database saraiva_homolog -User USUARIO
```

Resultados esperados depois da homologacao:

- MySQL `8.0.x`;
- exatamente uma entrada bem-sucedida para cada migration de V3 a V7;
- nenhum checksum divergente no `Flyway.validate`;
- `operacoes_sem_resultado`, orfaos, totais inconsistentes e snapshots incompletos iguais a zero;
- nenhuma chave duplicada.

Nao edite V1, V2 ou qualquer migration que ja tenha sido aplicada. Se um checksum divergir, interrompa a publicacao e descubra qual artefato foi originalmente executado. Nao use `flyway repair` como atalho.

## 5. Backup logico e restauracao isolada

### Backup

O acesso externo ao MySQL de producao, se aprovado para a janela, deve ser habilitado ou tunelado manualmente pelo responsavel. Este repositorio nao abre conexao nem descobre credenciais sozinho.

```powershell
cd backend
.\scripts\backup-mysql.ps1 `
  -HostName HOST_EXPLICITAMENTE_CONFERIDO `
  -Port 3306 `
  -Database BANCO_ORIGEM `
  -User USUARIO_SOMENTE_BACKUP `
  -OutputDirectory C:\backup-seguro\saraiva
```

O dump usa `--single-transaction`, `--quick`, UTF-8, blobs hexadecimais, rotinas, eventos e triggers. Ele gera `.sql`, `.sha256` e metadados sem senha. Como o dump nao usa `--databases`, nao inclui comandos para trocar para o nome do banco de origem.

Armazene o conjunto fora do repositorio, com acesso restrito e criptografia. O diretorio padrao de backups esta ignorado pelo Git. Um dump contendo dados reais continua sendo sensivel mesmo sem senhas.

### Restauracao em banco descartavel

Crie um usuario que tenha acesso apenas ao banco temporario. O script recusa nomes sem um marcador de homologacao e exige confirmacao exata:

```powershell
cd backend
.\scripts\restore-mysql-temp.ps1 `
  -HostName HOST_HOMOLOG `
  -Port 3306 `
  -Database saraiva_homolog_restore `
  -User USUARIO_HOMOLOG `
  -DumpPath C:\backup-seguro\saraiva\arquivo.sql `
  -Confirmation "RESTORE:saraiva_homolog_restore" `
  -CreateDatabase
```

Depois da restauracao e antes de iniciar o backend, execute `inspect-mysql.ps1` para registrar a linha de base. Anote contagens de `produto`, `cliente`, `venda`, `item_venda` e `movimentacao_estoque`.

## 6. Homologacao de V3 a V7

Existem dois ensaios complementares.

### Banco novo descartavel

Com Docker Desktop ou outro runtime Docker ativo:

```powershell
cd backend
.\mvnw.cmd -Pmysql8-integration verify
```

A suite sobe `mysql:8.0.36`, aplica V1 a V7, executa `Flyway.validate` e testa:

- reenvio da mesma venda;
- duas requisicoes simultaneas com a mesma chave;
- duas vendas distintas disputando a ultima unidade;
- reenvio de entrada de estoque;
- cancelamento sem devolucao duplicada;
- preco alterado por outro computador e negociacao manual;
- imutabilidade dos snapshots historicos;
- abertura, vinculacao da venda em dinheiro, estorno e fechamento do caixa.

O banco e destruido pelo Testcontainers ao fim da execucao.

### Copia restaurada

1. Restaure o dump no banco temporario.
2. Registre a linha de base com `inspect-mysql.ps1`.
3. Aponte somente o backend de homologacao para essa copia.
4. Inicie uma unica instancia; o startup aplicara apenas migrations pendentes.
5. Confirme o healthcheck e execute novamente `inspect-mysql.ps1`.
6. Compare as contagens e totais com a linha de base.
7. Execute manualmente vendas, cancelamentos e movimentos usando apenas registros de teste criados na copia.
8. Descarte o banco ao final conforme a politica de dados da empresa.

MySQL executa DDL com commits implicitos. A V3 possui dois `ALTER TABLE`; por isso, uma interrupcao entre eles pode deixar a coluna criada sem o registro completo do Flyway. Esse caso deve ser reproduzido e resolvido apenas na copia. Nao reaplique cegamente nem edite a migration se ela ja existir em qualquer ambiente compartilhado.

## 7. Build e execucao Linux

Backend:

```bash
cd backend
bash ./mvnw --batch-mode test
bash ./mvnw --batch-mode -DskipTests package
java -jar target/saraiva-motos-0.0.1-SNAPSHOT.jar
```

Frontend:

```bash
cd demo
npm ci
npm test
npm run build
PORT=3000 npm start
```

Validar `GET /api/health` no backend e `GET /` no frontend. Em ambiente Railway, confirme nos logs que a URL JDBC aponta para homologacao antes da primeira mensagem do Flyway.

## 8. Checklist da PWA instalada

Execute em Chrome e Edge no Windows, usando o dominio HTTPS de homologacao:

- o manifest mostra `Saraiva Motos`, modo standalone e os icones 192, 512 e maskable;
- o botao de instalacao aparece quando o navegador emite o evento de instalabilidade;
- a instalacao abre em janela propria e permite criar atalho/fixar na barra;
- a versao exibida corresponde a `VITE_APP_VERSION`;
- DevTools confirma que `/api/**`, login, vendas, estoque e clientes usam rede, sem resposta comercial do cache;
- sem rede, o sistema nao promete nem permite concluir operacoes comerciais;
- com uma venda no carrinho, publique somente no ambiente isolado a versao N+1;
- a atualizacao fica aguardando e nao recarrega automaticamente;
- ao confirmar com o carrinho vazio, a nova versao assume controle e aparece apos o reload;
- ao adiar, a venda em andamento permanece utilizavel e nenhuma chave de idempotencia e trocada;
- feche e reabra a PWA e confirme login, historico e versao.

O ensaio N para N+1 depende de dois builds servidos sob o mesmo dominio de homologacao; ele nao pode ser reproduzido apenas com o build estatico local sem um servidor HTTPS/localhost e troca controlada dos artefatos.

## 9. Ordem de publicacao segura

1. Congelar os artefatos aprovados e registrar seus hashes/versoes.
2. Confirmar `flyway_schema_history` e checksums sem executar migration.
3. Criar e verificar backup logico; manter tambem o recurso de backup do Railway se ja estiver disponivel, sem contratar servico nesta etapa.
4. Restaurar o dump em banco isolado e validar integridade.
5. Aplicar V3-V7 somente na copia e executar todos os testes.
6. Homologar backend, frontend, CORS, HTTPS e PWA em URLs isoladas.
7. Definir janela de manutencao e impedir novas vendas durante a mudanca de producao.
8. Repetir a verificacao pre-flight e criar um backup final.
9. Publicar primeiro o backend compativel com schema aditivo; confirmar healthcheck e smoke tests.
10. Publicar o frontend; confirmar versao, login, venda pequena controlada e estoque.
11. Reabrir as operacoes somente depois da reconciliacao.

Nenhum desses passos e executado automaticamente pelos scripts.

## 10. Recuperacao em caso de falha

- Falha antes de qualquer migration: interromper e manter a versao atual.
- Falha durante V3-V7 na copia: preservar logs, descartar a copia e repetir a restauracao; nao reparar manualmente a origem.
- Falha de aplicacao depois de migrations aditivas concluidas: manter o banco, reverter apenas os artefatos da aplicacao se a versao anterior for compativel e preparar correcao progressiva.
- Falha em producao antes da reabertura e sem novas escritas: restaurar o backup seguindo o procedimento aprovado pelo responsavel do banco.
- Falha depois de novas vendas: nao restaurar cegamente, pois isso apagaria operacoes posteriores ao backup. Suspender vendas, preservar banco e logs e reconciliar/avancar com uma migration corretiva.
- Suspeita de duplicidade: consultar chave idempotente, venda e movimentos na mesma transacao logica antes de qualquer ajuste manual.

O criterio de aceite da recuperacao inclui contagens, totais, amostra de snapshots, saldo dos produtos afetados, login e uma operacao idempotente controlada.

## Referencias oficiais

- Railway Config as Code: https://docs.railway.com/config-as-code/reference
- Railway MySQL: https://docs.railway.com/databases/mysql
- MySQL `mysqldump`: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- Flyway validate: https://documentation.red-gate.com/flyway/reference/commands/validate
- Testcontainers MySQL: https://java.testcontainers.org/modules/databases/mysql/
- Testcontainers JUnit 5: https://java.testcontainers.org/test_framework_integration/junit_5/
