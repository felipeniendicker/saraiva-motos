# Impressao termica de 80 mm no Windows

O Saraiva Motos mantem duas operacoes independentes: `Salvar PDF` baixa um arquivo e `Imprimir comprovante` usa `window.print()`. O Railway apenas entrega a aplicacao HTTPS; ele nao acessa a impressora conectada ao computador da loja.

## Preparacao obrigatoria

1. Identifique o modelo real da impressora termica e instale o driver oficial do fabricante.
2. Em **Configuracoes > Bluetooth e dispositivos > Impressoras e scanners**, imprima uma pagina de teste.
3. Defina essa impressora como padrao. Nao use uma impressora A4 ou `Microsoft Print to PDF` como padrao.
4. Nas preferencias do driver, crie ou selecione papel de 80 mm, margem minima, escala 100% e corte automatico quando suportado.
5. No Chrome ou Edge, desative cabecalhos e rodapes e confirme a impressao convencional antes de habilitar qualquer modo silencioso.

## Alternativa recomendada: Microsoft Edge gerenciado

Versoes recentes do Edge no Windows oferecem a politica empresarial `SilentPrintingEnabled`. Quando habilitada, a visualizacao e fechada automaticamente e o trabalho segue para a impressora padrao com as configuracoes padrao. A politica e documentada pela Microsoft em:

- https://learn.microsoft.com/pt-br/deployedge/microsoft-edge-browser-policies/SilentPrintingEnabled
- https://learn.microsoft.com/en-us/deployedge/microsoft-edge-configure-kiosk-mode

Antes de ativar na loja, o responsavel tecnico deve:

1. Atualizar o Edge e conferir a compatibilidade da versao instalada em `edge://version`.
2. Aplicar os modelos administrativos oficiais do Edge ou a politica de dispositivo equivalente.
3. Habilitar `SilentPrintingEnabled` apenas no computador dedicado ao caixa.
4. Conferir em `edge://policy` se a politica foi carregada.
5. Testar venda, reimpressao, papel ausente, impressora desligada e troca de bobina.

A impressao silenciosa sempre utiliza o destino padrao. Uma configuracao incorreta pode enviar comprovantes para outra impressora ou para PDF.

## Chrome em modo dedicado

O Chrome pode ser iniciado por um atalho administrativo com parametros de kiosk e kiosk printing, mas esse comportamento deve ser homologado na versao instalada e em um usuario Windows dedicado. Flags de linha de comando nao devem ser tratadas como contrato permanente e nao substituem driver, impressora padrao ou politicas de seguranca.

## Quando usar um agente local

Um agente local de impressao somente deve ser considerado se as politicas do navegador nao atenderem ao equipamento real. Ele exige instalacao e atualizacao no computador, autenticacao da origem HTTPS, restricao da impressora permitida e assinatura/validacao dos trabalhos. Nao deve receber JWT, dados de estoque ou acesso geral ao computador.

## Recuperacao

Se a impressao silenciosa falhar, desabilite a politica/atalho dedicado e use imediatamente o botao convencional **Imprimir comprovante** ou **Salvar PDF**. Nenhuma venda depende da impressora para permanecer registrada.
