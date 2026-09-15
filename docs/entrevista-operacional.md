# Entrevista operacional

Documento vivo. Cada bloco é registrado depois da confirmação de Gilmar Santos.
Processo não confirmado fica marcado como **não definido** e não vira código.

| Bloco | Tema | Situação |
|---|---|---|
| 1 | Estrutura do escritório | Respondido em 15/09/2026 |
| 2 | Entrada de leads | Aguardando |
| 3 | Reunião comercial | Aguardando |
| 4 | Conversão em cliente | Aguardando |
| 5 | Cadastro do cliente | Aguardando |
| 6 | Onboarding | Aguardando |
| 7 | Operação contábil | Aguardando |
| 8 | Tarefas recorrentes | Aguardando |
| 9 | WhatsApp e atendimento | Aguardando |
| 10 | Financeiro | Aguardando |
| 11 | Contábil | Aguardando |
| 12 | Publicação | Aguardando |

## Prioridade declarada para 30 dias

1. Cadastro de clientes
2. CRM
3. Atendimento WhatsApp
4. Criação de tarefas a partir das conversas
5. Tarefas recorrentes e responsáveis
6. Financeiro automático
7. BI básico

Fora desta lista nos 30 dias: conciliação bancária, exportação Alterdata,
publicação em Vercel, Supabase remoto e Evolution API em Oracle Cloud.

## Bloco 1: estrutura do escritório

### Equipe

| Pessoa | Função | Papel no sistema | Departamentos |
|---|---|---|---|
| Gilmar Santos | Sócio, contador responsável, decisões técnicas, comerciais e estratégicas | `socio` | Todos |
| Daniel | Operação contábil, fiscal, pessoal e legalização | `operacao` | Fiscal, Contábil, Pessoal, Paralegal e Legalização |
| Tamires | SDR, administrativo, primeiro atendimento comercial e financeiro operacional | `administrativo` | Comercial, Atendimento, Administrativo, Financeiro |

Sem terceirizados e sem estagiários nesta data.

### Departamentos

Comercial, Atendimento, Administrativo, Financeiro, Fiscal, Contábil, Pessoal
e Legalização.

### Responsáveis

- Gilmar: gestão geral, decisões técnicas, comercial e aprovação final.
- Daniel: operação contábil, fiscal, pessoal e legalização.
- Tamires: SDR, administrativo, atendimento inicial e financeiro operacional.

### Regras identificadas

1. Gilmar dá a palavra final em qualquer divergência.
2. Gilmar e Tamires visualizam honorários, faturamento, contas a receber e inadimplência.
3. Gilmar visualiza todos os leads, propostas e valores negociados.
4. Tamires cadastra e qualifica leads, acompanha propostas e consulta informações comerciais e financeiras necessárias ao atendimento.
5. Daniel acessa informações financeiras e comerciais somente quando necessário para a operação.
6. Somente Gilmar cria, edita e desativa usuários e altera permissões.
7. Gilmar cria, altera e conclui qualquer tarefa.
8. Daniel cria, altera e conclui tarefas da operação.
9. Tamires cria, altera e conclui tarefas comerciais, administrativas, financeiras e de atendimento.
10. Gilmar aprova a entrega final antes do envio ao cliente. Daniel executa e encaminha para revisão quando necessário.
11. Fase 1 é de uso interno. Clientes não terão acesso ao sistema.

### Confronto com o que já está implementado

O motor de domínio em `src/services/domain/engine.ts` já implementa papéis
`socio`, `operacao`, `administrativo` e `leitura` com filtro por departamento.
As regras 1, 2, 3, 4, 6, 7, 8, 9 e 11 são atendidas pelo código atual.

Duas regras não têm correspondência no código:

**Regra 5, acesso por necessidade.** O modelo implementado é binário. Com o
departamento Financeiro a pessoa vê todo o financeiro. Sem o departamento, não
vê nada. Não existe acesso temporário nem acesso sob justificativa. Hoje
`leads` e `propostas` são de leitura compartilhada, então Daniel já lê o
comercial mesmo sem o departamento Comercial, mas não consegue alterar.
Decisão pendente registrada abaixo.

**Regra 10, aprovação da entrega.** `completeTask` exige checklist, dependências
e protocolo quando o modelo pedir, porém não existe etapa de aprovação por uma
segunda pessoa. Hoje Daniel conclui a tarefa sozinho e nada bloqueia o envio ao
cliente. Decisão pendente registrada abaixo.

### Decisões pendentes do Bloco 1

| # | Decisão | Por que trava o código |
|---|---|---|
| 1.A | Como tratar o acesso de Daniel ao financeiro e ao comercial | Define se o sistema mantém o modelo binário por departamento, se cria acesso somente leitura ou se registra liberação temporária auditada |
| 1.B | Quais tarefas exigem aprovação de Gilmar antes do envio | Define se `completeTask` ganha estado "Aguardando aprovação" e em quais modelos de tarefa ele se aplica |
