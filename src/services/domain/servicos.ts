/**
 * Catálogo de serviços adicionais, parametrizado por Gilmar em 15/09/2026.
 *
 * Os valores são parâmetros comerciais iniciais. Não são tabela oficial de
 * mercado, promessa de venda nem cálculo tributário.
 *
 * Serviço com valor zero nunca é tratado como gratuito automaticamente. Cada um
 * precisa de uma classificação explícita, e "Aguardando definição de preço" não
 * pode entrar em proposta final.
 */

export const SITUACOES_PRECO = [
 'Preço aprovado',
 'Incluído no plano',
 'Cortesia com aprovação do sócio',
 'Aguardando definição de preço',
 'Desativado',
] as const;
export type SituacaoPreco = typeof SITUACOES_PRECO[number];

/** Situações que impedem o serviço de entrar em proposta final. */
export const SITUACOES_BLOQUEADAS: readonly SituacaoPreco[] = ['Aguardando definição de preço', 'Desativado'];

export interface ServicoCatalogo { nome: string; valor: number; departamento: string; situacaoPreco: SituacaoPreco }

const s = (nome: string, valor: number, departamento: string): ServicoCatalogo =>
 ({ nome, valor, departamento, situacaoPreco: valor > 0 ? 'Preço aprovado' : 'Aguardando definição de preço' });

