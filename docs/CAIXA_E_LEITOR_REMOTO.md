# Caixa e leitor remoto

## Controle de caixa

O Dashboard permite abrir um unico caixa global, registrar entradas e saidas avulsas, acompanhar vendas por forma de pagamento e fechar informando o valor contado.

- Toda nova venda autenticada exige caixa aberto e recebe `venda.caixa_id`.
- Somente `DINHEIRO` cria entrada no saldo fisico. PIX, debito, credito e outros aparecem nos totais comerciais.
- Cancelamento em dinheiro exige caixa aberto e cria uma devolucao no caixa atualmente aberto.
- Vendas antigas permanecem com `caixa_id = NULL` e continuam consultaveis.
- A abertura unica e protegida no MySQL por indice exclusivo sobre coluna gerada.
- Movimentos de venda/cancelamento possuem unicidade por venda e tipo.
- Movimentos avulsos exigem `Idempotency-Key` UUID e guardam hash do conteudo.
- Fechamento usa bloqueio pessimista, recusa caixa ja fechado e operacoes idempotentes incompletas.
- Totais e saldo do fechamento ficam armazenados como snapshot. Cancelamentos posteriores nao reescrevem o fechamento antigo.

Antes de atualizar o frontend de producao, abra um caixa com o operador responsavel. Durante a troca, mantenha uma janela sem vendas: o backend novo recusa venda sem caixa aberto.

## Leitor remoto

O computador autenticado cria uma sessao valida por cinco minutos. O backend gera um token aleatorio de 256 bits, armazena apenas SHA-256 e devolve um QR Code PNG embutido.

O QR aponta para:

```text
https://FRONTEND/#/leitor/TOKEN_TEMPORARIO
```

O token nao e JWT. A tela do celular nao recebe dados de produto, cliente, preco, estoque ou carrinho. Ela pode somente consultar se o pareamento esta ativo e enviar EAN-8, UPC-A ou EAN-13 com digito verificador valido.

O computador consulta leituras pendentes a cada 750 ms. As sessoes e leituras ficam no MySQL, portanto requisicoes podem cair em instancias Railway diferentes. `eventoId` e indice exclusivo evitam duplicacao; o consumo usa `FOR UPDATE`.

A camera usa `BarcodeDetector` quando o navegador oferece suporte. HTTPS e obrigatorio fora de `localhost`. Se o recurso nao existir ou a permissao for negada, permanece disponivel a digitacao manual. O leitor USB original continua funcionando.

Configure no backend:

```text
FRONTEND_PUBLIC_URL=https://url-publica-exata-do-frontend
CORS_ALLOWED_ORIGINS=https://url-publica-exata-do-frontend
```

## Homologacao manual

1. Aplicar V6 e V7 somente em copia MySQL 8 restaurada.
2. Confirmar que vendas antigas possuem `caixa_id` nulo e continuam em historico/PDF.
3. Abrir caixa com valor inicial conhecido.
4. Fazer uma venda em dinheiro e outra por PIX; apenas a primeira aumenta o saldo fisico.
5. Cancelar a venda em dinheiro e confirmar uma unica devolucao.
6. Registrar entrada e saida avulsas, inclusive reenvio da mesma chave.
7. Fechar, conferir diferenca e tentar fechar novamente; a segunda tentativa deve ser recusada.
8. Gerar QR, abrir no Chrome/Edge Android sob HTTPS e testar EAN-8, UPC-A e EAN-13.
9. Repetir a mesma leitura rapidamente; apenas um item deve ser processado por evento.
10. Esperar cinco minutos e confirmar a expiracao.
11. Testar com duas instancias do backend compartilhando o mesmo MySQL.

Nao executar V6/V7 diretamente em producao sem backup, restauracao ensaiada e janela operacional aprovada.
