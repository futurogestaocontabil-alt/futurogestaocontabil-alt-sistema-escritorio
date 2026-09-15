import { describe, expect, it } from 'vitest';
import { calculatePrice, PRICE_VERSION, type Plan, type PriceInput, type TaxRegime } from '../src/services/domain/pricing';

// As faixas abaixo são a tabela oficial informada por Gilmar em 15/09/2026.
// Estão escritas à mão de propósito: o teste confere o motor contra a tabela,
// e não contra ele mesmo. Alterar o motor sem alterar a tabela quebra o teste.
const FAIXAS: Record<'Serviços'|'Comércio', Record<TaxRegime, [number, number][]>> = {
 'Serviços': {
  'Simples Nacional': [[6750,199],[15000,297],[25000,397],[50000,547],[100000,747],[200000,1147],[400000,1299]],
  'Lucro Presumido': [[15000,327],[25000,457],[50000,597],[100000,857],[200000,1297],[300000,1997],[500000,2297],[800000,4115],[1500000,5225],[2500000,7844]],
  'Lucro Real': [[100000,815],[300000,1816],[500000,2899],[800000,4289],[1500000,6499],[2500000,7891]],
  'Imunes ou Isentas': [[100000,892],[300000,1931],[500000,4009],[800000,4752],[1500000,5739],[2500000,7721]],
 },
 'Comércio': {
  'Simples Nacional': [[6750,299],[20000,397],[50000,497],[100000,828],[200000,1313],[300000,1618],[400000,2350]],
  'Lucro Presumido': [[20000,497],[50000,597],[100000,1006],[300000,2484],[400000,3306],[500000,4899],[800000,6262],[1500000,7935]],
  'Lucro Real': [[100000,1047],[300000,2588],[500000,2999],[600000,3590],[800000,4416],[1500000,5201],[2500000,8100]],
  'Imunes ou Isentas': [[100000,1337],[300000,2436],[500000,4811],[800000,5702],[1500000,6755],[2500000,9265]],
 },
};
const ADICIONAL_PLANO: Record<Plan, number> = { 'Essencial': 0, 'Mentor': 100, 'Estratégico': 560 };
const base = (over: Partial<PriceInput> = {}): PriceInput =>
 ({ plano: 'Essencial', atividade: 'Serviços', regime: 'Simples Nacional', faturamento: 6750, ...over });
const item = (result: ReturnType<typeof calculatePrice>, nome: string) => result.itens.find(line => line.nome === nome);

describe('Simulação de honorários, tabela oficial', () => {
 it('calcula todas as faixas de todas as atividades e regimes', () => {
  for (const atividade of ['Serviços','Comércio'] as const)
   for (const regime of Object.keys(FAIXAS[atividade]) as TaxRegime[])
    for (const [limite, esperado] of FAIXAS[atividade][regime]) {
     const result = calculatePrice(base({ atividade, regime, faturamento: limite }));
     expect(result.total, `${atividade} / ${regime} / até ${limite}`).toBe(esperado);
     expect(result.faixaCentavos).toBe(esperado * 100);
     expect(result.limiteFaturamento).toBe(limite);
    }
 });

 it('usa a primeira faixa cujo limite alcança o faturamento', () => {
  expect(calculatePrice(base({ faturamento: 6750 })).total).toBe(199);
  expect(calculatePrice(base({ faturamento: 6750.01 })).total).toBe(297);
  expect(calculatePrice(base({ faturamento: 0 })).total).toBe(199);
 });

 it('soma o adicional de cada plano sobre a faixa', () => {
  for (const [plano, adicional] of Object.entries(ADICIONAL_PLANO) as [Plan, number][]) {
   const result = calculatePrice(base({ plano }));
   expect(result.total, plano).toBe(199 + adicional);
   expect(result.baseCentavos).toBe(adicional * 100);
  }
 });
});

