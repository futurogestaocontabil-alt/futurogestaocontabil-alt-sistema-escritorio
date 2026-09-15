# Plataforma Futuro Contabilidade Digital

Documento de transferência para reconstrução no Claude Code.

## Fonte do código

O projeto executável completo está em `C:\projetos\codex\sistema escritorio`.
Não é necessário copiar código manualmente: abra essa pasta no Claude Code. A documentação detalhada já está em:

- `docs/regras-de-negocio-e-processos.md`
- `docs/arquitetura/backend.md`
- `docs/estrutura.md`
- `docs/requisitos/escopo-plataforma-futuro.md`
- `docs/requisitos/contabil/especificacao-conciliacao-bancaria.md`

## Stack

React 19, TypeScript, Vite, React Router, Lucide, Node.js/tsx, PGlite/PostgreSQL local, Supabase preparado, Evolution API para WhatsApp e OpenCNPJ para consulta pública.

## Pastas principais

```text
src/App.tsx                         rotas e composição das telas
src/components/AppProvider.tsx     sessão, estado e comandos
src/components/ChatInbox.tsx       atendimento estilo WhatsApp Web
src/components/WhatsAppConnection.tsx QR/status em Configurações
src/components/EntityForm.tsx      formulários
src/components/ResourceTable.tsx   CRUD genérico
src/services/resourceSchema.ts     campos, colunas e defaults
src/services/domain/                regras, seed, recorrências e preços
src/types/domain.ts                 entidades e AppState
src/services/api.ts                 cliente HTTP
server/index.ts                     API, autenticação e Evolution
server/auth.ts                      sessão e autorização
server/database.ts                  PGlite, transações e revisão
supabase/migrations/                tabelas, RLS e funções remotas
supabase/functions/futuro-api/      Edge Function futura
infra/evolution/docker-compose.yml Evolution API local
tests/                              testes de domínio, banco e servidor
```

## Rotas e telas

`/` Dashboard; `/crm` CRM comercial; `/atendimento` caixa de entrada; `/clientes` carteira e cadastro; `/legalizacao` processos; `/tarefas` tarefas e recorrências; `/financeiro` contas a receber/pagar e BI; `/contabil` planos de contas por empresa; `/portfolio` serviços; `/escritorio` equipe, sistemas, metas e cargos; `/documentos` arquivos privados; `/configuracoes` usuários, permissões, POPs e conexão WhatsApp.

## Regras de negócio essenciais

1. Cada cliente possui responsável, regime, plano, honorário, vencimento, financeiro ativo e recorrências.
2. Ao criar cliente ativo com financeiro habilitado, gerar contas a receber mensais sem duplicar competência.
3. Tarefas aplicáveis ao regime tributário vêm recomendadas/marcadas; o usuário pode desmarcar e adicionar exceções.
4. Transferência de responsável move apenas tarefas recorrentes pendentes daquele cliente e modelo.
5. Conclusão de tarefa exige checklist obrigatório, dependências e protocolo/recibo quando exigido.
6. Plano de contas e contas contábeis são isolados por cliente e versão do plano.
7. CNPJ usa OpenCNPJ, preenche dados públicos e nunca salva automaticamente sem revisão.
8. Economia tributária é hipótese até haver documentos e premissas registradas.
9. WhatsApp não faz disparo em massa. Credenciais e QR ficam em Configurações; Atendimento mostra apenas conversas.
10. Arquivos são privados, até 10 MB, fora de `public`; segredos ficam no cofre AES-256-GCM.
11. Sócio administra usuários, integrações, serviços e segredos. Leitura não altera dados.
12. Todo comando usa `expectedVersion` e conflito de revisão retorna HTTP 409.

## Entidades

```ts
clientes, tarefas, processos, leads, propostas, faturas, despesas,
servicos, documentos, licencas, equipe, sistemas, integracoes, metas,
cargos, avaliacoes, conversas, irpf, atividades, configuracoes,
planosContabeis, contasContabeis
```

Base:

```ts
interface Entity { id:string; createdAt:string; updatedAt:string; [key:string]:JsonValue }
type AppState = { [K in CollectionName]: Entity[] } & {
  meta:{version:1; revision:number; organizacaoId:string}
}
```

## API local

```text
GET  /api/session
POST /api/setup
POST /api/login
POST /api/logout
GET  /api/state
POST /api/command
GET/POST /api/users
PATCH /api/users/:id
POST /api/documents
GET  /api/documents/:id
GET/POST /api/vault
POST /api/vault/:id/reveal
GET  /api/cnpj/:cnpj
POST /api/whatsapp/config
GET  /api/whatsapp/status
POST /api/whatsapp/qr
POST /api/whatsapp/send
POST /api/webhooks/evolution[/evento]
```

## Atendimento WhatsApp

O webhook lê `data.key.remoteJid`, `data.message.conversation` e `extendedTextMessage.text`, criando mensagens em `conversas`:

```ts
{id:string, telefone:string, status:string, origem:'WhatsApp',
 mensagens:[{id:string, texto:string, autor:'cliente'|'equipe', criadoEm:string}]}
```

O envio chama no servidor:

```text
POST {baseUrl}/message/sendText/{instanceName}
headers: apikey: {apiKey}
body: { number: telefone, text: mensagem }
```

Nunca colocar `apiKey` no React ou em variável `VITE_`.

## Supabase e segurança

As tabelas remotas são organizações, memberships, states, files, vault e security_events. Todas têm RLS ativo e acesso direto do browser revogado. A Edge Function valida JWT e associação ativa. Variáveis exclusivas do servidor: `SUPABASE_SERVICE_ROLE_KEY`, `FUTURO_VAULT_KEY`, `FUTURO_ALLOWED_ORIGINS`.

## Comandos

```powershell
cd 'C:\projetos\codex\sistema escritorio'
npm install
npm run typecheck
npm test
npm run build
npm start
```

Evolution local:

```powershell
cd 'C:\projetos\codex\sistema escritorio\infra\evolution'
docker compose up -d
```

## Prompt para o Claude Code

```text
Abra C:\projetos\codex\sistema escritorio e reconstrua/continue a Plataforma Futuro Contabilidade Digital. Preserve React + Vite + TypeScript, AppState tipado, PGlite local, API Node, autorização por papel/departamento, auditoria, revisão concorrente e cofre cifrado. Leia primeiro docs/regras-de-negocio-e-processos.md, docs/arquitetura/backend.md e docs/requisitos. Valide typecheck, testes e build antes de mudar código. O WhatsApp usa Evolution API somente no backend; configuração e QR ficam em Configurações, e Atendimento tem layout de caixa estilo WhatsApp Web sem disparo em massa. O CNPJ usa OpenCNPJ com revisão manual. Clientes, financeiro, recorrências, tarefas e planos de contas são isolados por empresa. Não invente dados fiscais, clientes ou credenciais.
```

## Limites atuais

Conciliação OFX/CSV/XLSX e exportação final Alterdata estão especificadas, mas precisam de implementação completa. Supabase está preparado, mas não deve ser tratado como publicado até aplicar migração e testar runtime remoto. Evolution precisa de serviço persistente separado quando houver publicação web.

Antes de publicar ou subir documentação, preservar a estrutura em `C:\projetos\codex\sistema escritorio` e não enviar `.local-data`, `.env`, `vault.key` ou documentos reais.
