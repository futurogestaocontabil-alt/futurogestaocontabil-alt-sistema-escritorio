# Contábil / Conciliação Bancária

Especificação funcional e técnica v1.0 | Futuro Contabilidade Digital | 07/09/2026

## 1. Entrega e decisão de escopo

Criar uma área integrada ao cadastro do cliente para importar plano de contas e extratos, comparar movimentações bancárias com registros contábeis/financeiros, sugerir partidas, submeter à revisão e exportar um lote para o Alterdata. Este documento é a especificação para desenvolvimento, com backlog e critérios de aceite. Não representa módulo implementado, conciliação executada nem integração homologada.

O Alterdata continua sendo o sistema contábil de destino. A Plataforma Futuro organiza preparação, documentos, revisão e rastreabilidade. A primeira integração será por arquivo, sem gravação direta no banco do Alterdata.

Os trechos entre chaves do pedido são campos de um modelo, não dados reais. Nenhum extrato foi fornecido. Faltam razão contábil, históricos padrão, regras aprovadas do escritório e identificação da versão/configuração do Alterdata. Os anexos são fontes de dados, não autorizações para executar lançamentos ou importar valores.

## 2. O que os anexos confirmam

### Regra implementada na Plataforma Futuro

Cada upload de plano de contas deve criar uma nova versão vinculada ao cliente selecionado. O arquivo de origem permanece no armazenamento privado como evidência. As contas são gravadas com `clienteId` e `planoContabilId`; por isso uma conta não pode ser usada por outra empresa ou versão. O mesmo código pode existir em clientes diferentes, mas não pode se repetir na mesma versão do mesmo plano.

O fluxo é: upload privado do arquivo, criação da versão em **Em análise**, conferência das contas, ativação e substituição automática somente do plano ativo daquele cliente. A ativação requer ao menos uma conta analítica. Versões anteriores ficam como **Substituído** e não são apagadas. A aba **Contábil** já expõe os cadastros de planos e contas com essas travas. A leitura automática do conteúdo de PDF/XLS/CSV/OFX continuará sendo implementada como etapa específica, pois exige parser e validação por formato antes de gravar contas.

### Plano de contas

Fonte: `G:\Meu Drive\PLANO DE CONTAS\MARQUES E BARBOSA.PDF`, relatório de 23 páginas. Extração estruturada: **992 contas**, sendo **875 A** e **117 S**, sem códigos ou classificações duplicados no resultado extraído. A primeira página foi conferida visualmente. Não houve conferência visual individual das 992 linhas; a importação precisa de revisão antes da ativação.

O relatório separa classificação hierárquica, descrição com código entre parênteses, Sub-Conta, periodicidade, Orig., Mov., C.Cus., Tipo e Taxa. O marcador A/S permite propor a distinção analítica/sintética; não confundir a coluna Mov. com essa distinção. A coluna Orig. apresenta D, C e, em seis contas, I. Preservar I como valor original e pedir confirmação de significado antes de interpretar a natureza dessas contas.

| Código observado | Classificação | Descrição | Tipo | Página |
|---|---|---|---|---|
| 42 | 1.1.01.002 | Bancos Conta Movimento | S | 1 |
| 49 | 1.1.01.002.00001 | Banco Bradesco S/A. | A | 1 |
| 77 | 1.1.01.002.00005 | Banco Itaú S/A. | A | 1 |
| 6867 | 1.1.01.002.00007 | BANCO NUBANK | A | 1 |
| 6874 | 1.1.01.002.00008 | BANCO CORA | A | 1 |
| 658 | 2.1.01.001.00001 | Fornecedores a Pagar | A | 11 |
| 861 | 2.1.04.001.00007 | Salários a Pagar | A | 16 |
| 2870 | 3.2.03.002.00001 | Despesas Bancárias | A | 22 |

São exemplos deste cliente, não um plano padrão para os demais. Banco Itaú também aparece no passivo, com outros códigos; vincular por descrição isolada pode classificar incorretamente uma conta de empréstimo como disponibilidade. Os números entre parênteses são candidatos ao código reduzido do exportador, sujeitos à confirmação na empresa Alterdata. Não substituir esses códigos pela classificação pontuada sem homologação.