describe('Simulação de honorários, critérios operacionais', () => {
 const criterio = (over: Partial<PriceInput>) => calculatePrice(base(over)).criteriosCentavos / 100;

 it('cobra colaboradores pela faixa de quantidade', () => {
  expect(criterio({ colaboradores: 3 })).toBe(3 * 50);
  expect(criterio({ colaboradores: 4 })).toBe(4 * 40);
  expect(criterio({ colaboradores: 6 })).toBe(6 * 40);
  expect(criterio({ colaboradores: 7 })).toBe(7 * 35);
  expect(criterio({ colaboradores: 15 })).toBe(15 * 35);
  expect(criterio({ colaboradores: 16 })).toBe(16 * 32);
  expect(criterio({ colaboradores: 30 })).toBe(30 * 32);
  expect(criterio({ colaboradores: 31 })).toBe(31 * 30);
 });

 it('cobra trinta reais por sócio com pró-labore e bloqueia acima de três', () => {
  expect(criterio({ proLabore: 1 })).toBe(30);
  expect(criterio({ proLabore: 3 })).toBe(90);
  expect(() => calculatePrice(base({ proLabore: 4 }))).toThrow(/até 3 pessoas/);
 });

 it('cobra contas financeiras, ponto por colaborador e guias DIFAL pelas faixas', () => {
  expect(criterio({ contasFinanceiras: 3 })).toBe(30);
  expect(criterio({ contasFinanceiras: 4 })).toBe(32);
  expect(criterio({ pontoColaboradores: 10 })).toBe(50);
  expect(criterio({ pontoColaboradores: 11 })).toBe(38.5);
  expect(criterio({ guiasDifal: 10 })).toBe(250);
  expect(criterio({ guiasDifal: 11 })).toBe(220);
  expect(criterio({ guiasDifal: 20 })).toBe(400);
  expect(criterio({ guiasDifal: 21 })).toBe(357);
 });

 it('cobra notas fiscais e contas a pagar por unidade', () => {
  expect(criterio({ notas: 37 })).toBe(370);
  expect(criterio({ contasPagar: 22 })).toBe(110);
 });

 it('cobra cem reais para ponto eletrônico, ICMS-ST e monofásico somente quando marcados', () => {
  expect(criterio({ pontoEletronico: true })).toBe(100);
  expect(criterio({ icmsSt: true })).toBe(100);
  expect(criterio({ monofasico: true })).toBe(100);
  expect(criterio({ pontoEletronico: false, icmsSt: false, monofasico: false })).toBe(0);
  expect(criterio({})).toBe(0);
 });

 it('cobra cinquenta reais apenas quando o ponto declaradamente não será integrado', () => {
  expect(criterio({ teraPontoIntegrado: false })).toBe(50);
  expect(criterio({ teraPontoIntegrado: true })).toBe(0);
  expect(criterio({})).toBe(0);
 });

 it('cobra o nível de integração contábil e fiscal separadamente', () => {
  expect(criterio({ integracaoContabil: 'alto' })).toBe(0);
  expect(criterio({ integracaoContabil: 'medio' })).toBe(90);
  expect(criterio({ integracaoContabil: 'baixo' })).toBe(150);
  expect(criterio({ integracaoContabil: 'baixo', integracaoFiscal: 'baixo' })).toBe(300);
  expect(criterio({ integracaoContabil: 'medio', integracaoFiscal: 'alto' })).toBe(90);
 });
});

describe('Simulação de honorários, serviços extras', () => {
 const extra = (over: Partial<PriceInput['extras'] extends (infer T)[] | undefined ? T : never> = {}) =>
  ({ servicoId: 'servico-1', nome: 'Serviço adicional de teste', valor: 250, quantidade: 1, ...over });

 it('soma o extra pelo valor informado e pela quantidade', () => {
  const result = calculatePrice(base({ extras: [extra({ quantidade: 3, valor: 120 })] }));
  expect(result.extrasCentavos).toBe(36000);
  expect(result.total).toBe(199 + 360);
 });

 it('exige serviço do catálogo, nome e quantidade maior que zero', () => {
  expect(() => calculatePrice(base({ extras: [extra({ servicoId: '' })] }))).toThrow(/catálogo/);
  expect(() => calculatePrice(base({ extras: [extra({ nome: '' })] }))).toThrow(/catálogo/);
  expect(() => calculatePrice(base({ extras: [extra({ quantidade: 0 })] }))).toThrow(/catálogo/);
 });

 it('exige aprovação do sócio para serviço sem preço', () => {
  expect(() => calculatePrice(base({ extras: [extra({ valor: 0 })] }))).toThrow(/aprovação explícita do sócio/);
  expect(calculatePrice(base({ extras: [extra({ valor: 0, aprovacaoSocio: true })] })).total).toBe(199);
 });
});

