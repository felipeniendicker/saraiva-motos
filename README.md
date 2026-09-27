# Saraiva Motos

Sistema de gestão da Saraiva Motos. O frontend permanece em `demo/` e o backend Java está em `backend/`.

## Frontend

Requisitos: Node.js e npm.

```powershell
cd demo
npm install
npm run dev
```

O Vite inicia normalmente em `http://localhost:5173`. Para validar o frontend:

```powershell
npm test -- --run
npm run build
```

Nesta etapa, o frontend continua usando `localStorage`; ainda não há integração com a API.

## Backend

O backend usa Java 17, Spring Boot, Maven, Spring Web, Spring Data JPA, Bean Validation, MySQL e Flyway.

### Requisitos

- Java 17
- Maven 3.6.3 ou superior
- MySQL 8

Crie o banco e um usuário local no MySQL. Exemplo:

```sql
CREATE DATABASE saraiva_motos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'saraiva'@'localhost' IDENTIFIED BY 'defina-uma-senha-local';
GRANT ALL PRIVILEGES ON saraiva_motos.* TO 'saraiva'@'localhost';
FLUSH PRIVILEGES;
```

Configure as credenciais no terminal, sem gravá-las no repositório:

```powershell
$env:DB_URL = "jdbc:mysql://localhost:3306/saraiva_motos?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Sao_Paulo"
$env:DB_USERNAME = "saraiva"
$env:DB_PASSWORD = "sua-senha-local"
$env:CORS_ALLOWED_ORIGINS = "http://localhost:5173"
```

Execute o backend:

```powershell
cd backend
mvn spring-boot:run
```

Ao iniciar a aplicação, o Flyway aplica automaticamente as migrações em `src/main/resources/db/migration`. O Hibernate está configurado apenas para validar o schema (`ddl-auto=validate`), portanto não cria nem altera tabelas.

Valide o endpoint:

```powershell
Invoke-RestMethod http://localhost:8080/api/health
```

Resposta esperada:

```json
{"status":"UP","application":"Saraiva Motos"}
```

Para executar testes e gerar o pacote:

```powershell
mvn test
mvn package
```

Os testes automatizados não dependem de uma instância externa do MySQL. A validação real das migrações ocorre na inicialização contra o MySQL configurado.

### Decisões da estrutura inicial

- Identificadores usam `BIGINT AUTO_INCREMENT`, oferecendo uma faixa ampla e mantendo o modelo simples para esta fase.
- Valores monetários usam `DECIMAL(15,2)`, evitando imprecisão de ponto flutuante.
- Datas são persistidas em `DATETIME(6)` e a aplicação usa o fuso `America/Sao_Paulo`.
- O CORS aceita somente origens configuradas em `CORS_ALLOWED_ORIGINS`; o padrão local é `http://localhost:5173`.
- Credenciais são fornecidas por variáveis de ambiente e não são versionadas.

Não foi incluído Docker Compose porque o ambiente desta etapa não possui Docker disponível. A configuração acima permite executar e validar com uma instalação local do MySQL.
