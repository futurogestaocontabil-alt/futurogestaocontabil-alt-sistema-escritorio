/**
 * Modelos de proposta e de contrato da Futuro Contabilidade Digital.
 *
 * A estrutura e a redação jurídica vêm dos modelos oficiais entregues por
 * Gilmar em 15/09/2026. Proposta e contrato são documentos diferentes e têm
 * modelos separados.
 *
 * Nenhum dado de cliente entra aqui. Os dados do escritório também não: eles
 * ficam em configurações, preenchidos no próprio sistema, nunca no código.
 *
 * Uma alteração de modelo cria nova versão. Documento já gerado ou assinado
 * guarda a versão que usou e não muda.
 */

export const MODELO_PROPOSTA_VERSAO = 'proposta-v1';
export const MODELO_CONTRATO_VERSAO = 'contrato-v1';

/** Campo que o gerador precisa preencher. `origem` diz de onde ele vem. */
export interface CampoModelo {
 chave: string;
 rotulo: string;
 origem: 'escritorio' | 'cliente' | 'socio' | 'proposta' | 'contrato' | 'simulacao';
 obrigatorio: boolean;
 /** Quando o modelo só exige em certas situações, por exemplo inscrição estadual. */
 condicional?: string;
}

export interface SecaoModelo {
 id: string;
 titulo: string;
 /** Texto jurídico ou comercial. `{{campo}}` é substituído na geração. */
 corpo: string;
 /** Seção que o sócio pode reescrever sem criar nova versão do modelo. */
 editavel?: boolean;
}

export interface ModeloDocumento {
 id: string;
 tipo: 'proposta' | 'contrato';
 nome: string;
 versao: string;
 campos: CampoModelo[];
 secoes: SecaoModelo[];
}

const campo = (chave: string, rotulo: string, origem: CampoModelo['origem'], obrigatorio = true, condicional?: string): CampoModelo =>
 ({ chave, rotulo, origem, obrigatorio, ...(condicional ? { condicional } : {}) });

// ---------------------------------------------------------------------------
// Dados do escritório. Ficam em configurações, nunca fixos no código.
// ---------------------------------------------------------------------------
export const CAMPOS_ESCRITORIO: CampoModelo[] = [
 campo('escritorioRazaoSocial', 'Razão social do escritório', 'escritorio'),
 campo('escritorioNomeFantasia', 'Nome fantasia', 'escritorio', false),
 campo('escritorioCnpj', 'CNPJ do escritório', 'escritorio'),
 campo('escritorioEndereco', 'Endereço do escritório', 'escritorio'),
 campo('escritorioCidade', 'Cidade do escritório', 'escritorio'),
 campo('escritorioUf', 'Estado do escritório', 'escritorio'),
 campo('escritorioCep', 'CEP do escritório', 'escritorio'),
 campo('escritorioTelefone', 'Telefone do escritório', 'escritorio'),
 campo('escritorioEmail', 'E-mail do escritório', 'escritorio'),
 campo('contadorNome', 'Contador responsável', 'socio'),
 campo('contadorCpf', 'CPF do contador', 'socio'),
 campo('contadorCrc', 'CRC do contador', 'socio'),
 campo('contadorEstadoCivil', 'Estado civil do contador', 'socio', false),
 campo('contadorProfissao', 'Profissão do contador', 'socio', false),
 campo('contadorEndereco', 'Endereço do contador', 'socio', false),
 campo('escritorioForo', 'Foro padrão', 'escritorio', false),
 campo('escritorioRodape', 'Rodapé padrão', 'escritorio', false),
 campo('escritorioConfidencialidade', 'Texto de confidencialidade', 'escritorio', false),
 campo('escritorioLogotipo', 'Logotipo', 'escritorio', false),
];

