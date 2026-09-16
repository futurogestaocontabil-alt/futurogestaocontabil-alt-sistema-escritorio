# Processo: do lead à rotina mensal

Registrado a partir das definições de Gilmar Santos em 15/09/2026.
Item marcado como **não definido** não vira regra automática.

## Fluxo completo

```text
Lead
→ Qualificação
→ Reunião comercial
→ Diagnóstico
→ Simulação de honorário
→ Proposta
→ Aceite comercial
→ Geração do contrato
→ Assinatura pela Autentique
→ Conversão em cliente
→ Onboarding interno
→ Reunião de onboarding externo
→ Ativação operacional
→ Rotina mensal
```

**Regra dura:** o lead só vira cliente depois do contrato assinado. Aceite
verbal, aceite da proposta e primeiro pagamento não convertem.

## 1. Simulação de honorário

A simulação acontece antes da proposta. A regra vive em um único lugar,
`src/services/domain/pricing.ts`, compartilhado com a Edge Function por
`scripts/build-edge.mjs`. Nenhum valor pode ser duplicado na interface.

### Conferência do motor contra a tabela oficial

A tabela oficial enviada por Gilmar foi conferida linha a linha contra o
código em 15/09/2026. **O motor já implementa a tabela inteira, sem
divergência de valor.**

A conferência está automatizada em `tests/pricing.test.ts`, que escreve as
faixas à mão e compara com o motor. Alterar o motor sem alterar a tabela
quebra o teste. Cobertura: 57 faixas, adicional dos três planos, todos os
critérios operacionais em cada degrau, níveis de integração, serviços extras,
bloqueios e o exemplo conferido com Gilmar.

| Regra | Tabela oficial | Motor |
|---|---|---|
| Faixas de Serviços e Comércio, quatro regimes | 57 faixas | Iguais |
| Adicional de plano | 0, 100 e 560 | Iguais |
| Colaboradores | 50, 40, 35, 32 e 30 por degrau | Iguais |
| Pró-labore | 30 por sócio, bloqueio acima de 3 | Igual |
| Contas financeiras | 10 até três, depois 8 | Iguais |
| Ponto por colaborador | 5 até dez, depois 3,50 | Iguais |
| Guias DIFAL | 25, 20 e 17 por degrau | Iguais |
| Notas fiscais | 10 por nota | Igual |
| Contas a pagar | 5 por conta | Igual |
| Ponto eletrônico, ICMS-ST, monofásico | 100 cada | Iguais |
| Ponto sem integração | 50 quando declarado falso | Igual |
| Integração contábil e fiscal | 0, 90 e 150 | Iguais |
| Indústria | Bloqueia | Bloqueia |
| Faturamento acima da última faixa | Bloqueia | Bloqueia |
| Versão da regra | `escopo-4.4-v1` | Igual |

Exemplo conferido: Serviços, Simples Nacional, R$ 50.000,00, plano Mentor,
4 colaboradores, 2 pró-labores, 2 contas financeiras, integração contábil
média e fiscal alta. Resultado do motor: **R$ 977,00**, igual ao esperado.

### Divergências entre a especificação e o código

Três pontos da especificação divergem do código. Nenhum é erro de valor.

| Ponto | Especificação | Código | Recomendação |
|---|---|---|---|
| `PriceResult.valor` e `total` | `string` | `number` | Manter número. Valor monetário formatado como texto quebra soma, ordenação e o financeiro. Formatação é trabalho da tela |
| `PriceLine` | `valorUnitario` e `total` | `valorUnitarioCentavos` e `totalCentavos` | Manter centavos. Inteiro em centavos é o que impede perda de arredondamento |
| `PriceLine.categoria` | `base`, `plano`, `criterio`, `integracao`, `extra` | Não existe | **Acrescentar.** É o que permite agrupar o detalhamento na tela sem a tela adivinhar pelo nome do item |

Dois textos de bloqueio também divergem, só na redação. A especificação pede
mensagens mais explicativas que as atuais. Ajuste de texto, sem efeito no
cálculo.

### O que ainda falta na simulação

1. Campo `categoria` em cada linha do detalhamento.
2. Persistência da simulação: versão da tabela, data, usuário, entradas,
   acréscimos, valor final, observações e lead ou cliente relacionado.
3. Tela em seis etapas: empresa, plano, operação, integração, extras e
   resultado.
4. Congelamento do preço do serviço extra no momento da simulação, para que
   mudança futura no catálogo não altere proposta antiga.
5. Desconto. **Não definido.** Sem percentual e sem responsável, não há regra
   para escrever.

## 2. Proposta

Gerada a partir da simulação aprovada. Guarda uma fotografia imutável:
dados do cliente, plano, atividade, regime, faturamento considerado,
critérios, serviços extras, valor final, versão da regra, data, responsável,
validade e condição de pagamento.

Situações: Rascunho, Gerada, Enviada, Visualizada, Em negociação, Aceita,
Recusada e Expirada.

Regras:

- Proposta aceita não converte em cliente. Aceite libera a geração do contrato.
- Alteração de preço guarda histórico. Mudança de tabela cria nova versão e
  nunca altera proposta antiga.
