# PROMPT - PLATAFORMA FUTURO

> Documento único e consolidado. Substitui todas as versões anteriores.

---

## 0. O QUE CONSTRUIR

Construa a **Plataforma Futuro**, sistema operacional único da Futuro Contabilidade Digital, escritório contábil em Goiânia/GO. Substitui integralmente Notion, Trello, ChatSC e 4C Foresee. Migração única, sem sincronização contínua.

**Stack:** React + Vite + TypeScript + Tailwind · Supabase (Postgres, Auth, Storage, Edge Functions, RLS) · deploy Vercel.

**Cores:** petróleo `#043F4E` primária · dourado `#D5B34B` acento · creme `#F7F2E8` fundo · cinza `#525B61` texto · vermelho `#A43B3B` risco.

**Regras de interface:** português do Brasil com acentuação correta · nunca usar travessão · a Tamires (administrativo, zero conhecimento técnico) precisa operar sozinha · toda tela carrega com dados reais, nunca vazia esperando filtro.

**Convenções de código:** TypeScript estrito sem `any` sem justificativa · componentes com função nomeada e export default em PascalCase · hooks com prefixo `use` em `src/hooks/` · Supabase isolado em `src/services/` · entidades de negócio em português, variáveis e arquivos em inglês camelCase · nenhuma lógica de negócio dentro de componente.

```
src/
├── components/
├── pages/
├── hooks/
├── services/
├── types/
├── utils/
└── lib/
```

---

## 1. CONTEXTO E NÚMEROS DE PARTIDA

**Equipe:** Gilmar Santos (sócio, CRC GO-028974/O, vende e executa) · Daniel Branquinho (operações, executa a maior parte) · Tamires (SDR e administrativo, sem base técnica).

**Meta:** 100 ou mais clientes ativos até 31/12/2026.

**Base medida em setembro de 2026:** 50 clientes ativos · R$ 22.632 de receita recorrente · ticket médio R$ 526 · menor honorário R$ 100, maior R$ 2.800 · 7 clientes ativos sem honorário cadastrado.

**Planos, nomes fixos:** Essencial · Mentor · Estratégico.

**Departamentos:** Fiscal · Pessoal · Contábil · Paralegal e Legalização · Financeiro.

### Os problemas que o sistema existe para resolver

| Problema medido | Número atual |
|---|---|
| Tarefas entregues fora do prazo | 127 de 139 (91%) |
| Mensagens de WhatsApp não lidas | 519 |
| Contatos não qualificados | 490 de 551 (89%) |
| Simulações comerciais travadas na etapa Planos | 82 de 82 |
| Propostas geradas e nunca enviadas | 34 de 34 |
| Licenças sem data de vencimento | 31 de 32 |
| Serviços extras sem preço | 172 |
| Clientes ativos sem honorário | 7 de 50 |
| Base de obrigações acessórias | não existe |
| Fechamento mensal em sistema | não existe |

---

## 2. NAVEGAÇÃO

```
▣  Dashboard
◈  CRM
☎  Atendimento
▤  Clientes
⚖  Legalização
⊞  Tarefas
$  Financeiro
◆  Portfólio de Serviços
■  Escritório
▦  Documentos
⚙  Configurações
```

---

## 3. DASHBOARD

**Linha 1, quatro contadores:** Clientes ativos · Tarefas pendentes · Documentos recebidos nos últimos 30 dias · Relatórios fechados na competência, lendo das tarefas de Fechamento Contábil concluídas sobre o total de clientes ativos. Todos clicáveis para a tela filtrada.

**Linha 2, dois painéis:**
- **Tarefas urgentes:** prazo vencido ou vencendo em 24h, ordenadas por atraso, com cliente, tipo, responsável e dias de atraso em vermelho. Botão de reatribuir na linha.
- **Atividades recentes:** feed das últimas 48h. Passo concluído, tarefa finalizada, documento recebido, proposta enviada, cliente novo.

**Linha 3, alertas de vencimento:** certificados, alvarás e licenças vencendo em 90 dias, com semáforo. Verde acima de 60 dias, amarelo de 30 a 60, vermelho abaixo de 30.

---

## 4. CRM

### 4.1 Kanban

```
Lead → Qualificação → Reunião agendada → Diagnóstico →
Proposta enviada → Negociação → Fechado ganho / Fechado perdido
```

Cartão mostra nome, empresa, telefone, origem, valor estimado, responsável e dias parado. Parado mais de 7 dias fica com borda vermelha.

**Origem obrigatória:** Indicação · Programa de Indicação · BNI · Google Meu Negócio · Instagram · Site · Outro.

### 4.2 Atendimento integrado

A conversa de WhatsApp do lead fica embutida no cartão. Escrever no cartão envia mensagem. Sem troca de tela.

Botão **Criar follow-up** com data, hora e responsável. Ao vencer, entra nas tarefas urgentes.

Histórico registra mensagens, mudanças de coluna e follow-ups.

### 4.3 Biblioteca de scripts

Painel lateral com botão de copiar em cada bloco. Conteúdo editável em Configurações.

**a) Perguntas essenciais antes da reunião**, como checklist de qualificação:
CNPJ e regime atual · faturamento médio dos últimos 12 meses · quantos sócios e se há pró-labore · quantos funcionários registrados · emite nota, quantas por mês, produto ou serviço · tem certificado digital válido · quem faz a contabilidade hoje e quanto paga · qual a dor principal · tem débitos ou parcelamentos · alvarás e licenças em dia · expectativa de prazo para trocar

**b) Etapas do atendimento antes da reunião:**
1. Responder o primeiro contato em até 15 minutos
2. Fazer as perguntas essenciais pelo WhatsApp
3. Registrar as respostas no cartão
4. Classificar o lead por tier conforme o faturamento
5. Agendar a reunião de diagnóstico com data e hora confirmadas
6. Enviar confirmação com link e pauta
7. Rodar a simulação de preço antes da reunião

**c) Quebra de objeções**, cada uma com resposta editável:
"Está caro" · "Meu contador atual cobra menos" · "Vou pensar e te retorno" · "Preciso falar com meu sócio" · "Estou sem tempo agora" · "Já tenho contador há muitos anos" · "Não vejo diferença entre contabilidades" · "E se eu não gostar, tem multa para sair"