// ---------------------------------------------------------------------------
// Dados da empresa contratante, vindos do cadastro do cliente ou do lead.
// ---------------------------------------------------------------------------
export const CAMPOS_CLIENTE: CampoModelo[] = [
 campo('razaoSocial', 'Razão social', 'cliente'),
 campo('nomeFantasia', 'Nome fantasia', 'cliente', false),
 campo('cnpj', 'CNPJ', 'cliente'),
 campo('inscricaoEstadual', 'Inscrição estadual', 'cliente', false, 'Quando houver'),
 campo('inscricaoMunicipal', 'Inscrição municipal', 'cliente', false, 'Quando houver'),
 campo('endereco', 'Endereço completo', 'cliente'),
 campo('cep', 'CEP', 'cliente'),
 campo('cidade', 'Cidade', 'cliente'),
 campo('uf', 'Estado', 'cliente'),
 campo('telefone', 'Telefone', 'cliente'),
 campo('email', 'E-mail', 'cliente'),
 campo('representanteLegal', 'Representante legal', 'cliente'),
 campo('cpfRepresentante', 'CPF do representante', 'cliente'),
 campo('cargoRepresentante', 'Cargo do representante', 'cliente', false),
 campo('estadoCivilRepresentante', 'Estado civil do representante', 'cliente', false, 'Quando o modelo exigir'),
 campo('profissaoRepresentante', 'Profissão do representante', 'cliente', false, 'Quando o modelo exigir'),
 campo('enderecoRepresentante', 'Endereço do representante', 'cliente', false, 'Quando o modelo exigir'),
 campo('socios', 'Sócios, com nome, CPF e cargo', 'cliente', false),
 campo('atividade', 'Atividade', 'cliente'),
 campo('regime', 'Regime tributário', 'cliente'),
];

// ---------------------------------------------------------------------------
// Modelo de proposta comercial.
// ---------------------------------------------------------------------------
export const MODELO_PROPOSTA: ModeloDocumento = {
 id: 'modelo-proposta',
 tipo: 'proposta',
 nome: 'Proposta comercial',
 versao: MODELO_PROPOSTA_VERSAO,
 campos: [
  ...CAMPOS_ESCRITORIO, ...CAMPOS_CLIENTE,
  campo('numeroProposta', 'Número da proposta', 'proposta'),
  campo('dataEmissao', 'Data de emissão', 'proposta'),
  campo('validade', 'Validade', 'proposta'),
  campo('plano', 'Plano escolhido', 'proposta'),
  campo('faturamento', 'Faturamento informado', 'simulacao'),
  campo('servicosIncluidos', 'Serviços incluídos no plano', 'proposta'),
  campo('servicosAdicionais', 'Serviços adicionais', 'proposta', false),
  campo('valorOriginal', 'Valor original', 'simulacao'),
  campo('descontoValor', 'Desconto aplicado', 'proposta', false),
  campo('descontoPercentual', 'Percentual de desconto', 'proposta', false),
  campo('valorFinal', 'Valor final mensal', 'proposta'),
  campo('condicaoPagamento', 'Condição de pagamento', 'proposta'),
  campo('diaVencimento', 'Vencimento escolhido', 'proposta'),
  campo('regraProRata', 'Regra de pró-rata', 'proposta', false),
  campo('dataInicio', 'Data prevista de início', 'proposta'),
  campo('responsavelComercial', 'Responsável comercial', 'proposta'),
  campo('observacoes', 'Observações', 'proposta', false),
  campo('premissas', 'Premissas da proposta', 'proposta', false),
  campo('servicosNaoIncluidos', 'Serviços não incluídos', 'proposta', false),
  campo('documentosNecessarios', 'Documentos necessários', 'proposta', false),
  campo('prazoInicio', 'Prazo para início', 'proposta', false),
 ],
 secoes: [
  { id: 'capa', titulo: 'Proposta comercial', corpo: '{{escritorioRazaoSocial}}\nProposta {{numeroProposta}}\nPreparado para: {{razaoSocial}}\nEmitida em {{dataEmissao}}. Válida até {{validade}}.' },
  { id: 'sobre', titulo: 'Sobre nós', editavel: true, corpo: 'Contabilidade consultiva para empresas em crescimento. A equipe une competência técnica e atendimento próximo, para dar previsibilidade fiscal e segurança nas decisões do negócio.' },
  { id: 'identificacao', titulo: 'Identificação', corpo: 'CLIENTE\n{{razaoSocial}}\nCNPJ: {{cnpj}}\nE-mail: {{email}}\n\nPRESTADOR\n{{escritorioRazaoSocial}}\nCNPJ: {{escritorioCnpj}}\nE-mail: {{escritorioEmail}}' },
  { id: 'criterios', titulo: 'Critérios do cliente', corpo: 'Faturamento informado: {{faturamento}}\nTributação: {{regime}}\nAtividade: {{atividade}}' },
  { id: 'plano', titulo: 'Plano selecionado', corpo: 'Plano {{plano}}\n\nServiços incluídos:\n{{servicosIncluidos}}' },
  { id: 'adicionais', titulo: 'Serviços adicionais selecionados', corpo: '{{servicosAdicionais}}' },
  { id: 'investimento', titulo: 'Investimento', corpo: 'Valor original: {{valorOriginal}}\nDesconto aplicado: {{descontoValor}} ({{descontoPercentual}})\nValor final mensal: {{valorFinal}}\n\nCondição de pagamento: {{condicaoPagamento}}\nVencimento: dia {{diaVencimento}}\nPró-rata: {{regraProRata}}\nInício previsto: {{dataInicio}}\nValidade da proposta: {{validade}}' },
  { id: 'nao-incluidos', titulo: 'Serviços não incluídos', editavel: true, corpo: '{{servicosNaoIncluidos}}' },
  { id: 'premissas', titulo: 'Premissas da proposta', editavel: true, corpo: '{{premissas}}\n\nEsta proposta é comercial. Não constitui cálculo de tributos nem promessa de economia tributária. Qualquer oportunidade identificada depende de análise documental.' },
  { id: 'documentos', titulo: 'Documentos necessários', editavel: true, corpo: '{{documentosNecessarios}}' },
  { id: 'proximos-passos', titulo: 'Próximos passos', editavel: true, corpo: '1. Aceite a proposta\n2. Envie a documentação\n3. Assine o contrato\n4. Inicie os serviços\n\nPrazo para início: {{prazoInicio}}' },
  { id: 'encerramento', titulo: 'Encerramento', corpo: 'Responsável comercial: {{responsavelComercial}}\n{{observacoes}}\n\n{{escritorioRazaoSocial}} · {{escritorioTelefone}} · {{escritorioEmail}}' },
 ],
};