### Modelo Alterdata

Fonte: `C:\Users\gilma\Downloads\modelo+de+importacao+excel.xls`. Arquivo XLS binário real, não CSV renomeado. Contém Planilha1 com 9 linhas e 10 colunas; Planilha2 e Planilha3 estão vazias. Linha 1 contém cabeçalhos e linhas 2 a 9 contêm exemplos. Datas são células de data do Excel; valores são numéricos. Há código textual `00001` e números de documento com zeros à esquerda.

| Coluna | Cabeçalho exato | Campo interno proposto | Regra de exportação |
|---|---|---|---|
| A | lancto auto | codigoLancamentoAutomatico | Texto. Apenas quando código e regra forem confirmados no destino. |
| B | debito | codigoContaDebito | Texto; conta analítica da versão do plano do cliente. |
| C | credito | codigoContaCredito | Texto; conta analítica da mesma versão. |
| D | data | dataLancamento | Data Excel, apresentação dd/mm/yyyy; sem conversão por fuso. |
| E | valor | valor | Número positivo com duas casas; cálculo interno em centavos. |
| F | cód histórico | codigoHistorico | Código existente no cadastro de históricos do destino. |
| G | complemento historico | complementoHistorico | Texto literal, sem fórmulas; limite a homologar. |
| H | Ccusto debito | centroCustoDebito | Código textual validado quando aplicável. |
| I | Ccusto credito | centroCustoCredito | Código textual validado quando aplicável. |
| J | NrDocumento | numeroDocumento | Texto; preservar zeros e identidade do grupo contábil. |

Os exemplos usam A=`00001`, F=`31`, G=`Teste`, B/C vazios e centro de custo `10` em parte das linhas. Esses valores são exemplos do modelo; não são parâmetros autorizados para MARQUES E BARBOSA. Não replicá-los automaticamente.