**d) Modelos de mensagem:** primeiro contato · follow-up 1 · follow-up 2 · follow-up final · agradecimento por proposta negada.

### 4.4 Simulação de preço

```
Preço = base do plano + faixa de faturamento + critérios adicionais + extras
```

**Base:** Essencial R$ 0,00 · Mentor R$ 100,00 · Estratégico R$ 560,00. A faixa é atribuída ao Essencial; os outros somam a base por cima.

**Faixas mensais, Serviços:**
- *Simples Nacional:* 6.750 = 199 | 15.000 = 297 | 25.000 = 397 | 50.000 = 547 | 100.000 = 747 | 200.000 = 1.147 | 400.000 = 1.299
- *Lucro Presumido:* 15.000 = 327 | 25.000 = 457 | 50.000 = 597 | 100.000 = 857 | 200.000 = 1.297 | 300.000 = 1.997 | 500.000 = 2.297 | 800.000 = 4.115 | 1.500.000 = 5.225 | 2.500.000 = 7.844
- *Lucro Real:* 100.000 = 815 | 300.000 = 1.816 | 500.000 = 2.899 | 800.000 = 4.289 | 1.500.000 = 6.499 | 2.500.000 = 7.891
- *Imunes ou Isentas:* 100.000 = 892 | 300.000 = 1.931 | 500.000 = 4.009 | 800.000 = 4.752 | 1.500.000 = 5.739 | 2.500.000 = 7.721

**Faixas mensais, Comércio:**
- *Simples Nacional:* 6.750 = 299 | 20.000 = 397 | 50.000 = 497 | 100.000 = 828 | 200.000 = 1.313 | 300.000 = 1.618 | 400.000 = 2.350
- *Lucro Presumido:* 20.000 = 497 | 50.000 = 597 | 100.000 = 1.006 | 300.000 = 2.484 | 400.000 = 3.306 | 500.000 = 4.899 | 800.000 = 6.262 | 1.500.000 = 7.935
- *Lucro Real:* 100.000 = 1.047 | 300.000 = 2.588 | 500.000 = 2.999 | 600.000 = 3.590 | 800.000 = 4.416 | 1.500.000 = 5.201 | 2.500.000 = 8.100
- *Imunes ou Isentas:* 100.000 = 1.337 | 300.000 = 2.436 | 500.000 = 4.811 | 800.000 = 5.702 | 1.500.000 = 6.755 | 2.500.000 = 9.265

**Indústria:** mesma estrutura, tabela a exportar da parametrização do 4C.

**Critérios adicionais:**

*Fator × resposta numérica:* colaboradores 1a3=50 | 4a6=40 | 7a15=35 | 16a30=32 | 31+=30 · pró-labore 1a3=30 · contas financeiras 1a3=10 | 4+=8 · ponto eletrônico por colaborador 1a10=5 | 11+=3,50 · guia DIFAL ICMS 1a10=25 | 11a20=20 | 21+=17 · emissão de notas 1+=10 · contas a pagar 1+=5

*Sim ou não:* ponto eletrônico sim=100 · ICMS-ST interestadual sim=100 · PIS/COFINS monofásico sim=100 · terá ponto integrado não=50

*Múltipla escolha:* integração contábil alto=0 médio=90 baixo=150 · integração fiscal alto=0 médio=90 baixo=150

**Personas:** Comércio em Geral · Prestador de Serviço em Geral · Engenheiro PJ · Clínica de Estética · Clínicas em Geral.

### 4.5 Gerar proposta

Documento com identidade visual: dados do cliente, plano, entregáveis, valor mensal, extras, condição de pagamento, validade e responsável.

**Entregáveis por plano:**

*Essencial:* armazenamento de XML · gestão de documentos em nuvem · acesso via app, plataforma ou e-mail · suporte por e-mail em até 48h · treinamento de emissão de nota · reunião de onboarding · contabilidade completa fiscal, DP e contábil.

*Mentor:* tudo do Essencial, trocando o suporte por e-mail por suporte tributário por WhatsApp prioritário, e somando relatórios gerenciais · distribuição de lucro com compliance tributário · programa de indicação · análise tributária com Fator R · monitoramento fiscal e CNDs na Veri · planejamento tributário · treinamento de gestão financeira · sistema de gestão financeira · grupo exclusivo no WhatsApp.

*Estratégico:* tudo do Mentor, somando reunião mensal de resultados de 1 hora · análise de precificação · suporte por telefone · treinamento de processos · planejamento financeiro · escritório virtual incluso.

**Regra:** proposta gerada e não enviada em 48h dispara alerta e entra nas tarefas urgentes.

### 4.6 Gerar contrato

Habilitado quando a proposta é aceita. Mescla os dados do cliente sem redigitação: razão social, CNPJ, endereço, sócio administrador, CPF, plano, valor por extenso e numeral, composição do valor, dia de vencimento, data de início, prazo, foro.

Modelos a migrar: Contrato de Prestação de Serviços Profissionais Contábeis e Contrato de Consultoria e Assessoria Financeira.

Composição real praticada: *"Mensalidade R$ 317,00/mês, dividida em R$ 20,00 de sistema de emissão de notas fiscais e R$ 297,00 de plano básico, incluindo obrigações fiscais e acessórias mensais e assessoria via WhatsApp. Vencimento todo dia 30."*

Saída em PDF com capa, identidade visual e cláusulas numeradas. Envio para assinatura digital direto do sistema.

### 4.7 Ao fechar

Fechado ganho dispara: criação do cliente · abertura do processo de Onboarding com etapas travadas · **geração das tarefas recorrentes conforme a regra da seção 7.4** · criação da pasta no Drive · cadastro no sistema de cobrança.

---

## 5. ATENDIMENTO

Caixa de entrada de WhatsApp via **Z-API**. Abas Fila, Em atendimento e Finalizados, com contadores.

Conversa mostra o cliente vinculado ou marca como não identificado, com botão para vincular.

Métricas por conversa: tempo de primeira resposta e tempo de resolução.

