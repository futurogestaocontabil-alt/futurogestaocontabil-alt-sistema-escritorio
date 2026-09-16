# Referência funcional do ChatSC

Análise feita a partir de cinco capturas de tela enviadas por Gilmar em
15/09/2026. Referência de processo e experiência apenas. Não copiar código,
marca, cores, ícones nem textos do ChatSC.

O que foi observado: caixa de entrada, lista de conversas, conversa aberta,
cabeçalho, painel do contato, menu de atendimento, menu de mensagem e a tela de
configurações de atendimento. Não foram observadas as telas de Departamentos,
Demandas, Tags, Jornadas, Tarefas e Ordens de Serviço por dentro.

## Conceito central: atendimento não é o mesmo que conversa

Esta é a diferença mais importante em relação ao que o sistema tem hoje.

No ChatSC a conversa com um telefone é permanente e dentro dela existem vários
**atendimentos**, cada um com começo, responsável e encerramento. O cabeçalho
mostra "Atend: Gilmar Santos". Ao encerrar, o próprio histórico recebe um
evento: "Gilmar Santos finalizou o atendimento" e "Atendimento encerrado,
14/09/2026 às 21:12, Sem demanda". Depois disso o campo de resposta fica
bloqueado, com a mensagem "Este atendimento não está em andamento", e aparece o
botão "Iniciar novo atendimento".

O encerramento exige classificar a **demanda**, que é o tipo de solicitação
tratada. Quando não há, registra-se "Sem demanda", e existe uma ação específica
"Finalizar sem demanda".

No sistema atual, `conversas` tem um único campo `status` com quatro valores
fixos: Não iniciado, Em atendimento, Aguardando cliente e Finalizado. Não
existe atendimento como objeto, não existe responsável por atendimento, não
existe demanda e não existe histórico de encerramentos.

## Caixa de entrada

Quatro filtros de topo, cada um com contador visível: Fila 33, Ativos 7,
Grupos 0, Finalizados.

- **Fila**: aguardando, sem atendente definido.
- **Ativos**: em andamento, com atendente.
- **Grupos**: conversas de grupo, separadas das individuais.
- **Finalizados**: encerrados.

Filtros adicionais em caixa de seleção: BOT, Ver de todos e Não lidas.
"Ver de todos" indica que por padrão a pessoa vê apenas as suas conversas.

Busca única no topo da lista.

Cada linha da lista traz: avatar, nome da empresa ou do contato, segunda linha
com o contato ou a empresa, prévia da última mensagem com o nome de quem
escreveu, tempo relativo ("há 2 minutos", "há cerca de 5 horas"), contador de
não lidas e as etiquetas da conversa.

## Conversa aberta

Cabeçalho: avatar, nome da empresa, abaixo o nome e cargo do contato
("JOHNHATAN - Proprietário"), o atendente responsável e as etiquetas, com um
botão "+" para acrescentar etiqueta ali mesmo.

Ações do cabeçalho: finalizar, buscar dentro da conversa, menu de três pontos e
recolher ou expandir o painel direito.

Mensagens em balões, com o nome de quem enviou, o texto, o horário e, nas
enviadas, a confirmação de entrega e leitura. Mensagens de áudio aparecem com
reprodutor e controle de velocidade.

**Mensagem enviada pelo celular aparece marcada como "Dispositivo externo".**
Ou seja, a mensagem que Gilmar manda direto do WhatsApp do telefone entra no
histórico e é identificada como enviada pela equipe, não pelo cliente.

Campo de resposta: anexo, mensagens rápidas, texto, assinatura, emoji e
gravação de áudio. A dica do campo é "Digite, cole imagens ou solte arquivos.
Use ! para mensagens rápidas". Colar e arrastar arquivo funcionam direto no
campo.

## Menu do atendimento

Nove ações: Finalizar sem demanda, Mensagens agendadas, Mensagens rápidas,
Jornada do cliente, Salvar contato como, **Transferir atendimento**,
**Transferir para departamento**, Tags e Bloquear contato.

Transferência tem duas formas distintas: para uma pessoa e para um
departamento. Isso atende diretamente a necessidade levantada no Bloco 2, de
Daniel receber a mensagem de cliente já cadastrado e conseguir repassar.

## Menu da mensagem

Seis ações sobre uma mensagem específica: Encaminhar, Remover, Responder,
**Criar tarefa** e **Criar ordem de serviço**.

Ponto importante: a tarefa nasce de uma mensagem, não da conversa inteira. A
mensagem que originou a tarefa fica sendo a evidência.

O sistema atual tem o comando `messageToTask`, e é preciso conferir se ele
guarda a mensagem de origem ou apenas o texto.

## Painel direito

Seis abas: notas, checklist, histórico, contato, aplicativos e configurações.

Aba de notas: lista de notas internas sobre o cliente, com botão "Criar nota".
Estado vazio explica para que servem. O sistema atual não tem notas internas
por conversa.

Aba de contato, dividida em três partes:

- **Perfil**: etiquetas, razão social, CNPJ ou CPF, status do cliente e contato
  vinculado.
- **Empresa**: e-mail, segmento, porte, data de abertura, data de entrada, data
  de saída e motivo da saída.
- **Contato**: nome, WhatsApp, perfil comportamental, cargo, gênero e data de
  nascimento.

Data de entrada, data de saída e motivo da saída são campos de relacionamento,
não de cadastro. Registram quando o cliente entrou na carteira e por que saiu.

## Etiquetas observadas