- Envio por PDF, WhatsApp ou e-mail, com registro do canal.
- **Clicar em enviar não é envio.** Registrar comprovante, identificador ou
  confirmação quando houver.
- Desconto permanece não definido. Enquanto isso, exige aprovação de Gilmar.

Situações já implementadas hoje: Gerada, Enviada, Visualizada, Em negociação,
Aceita e Recusada. Faltam Rascunho e Expirada.

## 3. Contrato automático

O sistema gera o contrato a partir do cadastro, da reunião, da simulação e da
proposta aceita, usando modelo versionado. Não gerar com dado obrigatório
faltando.

Campos: razão social, nome fantasia, CNPJ, endereço, cidade e estado, sócios,
CPF dos sócios, representante legal e CPF, cargo, e-mail, atividade, regime,
plano, serviços incluídos, serviços extras, honorário, dia de vencimento,
forma de pagamento, competência inicial, data de início, informações da
reunião e condições comerciais aprovadas.

Situações: Em preparação, Gerado, Enviado para assinatura, Aguardando
assinatura, Assinado, Recusado, Cancelado e Expirado.

Nada disso existe hoje. O contrato é montado por Gilmar fora do sistema.

## 4. Autentique

Integração por API, nova no projeto.

Fluxo: o sistema gera o contrato, envia o documento, cadastra os signatários,
cria a solicitação de assinatura, salva o identificador externo e a data de
envio, acompanha a situação, recebe o webhook, atualiza a situação, registra o
contrato assinado, vincula ao cliente e grava auditoria.

A chave da Autentique fica no cofre cifrado ou em variável exclusiva do
servidor. Nunca no navegador.

O webhook da Autentique tem o mesmo problema já apontado no webhook da
Evolution: precisa de verificação de origem antes de existir endereço público.

## 5. Conversão em cliente

Quando o contrato for assinado: marcar contrato como assinado, converter o
lead, copiar os dados aprovados da proposta, criar o cadastro, criar o
onboarding interno, criar o onboarding externo, habilitar o financeiro,
configurar competência inicial e vencimento, criar as tarefas iniciais, criar
as recorrências do regime e registrar auditoria.

### Início da cobrança: contradição a resolver

A mesma definição apareceu de duas formas:

- Bloco 4, resposta 8: "o cliente começa a pagar no mês da assinatura ou
  conforme a condição registrada na proposta".
- Seção de conversão: "o cliente começa a pagar no mês seguinte à assinatura".

**Item 5.A, não definido.** O sistema precisa de um padrão único, com a
proposta podendo sobrepor. Sem isso, a primeira conta a receber pode nascer na
competência errada, e corrigir conta emitida é retrabalho com o cliente.

Vencimentos permitidos: dia 30, dia 5 e dia 10. Quando o mês não tiver o dia
escolhido, usar o último dia válido. Pró-rata permitido conforme a regra
comercial aprovada, ainda sem parâmetro definido.

## 6. Onboarding interno

Feito pela equipe antes e durante o início da operação. **Não é a reunião com
o cliente.** Não é uma tarefa, é um processo com várias tarefas, responsáveis,
documentos, acessos, sistemas e evidências.

### Alterdata

Marcação separada para Fiscal, Contábil e Departamento Pessoal. Tarefas:
cadastrar a empresa, cadastrar dados fiscais, contábeis e de pessoal, conferir
regime, CNAEs, endereço, sócios e responsável, registrar o código da empresa no
Alterdata e salvar evidência.

### NF Estoque

Cadastrar o cliente, inserir CNPJ e dados da empresa, configurar emissão de
notas quando aplicável, confirmar usuário e acesso, salvar evidência e
registrar pendências.

### eContador

Cadastrar o cliente, inserir dados, vincular, criar ou confirmar usuário,
gerar ou registrar login, enviar o login ao cliente, registrar a data do envio,
confirmar o recebimento e registrar pendências de acesso.

**Senha nunca em texto aberto.** O cofre AES-256-GCM já existe para isso.

### Veri

Cadastrar o cliente, inserir os dados, vincular responsável, confirmar
integração, salvar evidência e registrar pendências.

### Procuração e certificado digital

Cliente vindo de outro contador: verificar existência e validade do
certificado, solicitar a procuração, registrar órgão ou sistema, quem
concedeu, data de solicitação e de aprovação, salvar documento, registrar
validade e criar alerta de vencimento.

Empresa nova: depois da abertura, solicitar certificado quando necessário,
solicitar procurações, configurar acessos e registrar a situação.

### Extratos bancários

Solicitar a vinculação, identificar as contas, registrar banco, registrar
agência e conta de forma protegida, definir a conta principal, registrar a
autorização e confirmar a integração.

Atendimento por ticket:

- Ticket baixo: fluxo padrão de solicitação e vinculação.
- Ticket alto: encaminhar ao Mister Contador ou fluxo premium do escritório.

**O limite entre ticket baixo e alto é parâmetro configurável e está não
definido.** Não fixar valor no código.