**Botão "Virar tarefa" em toda mensagem.** Abre formulário já preenchido com cliente, texto e anexos, exigindo tipo de demanda, responsável e prazo. Máximo três cliques.

---

## 6. CLIENTES

### 6.1 Aba Clientes Geral, os KPIs

Painel reproduzindo os três BIs que já existem no Notion.

**Visão geral:** total de clientes · honorários total, receita recorrente · ticket médio · distribuição de honorários por faixa.

**Por regime e enquadramento:** clientes por enquadramento · honorário médio por enquadramento · clientes por Anexo do Simples (rosca) · clientes por regime tributário (rosca).

**Por nicho e grupo:** clientes por nicho · honorários por nicho, soma · honorário médio por nicho · clientes por grupo · entradas por grupo.

**Geográfico:** clientes por estado · clientes por cidade, em barras e em quadro agrupado.

**Porte e faturamento:** empresas por faixa de faturamento · clientes por porte.

**Entradas e vendas:** entradas por mês nos últimos 12 meses · honorários dos clientes que entraram, soma por mês · ticket médio dos novos · clientes por origem, com percentual sem origem preenchida.

**Onboarding, janela de 90 dias:** clientes em integração · risco alto · engajamento alto · prontos para upsell (quatro números) · clientes por Status de Integração, Fase da Integração, Engajamento e Risco (quatro roscas) · listas clicáveis de Onboarding Ativo, Clientes em Risco, Clientes Travados e Oportunidades de Venda.

**Operação:** tarefas por departamento · percentual de entrega no prazo por departamento.

Todo gráfico filtrável por período, regime, estado, nicho, grupo e responsável, e clicável para a lista correspondente.

### 6.2 Lista

Tabela com filtros salvos. Colunas: empresa, CNPJ, contatos, segmento, porte, honorário, data de entrada, regime, plano, tags, origem, status. Visões em quadro agrupado por enquadramento, por estado e por cidade, e linha do tempo por data de entrada.

Listas separadas para **Clientes ativos**, **Clientes que saíram** e **Clientes Carnê Leão**.

### 6.3 Ficha do cliente

**Dados** · razão social, nome fantasia, CNPJ, inscrição estadual, inscrição municipal, código no sistema, atividade principal e CNAEs, regime tributário, anexo do Simples, enquadramento, porte, grupo, nicho, endereço, cidade, UF, data de abertura, data de entrada, e-mail, telefone, forma de envio dos fechamentos, entregáveis contratados, link da pasta no Drive, observações, engajamento, risco, oportunidade de upsell, status e fase da integração.

**Contatos e sócios** · contatos múltiplos com telefone em E.164, papel e principal. Sócios com nome, CPF, RG, estado civil, endereço, participação e pró-labore.

**Financeiro do cliente** · honorário, composição, dia de vencimento, plano, início do contrato, índice e mês de reajuste, histórico de faturas, situação de pagamento, contrato assinado em PDF.

**Acessos e senhas** · cofre cifrado. Login e senha da prefeitura, senha SEFAZ, senha Gov, **código de acesso do Simples Nacional**, acessos bancários. Criptografados em repouso, revelados sob clique, com log de quem consultou, quando e de onde.

**Certificado digital** · titular, tipo A1 ou A3, emissão, **validade**, arquivo `.pfx`, senha cifrada, responsável, código. Alertas em D-90, D-60, D-30 e 1 semana antes.

**Alvarás e licenças** · uma linha por item, replicando a base "Acompanhamento de vencimentos" que já existe em cada cliente. Campos: Nome, Status, Arquivo, Vence em, Atualizado em.

Itens: Bombeiros · Licença sanitária · Licença ambiental · Alvará de funcionamento · Alvará provisório · Alvará AMMA · Órgão de classe.

Status com as três opções já usadas: **Ativo**, **Não tem**, **Não precisa**. Validade obrigatória quando Ativo. Semáforo por proximidade.

**Tarefas recorrentes** · as tarefas do cliente por periodicidade, com competência, status, passo atual, protocolo e responsável.

**Imposto de renda** · o IRPF deixa de ser área separada e vira aba do cliente. Campos: CPF, cidade/UF, e-mail, telefone, regime, tipo de declaração (Simplificada ou Completa), procuração e-CAC (com procuração PJ, com procuração PF, sem procuração), senha Gov cifrada, formulário respondido ou não, responsável, preço, data de envio, data de recebimento, data do pagamento, resultado do ajuste (imposto a restituir, imposto a pagar, sem saldo), valor a restituir, imposto devido, data da restituição, parcelamento, data da última conferência.

Situação com as oito etapas já praticadas: Não iniciada · Em preenchimento · Aguardando informações · Revisão e validação · Entregue · Pendência de malha · Em fila de restituição · Processo finalizado.

**Processos** · processos de legalização do cliente, com a etapa atual.

**Aderência ao plano** · entregáveis cumpridos sobre devidos no período.

**Documentos** · arquivos por tipo e competência, upload e link do Drive.

**Orientações de fechamento** · blocos recolhíveis por Setor fiscal, Setor contábil e Setor pessoal, com as particularidades daquele cliente. Estrutura já existe e deve ser preservada.

### 6.4 Painel de IRPF do escritório

Visão consolidada da campanha, reproduzindo os dois BIs existentes: total a restituir · imposto total a pagar · preço geral · preço a receber, filtrando data de pagamento vazia · clientes que pagaram · clientes faltando pagar · preço recebido por situação · tipo de declaração, Completa contra Simplificada (rosca) · município e UF (rosca) · total de preço por responsável · parcelamento · quadro por situação com as oito etapas.

---

## 7. LEGALIZAÇÃO

### 7.1 Regra do gate

**Nenhum processo avança de etapa enquanto todos os itens obrigatórios da etapa atual não estiverem concluídos.**

```sql
avancar_etapa(processo_id)
  → verifica itens obrigatórios pendentes da etapa atual
  → se houver, levanta exceção listando o que falta
  → se não houver, grava em processo_historico e avança
```

Impossível burlar pela tela ou por chamada direta à API.

### 7.2 Estrutura

