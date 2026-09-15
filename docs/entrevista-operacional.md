# Entrevista operacional

Documento vivo. Cada bloco é registrado depois da confirmação de Gilmar Santos.
Processo não confirmado fica marcado como **não definido** e não vira código.

| Bloco | Tema | Situação |
|---|---|---|
| 1 | Estrutura do escritório | Respondido em 15/09/2026 |
| 2 | Entrada de leads | Fechado em 15/09/2026 |
| 3 | Reunião comercial | Respondido em 15/09/2026, 5 itens não definidos |
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

## Bloco 2: entrada de leads

### Quem recebe e quem cadastra

- Primeiro contato: Gilmar, Tamires e também Daniel no WhatsApp, quando a
  mensagem vem de cliente já cadastrado.
- Cadastro do lead no sistema: Gilmar e Tamires.
- Daniel precisa conseguir transferir a conversa quando o assunto não for dele.

### Roteiro de qualificação da SDR

Roteiro completo com 20 perguntas, aplicado como conversa e não como
interrogatório. Aprofundar somente quando fizer sentido.

Perguntas mínimas antes de agendar:

1. Empresa e CNPJ
2. Atividade
3. Cidade e estado
4. Regime tributário
5. Faturamento aproximado
6. Já possui contador
7. Principal problema
8. Motivo da busca
9. Quem decide
10. Urgência

Resposta desconhecida é registrada como "não informado" e não bloqueia o
agendamento.

Roteiro completo, usado quando a conversa permitir: nome da empresa, CNPJ,
nome do responsável, telefone e melhor canal, atividade principal, cidade e
estado, empresa em funcionamento, regime tributário, faturamento médio mensal,
funcionários, pró-labore, emissão e tipo de notas, contador atual, honorário
atual, motivo da procura, principal problema, urgência ou pendência, quem
participa da decisão, expectativa de melhoria e melhor período para reunião.

### Critérios para agendar

- Existe necessidade real.
- A pessoa tem relação com a decisão.
- A empresa está dentro do perfil do escritório.
- Existe disponibilidade para avaliar uma solução.
- O problema pode ser tratado pela Futuro Contabilidade Digital.

### Classificação do lead

| Classificação | Definição |
|---|---|
| Qualificado | Dor clara, perfil compatível, decisor envolvido e intenção de avançar |
| Em avaliação | Tem potencial, faltam informações ou falta urgência |
| Não qualificado | Sem necessidade clara, sem perfil, ou busca apenas informação gratuita |
| Perdido | Sem interesse, contratou outro escritório ou não respondeu após a cadência |

Critérios de qualificação: empresa ativa ou em abertura real; necessidade de
contabilidade, organização financeira, planejamento tributário ou
regularização; faturamento compatível com os planos; responsável com poder de
decisão; dor clara; intenção real de resolver; prazo ou urgência; atividade
atendida pelo escritório; aceita reunião de diagnóstico; entende que a
contratação depende de análise e proposta.

Dores reconhecidas: impostos sem orientação, falta de organização financeira,
ausência de relatórios e DRE, problemas de emissão de notas, falta de
acompanhamento do contador atual, pendências fiscais ou trabalhistas,
necessidade de trocar de contador e crescimento sem controle.

**Faturamento mínimo não está definido e não deve ser fixado agora.** O sistema
precisa expor esse valor como parâmetro configurável, a ser definido depois da
análise de custos, planos e capacidade operacional. Faturamento, regime e
atividade ajudam na classificação, mas não decidem sozinhos: empresa menor pode
ser estratégica por aderência, crescimento ou potencial de serviços adicionais.

### Motivos de descarte

Sem empresa ativa nem intenção real de abrir; busca apenas informação gratuita;
não informa dados básicos após tentativa razoável; necessidade que o escritório
não atende; fora do perfil operacional; não é decisor e não consegue envolver
quem decide; comportamento desrespeitoso, fraudulento ou incompatível; procura
apenas o menor preço sem interesse no valor da solução.

Faturamento baixo, isolado, não descarta. Avaliar potencial, atividade,
necessidade e possibilidade de serviços futuros.

### Decisão de agendar

Tamires faz a primeira qualificação e agenda o que estiver dentro do perfil.
Gilmar valida casos fora do padrão, situações estratégicas, clientes de maior
complexidade, descontos especiais e atividades de risco.

### Motivos de cancelamento ou não comparecimento

Não confirmou; esqueceu o horário; surgiu outra prioridade; não era o decisor;
não organizou documentos ou informações; não percebeu urgência; está resolvendo
pendências com o contador atual; receio de trocar de contador; reunião agendada
antes de entender a necessidade; horário inadequado.

O sistema registra o motivo e permite reagendar, gerar follow-up ou encerrar.

### Motivos de perda de venda

Preço acima do esperado; não percebeu urgência; permaneceu com o contador
atual; medo ou insegurança na troca; pendências com o contador atual; mudança
de endereço ou problemas internos; falta de decisão do sócio; proposta enviada
sem acompanhamento suficiente; não percebeu o retorno da solução; prazo de
decisão muito longo; solução maior que a prontidão do cliente; falta de uma
opção inicial mais simples, como diagnóstico ou consultoria.