export const CATALOGO_SERVICOS: readonly ServicoCatalogo[] = [
 // Consultoria e gestão
 s('Treinamento administrativo', 180, 'Administrativo'),
 s('Conciliação de cartão de crédito', 250, 'Financeiro'),
 s('Consultoria de processos', 390, 'Administrativo'),
 s('Consultoria financeira', 500, 'Financeiro'),
 s('Consultoria tributária', 300, 'Fiscal'),
 s('Acompanhamento mensal MEI', 150, 'Contábil'),
 s('Escritório virtual', 100, 'Administrativo'),
 s('Análise tributária perante enquadramento fiscal', 150, 'Fiscal'),
 s('Consultoria financeira trimestral online', 500, 'Financeiro'),
 s('Gestão e entrega de documentos via WhatsApp', 90, 'Atendimento'),
 s('Gestão e entrega de CNDs', 100, 'Fiscal'),
 s('Consultoria gerencial trimestral', 180, 'Contábil'),
 s('Consultoria gerencial mensal', 200, 'Contábil'),
 s('Relatórios gerenciais em áudio ou vídeo', 80, 'Contábil'),
 s('Consultoria de precificação', 297, 'Financeiro'),
 s('Acompanhamento financeiro', 500, 'Financeiro'),
 s('Treinamento de emissão de nota', 150, 'Fiscal'),
 s('Análise financeira', 500, 'Financeiro'),
 s('Análise de crédito', 300, 'Financeiro'),
 s('Análise de fluxo de caixa', 300, 'Financeiro'),
 s('Análise de margem', 300, 'Financeiro'),
 s('Análise de custos', 300, 'Financeiro'),
 s('Análise de estoque', 300, 'Financeiro'),
 s('Gestão de documentos', 90, 'Administrativo'),
 s('Suporte tributário por aplicativo ou WhatsApp', 150, 'Fiscal'),
 s('Grupo de WhatsApp', 100, 'Atendimento'),
 s('Mentoria continuada', 500, 'Contábil'),
 s('Parametrização de sistemas', 180, 'Administrativo'),
 s('Gestão comercial', 500, 'Administrativo'),
 s('Gestão de contratos', 300, 'Administrativo'),
 s('Gestão de resultados', 500, 'Contábil'),
 s('Gestão empresarial', 500, 'Contábil'),
 s('Consultoria estratégica', 800, 'Contábil'),
 s('Consultoria fiscal', 300, 'Fiscal'),
 s('Consultoria gerencial', 500, 'Contábil'),
 s('Consultoria jurídica', 500, 'Paralegal e Legalização'),
 s('Consultoria de RH', 500, 'Pessoal'),
 s('Consultoria trabalhista', 500, 'Pessoal'),
 s('Consultoria tributária em compras e vendas', 500, 'Fiscal'),
 s('Consultoria e treinamento de gestão de equipe', 500, 'Pessoal'),
 s('Contabilidade integrada e consultiva', 500, 'Contábil'),
 s('Customer Success', 300, 'Atendimento'),
 s('Inteligência artificial para análise de impostos', 500, 'Fiscal'),
 s('Implantação e parametrização de ERP', 180, 'Administrativo'),
 s('Parametrização de ERP', 180, 'Administrativo'),

 // Societário e legalização
 s('Abertura de empresa', 990, 'Paralegal e Legalização'),
 s('Encerramento de empresa', 1300, 'Paralegal e Legalização'),
 s('Alterações contratuais', 1300, 'Paralegal e Legalização'),
 s('Regularização de empresa', 1500, 'Paralegal e Legalização'),
 s('Holding patrimonial ou consultoria', 5000, 'Paralegal e Legalização'),
 s('Marcas e patentes', 1800, 'Paralegal e Legalização'),
 s('Serviços avulsos de alteração cadastral', 200, 'Paralegal e Legalização'),
 s('Cadastro ou alteração de CNPJ', 500, 'Paralegal e Legalização'),
 s('Alteração de contador responsável na SEFAZ', 200, 'Fiscal'),
 s('Cadastro no conselho profissional pessoa jurídica', 500, 'Paralegal e Legalização'),
 s('Cadastro municipal', 400, 'Paralegal e Legalização'),
 s('Cadastro FUSEX', 1700, 'Paralegal e Legalização'),
 s('Cadastro previdenciário', 600, 'Pessoal'),
 s('Cadastro SICAF', 500, 'Paralegal e Legalização'),
 s('Cadastro estadual', 500, 'Paralegal e Legalização'),
 s('Cadastro de senha web prefeitura', 250, 'Paralegal e Legalização'),
 s('Processo administrativo federal, estadual ou municipal', 350, 'Paralegal e Legalização'),

 // Alvarás e licenças
 // A parametrização trouxe "Alvará de localização" duas vezes, com R$ 600,00 e
 // R$ 500,00. Gilmar resolveu em 15/09/2026: vale R$ 500,00, entrada única.
 s('Alvará de localização', 500, 'Paralegal e Legalização'),
 s('Alvará e licenças de bombeiros', 150, 'Paralegal e Legalização'),
 s('Alvará e licenças de meio ambiente', 2000, 'Paralegal e Legalização'),
 s('Alvará de vigilância sanitária', 500, 'Paralegal e Legalização'),

 // Certificado digital
 s('Certificado digital A1 pessoa física', 130, 'Administrativo'),
 s('Certificado digital A1 pessoa jurídica', 170, 'Administrativo'),

 // Declarações e obrigações
 s('Declaração MEI', 200, 'Fiscal'),
 s('Declaração DCTF', 150, 'Fiscal'),
 s('Declaração ECD ou ECF', 400, 'Contábil'),
 s('Declaração EFD', 250, 'Fiscal'),
 s('Declaração PGDAS', 80, 'Fiscal'),
 s('Declaração prefeitura mensal', 150, 'Fiscal'),
 s('DIRF', 500, 'Pessoal'),
 s('DMED', 300, 'Fiscal'),
 s('Imposto de renda pessoa física', 150, 'Contábil'),
 s('CND eletrônica', 50, 'Fiscal'),
 s('Emissão de nota fiscal avulsa', 40, 'Fiscal'),
 s('Recálculo de guias', 10, 'Fiscal'),
 s('Folha de pagamento doméstica', 100, 'Pessoal'),

 // Parcelamentos e recuperação
 s('Parcelamento estadual', 250, 'Fiscal'),
 s('Parcelamento FGTS', 500, 'Pessoal'),
 s('Parcelamento INSS', 250, 'Pessoal'),
 s('Parcelamento MEI', 250, 'Fiscal'),
 s('Parcelamento prefeitura', 400, 'Fiscal'),
 s('Parcelamento procuradoria', 300, 'Fiscal'),
 s('Parcelamento receita federal', 250, 'Fiscal'),
 s('Recuperação tributária PIS/COFINS monofásico', 100, 'Fiscal'),
 s('Recuperação de ICMS', 500, 'Fiscal'),
];