`processo_tipo` (nome, departamento, SLA) · `processo_etapa` (ordem, nome, obrigatória, SLA, papel) · `processo_etapa_item` (ordem, descrição, natureza: marcar, anexar, informar valor, aprovar; obrigatório) · `processo` (cliente, tipo, etapa atual, responsável, prazo, valor do serviço, valor pago) · `processo_historico` (log imutável).

Visão em quadro com uma coluna por etapa. Dentro do cartão, o checklist da etapa.

### 7.3 Templates a cadastrar no dia um

**ABERTURA DE EMPRESA** (8 blocos, 40 itens)

1. *Dados pessoais dos sócios:* nome completo · CPF · RG · estado civil · endereço residencial · e-mail e telefone
2. *Dados da empresa:* nome empresarial e fantasia · endereço comercial · CNAEs · regime tributário desejado · capital social · participação societária
3. *Documentação:* documentos pessoais dos sócios · comprovante de endereço da empresa · contrato social se aplicável · número do IPTU · consulta de viabilidade
4. *Análise e planejamento:* verificar se a atividade pode ser exercida no endereço · consulta de viabilidade na Junta · definir o regime tributário ideal · elaborar o contrato social
5. *Registro:* protocolo na Junta Comercial · CNPJ na Receita Federal · inscrição municipal · inscrição estadual na SEFAZ se necessário
6. *Alvarás:* bombeiro · provisório · sanitário · funcionamento · AMMA
7. *SEFAZ e Prefeitura:* cadastrar DTE SEFAZ · habilitar emissão de nota de comércio ou serviço · cadastrar CSC para cupom fiscal se comércio · solicitar usuário para consulta no banco
8. *Finalização:* certificado digital se necessário · cadastro no eSocial se houver funcionários · abertura de conta PJ · assinatura e entrega de documentos · enviar para integração do cliente

**DESENQUADRAMENTO DE MEI PARA LTDA** (11 blocos, 33 itens)

1. *Desenquadramento no Portal do Simples:* acessar o portal · solicitar o desenquadramento · guardar o comprovante
2. *Atualização na Junta:* acessar o sistema · registrar a atualização informando que deixou de ser MEI · aguardar
3. *Viabilidade:* solicitar viabilidade para transformação · aguardar deferimento
4. *DBE:* acessar o Coletor Nacional · preencher com os dados da alteração · gerar protocolo e acompanhar
5. *FCN:* acessar o sistema da Junta · preencher a FCN atualizada
6. *Taxa:* gerar e imprimir a guia · enviar ao cliente
7. *Contrato social:* após compensação, redigir com inclusão de sócios, novo capital, definição do administrador, alteração do objeto social se necessário, e consolidar
8. *Assinatura:* gerar e enviar o link de assinatura digital
9. *Análise da Junta:* acompanhar · após deferimento, imprimir o contrato registrado
10. *Prefeitura:* atualizar cadastro municipal · nova inscrição se necessário · pagar taxas
11. *SEFAZ, se comércio ou indústria:* atualizar inscrição estadual · regularizar no cadastro de contribuintes do ICMS · emitir novos documentos fiscais

**ALTERAÇÃO DE ENDEREÇO NA JUNTA, GOIÂNIA** (7 blocos, 38 itens)

1. *Documentos do novo endereço:* comprovante de endereço · número do IPTU · contrato de aluguel ou escritura · alvará de funcionamento do prédio · alvará dos bombeiros do prédio · habite-se · número oficial · uso do solo · demais conforme o ramo
2. *Uso do solo na Prefeitura:* verificar se a atividade pode ser exercida · solicitar no site · informar o cliente de que não fazemos processos com AMMA, pois quem faz é parceiro · aguardar e salvar o deferimento
3. *Cobrança inicial:* calcular honorários conforme ramo e alvarás · cobrar 50% para iniciar, padrão R$ 897 · confirmar o pagamento antes de começar
4. *Início:* viabilidade na JUCEG · DBE na Receita · FCN · gerar DARE · enviar a taxa ao cliente
5. *Contrato:* redigir a alteração com nova cláusula de endereço · enviar ao cliente para revisar · link de assinatura digital · confirmar pagamento da taxa
6. *Protocolo:* protocolar contrato assinado, DBE, FCN, viabilidade e comprovante · aguardar deferimento e baixar o registrado · enviar autenticado ao cliente
7. *Pós-Junta:* atualizar na Prefeitura · atualizar na SEFAZ se aplicável · solicitar alvará de funcionamento do novo endereço · encaminhar para Bombeiro ou AMMA se o CNAE exigir · informar o cliente da conclusão

**BAIXA DE CNPJ:** verificar certificado digital válido antes de tudo · cobrar 50% para iniciar e 50% ao finalizar · ME e EPP R$ 600, demais a combinar.

**ONBOARDING DE CLIENTE:**
1. Confecção do contrato de prestação de serviços
2. Subir contrato na ferramenta de assinatura digital
3. Enviar contrato para o cliente assinar
4. Contrato assinado
5. Salvar contrato na pasta do cliente
6. Fazer procuração e-CAC
7. Cadastrar cliente nos sistemas: Alterdata, eContador, NF Stock, Veri
8. Cadastrar cliente no sistema de cobrança
9. Agendar reunião de onboarding
10. Enviar e-mail de boas-vindas e manuais
11. Agendar reunião de treinamento

**Demais tipos:** alteração contratual · alteração de sócios · alteração de nome ou nome fantasia · registro de marca no INPI · alvará de funcionamento · alvará de bombeiro · alvará sanitário · alvará ambiental · órgão de classe.

### 7.4 Integração obrigatória

Processo de alvará ou certificado concluído **grava automaticamente** validade e arquivo na aba Alvarás e licenças do cliente. Não existe alvará concluído sem validade registrada.

### 7.5 Jornada do cliente

Pós-onboarding, com prazo de permanência por etapa em dias: Boas-vindas → Onboarding/Implantação (1) → Ativação (1) → Acompanhamento Inicial (30) → Relacionamento (35) → Fidelização (35) → Expansão de Serviços (36) → Pedido de Indicação (37). Etapa vencida gera tarefa automática.

---