Toda perda registra motivo principal, objeção, data de possível retomada e
próximo follow-up.

### Confronto com o que já está implementado

`src/pages/CrmPage.tsx` já entrega o funil com as oito etapas do escopo em
kanban, filtro por origem e responsável, formulário de qualificação, propostas
com follow-up, motivo de perda, detecção de oportunidade parada há mais de sete
dias e desempenho por origem.

A lista de origens já existe no código com onze opções: Indicação, Programa de
Indicação, BNI, Networking, WhatsApp, Google Meu Negócio, Instagram, Site,
Tráfego pago, Cliente antigo e Outro. Precisa ser confirmada ou reduzida por
Gilmar.

Lacunas entre o roteiro confirmado e o formulário atual:

| Item confirmado no Bloco 2 | Situação no código |
|---|---|
| Atividade da empresa | Ausente na qualificação |
| Cidade e estado | Ausente na qualificação |
| Motivo da busca | Ausente, existe apenas "Principal dificuldade" |
| Quem decide | Ausente |
| Classificação do lead em quatro níveis | Ausente, existe apenas a etapa do funil |
| Faturamento mínimo configurável | Ausente |
| Motivo de cancelamento ou não comparecimento da reunião | Ausente |
| Lista completa de motivos de perda | Parcial, o código tem 6 dos 12 motivos |
| Transferência de conversa entre pessoas da equipe | Ausente, tratado no Bloco 9 |

### Decisões pendentes do Bloco 2

| # | Decisão | Por que trava o código |
|---|---|---|
| 2.A | Confirmar ou reduzir a lista de origens de lead | Define as opções do campo Origem e os cortes do BI por origem |
| 2.B | Canais oficiais de primeiro contato | Define quais canais o sistema registra e quais entram na caixa de atendimento |
| 2.C | Como o sistema decide a classificação do lead | "Atende à maioria dos critérios" não é implementável. É preciso escolher entre classificação manual, pontuação automática ou um conjunto pequeno de critérios obrigatórios |

### Observações levadas a Gilmar

Dez perguntas obrigatórias antes de agendar é muito para uma SDR cuja meta
única é o agendamento. Recomendação registrada: reduzir o mínimo ao que
realmente decide se a reunião acontece e deixar o restante para o diagnóstico
conduzido por Gilmar.

### Bloco 2: decisões fechadas em 15/09/2026

**2.A. Origens do lead.** Mantidas as onze opções já existentes no código:
Indicação, Programa de Indicação, BNI, Networking, WhatsApp, Google Meu
Negócio, Instagram, Site, Tráfego pago, Cliente antigo e Outro.

**2.B. Canais de atendimento.** WhatsApp, Telefone, Instagram, E-mail, Site,
Indicação e Atendimento manual registrado pela equipe. Somente o WhatsApp é
canal integrado. Os demais são registrados manualmente, mas precisam aparecer
como origem e como canal do lead.

O lead passa a ter dois campos distintos: **origem**, que responde de onde a
pessoa veio, e **canal**, que responde por onde ela falou. Hoje o código tem
apenas origem.

**2.C. Classificação do lead.** Manual, feita por Tamires, com os critérios
exibidos na tela como lembrete. Sem pontuação automática. Valores:
Qualificado, Em avaliação, Não qualificado e Perdido. O sistema mostra os
critérios e nunca decide sozinho.

**Perguntas mínimas antes da reunião, reduzidas de dez para seis:**

1. Qual é a empresa e o CNPJ?
2. Qual é a atividade principal?
3. A empresa está ativa?
4. Qual é o principal problema hoje?
5. A pessoa participa da decisão ou consegue trazer o decisor?
6. Existe urgência ou prazo para resolver?

As demais informações são preenchidas depois pelo CNPJ, durante a reunião ou
no diagnóstico.

## Bloco 3: reunião comercial

### Respondido

- A reunião é conduzida por Gilmar.
- Dados obrigatórios de registro: diagnóstico, dores, riscos, oportunidades,
  regime, faturamento, atividade, situação atual, objeções, proposta, próximo
  passo e follow-up.
- Antes de falar de preço, identificar: principal dor, impacto financeiro ou
  operacional, urgência, situação com o contador atual, risco de continuar como
  está e objetivo do cliente.
- A solução é apresentada pelos planos Essencial, Mentor e Estratégico,
  conforme o perfil do cliente.
- O honorário considera plano, complexidade, faturamento, funcionários,
  pró-labore, quantidade de obrigações, serviços extras e nível de
  acompanhamento.
- A proposta pode ser enviada por PDF, WhatsApp ou e-mail.

### Não definido

| # | Item | Situação |
|---|---|---|
| 3.A | Participação de Daniel ou Tamires na reunião | Não definido |
| 3.B | Quem aprova desconto e qual é o limite | Não definido. Por ora, considerar que Gilmar aprova |
| 3.C | Formato principal de envio da proposta | Não definido. Hoje os três formatos são aceitos |
| 3.D | Cadência de follow-up depois da reunião | Não definido |
| 3.E | Ratificação do roteiro e das perguntas obrigatórias | Ver abaixo |