Nas capturas aparecem: SIMPLES NACIONAL, CLIENTE PRO LAB, COMERCIAL, Influência,
Cautela, Gilmar Santos, PESSOAL GILMAR, Não Identificado, Não Cliente e
CLIENTE MARCILENE.

**Observação crítica.** Essas etiquetas misturam pelo menos cinco eixos
diferentes: regime tributário, tipo de serviço contratado, assunto da conversa,
perfil comportamental, responsável e vínculo com a carteira.

Isso é dívida de organização, não um modelo a copiar. No sistema da Futuro, a
maior parte disso deve virar campo real, preenchido sozinho a partir do cadastro
do cliente:

| Etiqueta observada | Onde deve ficar no sistema da Futuro |
|---|---|
| SIMPLES NACIONAL | Campo regime do cliente, exibido, nunca digitado na conversa |
| CLIENTE PRO LAB | Serviço contratado, vindo do contrato |
| Gilmar Santos | Campo responsável pelo atendimento |
| Não Identificado, Não Cliente | Situação do vínculo entre telefone e cadastro |
| Influência, Cautela | Perfil do contato, campo do cadastro |
| COMERCIAL | Departamento ou assunto do atendimento |

Etiqueta livre deve sobrar apenas para o que não cabe em campo. Caso contrário
a caixa de entrada vira a bagunça que está nas capturas.

## Configurações de atendimento

A tela de configurações separa o que é operação do que é parametrização, que é
exatamente a regra do escopo da Futuro: configuração não aparece na tela
operacional.

Itens do bloco Atendimento observados: Assinatura no atendimento, Bot de
atendimento inicial com direcionamento por departamento, Demandas, Departamentos,
Finalização de atendimento, Mensagem CSAT, Mensagens rápidas e Monitor de
atendimentos aguardando.

Dois merecem atenção:

- **Finalização de atendimento**: define as regras para concluir um
  atendimento. É onde se determina se a demanda é obrigatória.
- **Monitor de atendimentos aguardando**: alerta quando um atendimento espera
  além do limite. Com uma fila de 33 conversas, esse alerta é o que impede o
  cliente de ficar sem resposta.

## Defeito confirmado pelas capturas

O balão "Dispositivo externo" comprova um caso real que o sistema da Futuro
trata errado hoje.

Em `server/index.ts`, o webhook grava toda mensagem com `autor: 'cliente'`, sem
verificar `data.key.fromMe`. A condição de entrada aceita mensagens com
`fromMe` verdadeiro quando o evento é `messages.upsert`, que é justamente o
evento que a Evolution envia.

Consequência: quando Gilmar responde um cliente pelo WhatsApp do celular, a
mensagem entra no histórico atribuída ao cliente. O atendimento passa a mostrar
o contador falando sozinho.

Há um segundo efeito ligado ao primeiro. A Evolution devolve pelo webhook as
mensagens enviadas pela própria API. Como as mensagens são gravadas com
identificador novo a cada vez, corrigir apenas o autor passaria a duplicar toda
mensagem enviada pelo sistema.

Correção proposta, a ser aplicada junto com o Bloco 9:

1. Definir o autor por `data.key.fromMe`: verdadeiro é equipe, falso é cliente.
2. Guardar o identificador da mensagem da Evolution, `data.key.id`, em cada
   mensagem gravada.
3. Ignorar a mensagem quando esse identificador já existir na conversa.
4. Marcar a origem do envio, para distinguir o que saiu pelo sistema do que saiu
   pelo celular, como faz o rótulo "Dispositivo externo".

Não foi corrigido agora porque depende da decisão sobre o modelo de atendimento
do Bloco 9.

## Distância entre o ChatSC e o sistema atual

| Recurso | ChatSC | Sistema da Futuro hoje |
|---|---|---|
| Atendimento com abertura e encerramento | Sim | Não, apenas um campo de situação |
| Demanda obrigatória no encerramento | Sim | Não |
| Fila, ativos, grupos e finalizados | Sim, com contador | Não |
| Ver somente as minhas conversas | Sim | Não |
| Transferir para pessoa | Sim | Não |
| Transferir para departamento | Sim | Não |
| Criar tarefa a partir de uma mensagem | Sim | Existe `messageToTask`, falta conferir a evidência |
| Notas internas | Sim | Não |
| Mensagens rápidas | Sim, com atalho | Não |
| Mensagens agendadas | Sim | Não, e depende de decisão sobre disparo |
| Painel do contato | Sim | Parcial, o cadastro existe mas não aparece na conversa |
| Alerta de espera na fila | Sim | Não |
| Áudio e anexo | Sim | Não, apenas texto |
| Autor correto da mensagem | Sim | Não, defeito descrito acima |

## Pontos a confirmar com Gilmar no Bloco 9

1. Adotar atendimento como objeto com abertura, responsável e encerramento, ou
   manter o campo único de situação.
2. Se adotar, a demanda é obrigatória no encerramento e qual é a lista inicial
   de demandas.
3. Quais as quatro ou cinco filas da caixa de entrada da Futuro.
4. Cada pessoa vê apenas as suas conversas por padrão, ou vê todas.
5. Quem pode transferir, e se existe transferência por departamento além da
   transferência por pessoa.
6. Conversas de grupo entram na caixa ou são ignoradas.
7. Quais etiquetas permanecem livres, depois de transformar em campo o que é
   cadastro.
8. Áudio e anexo entram na primeira versão ou ficam para depois.
9. Mensagens rápidas entram na primeira versão.
10. Existe limite de espera na fila que gere alerta.