## 8. TAREFAS

Absorve o que seriam módulos separados de obrigações acessórias e de fechamento mensal. Tudo é tarefa: o que se repete e o que chega por evento.

### 8.1 Os dois tipos

**Tarefa recorrente** · nasce de uma regra, se repete em um período fixo, tem checklist de passos e prazo legal ou interno. Gerada por job.

**Tarefa avulsa** · nasce de um evento, quase sempre uma mensagem de WhatsApp. Usa a taxonomia de tipos de demanda. Não se repete.

Mesmo objeto, mesma tela, mesmo responsável, mesmo SLA.

### 8.2 Abas

```
Mensais  |  Trimestrais  |  Anuais  |  Avulsas  |  Minha mesa
```

Cada aba mostra uma tabela cruzando **cliente por tarefa**, com semáforo e o passo em que está parada. Filtro por competência, responsável, departamento e cliente.

**Minha mesa** abre filtrada pela pessoa logada, ordenada por prazo, com atraso em vermelho.

### 8.3 Estrutura

```
tarefa_modelo
├── nome
├── periodicidade        (mensal, trimestral, anual, avulsa)
├── departamento
├── categoria            (obrigação legal, fechamento, entregável de plano, interno)
├── dia de vencimento    ou regra de cálculo do prazo
├── exige protocolo      (sim para obrigação legal)
├── regra de aplicabilidade
└── passos[]
    ├── ordem, descrição, obrigatório
    ├── natureza         (marcar, anexar, informar valor, aprovar)
    └── condição         (opcional: só aparece se o cliente atende a condição)

tarefa
├── cliente, modelo, competência, vencimento, responsável
├── status, passo atual
├── protocolo e recibo   (quando exigido)
└── passos_execucao[]    (concluído por quem, quando, com qual anexo)
```

**Trava:** a tarefa não fecha enquanto todos os passos obrigatórios não estiverem concluídos. Mesma função `avancar_etapa`, aplicada aos passos.

### 8.4 Definição no cadastro do cliente

**Ao cadastrar o cliente, o sistema monta a lista de tarefas recorrentes dele.** O usuário revisa e confirma antes de salvar. Depois disso, o job mensal gera as competências automaticamente.

Critérios, todos vindos da ficha: regime tributário · atividade · tem funcionário · tem pró-labore · tem inscrição estadual · faz retenções · plano contratado.

| Condição | Tarefas geradas |
|---|---|
| Todo cliente ativo | Coleta de documentos (mensal) · Fechamento fiscal (mensal) · Fechamento contábil (mensal) |
| MEI | DAS-MEI (mensal, dia 20) · DASN-SIMEI (anual, até 31/05) |
| Simples Nacional | PGDAS-D e DAS (mensal, dia 20) · DEFIS (anual, até 31/03) |
| Lucro Presumido | PIS e COFINS (mensal) · IRPJ e CSLL (trimestral) · EFD Contribuições (mensal) · ECD (anual) · ECF (anual) |
| Lucro Real | PIS e COFINS (mensal) · IRPJ e CSLL (mensal ou trimestral) · EFD Contribuições (mensal) · ECD (anual) · ECF (anual) |
| Imune ou Isenta | DCTFWeb (mensal) · ECD (anual) · ECF (anual) |
| Tem funcionário | Fechamento de folha (mensal) · eSocial (mensal) · FGTS Digital (mensal) · DCTFWeb (mensal) · 13º primeira parcela (novembro) · 13º segunda parcela (dezembro) |
| Só pró-labore | Fechamento de pró-labore (mensal) · eSocial simplificado (mensal) · DCTFWeb (mensal) |
| Faz retenções | EFD-Reinf (mensal) |
| Comércio ou indústria com IE | EFD ICMS/IPI (mensal) · GIA conforme o estado |
| Prestador de serviço | ISS (mensal) · declaração mensal de serviços do município |
| Plano Mentor | Relatório gerencial (mensal) · Análise de Fator R (mensal) · Monitoramento de CNDs (mensal) · Planejamento tributário (anual) |
| Plano Estratégico | Tudo do Mentor · Reunião de resultados (mensal) · Análise de precificação (trimestral) |

Tarefas fora da regra podem ser incluídas manualmente, com justificativa.

### 8.5 Modelos centrais com os passos

#### COLETA DE DOCUMENTOS · mensal · Administrativo

1. Disparar o aviso ao cliente pelo WhatsApp no dia 1
2. Baixar os XMLs no NF Stock
3. Receber os extratos bancários de todas as contas
4. Receber o fechamento de ponto e as movimentações de pessoal
5. Receber notas de despesa e comprovantes
6. Conferir a lista contra o mês anterior, para achar o que faltou
7. Cobrar o pendente, com régua em D+3, D+5 e D+8
8. Escalar ao responsável da conta o que continuar pendente em D+10

*Trava:* Fechamento fiscal e Fechamento de folha não abrem sem esta tarefa concluída ou justificada.

---

#### FECHAMENTO DE FOLHA · mensal · Pessoal

1. Solicitar ao cliente as movimentações do mês (ponto, atestados, admissões, rescisões, férias)
2. Lançar no sistema
3. Conferir os lançamentos
4. Verificar as variáveis: **plano de saúde · vale-transporte · vale-alimentação** · horas extras · faltas · adiantamentos · bonificações · descontos
5. Conferir a folha contra o mês anterior, sinalizando variação acima de 10%
6. Transmitir o eSocial
7. Transmitir a DCTFWeb
8. Gerar as guias: FGTS Digital, DARF INSS, DARF IRRF
9. Enviar folha, holerites e guias ao cliente
10. Registrar o envio

*Passos condicionais:* rescisão no mês exige exame demissional anexado antes do passo 6 · férias no mês exigem aviso com 30 dias registrado.

*Entregas:* folha fechada · holerites · guia FGTS Digital · DARF INSS · DARF IRRF · recibo do eSocial · recibo da DCTFWeb.

---

#### FECHAMENTO FISCAL · mensal · Fiscal

