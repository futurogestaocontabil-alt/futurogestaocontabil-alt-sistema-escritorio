import type { JsonValue } from '../types/domain';

export interface CnpjLookupResult {
  data: Record<string, JsonValue>;
  source: string;
  warning: string;
}

type PublicCnpj = Record<string, unknown>;

function value(source: PublicCnpj, key: string): string {
  const candidate = source[key];
  return candidate === null || candidate === undefined ? '' : String(candidate).trim();
}

export function normalizeCnpj(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

export function validCnpjFormat(input: string): boolean {
  return /^[0-9A-Z]{12}[0-9]{2}$/.test(normalizeCnpj(input));
}

function formatAddress(source: PublicCnpj): string {
  return [value(source, 'tipo_logradouro'), value(source, 'logradouro'), value(source, 'numero'), value(source, 'complemento'), value(source, 'bairro'), value(source, 'cep')].filter(Boolean).join(', ');
}

function mapPorte(raw: string): string {
  const porte = raw.toLocaleUpperCase('pt-BR');
  if (porte.includes('MICROEMPRESA')) return 'ME';
  if (porte.includes('PEQUENO PORTE')) return 'EPP';
  if (porte.includes('MEI')) return 'MEI';
  return porte && !porte.includes('NÃO INFORMADO') ? 'Demais' : '';
}

function parseCapitalSocial(raw: string): number {
  const normalized = raw.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapOpenCnpj(source: PublicCnpj): CnpjLookupResult {
  const mainCnae = value(source, 'cnae_principal');
  const secondary = Array.isArray(source.cnaes_secundarios) ? source.cnaes_secundarios.map(item => String(item).trim()).filter(Boolean) : [];
  const partners = Array.isArray(source.QSA) ? source.QSA as PublicCnpj[] : [];
  const phones = Array.isArray(source.telefones) ? source.telefones as PublicCnpj[] : [];
  const isMei = value(source, 'opcao_mei').toUpperCase() === 'S';
  const isSimples = value(source, 'opcao_simples').toUpperCase() === 'S';
  const regime = isMei ? 'MEI' : isSimples ? 'Simples Nacional' : '';
  const cnaes = [mainCnae, ...secondary].filter(Boolean).join('\n');
  const quadroSocietario = partners.map(item => [value(item, 'nome_socio'), value(item, 'qualificacao_socio')].filter(Boolean).join(' - ')).filter(Boolean).join('\n');
  const telefone = phones.map(item => [value(item, 'ddd'), value(item, 'numero')].filter(Boolean).join(' ')).filter(Boolean).join(' / ');
  const data: Record<string, JsonValue> = {
    cnpj: normalizeCnpj(value(source, 'cnpj')),
    nome: value(source, 'nome_fantasia') || value(source, 'razao_social'),
    nomeFantasia: value(source, 'nome_fantasia'),
    razaoSocial: value(source, 'razao_social'),
    email: value(source, 'email').toLowerCase(),
    telefone,
    dataAbertura: value(source, 'data_inicio_atividade'),
    situacaoCadastral: value(source, 'situacao_cadastral'),
    dataSituacaoCadastral: value(source, 'data_situacao_cadastral'),
    naturezaJuridica: value(source, 'natureza_juridica'),
    porte: mapPorte(value(source, 'porte_empresa')),
    capitalSocial: parseCapitalSocial(value(source, 'capital_social')),
    cnaes,
    cep: value(source, 'cep'),
    endereco: formatAddress(source),
    logradouro: [value(source, 'tipo_logradouro'), value(source, 'logradouro')].filter(Boolean).join(' '),
    numero: value(source, 'numero'),
    complemento: value(source, 'complemento'),
    bairro: value(source, 'bairro'),
    cidade: value(source, 'municipio'),
    uf: value(source, 'uf'),
    quadroSocietario,
    fonteDadosCadastrais: 'OpenCNPJ / Receita Federal',
    consultaCnpjEm: new Date().toISOString(),
  };
  if (regime) data.regime = regime;
  return {
    data: Object.fromEntries(Object.entries(data).filter(([, candidate]) => candidate !== '' && candidate !== null)),
    source: 'OpenCNPJ / Receita Federal',
    warning: regime ? 'Revise os dados antes de salvar. O enquadramento tributário deve ser confirmado com documentos fiscais.' : 'Regime tributário não confirmado pela consulta pública. Selecione após conferir a documentação do cliente.',
  };
}
