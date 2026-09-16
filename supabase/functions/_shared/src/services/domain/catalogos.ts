// Fonte única das listas fixas do processo da Futuro Contabilidade Digital.
// Interface, domínio e API leem daqui. Nenhuma lista pode ser repetida em tela.

export const ORIGENS_LEAD = ['Indicação','Programa de Indicação','BNI','Networking','WhatsApp','Google Meu Negócio','Instagram','Site','Tráfego pago','Cliente antigo','Outro'] as const;

export const CANAIS_ATENDIMENTO = ['WhatsApp','Telefone','Instagram','E-mail','Site','Indicação','Atendimento manual'] as const;
export const CANAL_INTEGRADO = 'WhatsApp';

export const CLASSIFICACOES_LEAD = ['Qualificado','Em avaliação','Não qualificado','Perdido'] as const;

export const ETAPAS_FUNIL = ['Lead','Qualificação','Reunião agendada','Diagnóstico','Proposta enviada','Negociação','Fechado ganho','Fechado perdido'] as const;

export const PERGUNTAS_MINIMAS_AGENDAMENTO = [
 { campo: 'empresa', rotulo: 'Qual é a empresa e o CNPJ?' },
 { campo: 'atividade', rotulo: 'Qual é a atividade principal?' },
 { campo: 'empresaAtiva', rotulo: 'A empresa está ativa?' },
 { campo: 'principalProblema', rotulo: 'Qual é o principal problema hoje?' },
 { campo: 'decisor', rotulo: 'A pessoa participa da decisão ou consegue trazer o decisor?' },
 { campo: 'urgencia', rotulo: 'Existe urgência ou prazo para resolver?' },
] as const;

// Lembrete visual apenas. Nunca decide aceitar ou recusar um lead.
export const CRITERIOS_QUALIFICACAO = [
 'Empresa ativa ou em abertura real',
 'Necessidade de contabilidade, organização financeira, planejamento ou regularização',
 'Faturamento compatível com os planos',
 'Responsável com poder de decisão',
 'Dor clara',
 'Intenção real de resolver',
 'Prazo ou urgência',
 'Atividade atendida pelo escritório',
 'Aceita reunião de diagnóstico',
 'Entende que a contratação depende de análise e proposta',
] as const;

export const MOTIVOS_PERDA = [
 'Preço acima do esperado','Não percebeu urgência','Permaneceu com o contador atual','Medo ou insegurança na troca',
 'Pendências com o contador atual','Mudança de endereço ou problema interno','Falta de decisão do sócio',
 'Proposta sem acompanhamento suficiente','Não percebeu o retorno da solução','Prazo de decisão muito longo',
 'Solução maior que a prontidão do cliente','Falta de opção inicial mais simples',
] as const;

export const MOTIVOS_CANCELAMENTO_REUNIAO = [
 'Não confirmou','Esqueceu o horário','Surgiu outra prioridade','Não era o decisor','Não organizou documentos',
 'Não percebeu urgência','Resolvendo pendências com o contador atual','Receio de trocar de contador',
 'Agendada antes de entender a necessidade','Horário inadequado',
] as const;

export const MOTIVOS_DESCARTE = [
 'Sem empresa ativa nem intenção de abrir','Busca apenas informação gratuita','Não informou dados básicos',
 'Necessidade que o escritório não atende','Fora do perfil operacional','Não é decisor e não envolve quem decide',
 'Comportamento incompatível','Procura apenas o menor preço',
] as const;

export const STATUS_PROPOSTA = ['Rascunho','Gerada','Enviada','Visualizada','Em negociação','Aceita','Recusada','Expirada'] as const;
export const STATUS_CONTRATO = ['Em preparação','Gerado','Enviado para assinatura','Aguardando assinatura','Assinado','Recusado','Cancelado','Expirado'] as const;
export const FORMAS_ENVIO_PROPOSTA = ['PDF','WhatsApp','E-mail'] as const;
export const FORMAS_ASSINATURA = ['Autentique','Papel','WhatsApp'] as const;
export const ASSINATURA_PREFERENCIAL = 'Autentique';

export const DIAS_VENCIMENTO = [30, 5, 10] as const;

export const DEMANDAS_ATENDIMENTO = [
 'Comercial','Fiscal','Contábil','Pessoal','Financeiro','Legalização','Documentos','Certificado digital',
 'Nota fiscal','Extrato bancário','Onboarding','Dúvida geral','Solicitação de serviço','Sem demanda',
] as const;

export const STATUS_ATENDIMENTO = ['Fila','Em atendimento','Aguardando resposta','Finalizado'] as const;

export const FILAS_ATENDIMENTO = ['Fila','Ativos','Grupos','Finalizados','Aguardando resposta','Com tarefa','Sem tarefa'] as const;

export const VINCULOS_CONVERSA = ['Cliente','Lead','Não identificado','Não cliente'] as const;

export const ORIGENS_MENSAGEM = ['Enviada pelo sistema','Dispositivo externo','Recebida'] as const;

// Etiqueta livre existe apenas para o que não cabe em campo estruturado.
// Regime, plano, responsável e departamento são campos, nunca etiqueta.
export const ETIQUETAS_LIVRES = ['Aguardando documento','Urgente','Retornar em janeiro','Cliente estratégico','Solicitação especial'] as const;

export const DEPARTAMENTOS = ['Comercial','Atendimento','Administrativo','Financeiro','Fiscal','Contábil','Pessoal','Paralegal e Legalização'] as const;

export const STATUS_ONBOARDING_EXTERNO = ['Aguardando agendamento','Agendada','Realizada','Pendências do cliente','Em implantação','Concluída','Bloqueada'] as const;

export const SISTEMAS_ONBOARDING = [
 { id: 'alterdata-fiscal', nome: 'Alterdata Fiscal', departamento: 'Fiscal', exigeCodigoEmpresa: true },
 { id: 'alterdata-contabil', nome: 'Alterdata Contábil', departamento: 'Contábil', exigeCodigoEmpresa: true },
 { id: 'alterdata-dp', nome: 'Alterdata Departamento Pessoal', departamento: 'Pessoal', exigeCodigoEmpresa: true },
 { id: 'nf-estoque', nome: 'NF Estoque', departamento: 'Fiscal', exigeCodigoEmpresa: false },
 { id: 'econtador', nome: 'eContador', departamento: 'Administrativo', exigeCodigoEmpresa: false, exigeEnvioLogin: true },
 { id: 'veri', nome: 'Veri', departamento: 'Administrativo', exigeCodigoEmpresa: false },
] as const;

// Mister Contador é empresa parceira. O sistema só registra se o cadastro foi
// feito lá, não integra com ela.
export const PARCEIRO_TICKET_ALTO = 'Mister Contador';

export type Origem = typeof ORIGENS_LEAD[number];
export type Canal = typeof CANAIS_ATENDIMENTO[number];
export type ClassificacaoLead = typeof CLASSIFICACOES_LEAD[number];
export type StatusProposta = typeof STATUS_PROPOSTA[number];
export type StatusContrato = typeof STATUS_CONTRATO[number];
export type Demanda = typeof DEMANDAS_ATENDIMENTO[number];
export type StatusAtendimento = typeof STATUS_ATENDIMENTO[number];
export type SistemaOnboarding = typeof SISTEMAS_ONBOARDING[number]['id'];