1. Importar as notas (XML de entrada e de saída)
2. Conferir as notas: bater com o portal da prefeitura e da SEFAZ, verificar canceladas, inutilizadas e denegadas
3. Escriturar entradas e saídas
4. Apurar e gerar os encargos conforme o regime
5. Conferir a apuração: faturamento escriturado tem que bater com o faturamento declarado
6. Transmitir as obrigações da competência
7. Enviar as guias ao cliente
8. Registrar o envio

*Passos condicionais:* Simples Nacional acrescenta segregação de receitas, verificação do anexo e cálculo do Fator R no passo 4 · comércio ou indústria acrescenta ICMS-ST e DIFAL no passo 3 · cliente com retenções acrescenta conferência de ISS retido, IRRF, INSS, PIS, COFINS e CSLL no passo 5.

*Entregas:* guias do mês · PGDAS-D ou apuração transmitida com recibo · EFD transmitida com recibo · declaração municipal de serviços · relatório de faturamento.

*Alerta automático:* Fator R entre 26% e 28% gera tarefa avulsa de análise tributária.

---

#### FECHAMENTO CONTÁBIL · mensal · Contábil

1. Solicitar o extrato ao cliente
2. Fazer os lançamentos
3. Fazer a conciliação contábil
4. Conferências de fechamento: caixa não pode estar negativo · saldo contábil do banco tem que bater com o extrato · fornecedores e clientes conciliados
5. Fechar o balancete
6. Fazer a análise
7. Gerar o dashboard e o relatório
8. **Ramificação por plano:**
   - **Plano contempla reunião** (Estratégico): marcar a reunião, apresentar ao cliente, registrar a ata
   - **Plano não contempla reunião** (Essencial e Mentor): enviar o dashboard e a análise ao cliente
9. Registrar o envio ou a realização da reunião

*Dependência:* só abre com o Fechamento Fiscal e o Fechamento de Folha da mesma competência concluídos. Regra escrita pelo próprio escritório: as informações precisam estar atualizadas *"no mesmo momento de entrega das obrigações de outros departamentos"*.

*Entregas:* balancete fechado · DRE do mês e acumulado · conciliação bancária sem pendências · análise de variações · dashboard enviado ou reunião realizada.

*Anuais do departamento:* ECD · ECF · balanço patrimonial · DRE do exercício · demonstração das mutações do patrimônio líquido.

---

#### Demais modelos a cadastrar

**Mensais:** DAS-MEI · PGDAS-D e DAS · PIS e COFINS · DCTFWeb · eSocial · FGTS Digital · EFD Contribuições · EFD ICMS/IPI · EFD-Reinf · ISS · declaração municipal de serviços · relatório gerencial · análise de Fator R · monitoramento de CNDs · reunião de resultados.

**Trimestrais:** IRPJ e CSLL do Lucro Presumido · análise de precificação.

**Anuais:** DASN-SIMEI · DEFIS · ECD · ECF · DIRF · balanço patrimonial · planejamento tributário · 13º primeira e segunda parcela · declaração de IRPF quando contratada.

### 8.6 Tarefas avulsas

Campos obrigatórios: tipo de demanda, cliente, departamento, responsável, prazo, prioridade.

*Fiscal:* IMPOSTOS guias · PARCELAMENTO guia · PARCELAMENTO simulação · SIMPLES NACIONAL recálculo · Retificar PGDAS · NF-e · NFS-e · Declaração anual do MEI · Declaração de faturamento · DÉBITOS consulta · ANÁLISE TRIBUTÁRIA

*Pessoal:* FOLHA cálculo · FOLHA alteração · ADMISSÃO · RESCISÃO solicitação · RESCISÃO cálculo · FÉRIAS · RECÁLCULO FGTS · ADIANTAMENTO SALARIAL · PRÓ-LABORE

*Contábil e financeiro:* RELATÓRIOS BANCO · BPO FINANCEIRO · PRECIFICAÇÃO · CONCILIAÇÃO

*Paralegal:* PROCURAÇÃO e-CAC · CERTIFICADO DIGITAL renovar · CERTIFICADO DIGITAL vencido · CERTIFICADO DIGITAL enviar arquivo · ALTERAÇÃO CONTRATUAL · ATO DA EMPRESA baixa · ABERTURA DE EMPRESA · DESENQUADRAMENTO · REGISTRO DE MARCA · ALVARÁS

*Comercial:* Elaboração de contrato · MENSAGEM JORNADA · IRRF DECLARAÇÃO

### 8.7 Painel

Concluídas no prazo sobre o total, por departamento e responsável, com o número de partida de 9% · tarefas por passo em que estão paradas, para achar o gargalo · clientes travados há mais de X dias · carga por responsável · reincidência de atraso por cliente · obrigações da competência entregues, pendentes e vencidas, com recibo · aderência ao plano por cliente, com alerta abaixo de 80% no Mentor.

### 8.8 Registro de tempo

Toda tarefa registra tempo gasto por passo. Alimenta a rentabilidade por cliente no Financeiro.

---

## 9. FINANCEIRO

### 9.1 KPIs

**Receita:** receita recorrente mensal, partindo de R$ 22.632 · ticket médio, partindo de R$ 526 · receita por competência nos últimos 12 meses · receita por plano · receita por regime · receita por nicho · receita por estado e cidade · extras contra recorrente.

**Cobrança e inadimplência:** faturado contra recebido no mês · inadimplência em reais e percentual · inadimplência por faixa de atraso, 1 a 15, 16 a 30, 31 a 60, mais de 60 dias · lista de inadimplentes · previsão de recebimento de 30, 60 e 90 dias.

**Custos e resultado:** contas a pagar por categoria · DRE do escritório por competência · margem por competência.

**Rentabilidade:** rentabilidade por cliente, honorário dividido pelo tempo gasto, ordenado do pior para o melhor · clientes com rentabilidade negativa · tempo gasto por cliente e por departamento · custo por hora por departamento.

**Ciclo de vida:** churn mensal e acumulado · CAC · LTV · relação LTV sobre CAC.

**Alertas:** clientes ativos sem honorário cadastrado, hoje 7 de 50 · contratos sem reajuste há mais de 12 meses · clientes abaixo do ticket mínimo do plano.