Nada marcado como não definido pode virar regra no código.

### Confronto com o que já existe no repositório

Gilmar respondeu que o roteiro da reunião ainda precisa ser documentado e que
as perguntas obrigatórias não estão formalizadas. **Existe material formalizado
no repositório que ele aparentemente não considerou.**

`docs/comercial/roteiro-reuniao-vendas-contabilidade.md` tem 377 linhas e
contém:

- Roteiro de reunião em sete etapas com tempo por etapa, somando 46 minutos:
  quebra-gelo e contrato da conversa, situação atual, problema e impacto,
  prioridade e decisão, resumo do diagnóstico, proposta e fechamento.
- Perguntas obrigatórias por etapa, entre cinco e seis em cada uma.
- Quebras para nove objeções, incluindo "está caro", "preciso pensar", "vou
  falar com meu sócio" e "você garante economia tributária?".
- Modelo de mensagem de follow-up.
- Oito indicadores de qualidade da reunião.
- Ficha rápida para o CRM com quatorze campos.

**Limite desse documento, declarado nele mesmo:** foi construído a partir de uma
análise resumida de uma reunião, não de gravação ou transcrição integral. Tom,
sequência e fidelidade das frases não foram confirmados. Portanto é proposta,
não processo confirmado. Por isso o item 3.E é ratificação, não redação.

O motor de preços em `src/services/domain/pricing.ts` já implementa exatamente
os fatores da resposta 7: plano como base, faixa por atividade e regime,
colaboradores, pró-labore, contas financeiras, ponto por colaborador, guias
DIFAL, emissão de notas, contas a pagar, ponto eletrônico, ICMS-ST, monofásico,
nível de integração contábil e fiscal, e serviços extras.

Duas travas já implementadas no motor de preços:

1. Atividade Indústria não tem tabela e o cálculo é recusado. Consta como
   pendência em `docs/pendencias.md`.
2. Serviço extra sem preço exige aprovação explícita do sócio.

**Não existe mecanismo de desconto no motor de preços.** Não há campo de
desconto, percentual máximo nem aprovação de desconto. A única aprovação
existente é para extra com valor zero. Enquanto 3.B estiver não definido, não
há o que implementar.

### Conflitos entre o Bloco 2, o Bloco 3 e o playbook

| Conflito | Playbook diz | Decisão de Gilmar diz |
|---|---|---|
| Classificação do lead | Pontuação de 0 a 12 com faixas automáticas decidindo se marca reunião | Classificação manual por Tamires, sem pontuação automática (2.C) |
| Situação do lead | Seis valores: qualificado, documentos pendentes, nutrição, proposta, ganho, perdido | Quatro valores: Qualificado, Em avaliação, Não qualificado, Perdido (2.C) |
| Critério para marcar reunião | Exige capacidade de investir acima do preço de entrada e disposição de enviar documentos | Seis perguntas mínimas, sem faturamento mínimo definido (2.A a 2.C) |

Prevalece a decisão de Gilmar. A tabela de pontuação do playbook pode virar
lembrete na tela, nunca regra automática.

## Publicação: decisão registrada em 15/09/2026

A Vercel não executa o servidor Node atual com PGlite em disco local. O deploy
existente não é considerado pronto e não deve ser tratado como publicação.

Nos próximos 30 dias a prioridade é o funcionamento local completo de CRM,
clientes, tarefas, financeiro e atendimento WhatsApp. Não publicar versão
quebrada na Vercel.

A decisão de publicação será avaliada depois, entre três caminhos:

1. Supabase Edge Functions com banco Supabase.
2. Servidor persistente no Oracle Cloud.
3. Permanecer local durante o desenvolvimento.

## Limitação de ambiente registrada: ChatSC

O ChatSC deve ser usado como referência funcional do atendimento, sem cópia de
código nem de identidade visual.

**Esta sessão não consegue acessar o ChatSC.** Verificado, não presumido: o
ambiente roda em container Linux com política de rede de lista restrita. Testes
de saída retornaram bloqueio para `api.opencnpj.org` e `www.google.com`, com
acesso liberado apenas ao GitHub. Existe Chromium instalado no container, mas
ele não alcança destinos fora da lista. Além disso, o ChatSC exige login, e
credenciais do usuário não devem ser solicitadas nem usadas por esta sessão.

Enquanto a limitação existir, a referência do ChatSC vem de capturas de tela
enviadas por Gilmar. Os demais blocos seguem sem bloqueio.

**Cinco capturas recebidas em 15/09/2026.** A análise está em
`docs/referencia-chatsc.md` e cobre caixa de entrada, lista de conversas,
conversa aberta, cabeçalho, painel do contato, menu de atendimento, menu de
mensagem e configurações de atendimento.

Não foram observadas por dentro as telas de Departamentos, Demandas, Tags,
Jornadas, Tarefas e Ordens de Serviço. Se forem necessárias, pedir novas
capturas no Bloco 9.