// ---------------------------------------------------------------------------
// Modelo de contrato. A redação e a ordem seguem os modelos oficiais.
// Alterar qualquer cláusula exige nova versão e aprovação do sócio.
// ---------------------------------------------------------------------------
export const MODELO_CONTRATO: ModeloDocumento = {
 id: 'modelo-contrato',
 tipo: 'contrato',
 nome: 'Contrato de prestação de serviços contábeis',
 versao: MODELO_CONTRATO_VERSAO,
 campos: [
  ...CAMPOS_ESCRITORIO, ...CAMPOS_CLIENTE,
  campo('numeroContrato', 'Número do contrato', 'contrato'),
  campo('numeroProposta', 'Número da proposta aceita', 'contrato'),
  campo('versaoProposta', 'Versão da proposta', 'contrato'),
  campo('dataContrato', 'Data do contrato', 'contrato'),
  campo('dataInicio', 'Data de início', 'contrato'),
  campo('plano', 'Plano contratado', 'contrato'),
  campo('servicosContratados', 'Serviços contratados', 'contrato'),
  campo('servicosAdicionais', 'Serviços adicionais', 'contrato', false),
  campo('valorMensal', 'Valor mensal', 'contrato'),
  campo('descontoAprovado', 'Desconto aprovado', 'contrato', false),
  campo('diaVencimento', 'Dia de vencimento', 'contrato'),
  campo('regraProRata', 'Regra de pró-rata', 'contrato', false),
  campo('limiteFuncionarios', 'Limite de funcionários do departamento pessoal', 'contrato', false),
  campo('avisoPrevioDias', 'Aviso prévio de rescisão, em dias', 'contrato'),
 ],
 secoes: [
  { id: '01-partes', titulo: '1. Identificação das partes', corpo: 'CONTRATANTE\n{{razaoSocial}}, {{endereco}}, {{cidade}}/{{uf}}, CEP {{cep}}.\nCNPJ: {{cnpj}}\nRepresentado por {{representanteLegal}}, {{estadoCivilRepresentante}}, {{profissaoRepresentante}}, CPF {{cpfRepresentante}}, endereço {{enderecoRepresentante}}.\n\nCONTRATADO\n{{escritorioRazaoSocial}}, {{escritorioEndereco}}, {{escritorioCidade}}/{{escritorioUf}}, CEP {{escritorioCep}}.\nCNPJ {{escritorioCnpj}}, CRC {{contadorCrc}}.\nRepresentado pelo sócio titular {{contadorNome}}, {{contadorEstadoCivil}}, {{contadorProfissao}}, CPF {{contadorCpf}}, endereço {{contadorEndereco}}.' },
  { id: '02-objeto', titulo: '2. Objeto do contrato', corpo: 'O profissional contratado obriga-se a prestar seus serviços profissionais ao contratante nas áreas contábil, fiscal ou tributária e trabalhista ou departamento pessoal, quando aplicável, conforme o plano {{plano}} contratado.' },
  { id: '03-servicos', titulo: '3. Serviços contratados', corpo: 'Área contábil: escrituração contábil mensal com base nos documentos fornecidos pelo CONTRATANTE; classificação, conciliação e lançamento de documentos contábeis; elaboração de balancetes, razão, diário e demonstrações contábeis obrigatórias; elaboração do Balanço Patrimonial e da Demonstração do Resultado do Exercício; entrega das obrigações acessórias contábeis exigidas pela legislação vigente.\n\nÁrea fiscal e tributária: apuração mensal dos tributos federais, estaduais e municipais; emissão das guias de recolhimento; escrituração fiscal de notas fiscais de entrada e saída; entrega das obrigações acessórias fiscais, incluindo PGDAS-D quando aplicável, EFD Contribuições, EFD ICMS/IPI, DCTF e DEFIS, conforme o regime tributário da empresa; orientação básica quanto ao enquadramento e cumprimento das obrigações tributárias.\n\nÁrea trabalhista e departamento pessoal, quando aplicável: elaboração da folha de pagamento mensal; processamento de admissões, rescisões e férias; apuração de encargos sociais de INSS, FGTS e IRRF; emissão de guias de recolhimento trabalhistas e previdenciárias; envio das obrigações acessórias trabalhistas, incluindo eSocial, EFD-Reinf e DCTFWeb.\n\nRegistros de empregados e serviços correlatos com limite estabelecido entre as partes de {{limiteFuncionarios}} funcionários.\n\nServiços contratados no plano: {{servicosContratados}}\nServiços adicionais contratados: {{servicosAdicionais}}' },
  { id: '04-nao-incluidos', titulo: '4. Serviços não incluídos', corpo: 'Todos os serviços extraordinários não contratados que forem necessários ou solicitados pelo contratante serão cobrados à parte, com preços previamente convencionados. Enquadram-se nesta hipótese, entre outros: alterações contratuais, abertura, baixa e transferência de empresas, regularizações e atualizações cadastrais em órgãos governamentais, emissão de certidões, parcelamento de débitos tributários e seu acompanhamento, recuperação de créditos tributários, análise e regularização de obrigações acessórias ou tributos em atraso, retificação de declarações já entregues, serviços de segurança e saúde no trabalho, atendimento a processos trabalhistas e administrativos, relatórios personalizados fora do escopo padrão, consultoria de planejamento tributário e estratégico, autenticação, registro e encadernação de livros, declarações específicas e Imposto de Renda Pessoa Física dos sócios ou administradores.\n\nOs valores de cada serviço extraordinário serão previamente apresentados e acordados entre as partes, considerando a complexidade do trabalho, o volume de informações envolvidas e o prazo de execução exigido.' },
  { id: '05-obrigacoes-contratada', titulo: '5. Obrigações da contratada', corpo: 'Assume inteira responsabilidade pelos serviços contratados. Obriga-se a entregar ao contratante, mediante protocolo, os documentos e demonstrações produzidos.\n\nElaboração da contabilidade de acordo com as Normas Brasileiras de Contabilidade, emissão de balancetes, elaboração de Balanço Patrimonial e demais demonstrações contábeis obrigatórias. Orientação e controle de aplicação dos dispositivos legais vigentes, federais, estaduais ou municipais. Elaboração dos registros fiscais obrigatórios, eletrônicos ou não, perante os órgãos municipais, estaduais e federais. Atendimento às demais exigências previstas na legislação e aos eventuais procedimentos fiscais.\n\nElaboração da folha de pagamento dos empregados e de pró-labore, das guias de recolhimento dos encargos sociais e tributos afins, além de elaboração, orientação e controle da aplicação dos preceitos da Consolidação das Leis do Trabalho e daqueles atinentes à Previdência Social.\n\nPARÁGRAFO PRIMEIRO. Responsabilizar-se-á o CONTRATADO por todos os documentos a ele entregues pelo contratante, enquanto permanecerem sob sua guarda para a consecução dos serviços pactuados, salvo comprovados casos fortuitos e motivos de força maior.' },
  { id: '06-obrigacoes-contratante', titulo: '6. Obrigações do contratante', corpo: 'O CONTRATANTE se obriga a preparar, mensalmente, toda a documentação fisco-contábil e de pessoal, que deverá ser disponibilizada ao contratado em tempo hábil, conforme cronograma pactuado entre as partes, a fim de que possa executar seus serviços em conformidade com o citado neste instrumento.\n\nPARÁGRAFO SEGUNDO. O CONTRATANTE tem ciência da Lei 9.613/98, alterada pela Lei 12.683/2012, especificamente no que trata da lavagem de dinheiro, regulamentada pela Resolução CFC nº 1.445/13 do Conselho Federal de Contabilidade.\n\nAntes do encerramento do exercício social, fornecer ao CONTRATADO a Carta de Responsabilidade da Administração.\n\nAs orientações dadas pelo CONTRATADO deverão ser seguidas pelo contratante, eximindo-se o primeiro das consequências da não observância do seu cumprimento.\n\nO CONTRATANTE informa que é de sua responsabilidade a administração dos controles internos adotados pela empresa e que eles estão adequados ao tipo de atividade e volume de transações, declarando que: não realizará nenhum tipo de operação que possa ser considerada ilegal frente à legislação vigente; os documentos encaminhados à contabilidade estão revestidos de total idoneidade; as informações geradas no sistema de gestão e controles internos da empresa são realizadas com documentação adequada, sendo de inteira responsabilidade do CONTRATANTE todo o conteúdo do banco de dados e arquivos gerados e encaminhados à contabilidade; não tem conhecimento de fatos que possam afetar as demonstrações contábeis ou a continuidade das operações da empresa.' },
  { id: '07-documentos', titulo: '7. Documentos e informações que o cliente deve enviar', corpo: 'Notas fiscais de entrada e de saída, extratos de todas as contas bancárias, comprovantes de despesas, movimentações de pessoal, controle de ponto quando houver, e demais documentos exigidos pela legislação aplicável ao regime tributário da empresa.' },
  { id: '08-prazos', titulo: '8. Prazos de envio de documentos', corpo: 'A documentação deve ser disponibilizada em tempo hábil, conforme cronograma pactuado entre as partes.\n\nPARÁGRAFO ÚNICO. As multas decorrentes da entrega fora do prazo por culpa do contratante serão de sua responsabilidade.' },
  { id: '09-honorarios', titulo: '9. Honorários', corpo: 'O CONTRATANTE pagará ao CONTRATADO pelos serviços prestados os honorários mensais de {{valorMensal}}, referentes ao plano {{plano}}. Desconto aprovado: {{descontoAprovado}}.\n\nPARÁGRAFO ÚNICO. Os valores dos honorários estabelecidos neste contrato serão reajustados anualmente, no mês de janeiro, com base na variação do Índice Nacional de Preços ao Consumidor Amplo, IPCA, apurado pelo IBGE, considerando-se o índice acumulado nos últimos doze meses anteriores ao reajuste. Na hipótese de extinção do IPCA, será adotado outro índice oficial que venha a substituí-lo ou, inexistindo substituto direto, outro indicador oficial de inflação que melhor reflita a variação do custo econômico do período. O percentual apurado será aplicado sobre o valor vigente dos honorários mensais, sendo eventuais arredondamentos e ajustes comunicados previamente ao contratante.' },
  { id: '10-pagamento', titulo: '10. Vencimento e forma de pagamento', corpo: 'Vencimento todo dia {{diaVencimento}} de cada mês.\n\nNo mês de dezembro de cada ano será cobrado o equivalente a um honorário mensal, por conta do encerramento do Balanço Patrimonial e demais obrigações anuais.' },
  { id: '11-pro-rata', titulo: '11. Cobrança pró-rata', corpo: '{{regraProRata}}' },
  { id: '12-reajuste', titulo: '12. Reajuste', corpo: 'Anual, em janeiro, pelo IPCA acumulado nos doze meses anteriores, conforme a cláusula 9.' },
  { id: '13-adicionais', titulo: '13. Serviços adicionais', corpo: 'Serviços extraordinários são cobrados à parte, com preço previamente acordado, conforme a cláusula 4.' },
  { id: '14-atraso', titulo: '14. Atraso e inadimplência', corpo: 'No caso de atraso no pagamento dos honorários, incidirá multa de 2% e juros de 1% ao mês.\n\nPersistindo o atraso por período de três meses, o CONTRATADO poderá rescindir o contrato por motivo justificado, eximindo-se de qualquer responsabilidade a partir da data da rescisão.' },
  { id: '15-rescisao', titulo: '15. Rescisão', corpo: 'Este instrumento é feito por tempo indeterminado, iniciando-se em {{dataInicio}}, podendo ser rescindido em qualquer época, por qualquer uma das partes, mediante aviso prévio de {{avisoPrevioDias}} dias, por escrito.\n\nPARÁGRAFO PRIMEIRO. A parte que não comunicar por escrito a intenção de rescindir o contrato, ou efetuá-la de forma sumária, fica obrigada ao pagamento de multa compensatória no valor de uma parcela mensal dos honorários vigentes à época.\n\nPARÁGRAFO SEGUNDO. O rompimento do vínculo contratual obriga as partes à celebração de distrato com a especificação da cessação das responsabilidades dos contratantes.\n\nPARÁGRAFO TERCEIRO. O CONTRATADO obriga-se a entregar os documentos, livros contábeis e fiscais e arquivos eletrônicos ao contratante, ou a outro profissional da contabilidade por ele indicado, após a assinatura do distrato entre as partes.' },
  { id: '16-responsabilidade', titulo: '16. Responsabilidade profissional', corpo: 'O CONTRATADO responde pelos serviços contratados nos termos da legislação profissional aplicável e das Normas Brasileiras de Contabilidade.' },
  { id: '17-confidencialidade', titulo: '17. Confidencialidade', corpo: '{{escritorioConfidencialidade}}' },
  { id: '18-lgpd', titulo: '18. Proteção de dados pessoais', corpo: 'No que toca aos dados, a CONTRATADA possui processos internos de governança para a proteção dos dados eventualmente armazenados em razão da execução e utilização em seus negócios relacionados aos serviços contratados, devendo a CONTRATANTE observar a LGPD e as premissas de governança com seus colaboradores e prestadores de serviços regularmente aceitas no tratamento dos dados obtidos.\n\nAs partes declaram-se cientes dos direitos, obrigações e penalidades aplicáveis constantes da Lei Geral de Proteção de Dados Pessoais, Lei 13.709/2018, e obrigam-se a adotar todas as medidas razoáveis para garantir, por si e por seu pessoal, colaboradores, empregados e subcontratados, que utilizem os dados protegidos na extensão autorizada na referida LGPD.' },
  { id: '19-comunicacoes', titulo: '19. Comunicações oficiais', corpo: 'As comunicações entre as partes serão feitas pelos canais informados neste contrato: {{escritorioEmail}}, {{escritorioTelefone}}, e pelo e-mail do contratante {{email}}.' },
  { id: '20-vigencia', titulo: '20. Vigência', corpo: 'Prazo indeterminado, com início em {{dataInicio}}.' },
  { id: '21-foro', titulo: '21. Foro', corpo: 'Os casos omissos serão resolvidos de comum acordo.\n\nPARÁGRAFO ÚNICO. Em caso de impasse, as partes submeterão a solução do conflito a procedimento arbitral nos termos da Lei nº 9.307/96, ou, alternativamente, elegem o foro de {{escritorioForo}} para dirimir qualquer ação oriunda do presente contrato.' },
  { id: '22-assinaturas', titulo: '22. Assinaturas', corpo: 'Para firmeza e como prova de haverem contratado, as partes firmam este documento, impresso ou por assinatura online, em duas vias de igual teor e forma, assinado pelas partes contratantes e pelas testemunhas abaixo.\n\n{{escritorioRazaoSocial}}\n{{contadorNome}}\n\n{{razaoSocial}}\n{{representanteLegal}}\n\nTestemunhas' },
 ],
};

export const MODELOS_DOCUMENTO: readonly ModeloDocumento[] = [MODELO_PROPOSTA, MODELO_CONTRATO];

/** Substitui `{{campo}}` pelos valores informados. Campo ausente vira marcador. */
export function preencherModelo(secoes: readonly SecaoModelo[], dados: Record<string, string>): { titulo: string; corpo: string }[] {
 return secoes.map(secao => ({
  titulo: secao.titulo,
  corpo: secao.corpo.replace(/\{\{(\w+)\}\}/g, (_todo, chave: string) => {
   const valor = dados[chave];
   return valor !== undefined && String(valor).trim() !== '' ? String(valor) : `[${chave} não informado]`;
  }),
 }));
}

/** Campos obrigatórios do modelo que ainda estão vazios. */
export function pendenciasDoModelo(modelo: ModeloDocumento, dados: Record<string, string>): string[] {
 return modelo.campos
  .filter(item => item.obrigatorio && String(dados[item.chave] ?? '').trim() === '')
  .map(item => item.rotulo);
}