### 9.2 Contas a receber
Honorários recorrentes com valor, composição, dia de vencimento, índice e mês de reajuste. Geração mensal automática das faturas. Boleto e Pix pela **Cora**, com webhook de baixa. Régua de cobrança por WhatsApp em D-5, D0, D+3, D+7 e D+15.

### 9.3 Contas a pagar
Fornecedor, categoria, valor, vencimento, status, recorrência, comprovante anexado.

### 9.4 Conciliação bancária
Extrato pela API da Cora e por OFX para os demais bancos. Sugestão automática de vínculo com regras por descrição e valor. Confirmação manual do que ficar em dúvida. Open Finance exige instituição regulada e está fora de escopo.

### 9.5 Emissão de NFS-e
Nota do escritório contra os clientes, por competência. **Integrar por intermediador** (PlugNotas, Focus NFe, eNotas ou NFE.io). Não existe API única de prefeitura: Goiânia usa sistema próprio e o padrão nacional só cobre municípios conveniados.

---

## 10. PORTFÓLIO DE SERVIÇOS

Catálogo único do que o escritório vende. Alimenta a simulação, a proposta e a cobrança de extras. Nada é vendido fora dele.

`servico`: nome · categoria · descrição · o que está incluso · o que não está · pré-requisitos · valor ou regra de valor · unidade de cobrança (mensal, por evento, por nota, por hora) · departamento executor · SLA · POP vinculado · ativo ou inativo · planos em que já está incluso.

**Categorias, como o Notion já organiza:** MEI · Simples Nacional · Regime Normal · Implantação de Sistemas · Consultoria e BPO Financeiro · Registro de Marca · Extras e retrabalhos.

**Extras com preço já definido, migrar exatamente:**

| Serviço | Valor |
|---|---|
| Remissão de guia DAS | R$ 5,00 |
| Remissão de guia FGTS e INSS | R$ 10,00 |
| Emissão de nota fiscal | R$ 10,00 NFS-e · R$ 20,00 NF-e, por nota |
| Rescisão de funcionário sem registro | R$ 80,00 |
| Pesquisa do IBGE | R$ 197,00 |
| Parcelamento Simples Nacional, Receita e PGFN | R$ 250,00 |
| Declaração de ITR | a partir de R$ 150,00 |
| Declaração de imposto de renda | Simplificada R$ 150,00 · Completa a partir de R$ 200,00 |
| Treinamento administrativo | R$ 180,00 |
| Conciliação de cartão de crédito | R$ 250,00 |

**Regra:** migrar também os 172 extras do 4C, hoje quase todos com valor R$ 0,00. **Serviço com valor zero não entra em proposta nem em cobrança sem aprovação explícita do sócio.** O painel mostra em destaque quantos seguem sem preço.

**Ligação com a operação:** serviço vendido gera automaticamente a tarefa avulsa do tipo correspondente, com SLA e responsável, e entra como item na fatura do mês.

---

## 11. ESCRITÓRIO

### 11.1 Sistemas e ferramentas
Nome · link de acesso · login · **senha cifrada** · setor (Fiscal, Comercial, Administrativo, Marketing, Pessoal, Contábil) · situação (Ativo, Estudando, Cancelado) · e-mail e telefone de suporte · custo mensal · dia de vencimento · responsável interno.

### 11.2 APIs e integrações
Nome · API · ambiente (Produção, Homologação, Teste) · status (Não configurada, Em configuração, Ativa, Inativa) · documentação · chave cifrada · observações · atualizado em.

### 11.3 Acessos de cliente, visão consolidada
Todos os acessos de cliente por sistema, filtrável: **Simples Nacional (código de acesso)** · e-CAC e procuração · Prefeitura · SEFAZ · Gov.br · Bancos.

Cada linha mostra cliente, sistema, login, situação da procuração, validade quando houver, e botão para revelar o segredo. Toda revelação gera log com usuário, data, hora e origem.

Alerta de procuração e-CAC vencendo, e de código de acesso do Simples pendente para cliente novo.

### 11.4 Equipe
Nome · foto · cargo · e-mail · telefone · data de admissão · aniversário com lembrete no dia anterior às 09:00 · departamento · gestor direto · situação.

### 11.5 Organograma
**Não existe hoje. Construir.** Árvore montada pelo campo gestor direto. Cada nó mostra foto, nome, cargo e departamento. Clicar abre a ficha do colaborador com responsabilidades, clientes sob responsabilidade e carga de tarefas abertas.

### 11.6 Plano de cargos e salários
**Não existe hoje. Construir.** Cargos já usados: Estagiário, Auxiliar, Assistente, Analista, CEO.

`cargo`: nome · nível (Estagiário, Auxiliar, Assistente, Analista, Coordenador, Gestor, Sócio) · departamento · descrição · responsabilidades · requisitos · competências técnicas e comportamentais.

`faixa_salarial`: cargo · degrau (I, II, III) · salário base mínimo e máximo · benefícios · critérios objetivos de promoção.

`avaliacao`: colaborador · período · competências com nota · resultado · plano de desenvolvimento · próxima avaliação · elegibilidade para promoção.

Tela mostra a matriz de cargos por degrau e a posição de cada colaborador nela.

### 11.7 Metas e OKRs
Objetivo, resultados-chave, responsável, período, progresso. Meta em vigor: 100 ou mais clientes ativos até 31/12/2026, partindo de 50.

### 11.8 Processos e instruções de trabalho
Nome, departamento (Fiscal, Contábil, Comercial, Renovações, Administrativo, Financeiro, Pessoal), responsável, conteúdo ou arquivo. Vinculável a tipo de demanda e a tipo de processo.

---

## 12. DOCUMENTOS

Repositório central por cliente, tipo e competência. Upload manual e recebimento automático pelo WhatsApp e pelo NF Stock. Vinculação a processo, tarefa ou obrigação. Busca por nome, cliente, tipo e período. Link para a pasta do cliente no Drive.

---

## 13. CONFIGURAÇÕES

Usuários e papéis (sócio, operação, administrativo, somente leitura) com RLS por departamento · catálogo de tipos de demanda e SLAs · templates de processo e checklists · modelos de tarefa recorrente e regras de aplicabilidade · tabelas de preço e critérios · personas · modelos de proposta e contrato · biblioteca de scripts e objeções · integrações e chaves.