describe('Simulação de honorários, bloqueios', () => {
 it('bloqueia a atividade Indústria enquanto não houver tabela parametrizada', () => {
  expect(() => calculatePrice(base({ atividade: 'Indústria' }))).toThrow(/Indústria/);
 });

 it('bloqueia faturamento acima da última faixa parametrizada', () => {
  expect(() => calculatePrice(base({ faturamento: 400001 }))).toThrow(/acima da última faixa/);
  expect(() => calculatePrice(base({ atividade: 'Comércio', regime: 'Lucro Real', faturamento: 2500001 }))).toThrow(/acima da última faixa/);
 });

 it('recusa faturamento e quantidades inválidas', () => {
  expect(() => calculatePrice(base({ faturamento: -1 }))).toThrow(/valor financeiro válido/);
  expect(() => calculatePrice(base({ faturamento: Number.NaN }))).toThrow(/valor financeiro válido/);
  expect(() => calculatePrice(base({ colaboradores: 1.5 }))).toThrow(/quantidade inteira válida/);
  expect(() => calculatePrice(base({ colaboradores: -2 }))).toThrow(/quantidade inteira válida/);
 });

 it('recusa plano e nível de integração desconhecidos', () => {
  expect(() => calculatePrice(base({ plano: 'Premium' as Plan }))).toThrow(/Plano inválido/);
  expect(() => calculatePrice(base({ integracaoFiscal: 'altissimo' as 'alto' }))).toThrow(/nível de integração/i);
 });
});

describe('Simulação de honorários, resultado', () => {
 it('reproduz o exemplo conferido com Gilmar', () => {
  const result = calculatePrice({
   plano: 'Mentor', atividade: 'Serviços', regime: 'Simples Nacional', faturamento: 50000,
   colaboradores: 4, proLabore: 2, contasFinanceiras: 2, integracaoContabil: 'medio', integracaoFiscal: 'alto',
  });
  expect(result.total).toBe(977);
  expect(result.faixaCentavos).toBe(54700);
  expect(result.baseCentavos).toBe(10000);
  expect(result.criteriosCentavos).toBe(33000);
  expect(item(result, 'Colaboradores')).toMatchObject({ quantidade: 4, valorUnitarioCentavos: 4000, totalCentavos: 16000 });
  expect(item(result, 'Pró-labore')).toMatchObject({ quantidade: 2, totalCentavos: 6000 });
  expect(item(result, 'Contas financeiras')).toMatchObject({ quantidade: 2, totalCentavos: 2000 });
  expect(item(result, 'Integração contábil')?.totalCentavos).toBe(9000);
  expect(item(result, 'Integração fiscal')?.totalCentavos).toBe(0);
 });

 it('fecha o total com a soma do detalhamento, sem perda de centavos', () => {
  const result = calculatePrice({
   plano: 'Estratégico', atividade: 'Comércio', regime: 'Lucro Presumido', faturamento: 300000,
   colaboradores: 11, proLabore: 3, contasFinanceiras: 7, pontoColaboradores: 11, guiasDifal: 23,
   notas: 140, contasPagar: 60, pontoEletronico: true, icmsSt: true, monofasico: true,
   teraPontoIntegrado: false, integracaoContabil: 'baixo', integracaoFiscal: 'medio',
   extras: [{ servicoId: 'servico-1', nome: 'Serviço adicional de teste', valor: 99.9, quantidade: 3 }],
  });
  const somaDosItens = result.itens.reduce((acc, line) => acc + line.totalCentavos, 0);
  expect(somaDosItens).toBe(result.totalCentavos);
  expect(result.baseCentavos + result.faixaCentavos + result.criteriosCentavos + result.extrasCentavos).toBe(result.totalCentavos);
  expect(result.totalCentavos).toBe(Math.round(result.total * 100));
  expect(item(result, 'Ponto por colaborador')?.totalCentavos).toBe(11 * 350);
 });

 it('carimba a versão da regra e avisa que não é cálculo de tributos', () => {
  const result = calculatePrice(base());
  expect(result.versao).toBe(PRICE_VERSION);
  expect(PRICE_VERSION).toBe('escopo-4.4-v1');
  expect(result.alertas).toContain('Simulação comercial com base na tabela fornecida. Não é cálculo de tributos.');
  expect(JSON.stringify(result)).not.toMatch(/economia/i);
 });
});
