export type Plan = 'Essencial' | 'Mentor' | 'Estratégico';
export type Activity = 'Serviços' | 'Comércio' | 'Indústria';
export type TaxRegime = 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real' | 'Imunes ou Isentas';
export interface PriceExtra { servicoId: string; nome: string; valor: number; quantidade: number; aprovacaoSocio?: boolean }
export interface PriceInput {
  plano: Plan; atividade: Activity; regime: TaxRegime; faturamento: number;
  colaboradores?: number; proLabore?: number; contasFinanceiras?: number; pontoColaboradores?: number;
  guiasDifal?: number; notas?: number; contasPagar?: number; pontoEletronico?: boolean;
  icmsSt?: boolean; monofasico?: boolean; teraPontoIntegrado?: boolean;
  integracaoContabil?: 'alto'|'medio'|'baixo'; integracaoFiscal?: 'alto'|'medio'|'baixo'; extras?: PriceExtra[];
}
export interface PriceLine { nome: string; quantidade: number; valorUnitarioCentavos: number; totalCentavos: number }
export interface PriceResult { valor: number; total: number; totalCentavos: number; baseCentavos: number; faixaCentavos: number; criteriosCentavos: number; extrasCentavos: number; limiteFaturamento: number; versao: string; itens: PriceLine[]; alertas: string[] }
export const PRICE_VERSION = 'escopo-4.4-v1';
type Band = readonly [limite: number, valor: number];
export const PRICE_TABLES: Record<Exclude<Activity, 'Indústria'>, Record<TaxRegime, readonly Band[]>> = {
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
export function toCents(value: number): number {
 if (!Number.isFinite(value) || value < 0 || value > 1000000000) throw new Error('Informe um valor financeiro válido, positivo ou zero.');
 return Math.round((value + Number.EPSILON) * 100);
}
function count(value: number | undefined, label: string): number {
 const n = value ?? 0; if (!Number.isSafeInteger(n) || n < 0 || n > 1000000) throw new Error(`${label}: informe uma quantidade inteira válida.`); return n;
}
export function calculatePrice(input: PriceInput): PriceResult {
 toCents(input.faturamento);
 if (input.atividade === 'Indústria') throw new Error('A tabela de Indústria não foi fornecida. Importe a parametrização do 4C antes de simular.');
 const tables = PRICE_TABLES[input.atividade];
 if (!tables || !tables[input.regime]) throw new Error('Atividade ou regime sem tabela de preços cadastrada.');
 const band = tables[input.regime].find(([limit]) => input.faturamento <= limit);
 if (!band) throw new Error('Faturamento acima da última faixa fornecida. É necessária uma parametrização aprovada.');
 const bases: Record<Plan,number> = {Essencial:0,Mentor:100,'Estratégico':560};
 if (!(input.plano in bases)) throw new Error('Plano inválido.');
 const itens: PriceLine[] = [];
 function add(nome: string, quantidade: number, value: number) { const cents=toCents(value); const total=quantidade*cents; if(!Number.isSafeInteger(total)) throw new Error('Valor calculado fora do limite.'); itens.push({nome,quantidade,valorUnitarioCentavos:cents,totalCentavos:total}); return total; }
 const baseCentavos=add(`Base ${input.plano}`,1,bases[input.plano]);
 const faixaCentavos=add(`Faixa até R$ ${band[0].toLocaleString('pt-BR')}`,1,band[1]);
 let criteriosCentavos=0;
 const employees=count(input.colaboradores,'Colaboradores'); if(employees) criteriosCentavos+=add('Colaboradores',employees,employees<=3?50:employees<=6?40:employees<=15?35:employees<=30?32:30);
 const partners=count(input.proLabore,'Pró-labore'); if(partners>3) throw new Error('O escopo só fornece preço de pró-labore para até 3 pessoas.'); if(partners) criteriosCentavos+=add('Pró-labore',partners,30);
 const accounts=count(input.contasFinanceiras,'Contas financeiras'); if(accounts) criteriosCentavos+=add('Contas financeiras',accounts,accounts<=3?10:8);
 const points=count(input.pontoColaboradores,'Ponto por colaborador'); if(points) criteriosCentavos+=add('Ponto por colaborador',points,points<=10?5:3.5);
 const difal=count(input.guiasDifal,'Guias DIFAL'); if(difal) criteriosCentavos+=add('Guias DIFAL ICMS',difal,difal<=10?25:difal<=20?20:17);
 const notes=count(input.notas,'Emissão de notas'); if(notes) criteriosCentavos+=add('Emissão de notas',notes,10);
 const payable=count(input.contasPagar,'Contas a pagar'); if(payable) criteriosCentavos+=add('Contas a pagar',payable,5);
 if(input.pontoEletronico===true) criteriosCentavos+=add('Ponto eletrônico',1,100);
 if(input.icmsSt===true) criteriosCentavos+=add('ICMS-ST interestadual',1,100);
 if(input.monofasico===true) criteriosCentavos+=add('PIS/COFINS monofásico',1,100);
 if(input.teraPontoIntegrado===false) criteriosCentavos+=add('Sem ponto integrado',1,50);
 for(const [label,value] of [['Integração contábil',input.integracaoContabil],['Integração fiscal',input.integracaoFiscal]] as const) {
  if(value!==undefined) { if(!['alto','medio','baixo'].includes(value)) throw new Error('Nível de integração inválido.'); criteriosCentavos+=add(label,1,value==='alto'?0:value==='medio'?90:150); }
 }
 let extrasCentavos=0;
 for(const extra of input.extras??[]) { const qty=count(extra.quantidade,'Quantidade do extra'); if(!qty||!extra.servicoId||!extra.nome) throw new Error('Extra exige serviço do catálogo e quantidade maior que zero.'); if(toCents(extra.valor)===0&&!extra.aprovacaoSocio) throw new Error('Serviço sem preço exige aprovação explícita do sócio.'); extrasCentavos+=add(extra.nome,qty,extra.valor); }
 const totalCentavos=baseCentavos+faixaCentavos+criteriosCentavos+extrasCentavos;
 if(!Number.isSafeInteger(totalCentavos)) throw new Error('Valor calculado fora do limite.');
 return {valor:totalCentavos/100,total:totalCentavos/100,totalCentavos,baseCentavos,faixaCentavos,criteriosCentavos,extrasCentavos,limiteFaturamento:band[0],versao:PRICE_VERSION,itens,alertas:['Simulação comercial com base na tabela fornecida. Não é cálculo de tributos.']};
}