---

## 14. INTEGRAÇÕES

| Sistema | Uso |
|---|---|
| Z-API | WhatsApp, envio e recebimento, webhook |
| Cora | Boleto, Pix, extrato, webhook de pagamento |
| Alterdata e eContador | ERP contábil, vinculação de conta e extrato |
| NF Stock | Coleta de NF-e e NFS-e |
| Veri | Monitoramento de certidões e CNDs |
| Intermediador de NFS-e | Emissão da nota do escritório |
| Google Workspace | E-mail, Drive, Agenda |
| Assinatura digital | Contratos e procurações |

---

## 15. SEGURANÇA

RLS por departamento e papel · segredos cifrados em repouso, nunca em campo de texto **nem em nome de arquivo** · log de acesso a credencial com usuário, data, hora e origem · log imutável de transição de etapa e de passo · nenhum dado sensível em URL ou query string.

Nota de migração: existe credencial exposta em um nome de arquivo na fonte original. Na migração, remover a credencial do nome e armazenar o segredo cifrado.

---

## 16. MIGRAÇÃO

**Notion:** base de clientes com 44 propriedades e os três BIs · CLIENTES SAIRAM · Clientes Carnê Leão · Certificado Digital nas três bases MEI, SN e Regime Normal · Acompanhamento de vencimentos de cada cliente · Fluxo do Cliente · Processo de Integração · Tarefas · Gestão de IRPF com os dois BIs · Nossas soluções com as 7 categorias · Extras e retrabalhos com os preços · Sistemas e ferramentas · Central de APIs · Colaboradores · OKRs · Processos FUTURO · Logins e senhas para o cofre.

**Trello:** quadro PARALEGAL, 26 cartões com seus checklists, que viram templates de processo · quadro LICENÇAS, 32 cartões, atribuindo validade a cada um.

**ChatSC:** 50 clientes ativos com honorário e regime · 169 ordens de serviço com histórico · taxonomia de demandas · etapas da jornada · conversas.

**4C Foresee:** parametrização de preços · 172 extras · personas · modelos de contrato · 82 simulações · 34 propostas.

**Descartar:** quadros mortos do Trello (FISCAL vazio, ONBOARDING com um cartão de 2025, dois "Visão Geral" duplicados, template de CRM nunca usado, Instagram, fotografia, acampamento) · workspace legado "Gestão de Escritório Contábil" do Notion, de 2024 · as três bases de Acompanhamento por departamento, que têm só o campo Nome · os doze "Cliente modelo" duplicados por mês em Abertura de Empresas, que viram um template único.

---

## 17. ORDEM DE CONSTRUÇÃO

Escopo integral. Isto é ordem de dependência técnica, não corte.

**Fase 0, fundação:** Supabase, Auth, RLS, tabelas do núcleo, cofre cifrado, layout base, migração de clientes.

**Fase 1, operação:** motor de processos com trava, templates do paralegal, tarefas avulsas, licenças com validade, documentos.

**Fase 2, atendimento:** webhook Z-API, caixa de entrada, botão Virar tarefa, vínculo com cliente.

**Fase 3, tarefas recorrentes:** modelos com passos, regra de aplicabilidade no cadastro, job de geração de competências, os quatro fechamentos, painel de prazos.

**Fase 4, comercial:** leads, personas, simulação com o motor de preços, propostas, contratos, assinatura, onboarding.

**Fase 5, financeiro:** honorários, faturas, Cora, NFS-e via intermediador, conciliação, KPIs.

**Fase 6, gestão:** KPIs de clientes, portfólio, escritório, organograma, cargos, desligamento dos quatro sistemas antigos.

**Recomendação:** colocar **um único departamento em produção primeiro**, o paralegal, porque os POPs já estão prontos em checklist, o volume é baixo e o Daniel executa quase sozinho. Se o motor de trava funcionar com ele, funciona com todos.

---

## 18. CRITÉRIOS DE ACEITE

1. É impossível avançar etapa de processo com item obrigatório pendente, inclusive por chamada direta à API
2. Nenhuma tarefa é concluída com passo obrigatório pendente
3. Nenhuma tarefa avulsa é salva sem tipo de demanda, responsável e prazo
4. Nenhum cliente é salvo sem origem
5. Nenhum cliente ativo é salvo sem honorário
6. Nenhum alvará, licença ou certificado com status Ativo é salvo sem data de validade
7. As tarefas recorrentes são definidas no cadastro, conforme regime, atividade, funcionário, pró-labore, inscrição estadual e plano, com confirmação obrigatória
8. As competências do mês seguinte são geradas automaticamente por job
9. O Fechamento Contábil não abre sem o Fechamento Fiscal e o de Folha da mesma competência concluídos
10. Fechamento fiscal e de folha não abrem sem a Coleta concluída ou justificada
11. Obrigação legal só é concluída com protocolo e recibo anexados
12. O passo de apresentação ao cliente ramifica corretamente conforme o plano contratado
13. Uma mensagem de WhatsApp vira tarefa atribuída em no máximo três cliques
14. A simulação reproduz exatamente o preço da tabela da seção 4.4, validada contra dez casos reais da base
15. Proposta gerada e não enviada em 48 horas aparece nas tarefas urgentes
16. Serviço com valor zero não entra em proposta sem aprovação do sócio
17. Nenhum segredo existe em campo de texto não cifrado nem em nome de arquivo
18. O contrato é gerado com os dados do cliente sem redigitação
19. Todos os KPIs das seções 6.1, 6.4 e 9.1 estão no ar e são clicáveis para a lista correspondente
20. O painel mostra aderência ao plano por cliente, cumprido sobre devido
21. A Tamires cadastra um cliente novo, do zero, sem ajuda
22. O dashboard mostra o percentual de entrega no prazo, comparável com o número de partida de 9%

---

## 19. PENDÊNCIA CONHECIDA

A tabela de faixas de faturamento da atividade **Indústria** não foi transcrita. Exportar da parametrização do 4C antes da Fase 4.
