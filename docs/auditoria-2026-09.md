# Auditoria do projeto, setembro de 2026

Executada sobre o commit `bbc2664` do repositório
`futurogestaocontabil-alt/futurogestaocontabil-alt-sistema-escritorio`.

## Validações executadas

| Comando | Resultado antes | Resultado depois |
|---|---|---|
| `npm run typecheck` | Sem erros | Sem erros |
| `npm test` | 43 de 44 aprovados, 1 falha | 45 de 45 aprovados |
| `npm run build` | Sucesso, 488 kB de JS | Sucesso, 488 kB de JS |

## Situação real do código

O sistema não precisa de reconstrução. As doze rotas do escopo existem em
`src/App.tsx`, o servidor Node em `server/index.ts` responde a todas as rotas
da API documentada, a persistência PGlite com revisão concorrente funciona e a
migração Supabase com RLS está escrita e testada em banco isolado.

O que está entregue e validado: autenticação com sessão HttpOnly e scrypt,
autorização por papel e departamento, cofre AES-256-GCM, documentos privados,
consulta CNPJ via OpenCNPJ, webhook e envio pela Evolution API, motor de
recorrências, motor de preços, planos de contas isolados por empresa e
revisão concorrente com HTTP 409.

O que está especificado e não implementado: conciliação bancária OFX, CSV e
XLSX, exportação para o Alterdata, publicação no Supabase remoto, publicação
na Vercel e Evolution API em servidor persistente.

## Defeitos encontrados e corrigidos

### 1. Teste do WhatsApp apontava para o provedor antigo

`tests/server.test.ts` ainda validava o contrato da Z-API, com os campos
`instanceId`, `instanceToken` e `clientToken` e o segredo gravado sob o nome
`Z-API WhatsApp`. O servidor já havia migrado para a Evolution API, com
`provider`, `baseUrl`, `instanceName` e `apiKey`. O teste falhava desde a
migração e nenhum teste cobria o webhook nem o envio de mensagem.

Correção: o teste foi reescrito para o contrato da Evolution API e foram
acrescentadas verificações de recebimento pelo webhook, de envio de mensagem
e de que a chave da API nunca aparece na resposta da API nem nos metadados do
cofre.

### 2. Telefone normalizado de três formas diferentes

O webhook gravava o telefone a partir de `remoteJid`, com código do país, por
exemplo `5562999990000`. O envio em `/api/whatsapp/send` apenas removia os
caracteres não numéricos, produzindo `62999990000` para o mesmo contato.

Consequências no atendimento:

1. A Evolution API recebia o número sem o código do país no envio.
2. A busca pela conversa existente não encontrava a conversa criada pelo
   webhook, então cada resposta da equipe abria uma conversa duplicada em vez
   de continuar o histórico do cliente.

Correção: a função `normalizePhone` em `server/index.ts` passou a ser a única
origem do telefone. Ela remove o sufixo do JID, remove o identificador de
dispositivo, mantém apenas dígitos e acrescenta o código 55 quando o número
tem 10 ou 11 dígitos. Webhook, envio e releitura do arquivo de eventos usam a
mesma função.

### 3. Log de depuração em rota de produção

`GET /api/state` escrevia `[state] conversas=N` no console a cada leitura.
Não vazava segredo, mas era ruído de depuração deixado na rota mais chamada
do sistema. Removido.

## Riscos abertos, por ordem de gravidade

### Alto: webhook da Evolution sem autenticação

`POST /api/webhooks/evolution` está corretamente excluído da verificação de
origem, porém não exige nenhum token, assinatura ou segredo compartilhado.
Qualquer requisição que alcance a porta cria conversas e mensagens em nome de
um cliente.

Hoje o servidor escuta apenas em `127.0.0.1` e o risco fica contido. No
momento em que a Evolution API subir no Oracle Cloud e o webhook precisar de
um endereço HTTPS público, isso vira uma rota de escrita aberta na internet.

Correção necessária antes da publicação: token compartilhado no cabeçalho,
conferido em tempo constante, com o segredo guardado no cofre e configurado
também no lado da Evolution.

### Alto: organização fixa no webhook

O webhook grava sempre em `LOCAL_ORG_ID`. A estrutura multiorganização do
Supabase existe, mas o webhook não sabe distinguir instâncias. Enquanto o uso
for de um único escritório não há impacto. Vira defeito no dia em que houver
mais de uma organização ou mais de um número conectado.

### Médio: mensagens de grupo tratadas como cliente

O webhook aceita qualquer `remoteJid`, inclusive `@g.us`, que identifica
grupo. Um grupo vira uma conversa com um telefone inexistente na caixa de
entrada. Depende de decisão de negócio no Bloco 9.

### Médio: divergência entre documentação e implementação

`AGENTS.md` determina Tailwind CSS e shadcn/ui. A interface usa CSS próprio em
`src/styles.css` e `src/components/ChatInbox.css`. As dependências do Tailwind
estão instaladas e praticamente não são usadas. Ou a documentação é corrigida,
ou a interface migra. Manter a divergência gera retrabalho a cada tela nova.

### Médio: caminho local do Windows em toda a documentação

`AGENTS.md`, `CLAUDE_CODE_RECONSTRUCAO.md` e `docs/estrutura.md` tratam
`C:\projetos\codex\sistema escritorio` como fonte oficial. A fonte oficial
agora é este repositório. Enquanto os dois textos existirem, qualquer pessoa
ou agente que ler a documentação vai procurar o código no lugar errado.

### Baixo: densidade do código

Boa parte do servidor e do motor de domínio está escrita com várias instruções
por linha, sem espaçamento. O código funciona e é testado, mas cada revisão
custa mais tempo e cada diff fica ilegível. Não justifica reformatação em
massa agora, justifica formatar o arquivo que for tocado.
