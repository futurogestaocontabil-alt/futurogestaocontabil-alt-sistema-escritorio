# Estado da implementação, 15/09/2026

Resultado da execução do processo definido em
`docs/processo-comercial-ao-onboarding.md`.

Validação em todo commit: `npm run typecheck` sem erros, `npm test` com
**102 de 102 aprovados** e `npm run build` com sucesso.

## Entregue e coberto por teste

| Item | Onde |
|---|---|
| Atendimento como ocorrência dentro da conversa | `openService`, `transferService`, `closeService` |
| Demanda obrigatória e motivo no encerramento | `closeService`, 14 demandas |
| Transferência por pessoa e por departamento, com rastro | `transferService` |
| Seis filas com contador e visão só das minhas conversas | `src/components/ChatInbox.tsx` |
| Autor da mensagem pelo `fromMe` | `server/index.ts` |
| Deduplicação por `data.key.id` | `server/index.ts` |
| Origem: Enviada pelo sistema, Dispositivo externo, Recebida | `server/index.ts` |
| Mensagem de grupo não vira conversa de cliente | `server/index.ts` |
| Criar tarefa a partir de mensagem, com evidência | `messageToTask` |
| Aprovação da entrega antes do envio, decisão 1.B | `completeTask`, `approveTask` |
| Campos do lead do Bloco 2, canal separado da origem | `CrmPage`, `catalogos.ts` |
| Classificação manual em quatro níveis, sem pontuação | `CrmPage` |
| Motivo de cancelamento da reunião e 12 motivos de perda | `CrmPage`, `catalogos.ts` |
| Tabela de honorários conferida contra o motor | `tests/pricing.test.ts`, 57 faixas |
| Categoria em cada linha do detalhamento | `pricing.ts` |
| Simulação salva com versão da regra e extra congelado | `saveSimulation` |
| Assistente de simulação em seis etapas | `src/components/SimulationWizard.tsx` |
| Contrato só de proposta aceita, modelo versionado | `generateContract` |
| Bloqueio por dado obrigatório, completando pelo lead | `generateContract` |
| Vencimento 30, 5 ou 10 com último dia válido | `dueDateFor` |
| Assinatura fora da Autentique exige justificativa | validação de `contratos` |
| Envio, assinatura e recusa com eventos registrados | `sendContract`, `registerSignature` |
| Ativação só com contrato assinado e aprovação do sócio | `activateClient` |
| Cliente, financeiro, onboarding interno e externo na ativação | `activateClient` |
| Onboarding interno por sistema, com código e evidência | `completeOnboardingStep` |
| Senha nunca gravada no onboarding | validação de `onboardings` |
| Ata obrigatória e dependência do interno no externo | `completeOnboardingStep` |
| Mister Contador apenas como registro de cadastro feito | `activateClient`, `OnboardingPage` |
| Token nos webhooks da Evolution e da Autentique | `conferirTokenWebhook` |
| Token e webhook da Autentique no cofre cifrado | `server/index.ts` |
| Vercel deixa de publicar a cada commit | `vercel.json` |

## Entregue sem validação de ponta a ponta

**Chamada à API da Autentique.** A configuração, o cofre, o webhook com token,
o mapeamento de eventos para as situações do contrato e o teste de conexão
estão escritos. O formato exato das respostas da Autentique não foi conferido
com credenciais reais, porque esta sessão não tem acesso à internet além do
GitHub. A função devolve ok e detalhe em vez de afirmar sucesso, de propósito.

Antes de usar em produção: cadastrar o token real, usar Testar conexão em
Configurações e conferir o retorno.

O envio do documento em si continua manual. O sistema registra o identificador
que a Autentique devolve, e o webhook cuida do resto.

## Não implementado, por depender de decisão

| # | Item | Por quê |
|---|---|---|
| 3.B | Desconto | Sem percentual máximo e sem regra, não há o que escrever. Hoje só existe a aprovação de serviço sem preço |
| 5.A | Mês de início da cobrança | O padrão implementado é o mês seguinte à assinatura, e a ativação aceita `mesDaAssinatura` para sobrepor. Falta a decisão para virar padrão |
| 5.B | Pró-rata | O campo existe no cliente, o cálculo depende da regra |
| 6.A | Limite de ticket alto | Marcado manualmente na ativação. Nenhum valor foi fixado no código |
| 1.A | Acesso comercial amplo de Daniel | Enquanto não houver decisão, Daniel fica sem o departamento Financeiro |
| 3.A, 3.C, 3.D | Participação na reunião, formato da proposta, cadência de follow-up | Registrados como não definidos |

Nenhum deles foi transformado em regra automática.

## Fora do que foi pedido, ainda em aberto

Tabela de honorários da atividade Indústria. O motor bloqueia a simulação e
explica o motivo. Enquanto a tabela não for cadastrada, o escritório não
consegue simular para indústria pelo sistema.

## Riscos que continuam

**Organização fixa no webhook.** O webhook grava sempre em `LOCAL_ORG_ID`. Sem
impacto com um único escritório e um único número. Vira defeito no dia em que
houver mais de uma organização ou mais de uma instância.

**Publicação.** A Vercel não executa o servidor Node com PGlite em disco. A
escolha entre Supabase Edge Functions, servidor no Oracle Cloud e permanecer
local continua em aberto, conforme registrado.

**Sem integração automática com Alterdata, NF Estoque, eContador e Veri.** O
onboarding interno é checklist com evidência e código da empresa. Alguém
continua digitando em cada sistema. Integrar de verdade depende de cada um
deles ter API e é outro projeto.
