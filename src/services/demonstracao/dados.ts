/**
 * Carteira fictícia usada apenas no ambiente de demonstração.
 *
 * Nada aqui é cliente real da Futuro Contabilidade Digital. Empresas, pessoas,
 * CNPJs e telefones são inventados, e os e-mails usam o domínio reservado
 * `example.test`, que nunca resolve. Nenhum dado real pode ser acrescentado a
 * este arquivo, porque ele é compilado para dentro do pacote publicado.
 */
import type { Command, JsonValue } from '../../types/domain';

/** Os literais abaixo variam de formato entre si, então as chaves ausentes são
 *  descartadas aqui em vez de virarem `undefined` dentro do registro. */
const registro = (valor: Record<string, unknown>): Record<string, JsonValue> =>
  Object.fromEntries(Object.entries(valor).filter(([, item]) => item !== undefined)) as Record<string, JsonValue>;

const hoje = new Date();
const dia = (n: number) => new Date(hoje.getTime() + n * 86400000).toISOString().slice(0, 10);
const competencia = hoje.toISOString().slice(0, 7);
const horaDeHoje = (h: number, m: number) => {
  const data = new Date(hoje);
  data.setHours(h, m, 0, 0);
  return data.toISOString();
};

const recorrencias = (responsavelId: string) => [
  { modeloId: 'coleta', responsavelId: 'tamires', diaVencimento: 5, periodicidade: 'mensal' },
  { modeloId: 'fiscal', responsavelId, diaVencimento: 15, periodicidade: 'mensal' },
  { modeloId: 'folha', responsavelId, diaVencimento: 5, periodicidade: 'mensal' },
  { modeloId: 'pgdas', responsavelId, diaVencimento: 20, periodicidade: 'mensal' },
  { modeloId: 'esocial', responsavelId, diaVencimento: 15, periodicidade: 'mensal' },
  { modeloId: 'contabil', responsavelId, diaVencimento: 25, periodicidade: 'mensal' },
];

const cliente = (
  id: string, razaoSocial: string, nomeFantasia: string, cnpj: string, atividade: string,
  regime: string, honorario: number, faturamento: number, funcionarios: number,
  diaVencimento: number, cidade: string, responsavelId: string, plano: string,
): Command => ({
  type: 'save', collection: 'clientes', id,
  data: {
    razaoSocial, nomeFantasia, cnpj, atividade, regime, honorario, faturamento, funcionarios,
    diaVencimento, cidade, uf: 'GO', responsavelId, plano, status: 'Ativo', origem: 'Indicação',
    notasFiscais: 90, recorrenciasConfirmadas: true, recorrencias: recorrencias(responsavelId),
    email: `contato@${id}.example.test`, telefone: '(62) 3000-0000',
  },
});

/**
 * Os comandos passam pelo mesmo motor de regras do servidor. Se um deles violar
 * uma regra, a demonstração falha do mesmo jeito que o sistema real falharia,
 * que é exatamente o comportamento desejado.
 */
