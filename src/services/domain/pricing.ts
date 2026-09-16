export type Plan = 'Essencial' | 'Mentor' | 'Estratégico';
export type Activity = 'Serviços' | 'Comércio' | 'Indústria';
export type TaxRegime = 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real' | 'Imunes ou Isentas';
export interface PriceExtra { servicoId: string; nome: string; valor: number; quantidade: number; aprovacaoSocio?: boolean }
/** Ajuste identificado sobre o total. O valor final nunca é digitado à mão. */
export interface PriceAdjustment { tipo: 'desconto' | 'acrescimo'; percentual?: number; valor?: number; justificativa?: string; aprovadoPorId?: string }
export const DESCONTO_SEM_APROVACAO = 10;
export interface PriceInput {
  plano: Plan; atividade: Activity; regime: TaxRegime; faturamento: number;
  colaboradores?: number; proLabore?: number; contasFinanceiras?: number; pontoColaboradores?: number;
  guiasDifal?: number; notas?: number; contasPagar?: number; pontoEletronico?: boolean;
  icmsSt?: boolean; monofasico?: boolean; teraPontoIntegrado?: boolean;
  integracaoContabil?: 'alto'|'medio'|'baixo'; integracaoFiscal?: 'alto'|'medio'|'baixo'; extras?: PriceExtra[];
  ajuste?: PriceAdjustment;
  /** A tabela de Indústria é parametrização sugerida até o sócio aprovar. */
  tabelaIndustriaAprovada?: boolean;
}
export type PriceCategory = 'base' | 'plano' | 'criterio' | 'integracao' | 'extra' | 'ajuste';
export interface PriceLine { nome: string; quantidade: number; valorUnitarioCentavos: number; totalCentavos: number; categoria: PriceCategory }
export interface PriceResult { valor: number; total: number; totalCentavos: number; subtotalCentavos: number; ajusteCentavos: number; baseCentavos: number; faixaCentavos: number; criteriosCentavos: number; extrasCentavos: number; limiteFaturamento: number | null; versao: string; parametrizacaoSugerida: boolean; itens: PriceLine[]; alertas: string[] }
export const PRICE_VERSION = 'escopo-4.5-v1';
/** `limite` nulo é faixa aberta, sem teto. Só a tabela de Indústria tem uma. */
type Band = readonly [limite: number | null, valor: number];
export const PRICE_TABLES: Record<Activity, Record<TaxRegime, readonly Band[]>> = {
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
 // Parametrização comercial sugerida em 15/09/2026, pendente de aprovação do
 // sócio. Enquanto não houver aprovação, a simulação avisa na própria tela.
 'Indústria': {
  'Simples Nacional': [[50000,725],[100000,1150],[200000,1638],[400000,1850],[null,2350]],
  'Lucro Presumido': [[100000,1094],[300000,2813],[500000,3750],[800000,4800],[1500000,6469],[2500000,7188],[null,9500]],
  'Lucro Real': [[100000,1138],[300000,2925],[500000,3906],[800000,4977],[1500000,6750],[2500000,7500],[null,10500]],
  'Imunes ou Isentas': [[100000,1337],[300000,2436],[500000,4811],[800000,5702],[1500000,6755],[2500000,9265],[null,11000]],
 },
};
/** Atividades cuja tabela ainda é sugestão comercial, não parametrização aprovada. */
export const TABELAS_SUGERIDAS: readonly Activity[] = ['Indústria'];
export function toCents(value: number): number {
 if (!Number.isFinite(value) || value < 0 || value > 1000000000) throw new Error('Informe um valor financeiro válido, positivo ou zero.');
 return Math.round((value + Number.EPSILON) * 100);
}
function count(value: number | undefined, label: string): number {
 const n = value ?? 0; if (!Number.isSafeInteger(n) || n < 0 || n > 1000000) throw new Error(`${label}: informe uma quantidade inteira válida.`); return n;
}
export function calculatePrice(input: PriceInput): PriceResult {
 toCents(input.faturamento);
 const tables = PRICE_TABLES[input.atividade];
 if (!tables || !tables[input.regime]) throw new Error('Atividade ou regime sem tabela de preços cadastrada.');
 const band = tables[input.regime].find(([limit]) => limit === null || input.faturamento <= limit);
 if (!band) throw new Error('Este faturamento está acima da maior faixa parametrizada. Solicite aprovação do sócio para cadastrar uma nova faixa.');
 const parametrizacaoSugerida = TABELAS_SUGERIDAS.includes(input.atividade) && input.tabelaIndustriaAprovada !== true;
 const bases: Record<Plan,number> = {Essencial:0,Mentor:100,'Estratégico':560};
 if (!(input.plano in bases)) throw new Error('Plano inválido.');
 const itens: PriceLine[] = [];
 function add(nome: string, quantidade: number, value: number, categoria: PriceCategory='criterio') { const cents=value<0?-toCents(-value):toCents(value); const total=quantidade*cents; if(!Number.isSafeInteger(total)) throw new Error('Valor calculado fora do limite.'); itens.push({nome,quantidade,valorUnitarioCentavos:cents,totalCentavos:total,categoria}); return total; }
 const baseCentavos=add(`Base ${input.plano}`,1,bases[input.plano],'plano');
 const faixaCentavos=add(band[0]===null?'Faixa acima da última parametrizada':`Faixa até R$ ${band[0].toLocaleString('pt-BR')}`,1,band[1],'base');
 let criteriosCentavos=0;
 const employees=count(input.colaboradores,'Colaboradores'); if(employees) criteriosCentavos+=add('Colaboradores',employees,employees<=3?50:employees<=6?40:employees<=15?35:employees<=30?32:30);
 const partners=count(input.proLabore,'Pró-labore'); if(partners) criteriosCentavos+=add('Pró-labore',partners,partners<=3?30:20);
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
  if(value!==undefined) { if(!['alto','medio','baixo'].includes(value)) throw new Error('Nível de integração inválido.'); criteriosCentavos+=add(label,1,value==='alto'?0:value==='medio'?90:150,'integracao'); }
 }
 let extrasCentavos=0;
 for(const extra of input.extras??[]) { const qty=count(extra.quantidade,'Quantidade do extra'); if(!qty||!extra.servicoId||!extra.nome) throw new Error('Extra exige serviço do catálogo e quantidade maior que zero.'); if(toCents(extra.valor)===0&&!extra.aprovacaoSocio) throw new Error('Serviço sem preço exige aprovação explícita do sócio.'); extrasCentavos+=add(extra.nome,qty,extra.valor,'extra'); }
 const subtotalCentavos=baseCentavos+faixaCentavos+criteriosCentavos+extrasCentavos;
 if(!Number.isSafeInteger(subtotalCentavos)) throw new Error('Valor calculado fora do limite.');

 // O total nunca é digitado. Qualquer ajuste entra como linha identificada,
 // com percentual ou valor, justificativa e, acima do limite, aprovação.
 let ajusteCentavos=0;
 const ajuste=input.ajuste;
 if(ajuste) {
  if(!['desconto','acrescimo'].includes(ajuste.tipo)) throw new Error('O ajuste precisa ser desconto ou acréscimo.');
  const temPercentual=ajuste.percentual!==undefined&&ajuste.percentual!==null;
  const temValor=ajuste.valor!==undefined&&ajuste.valor!==null;
  if(temPercentual===temValor) throw new Error('Informe o ajuste por percentual ou por valor, nunca os dois.');
  let bruto:number;
  if(temPercentual) {
   const percentual=Number(ajuste.percentual);
   if(!Number.isFinite(percentual)||percentual<=0||percentual>100) throw new Error('Percentual de ajuste inválido. Use um valor acima de zero e até 100.');
   bruto=Math.round(subtotalCentavos*percentual/100);
  } else {
   bruto=toCents(Number(ajuste.valor));
   if(bruto<=0) throw new Error('Informe um valor de ajuste maior que zero.');
  }
  if(ajuste.tipo==='desconto') {
   if(bruto>subtotalCentavos) throw new Error('O desconto não pode ser maior que o valor calculado.');
   const percentualEfetivo=subtotalCentavos===0?0:(bruto/subtotalCentavos)*100;
   if(percentualEfetivo>DESCONTO_SEM_APROVACAO+1e-9&&!ajuste.aprovadoPorId)
    throw new Error(`Desconto acima de ${DESCONTO_SEM_APROVACAO}% exige aprovação do sócio.`);
   if(!String(ajuste.justificativa??'').trim()) throw new Error('Todo desconto exige justificativa registrada.');
   ajusteCentavos=-bruto;
   add(`Desconto${temPercentual?` de ${Number(ajuste.percentual)}%`:''}`,1,-bruto/100,'ajuste');
  } else {
   if(!String(ajuste.justificativa??'').trim()) throw new Error('Todo acréscimo exige justificativa registrada.');
   ajusteCentavos=bruto;
   add(`Acréscimo${temPercentual?` de ${Number(ajuste.percentual)}%`:''}`,1,bruto/100,'ajuste');
  }
 }

 const totalCentavos=subtotalCentavos+ajusteCentavos;
 if(!Number.isSafeInteger(totalCentavos)||totalCentavos<0) throw new Error('Valor calculado fora do limite.');
 const alertas=['Simulação comercial com base na tabela fornecida. Não é cálculo de tributos.'];
 if(parametrizacaoSugerida) alertas.push(`A tabela de ${input.atividade} é parametrização comercial sugerida e ainda depende de aprovação do sócio. Não apresente como tabela oficial.`);
 return {valor:totalCentavos/100,total:totalCentavos/100,totalCentavos,subtotalCentavos,ajusteCentavos,baseCentavos,faixaCentavos,criteriosCentavos,extrasCentavos,limiteFaturamento:band[0],versao:PRICE_VERSION,parametrizacaoSugerida,itens,alertas};
}