### Responsáveis

| Pessoa | Responsabilidades no onboarding interno |
|---|---|
| Tamires | Cadastro administrativo e financeiro, eContador, NF Estoque, Veri, solicitação de documentos, envio de logins, acompanhamento de pendências e agendamento da reunião externa |
| Daniel | Alterdata Fiscal, Contábil e Pessoal, conferência de regime e obrigações, definição de tarefas técnicas, procurações e acessos técnicos |
| Gilmar | Aprovação da ativação, validação de exceções, clientes de ticket alto, revisão estratégica, aprovação de riscos e decisão sobre pendências críticas |

## 7. Onboarding externo

Reunião com o cliente depois do contrato assinado e do onboarding interno
inicial.

Objetivos: apresentar a equipe, explicar canais, WhatsApp, envio de documentos,
prazos e responsabilidades, confirmar atividades, regime, sistemas, acessos e
documentos faltantes, explicar o financeiro, o vencimento e a primeira
competência, apresentar o calendário de tarefas, registrar dúvidas e definir
próximos passos.

Gera ata e tarefas.

Situações: Aguardando agendamento, Agendada, Realizada, Pendências do cliente,
Em implantação, Concluída e Bloqueada.

## 8. Tarefas criadas na ativação

Comuns: conferir contrato, conferir cadastro, cadastrar no Alterdata Fiscal,
Contábil e Pessoal, cadastrar no NF Estoque, cadastrar no eContador, enviar
login do eContador, cadastrar no Veri, solicitar procuração, vincular
certificado, solicitar extrato, vincular extrato, definir responsável, criar
pasta, criar financeiro, criar recorrências, agendar onboarding externo,
realizar onboarding externo, registrar ata e encerrar onboarding.

Específicas dependem de regime, atividade, funcionários, pró-labore,
retenções, inscrição estadual, plano, serviços extras, cidade e município, e
necessidade de conselho profissional.

## 9. Modelo de atendimento

A conversa é permanente. O atendimento é uma ocorrência dentro dela. Uma
conversa tem vários atendimentos.

**Conversa** guarda: telefone, nome, cliente, lead, última mensagem, histórico
completo, data da última interação e situação do vínculo.

**Atendimento** guarda: identificador, conversa, cliente, responsável,
departamento, abertura, encerramento, situação, demanda, motivo do
encerramento, transferências, tarefas vinculadas e mensagens.

**Filas:** Fila, Ativos, Grupos, Finalizados, Aguardando resposta, Com tarefa
e Sem tarefa.

**Transferências:** para pessoa e para departamento, separadas.

**Demandas:** Comercial, Fiscal, Contábil, Pessoal, Financeiro, Legalização,
Documentos, Certificado digital, Nota fiscal, Extrato bancário, Onboarding,
Dúvida geral, Solicitação de serviço e Sem demanda.

Ao encerrar: classificar a demanda, informar o motivo, registrar responsável e
data, bloquear a resposta, salvar o histórico e permitir iniciar novo
atendimento.

## 10. Correção das mensagens do WhatsApp

Regras confirmadas, ainda não implementadas:

- `data.key.fromMe` falso: mensagem do cliente.
- `data.key.fromMe` verdadeiro: mensagem da equipe.
- Guardar `data.key.id` da Evolution em cada mensagem.
- Ignorar identificador repetido.
- Registrar se a mensagem saiu pelo sistema ou pelo celular.
- Celular aparece como "Dispositivo externo". Sistema aparece como "Enviada
  pelo sistema".
- Nunca registrar mensagem da equipe como mensagem do cliente.
- Nunca duplicar mensagem enviada pelo sistema.

## 11. Etiquetas

Etiqueta não substitui campo. Regime, plano, responsável e departamento são
campos do cadastro. Cliente ou não cliente é situação do vínculo.

Etiqueta livre serve só para o que não cabe em campo: aguardando documento,
urgente, retornar em janeiro, cliente estratégico e solicitação especial.

## 12. Ordem de implementação

Antes de criar ou alterar tela: atualizar o modelo de dados, criar as regras
do domínio, criar ou atualizar a API, criar testes, criar a interface, validar
permissões, validar auditoria e executar typecheck, testes e build.

## 13. Auditoria

Registrar: criação e edição da simulação, alteração de parâmetros, aprovação
de desconto, aprovação de serviço gratuito, geração e envio da proposta,
aceite, geração do contrato, envio para a Autentique, assinatura e conversão
em cliente.

## Itens não definidos

| # | Item |
|---|---|
| 3.A | Participação de Daniel ou Tamires na reunião comercial |
| 3.B | Percentual máximo de desconto. Gilmar aprova, o limite falta |
| 3.C | Formato principal de envio da proposta |
| 3.D | Cadência de follow-up |
| 5.A | Mês de início da cobrança: mês da assinatura ou mês seguinte |
| 5.B | Regra de pró-rata |
| 6.A | Limite entre ticket baixo e ticket alto |
| 6.B | Provedor de assinatura digital confirmado, além da Autentique citada |
| 1.A | Acesso comercial amplo de Daniel |