export const COMANDOS_DEMONSTRACAO: readonly Command[] = [
  cliente('cli-aurora', 'Padaria Aurora LTDA', 'Padaria Aurora', '11.111.111/0001-11', 'Comércio', 'Simples Nacional', 890, 85000, 6, 10, 'Goiânia', 'daniel', 'Essencial'),
  cliente('cli-cerrado', 'Transportes Cerrado ME', 'Transportes Cerrado', '22.222.222/0001-22', 'Serviços', 'Simples Nacional', 1240, 190000, 11, 5, 'Aparecida de Goiânia', 'daniel', 'Mentor'),
  cliente('cli-vidanova', 'Clínica Vida Nova LTDA', 'Clínica Vida Nova', '33.333.333/0001-33', 'Serviços', 'Lucro Presumido', 2380, 340000, 9, 30, 'Goiânia', 'gilmar', 'Estratégico'),
  cliente('cli-planalto', 'Metalúrgica Planalto LTDA', 'Metalúrgica Planalto', '44.444.444/0001-44', 'Indústria', 'Simples Nacional', 1638, 175000, 14, 10, 'Trindade', 'daniel', 'Mentor'),

  ...[
    { id: 'lead-1', nome: 'Restaurante Sabor do Cerrado', empresa: 'Restaurante Sabor do Cerrado LTDA', origem: 'BNI', canal: 'WhatsApp', etapa: 'Qualificação', classificacao: 'Em avaliação', temperatura: 'Morno', responsavelId: 'tamires', atividade: 'Comércio', regime: 'Simples Nacional', faturamento: 70000, valorEstimado: 890, telefone: '(62) 90000-0011', cidade: 'Goiânia' },
    { id: 'lead-2', nome: 'Oficina Motor Forte ME', empresa: 'Oficina Motor Forte ME', origem: 'Indicação', canal: 'WhatsApp', etapa: 'Reunião agendada', classificacao: 'Qualificado', temperatura: 'Quente', responsavelId: 'gilmar', atividade: 'Serviços', regime: 'Simples Nacional', faturamento: 120000, valorEstimado: 1150, telefone: '(62) 90000-0003', cidade: 'Trindade' },
    { id: 'lead-3', nome: 'Distribuidora Horizonte LTDA', empresa: 'Distribuidora Horizonte LTDA', origem: 'Instagram', canal: 'Instagram', etapa: 'Proposta enviada', classificacao: 'Qualificado', temperatura: 'Quente', responsavelId: 'gilmar', atividade: 'Comércio', regime: 'Lucro Presumido', faturamento: 420000, valorEstimado: 3100, telefone: '(62) 90000-0012', cidade: 'Goiânia' },
    { id: 'lead-4', nome: 'Studio Bem Estar', empresa: 'Studio Bem Estar ME', origem: 'Google Meu Negócio', canal: 'Site', etapa: 'Lead', classificacao: 'Não qualificado', temperatura: 'Frio', responsavelId: 'tamires', atividade: 'Serviços', regime: 'Simples Nacional', faturamento: 22000, valorEstimado: 690, telefone: '(62) 90000-0013', cidade: 'Goiânia' },
    { id: 'lead-5', nome: 'Construtora Rio Verde ME', empresa: 'Construtora Rio Verde ME', origem: 'Networking', canal: 'Telefone', etapa: 'Negociação', classificacao: 'Qualificado', temperatura: 'Quente', responsavelId: 'gilmar', atividade: 'Serviços', regime: 'Simples Nacional', faturamento: 260000, valorEstimado: 1850, telefone: '(62) 90000-0014', cidade: 'Rio Verde' },
    { id: 'lead-6', nome: 'Fundição Vale Azul LTDA', empresa: 'Fundição Vale Azul LTDA', origem: 'Networking', canal: 'Telefone', etapa: 'Diagnóstico', classificacao: 'Qualificado', temperatura: 'Quente', responsavelId: 'gilmar', atividade: 'Indústria', regime: 'Lucro Presumido', faturamento: 260000, valorEstimado: 2813, telefone: '(62) 90000-0015', cidade: 'Goiânia' },
  ].map<Command>(lead => ({ type: 'save', collection: 'leads', id: lead.id, data: registro({ ...lead, uf: 'GO' }) })),

  ...[
    { id: 't1', nome: `Coleta de documentos ${competencia}`, modeloId: 'coleta', tipoDemanda: 'Recorrente', clienteId: 'cli-aurora', departamento: 'Administrativo', responsavelId: 'tamires', prazo: dia(-2), prioridade: 'Alta', competencia },
    { id: 't2', nome: `Fechamento Fiscal ${competencia}`, modeloId: 'fiscal', tipoDemanda: 'Recorrente', clienteId: 'cli-cerrado', departamento: 'Fiscal', responsavelId: 'daniel', prazo: dia(1), prioridade: 'Alta', competencia },
    { id: 't3', nome: `Fechamento de Folha ${competencia}`, modeloId: 'folha', tipoDemanda: 'Recorrente', clienteId: 'cli-vidanova', departamento: 'Pessoal', responsavelId: 'daniel', prazo: dia(3), prioridade: 'Média', competencia },
    { id: 't4', nome: 'Emissão de CND estadual', tipoDemanda: 'Avulsa', clienteId: 'cli-planalto', departamento: 'Fiscal', responsavelId: 'daniel', prazo: dia(0), prioridade: 'Alta' },
    { id: 't5', nome: 'Renovação de certificado digital A1', tipoDemanda: 'Avulsa', clienteId: 'cli-aurora', departamento: 'Administrativo', responsavelId: 'tamires', prazo: dia(7), prioridade: 'Média' },
    { id: 't6', nome: 'Diagnóstico tributário anual', tipoDemanda: 'Consultoria', clienteId: 'cli-vidanova', departamento: 'Contábil', responsavelId: 'gilmar', prazo: dia(12), prioridade: 'Média' },
  ].map<Command>(tarefa => ({ type: 'save', collection: 'tarefas', id: tarefa.id, data: registro(tarefa) })),

  ...[
    { id: 'f1', clienteId: 'cli-aurora', competencia, vencimento: dia(-5), valor: 890, status: 'Paga', dataPagamento: dia(-5), formaPagamento: 'PIX' },
    { id: 'f2', clienteId: 'cli-cerrado', competencia, vencimento: dia(-10), valor: 1240, status: 'Vencida' },
    { id: 'f3', clienteId: 'cli-vidanova', competencia, vencimento: dia(15), valor: 2380, status: 'Em aberto' },
    { id: 'f4', clienteId: 'cli-planalto', competencia, vencimento: dia(10), valor: 1638, status: 'Em aberto' },
  ].map<Command>(fatura => ({ type: 'save', collection: 'faturas', id: fatura.id, data: registro(fatura) })),

  ...[
    { id: 'd1', fornecedor: 'Sistema contábil', categoria: 'Sistemas', vencimento: dia(4), valor: 1450, status: 'Em aberto' },
    { id: 'd2', fornecedor: 'Locação da sala comercial', categoria: 'Estrutura', vencimento: dia(-3), valor: 2200, status: 'Paga', dataPagamento: dia(-3) },
    { id: 'd3', fornecedor: 'Certificadora digital', categoria: 'Serviços', vencimento: dia(9), valor: 340, status: 'Em aberto' },
  ].map<Command>(despesa => ({ type: 'save', collection: 'despesas', id: despesa.id, data: registro(despesa) })),

  { type: 'save', collection: 'licencas', id: 'lic1', data: { nome: 'Alvará de localização', clienteId: 'cli-aurora', status: 'Ativo', validade: dia(45) } },
  { type: 'save', collection: 'licencas', id: 'lic2', data: { nome: 'Licença do Corpo de Bombeiros', clienteId: 'cli-planalto', status: 'Ativo', validade: dia(20) } },

  ...[
    { id: 'conv-1', telefone: '5562900000001', nome: 'Padaria Aurora', clienteId: 'cli-aurora', vinculo: 'Cliente', canal: 'WhatsApp', mensagens: [
      { id: 'm1', texto: 'Bom dia! Já posso emitir a nota do mês?', autor: 'cliente', criadoEm: horaDeHoje(9, 12), origem: 'Recebida', externoId: null },
      { id: 'm2', texto: 'Bom dia! Vou conferir a competência e já te retorno.', autor: 'equipe', criadoEm: horaDeHoje(9, 20), origem: 'Enviada pelo sistema', externoId: null },
    ] },
    { id: 'conv-2', telefone: '5562900000002', nome: 'Transportes Cerrado', clienteId: 'cli-cerrado', vinculo: 'Cliente', canal: 'WhatsApp', mensagens: [
      { id: 'm3', texto: 'Preciso do DAS de setembro com urgência.', autor: 'cliente', criadoEm: horaDeHoje(10, 2), origem: 'Recebida', externoId: null },
    ] },
    { id: 'conv-3', telefone: '5562900000003', nome: 'Oficina Motor Forte', leadId: 'lead-2', vinculo: 'Lead', canal: 'WhatsApp', mensagens: [
      { id: 'm4', texto: 'Vi seu perfil no Instagram, queria entender os planos.', autor: 'cliente', criadoEm: horaDeHoje(8, 45), origem: 'Recebida', externoId: null },
    ] },
    { id: 'conv-4', telefone: '5562900000004', nome: 'Número não identificado', vinculo: 'Não identificado', canal: 'WhatsApp', mensagens: [
      { id: 'm5', texto: 'Vocês abrem empresa?', autor: 'cliente', criadoEm: horaDeHoje(10, 40), origem: 'Recebida', externoId: null },
    ] },
  ].map<Command>(conversa => ({ type: 'save', collection: 'conversas', id: conversa.id, data: registro(conversa) })),

  { type: 'openService', data: { conversaId: 'conv-1', responsavelId: 'daniel', departamento: 'Fiscal', demanda: 'Nota fiscal' } },
  { type: 'openService', data: { conversaId: 'conv-3', responsavelId: 'tamires', departamento: 'Comercial', demanda: 'Comercial' } },
];
