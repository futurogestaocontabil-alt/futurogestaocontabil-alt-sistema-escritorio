import { describe, expect, it } from 'vitest';
import { createInitialState, runCommand, filterStateForActor } from '../src/services/domain/index';
import { calculatePrice } from '../src/services/domain/pricing';
import type { Actor, AppState, Command, JsonValue, Stage, Step } from '../src/types/domain';
const actor:Actor={id:'gilmar',memberId:'gilmar',nome:'Gilmar Santos',papel:'socio',departamentos:['Fiscal','Pessoal','Contábil','Financeiro','Administrativo']};
const reader:Actor={id:'leitor',nome:'Leitor',papel:'leitura',departamentos:['Administrativo']};
const operation=(state:AppState,command:Command,person=actor)=>runCommand(state,command,person);
function withClient(active=false,extras:Record<string,JsonValue>={}):AppState {
 return operation(createInitialState(),{type:'save',collection:'clientes',id:'client-a',data:{nome:'Empresa isolada dos testes',origem:'Teste automatizado',status:active?'Ativo':'Em implantação',honorario:500,regime:'Simples Nacional',atividade:'Serviços',plano:'Essencial',diaVencimento:20,responsavelId:'daniel',recorrenciasConfirmadas:active,recorrencias:active?[{modeloId:'coleta',responsavelId:'tamires',diaVencimento:5,periodicidade:'mensal'}]:[],...extras}});
}
function withTask(extras:Record<string,JsonValue>={}):AppState {
 return operation(withClient(),{type:'save',collection:'tarefas',id:'task-a',data:{nome:'Obrigação isolada',tipoDemanda:'Obrigação de teste',clienteId:'client-a',departamento:'Fiscal',responsavelId:'daniel',prazo:'2026-09-20',prioridade:'Normal',...extras}});
}
function completeSteps(state:AppState,id:string):AppState {
 let current=state;const task=state.tarefas.find(item=>item.id===id)!;
 for(const step of task.passos as Step[])current=operation(current,{type:'toggleStep',collection:'tarefas',id,data:{stepId:step.id,concluido:true}});
 return current;
}
describe('Gates operacionais e integridade do domínio',()=>{
 it('não inventa clientes e não altera o estado de entrada',()=>{
  const original=createInitialState();const saved=operation(original,{type:'save',collection:'metas',data:{nome:'Meta temporária'}});
  expect(original.clientes).toHaveLength(0);expect(original.meta.revision).toBe(0);expect(saved.meta.revision).toBe(1);expect(original.metas).not.toContainEqual(expect.objectContaining({nome:'Meta temporária'}));
 });
 it('exige origem, honorário e confirmação de recorrências ao ativar cliente',()=>{
  const initial=createInitialState();expect(()=>operation(initial,{type:'save',collection:'clientes',data:{nome:'Sem origem'}})).toThrow('origem');
  const state=withClient();expect(()=>operation(state,{type:'save',collection:'clientes',id:'client-a',data:{status:'Ativo',honorario:0}})).toThrow('Honorário');
  expect(()=>operation(state,{type:'save',collection:'clientes',id:'client-a',data:{status:'Ativo'}})).toThrow('recorrentes');
  expect(withClient(true).clientes[0].status).toBe('Ativo');
 });
 it('impede concluir tarefas por save e sem checklist obrigatório',()=>{
  const state=withTask();expect(()=>operation(state,{type:'save',collection:'tarefas',id:'task-a',data:{status:'Concluída'}})).toThrow('Concluir tarefa');
  expect(()=>operation(state,{type:'completeTask',id:'task-a'})).toThrow('itens obrigatórios');
  const done=operation(completeSteps(state,'task-a'),{type:'completeTask',id:'task-a'});expect(done.tarefas[0].status).toBe('Concluída');
 });
 it('exige protocolo e recibo válido nas obrigações transmitidas',()=>{
  let state=completeSteps(withTask({exigeProtocolo:true}),'task-a');
  expect(()=>operation(state,{type:'completeTask',id:'task-a'})).toThrow('protocolo');
  state=operation(state,{type:'save',collection:'tarefas',id:'task-a',data:{protocolo:'PROTOCOLO-TESTE'}});
  expect(()=>operation(state,{type:'completeTask',id:'task-a'})).toThrow('reciboId');
  state=operation(state,{type:'save',collection:'documentos',id:'receipt-a',data:{nome:'Recibo de teste',tipo:'Recibo',clienteId:'client-a',arquivoId:'arquivo-isolado'}});
  state=operation(state,{type:'save',collection:'tarefas',id:'task-a',data:{reciboId:'receipt-a'}});
  expect(operation(state,{type:'completeTask',id:'task-a'}).tarefas[0].status).toBe('Concluída');
 });
 it('bloqueia fechamento fiscal antes da coleta da mesma competência',()=>{
  const state=withTask({modeloId:'fiscal',competencia:'2026-09'});
  expect(()=>operation(state,{type:'save',collection:'tarefas',id:'task-a',data:{status:'Em andamento'}})).toThrow('Coleta');
 });
 it('valida cada etapa e só conclui depois do último checklist',()=>{
  let state=operation(withClient(),{type:'save',collection:'processos',id:'process-a',data:{nome:'Processo isolado',clienteId:'client-a',departamento:'Administrativo',responsavelId:'tamires',prazo:'2026-09-20',templateId:'certificado'}});
  expect(()=>operation(state,{type:'advanceProcess',id:'process-a'})).toThrow('itens obrigatórios');
  expect(()=>operation(state,{type:'save',collection:'processos',id:'process-a',data:{etapaAtual:1}})).toThrow('Avançar etapa');
  const first=(state.processos[0].etapas as Stage[])[0];
  for(const step of first.itens)state=operation(state,{type:'toggleStep',collection:'processos',id:'process-a',data:{stepId:step.id,concluido:true}});
  state=operation(state,{type:'advanceProcess',id:'process-a'});expect(state.processos[0].etapaAtual).toBe(1);expect(state.processos[0].status).toBe('Em andamento');
  expect(()=>operation(state,{type:'advanceProcess',id:'process-a'})).toThrow('itens obrigatórios');
  const last=(state.processos[0].etapas as Stage[])[1];
  for(const step of last.itens)state=operation(state,{type:'toggleStep',collection:'processos',id:'process-a',data:{stepId:step.id,concluido:true}});
  state=operation(state,{type:'advanceProcess',id:'process-a'});expect(state.processos[0].status).toBe('Concluído');expect(state.processos[0].etapaAtual).toBe(1);
 });
 it('gera recorrências e honorários uma única vez por cliente/competência',()=>{
  let state=withClient(true);state=operation(state,{type:'generateRecurring',data:{competencia:'2026-09'}});state=operation(state,{type:'generateRecurring',data:{competencia:'2026-09'}});expect(state.tarefas).toHaveLength(1);
  state=operation(state,{type:'generateInvoices',data:{competencia:'2026-09'}});state=operation(state,{type:'generateInvoices',data:{competencia:'2026-09'}});expect(state.faturas).toHaveLength(1);expect(state.faturas[0].valor).toBe(500);
 });
 it('respeita meses anuais, fechamento trimestral e último dia do mês',()=>{
  const state=withClient(true,{diaVencimento:31,recorrencias:[{modeloId:'coleta',responsavelId:'tamires',diaVencimento:31,periodicidade:'mensal'},{modeloId:'defis',responsavelId:'daniel',diaVencimento:31,periodicidade:'anual',mes:3},{modeloId:'irpj-csll',responsavelId:'daniel',diaVencimento:31,periodicidade:'trimestral'}]});
  const february=operation(state,{type:'generateRecurring',data:{competencia:'2027-02'}});expect(february.tarefas).toHaveLength(1);expect(february.tarefas[0].prazo).toBe('2027-02-28');
  const march=operation(state,{type:'generateRecurring',data:{competencia:'2027-03'}});expect(march.tarefas).toHaveLength(3);
  expect(operation(state,{type:'generateInvoices',data:{competencia:'2027-02'}}).faturas[0].vencimento).toBe('2027-02-28');
 });
 it('cria a primeira conta a receber junto com o novo cliente financeiro',()=>{
  const state=withClient(true,{financeiroAtivo:true,gerarHonorarioAutomatico:true,competenciaInicialFinanceiro:'2026-10',diaVencimento:15});
  expect(state.faturas).toHaveLength(1);expect(state.faturas[0]).toMatchObject({clienteId:'client-a',competencia:'2026-10',valor:500,vencimento:'2026-10-15',status:'Pendente',tipo:'Honorário',origem:'Cadastro automático'});
  const generated=operation(state,{type:'generateInvoices',data:{competencia:'2026-10'}});expect(generated.faturas).toHaveLength(1);
 });
 it('não gera honorário quando o financeiro ou a recorrência estiver desabilitada',()=>{
  const disabled=withClient(true,{financeiroAtivo:false,gerarHonorarioAutomatico:true});expect(disabled.faturas).toHaveLength(0);
  expect(operation(disabled,{type:'generateInvoices',data:{competencia:'2026-10'}}).faturas).toHaveLength(0);
 });
 it('não permite a leitor executar comandos indiretos de escrita',()=>{
  const state=withClient(true);
  for(const command of [{type:'generateRecurring',data:{competencia:'2026-09'}},{type:'generateInvoices',data:{competencia:'2026-09'}},{type:'messageToTask',data:{clienteId:'client-a',mensagem:'Mensagem de teste',responsavelId:'tamires'}}] as Command[])expect(()=>operation(state,command,reader)).toThrow();
 });
 it('mantém documentos de outro departamento ocultos e segredos fora do JSON',()=>{
  const state=operation(withClient(),{type:'save',collection:'documentos',data:{nome:'Fiscal privado',tipo:'Fiscal',departamento:'Fiscal'}});expect(filterStateForActor(state,reader).documentos).toHaveLength(0);
  expect(()=>operation(state,{type:'save',collection:'sistemas',data:{nome:'Sistema',secret:'dado secreto'}})).toThrow('cofre');
  expect(()=>operation(state,{type:'save',collection:'atividades',data:{nome:'Log adulterado'}})).toThrow('imutável');
 });
 it('mantém propostas e integrações sem confirmação externa em estado de preparação',()=>{
  let state=operation(createInitialState(),{type:'save',collection:'leads',id:'lead-a',data:{nome:'Lead isolado',origem:'Indicação',responsavelId:'gilmar'}});
  state=operation(state,{type:'save',collection:'propostas',id:'proposal-a',data:{nome:'Proposta',leadId:'lead-a',plano:'Essencial',validade:'2026-09-30',condicaoPagamento:'Mensal',responsavelId:'gilmar',valor:500,status:'Rascunho'}});
  expect(()=>operation(state,{type:'save',collection:'propostas',id:'proposal-a',data:{status:'Enviada'}})).toThrow('comprovante de envio');
  expect(()=>operation(state,{type:'save',collection:'integracoes',id:'integracao-0',data:{status:'Ativa'}})).toThrow('teste de conexão');
 });
});
describe('Preço comercial fornecido, com centavos e limites explícitos',()=>{
 const base={plano:'Essencial',atividade:'Serviços',regime:'Simples Nacional',faturamento:25000} as const;
 it('inclui o limite da faixa e avança somente acima dele',()=>{expect(calculatePrice(base).total).toBe(397);expect(calculatePrice({...base,faturamento:25000.01}).total).toBe(547);});
 it('aplica fatores por quantidade e preserva a composição em centavos',()=>{
  const price=calculatePrice({...base,plano:'Mentor',colaboradores:4,extras:[{servicoId:'extra-test',nome:'Extra isolado',valor:20.1,quantidade:3}]});
  expect(price.totalCentavos).toBe(71730);expect(price.total).toBe(717.3);expect(price.itens.reduce((sum,item)=>sum+item.totalCentavos,0)).toBe(price.totalCentavos);
 });
 it('marca Indústria como parametrização sugerida e barra faturamento além da faixa',()=>{
  const industria=calculatePrice({...base,atividade:'Indústria'});
  expect(industria.parametrizacaoSugerida).toBe(true);
  expect(()=>calculatePrice({...base,faturamento:400000.01})).toThrow('maior faixa parametrizada');
 });
 it('rejeita quantidades inválidas e serviço zero sem aprovação',()=>{
  expect(()=>calculatePrice({...base,colaboradores:1.5})).toThrow('inteira');expect(()=>calculatePrice({...base,extras:[{servicoId:'zero',nome:'Sem preço',valor:0,quantidade:1}]})).toThrow('aprovação');
 });
});