A documentação oficial confirma a importação por leiaute Excel e a importância da ordem de colunas, além de agrupar partidas múltiplas pelo número do documento e exigir equilíbrio dos valores. O cabeçalho deve ser excluído da faixa de dados na configuração. Referência: [Alterdata, importação Excel](https://ajuda.alterdata.com.br/bdcc/como-importar-lancamento-para-o-sistema-contabil-em-excel-150435655.html). Essas orientações não comprovam que a configuração da instalação do escritório corresponde ao anexo.

## 3. Navegação e telas

Menu principal: **Contábil / Conciliação Bancária**, rota `/contabil/conciliacao`. Cabeçalho fixo: cliente, empresa Alterdata vinculada, competência, banco/conta e responsável. O usuário deve ver sempre qual cliente e qual conta está tratando.

Abas internas:

1. **Visão geral:** importações, saldos, divergências, movimentos sem vínculo, sugestões aguardando revisão e lotes exportados.
2. **Plano de contas:** árvore, busca por código/descrição, filtro analíticas, alertas de duplicidade, versões e vínculo de contas bancárias.
3. **Extratos:** enviar arquivo, identificar banco/conta/período, mapear colunas, pré-visualizar, conferir totais e confirmar importação.
4. **Conciliação:** extrato à esquerda e razão/títulos à direita. Filtros por data, valor, documento, situação e contraparte. Seleção de um ou vários movimentos; exibição da diferença antes de confirmar.
5. **Lançamentos sugeridos:** data, débito, crédito, valor, histórico, documento, regra aplicada, evidência e revisor. Detalhe lateral mostra arquivo e linha de origem.
6. **Exportação Alterdata:** perfil homologado, prévia A:J, validações, revisão do lote, download e registro do retorno do Alterdata.
7. **Regras e históricos:** regras por cliente, versões, prioridade, condições, contas de destino e modelos de histórico.

Esboço de tela:

```text
Contábil / Conciliação Bancária
Cliente [selecionar]  Competência [AAAA-MM]  Conta [selecionar]
Extrato conferido | Conciliados | Pendentes | Sugestões a revisar

EXTRATO                         RAZÃO / TÍTULOS
Data | Histórico | Valor        Data | Documento | Conta | Valor
[ ] Movimento selecionado       [ ] Registro candidato
                    Diferença: R$ ...
[Vincular] [Dividir/ratear] [Solicitar documento] [Sugerir lançamento]

Detalhe: origem > regra > contas > documentos > revisão > exportação
```

Não mostrar saldo zero quando não informado. Usar “Saldo não informado” e impedir o selo de fechamento conferido.

## 4. Fluxo operacional para a equipe

1. Selecionar cliente e competência. Confirmar responsável e conta bancária.
2. Importar o plano ou escolher uma versão aprovada. Vincular cada conta bancária a uma conta analítica de disponibilidade.
3. Importar o extrato, revisar mapeamento, período, sinais e totais. Confirmar somente após resolver erros bloqueantes.
4. Importar o razão da conta bancária ou selecionar títulos/documentos financeiros disponíveis. Registrar saldo contábil inicial e a origem desse saldo.
5. Conferir os vínculos sugeridos. Resolver duplicidades e selecionar correspondências corretas.
6. Para movimentos ainda não contabilizados, revisar sugestões de débito/crédito e anexar suporte. Solicitar documentos para ambiguidades.
7. Submeter lançamentos ao revisor. Corrigir recusados; aprovar os válidos.
8. Gerar lote para Alterdata, baixar o arquivo e importar na empresa/lote correto.
9. Conferir o retorno no Alterdata e registrar o lote externo, quantidades, totais e eventuais rejeições.

Importante: conciliar com título financeiro não comprova que o lançamento já existe no razão. Separar vínculo financeiro, vínculo contábil e classificação. Sem razão/saldo contábil, oferecer classificação assistida e conferência do extrato, mas não declarar conciliação contábil completa.

## 5. Importação e normalização

### Plano

Aceitar PDF pesquisável, CSV e XLS/XLSX. Em PDF digitalizado, OCR gera candidatos com página e confiança; qualquer erro em código, hierarquia ou tipo exige revisão. Guardar original imutável, hash SHA-256, versão do extrator e texto bruto. Não ativar conta sintética para lançamento. Código, classificação e descrição são campos diferentes, todos preservados como texto.

Validar códigos únicos por cliente/versão, pais existentes, classificação consistente, tipo, caracteres, contas inativas e pendências de extração. Importar nova versão por comparação; não apagar contas usadas em lançamentos. Exibir novas, alteradas e ausentes, sem presumir que ausente significa excluída.

### OFX

Suportar formatos SGML e XML, diferentes quebras de linha e codificações. Extrair instituição, agência quando disponível, ACCTID, moeda, período, FITID, TRNTYPE, DTPOSTED, TRNAMT, NAME, MEMO e CHECKNUM quando presentes; LEDGERBAL/BALAMT/DTASOF são informações de saldo com sua data. Preservar campos brutos. O saldo final não substitui um saldo inicial que o arquivo não contém. Não assumir sinal apenas pelo texto “crédito/débito”; aplicar o contrato do parser e validar com a prévia.

### CSV e XLS/XLSX

Assistente permite selecionar aba, cabeçalho e linhas de dados; mapear data, histórico, documento, valor assinado ou entrada/saída, saldo e identificador. Pré-visualização antes de salvar. Persistir perfil por cliente/banco/formato com versão e amostra de estrutura, sem reusar silenciosamente quando os cabeçalhos mudarem.

Tratar vírgula/ponto decimal, separadores, aspas e histórico multilinha, negativos com parênteses, datas Excel 1900/1904 e data textual. Datas ambíguas e valores com formato misto bloqueiam a confirmação até escolha explícita. Ignorar linhas de saldo/subtotal somente por regra visível, mantendo contagem e motivo. Não executar fórmulas, macros ou links externos; célula crítica com fórmula exige valor validado ou exportação de valores pelo usuário.

### Modelo canônico

Cada movimento contém UUID, organização, cliente, conta bancária, importação, origem (aba/linha ou posição OFX), data bancária, moeda, valor em centavos com sinal, documento, histórico original/normalizado, FITID opcional, hash de conteúdo e situação. A referência bruta é imutável; correções são campos normalizados versionados e auditados.

Uma moeda por conciliação. A primeira versão suporta BRL. Outros códigos de moeda ficam bloqueados até existir política de câmbio e integração homologada. Limites iniciais propostos: 10 MB por arquivo e 50 mil movimentos por importação, ajustáveis após teste de carga.

## 6. Regras de conciliação e lançamentos

| ID | Regra |
|---|---|
| RN01 | Reimportação do mesmo hash para a mesma conta é idempotente. Em arquivos sobrepostos, FITID é único no contexto instituição/conta, nunca global. Mesmo FITID com conteúdo diferente vira conflito. |
| RN02 | Sem identificador estável, data + valor + histórico + documento apenas apontam possível duplicidade. Duas operações legítimas iguais não podem ser eliminadas automaticamente. |
| RN03 | Conferência bancária: saldo inicial + soma dos movimentos assinados = saldo final, em centavos. Saldo contábil ajustado é conferido separadamente, com diferenças temporárias identificadas. |
| RN04 | Correspondência usa cliente, conta, moeda, valor e evidências. Tolerância monetária padrão zero. Janela de datas é configurável e visível; não altera data original nem competência. |
| RN05 | Permitir 1:1, 1:N, N:1 e N:N por alocação de valores. Soma de alocações não pode ultrapassar o valor disponível. Rateio de principal, juros, multa, desconto e tarifa deve fechar exatamente. |
| RN06 | Conciliação parcial é permitida e mostra saldo não alocado. Confirmação exige responsável; desfazer preserva auditoria e bloqueia reutilização de vínculos já exportados sem reabertura controlada. |
| RN07 | Se já existe lançamento no razão, vincular sem gerar uma nova partida. O extrato não autoriza reconhecimento duplicado de receita/despesa. |
| RN08 | Sugestão exige contas analíticas ativas do plano do cliente, valor positivo, data, histórico e origem. Um débito/crédito bancário do extrato deve ser traduzido para a perspectiva da contabilidade. |
| RN09 | Entrada em banco de natureza devedora sugere débito na conta bancária; saída sugere crédito nela. A contrapartida depende da operação e dos documentos, não só do sinal. |
| RN10 | Recebimento de cliente pode baixar contas a receber; pagamento de fornecedor pode baixar obrigação já reconhecida. PIX não é categoria contábil. Sem suporte, manter pendente. |
| RN11 | Transferência entre contas próprias gera um único evento contábil. Vincular os dois lados do extrato para não exportar duas partidas; divergência de data fica identificada. |
| RN12 | Empréstimos, aportes, retiradas, aplicações/resgates e tributos exigem decomposição e regra apropriada. Não classificar automaticamente como receita/despesa. |
| RN13 | Uma regra aprovada pode sugerir tarifa para a conta 2870 neste cliente, mas “Tarifa de Terminais Rodoviários” é outra conta. Nome semelhante não basta para aprovar. |
| RN14 | Saldo e partidas devem fechar em centavos. Não criar conta transitória, centavo de ajuste ou receita/despesa fictícia para zerar diferença. |
| RN15 | Competência bloqueada impede alteração e exportação nova; reabertura exige sócio, motivo e trilha. Correção de lote já importado segue estorno/retificação controlados. |

Motor de sugestão: primeiro vínculos/documentos explícitos; depois regras aprovadas do cliente com prioridade e vigência; depois sugestões por padrão. Empates vão para revisão. Mostrar regra, versão, condições e evidências. Confiança é um indicador de evidência, não probabilidade estatística sem calibração. Nesta primeira versão nenhuma sugestão é aprovada automaticamente.

Correção manual não deve virar regra global automaticamente. Oferecer “Salvar regra para este cliente” com escopo, prioridade e revisão explícitos. IA, se adicionada depois, apenas propõe entre códigos existentes e não autoriza lançamento. Não enviar extratos a provedor externo sem configuração e autorização específicas.

Histórico proposto, ainda sujeito ao padrão do escritório: descrição objetiva da operação, contraparte quando identificada, referência do documento, banco e competência. Guardar identificador de rastreio internamente; não depender de texto truncado para idempotência.

## 7. Revisão, exportação e homologação

Estados separados:

- Importação: recebida, em análise, aguardando mapeamento, validada, confirmada ou rejeitada.
- Movimento: não vinculado, parcialmente vinculado ou vinculado; classificação é estado separado.
- Lançamento: sugerido, em revisão, aprovado ou recusado. Alteração em aprovado retorna à revisão.
- Lote: preparado, validado, exportado, importado confirmado, importado parcialmente ou rejeitado. Download não comprova importação.

O revisor pode trocar contas, data justificada, histórico, documento, centros de custo e rateios. Exigir motivo para substituir uma regra aplicada e para reabrir aprovação. Aprovação em lote exibe quantidade, débitos, créditos, exceções e cliente/competência; bloquear seleção entre clientes diferentes.

Perfil de saída `alterdata-excel-v1`: primeira versão gera **XLS binário** com A:J na ordem do anexo. Não renomear XLSX para XLS. Limitar a 65.535 linhas de dados por planilha e quebrar lotes sem dividir um documento múltiplo. Preservar código com zeros como texto; datas como datas; valor como número; texto como texto, neutralizando fórmulas. Não anexar planilhas internas ou informações bancárias desnecessárias.

Implementar dois modos distintos, homologados separadamente:

1. **Partidas explícitas:** débito e crédito definidos pela revisão; não preencher lançamento automático sem necessidade comprovada. Campos opcionais e valores neutros dependem do perfil homologado.
2. **Lançamento automático do Alterdata:** só habilitar se o cadastro desse código, sua máscara e seu comportamento forem confirmados. O `00001` do exemplo não prova validade para esta empresa.

Para partidas múltiplas, usar grupo documental exclusivo, mesmo documento para todas as linhas do grupo, igualdade exata entre débitos e créditos e regra homologada para lado vazio/zero. Não gerar esse formato antes do teste no destino. Número externo de documento e identificador interno do grupo devem permanecer distintos quando necessário.

Antes do download: cliente/empresa, versão do plano, contas, datas, valores, equilíbrio, histórico/centro de custo exigidos, aprovações, ausência de duplicidade de exportação e perfil homologado. Gerar arquivo imutável, hash, revisão, totais e manifesto privado com ligação a cada movimento/lançamento. Nova tentativa de download retorna o mesmo artefato; nova revisão recebe novo lote.

Homologar em empresa/lote de teste do Alterdata: partida simples, transferência, recebimento que baixa cliente, pagamento que baixa fornecedor, rateio com juros/tarifa, código com zeros, texto acentuado e reimportação controlada. Conferir contas, datas, históricos, valores, centros, documentos e totais no destino. Registrar evidência e versão instalada. Somente após isso rotular o perfil como “Homologado no Alterdata”.

## 8. Arquitetura proposta e integração com o sistema atual

Base existente verificada: React/Vite/TypeScript, servidor Node local em 127.0.0.1:4318, PGlite em `.local-data`, autenticação local e artefatos Supabase preparados, sem implantação remota. Os papéis existentes são sócio, operação, administrativo e leitura, com departamentos. A versão/build, banco interno e usuários específicos do Alterdata não foram informados; não inferir SQL Server, acesso direto ou licença de API.

Frontend: páginas em `src/pages/accounting`, componentes de árvore, assistente, grade de conciliação e revisor. Servidor: `server/accounting` para parsers, validações, matching, partidas e exportador. Processamento pesado em worker com progresso e cancelamento; nunca travar a interface. Selecionar bibliotecas mantidas para OFX, leitura XLS/BIFF e XLSX/OOXML e escrita XLS, com prova de leitura/retorno antes de fechar dependências.

Evitar inserir milhares de movimentos no JSON global retornado por `/api/state`. Criar tabelas e endpoints paginados próprios no PGlite, com migrações equivalentes para Supabase/PostgreSQL. SQL é acessível somente pelo servidor. Usar transações, revisão otimista, chaves de idempotência e restrições no banco, além da validação de interface.

| Entidade | Dados e vínculos principais |
|---|---|
| accounting_plan_versions | organização, cliente, origem/hash, versão, vigência, estado, revisor |
| accounting_accounts | versão, código texto, classificação, pai, descrição, tipo, natureza original, ativa, página/linha |
| bank_accounts | organização, cliente, banco/agência/conta protegidos, moeda, conta contábil vinculada |
| statement_imports / statement_transactions | conta, arquivo, parser/perfil, período, saldos com origem, linha, FITID, valor centavos, dados brutos |
| ledger_imports / ledger_entries | razão de referência, conta, saldo inicial, linhas, documento e chave externa |
| reconciliation_groups / reconciliation_allocations | conta/competência, lados vinculados, valor alocado, situação, autor e revisão |
| classification_rules / history_templates | cliente, condições, prioridade, contas, modelo de histórico, versão e vigência |
| journal_entries / journal_lines | cabeçalho/documento, partidas D/C, valor centavos, conta, centros e evidências |
| journal_source_allocations | ligação N:N entre movimentos e lançamentos com valores; impede dupla utilização |
| review_events / export_batches / export_items | revisão, resultado, justificativa, hash, snapshot, artefato, retorno do destino |

Todas as tabelas incluem `organizacao_id`; vínculos compostos também validam cliente/organização para impedir associações cruzadas. Códigos únicos por plano e cliente, FITID único por conta quando confiável e deduplicação por hash de arquivo. Índices por organização/cliente/competência/conta/data/status. Valores `bigint` em centavos ou `numeric(18,2)` com uma única política, nunca float. Cada lançamento tem soma D=C validada no commit transacional.

Endpoints propostos, todos autenticados:

```text
POST /api/accounting/plans/import             -> job e prévia
POST /api/accounting/plans/:id/approve        -> versão ativa
POST /api/accounting/statements/import        -> job e perfil de leitura
POST /api/accounting/imports/:id/confirm      -> movimentos persistidos
POST /api/accounting/ledger/import            -> razão de referência
GET  /api/accounting/transactions             -> filtros e paginação
POST /api/accounting/reconciliations          -> alocações + expectedRevision
POST /api/accounting/suggestions              -> propostas com evidências
POST /api/accounting/journals/:id/review       -> decisão auditada
POST /api/accounting/exports                  -> lote e artefato privados
POST /api/accounting/exports/:id/result        -> confirmação/rejeição externa
```

Respostas padronizadas: `409` para conflito/duplicidade, `422` com erros por linha/campo, `403` para permissão e `413` para limites. Cliente recebe progresso e mensagem acionável, nunca stack trace ou segredo.

Integrações internas: cliente fornece cadastro; Documentos guarda comprovantes privados; Tarefas recebe pendências de documentação; Financeiro pode fornecer títulos explicitamente vinculados ao cliente, nunca confundir contas do escritório com contas de seus clientes. A tarefa recorrente de conciliação abre esta área no contexto cliente/competência e só conclui mediante conferência definida. Exportação aprovada pode alimentar fechamento contábil, mas não elimina suas outras dependências/checklists.

## 9. Segurança e rastreabilidade

Sócio configura perfis e regras e aprova; operação do departamento Contábil prepara e concilia; administrativo coleta documentos e acompanha pendências sem aprovação contábil; leitura consulta apenas o escopo autorizado. Capacidade de revisão deve ser concedida explicitamente. Quando não houver dupla revisão possível, aprovação pelo próprio sócio requer registro dessa exceção.

RLS ativo em todas as tabelas no Supabase, com isolamento por organização e acesso do usuário ao cliente/departamento. Testar usuário A versus B, links, downloads, jobs e exportações. Na edição local, tabelas privadas com RLS e autorização efetiva no servidor, considerando que a conexão proprietária pode bypassar RLS. Nunca expor service_role no frontend.

Arquivos e artefatos fora de public, nome interno aleatório, autorização em cada acesso, hash e backup protegido. Validar assinatura do arquivo além da extensão, bloquear macros e fórmulas executáveis, limitar tempo/memória, tamanho descompactado, número de entradas ZIP e linhas. Parser XML sem entidades externas. Logs registram IDs, decisão, autor, data e revisões, não cópias integrais de dados bancários. Política de retenção configurada pelo escritório; não apagar evidências de lote importado silenciosamente.

## 10. Backlog ordenado e aceite

| Item | Entrega | Dependência | Aceite principal |
|---|---|---|---|
| CB01 | Navegação, contexto e permissões | cadastro/autenticação | cliente e conta sempre visíveis; acesso indevido negado |
| CB02 | Plano versionado e vínculo bancário | CB01 | conta sintética bloqueada; códigos preservados; revisão da extração |
| CB03 | Upload e assistente OFX/CSV/XLS/XLSX | CB01 | originais imutáveis; erros por linha; mapeamento explícito |
| CB04 | Deduplicação e saldos | CB03 | reimportação idempotente; operações iguais legítimas preservadas |
| CB05 | Importação de razão e títulos | CB02/03 | origem e saldo contábil identificados; sem razão não declara fechamento |
| CB06 | Conciliação e rateios | CB04/05 | nenhuma sobrealocação; reversão auditada; diferenças visíveis |
| CB07 | Regras, históricos e sugestões | CB02/06 | conta sempre existe; ambiguidade fica pendente; nada autoaprovado |
| CB08 | Revisão e competência bloqueada | CB07 | editar aprovado exige nova aprovação; alteração concorrente retorna conflito |
| CB09 | Exportador XLS e manifesto | CB08 + parâmetros Alterdata | A:J corretas; zeros preservados; valores e equilíbrio conferidos |
| CB10 | Homologação Alterdata | CB09 + ambiente de teste | lote conferido no destino e perfil registrado como homologado |
| CB11 | Integração Documentos/Tarefas/Financeiro | CB06/08 | contexto do cliente preservado, sem dupla contabilização |
| CB12 | Testes de carga, recuperação e segurança | todas | isolamento, interrupção/reinício e backup/restauração aprovados |

Casos obrigatórios: OFX SGML e XML; arquivo sobreposto; mesmo valor/data legítimos; CSV multilinha; decimal ambíguo; XLS real; XLSX com fórmula; datas inválidas; saldo ausente; diferença de R$ 0,01; transferência com dois extratos; baixa parcial; N:N; conta sintética; conta de outro cliente; conta desativada após sugestão; dupla exportação concorrente; rejeição parcial Alterdata; reabertura; tentativa de acesso fora do departamento.

Metas iniciais propostas para homologação em máquina acordada: importação de 10 mil linhas em até 30 segundos, filtros paginados em até 2 segundos e progresso visível em até 2 segundos. Medir antes de prometer desempenho; interrupção não pode deixar lote parcialmente confirmado.

## 11. Dados necessários para concluir a implantação

1. Um extrato de cada formato e banco a suportar, com conta/período identificados, e razão correspondente para teste de conciliação.
2. Produto e versão/build do Alterdata, empresa de teste, leiaute selecionado e indicação de uso de código reduzido versus classificação.
3. Cadastro de históricos e centros de custo; significado e existência de `00001`, `31` e `10` se esses códigos forem usados.
4. Confirmação das 992 contas extraídas e significado de Orig.=I; plano vigente e vínculo de cada conta bancária.
5. Regras do escritório, política de competência/tolerância, revisores e tratamento de exceções.

A ausência desses dados não impede desenvolver importação, revisão e regras estruturais. Impede afirmar conciliação real concluída, gerar partidas definitivas ou declarar compatibilidade homologada com o Alterdata.
