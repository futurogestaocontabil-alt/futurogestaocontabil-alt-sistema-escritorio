import { COLLECTIONS, type Actor, type AppState, type CollectionName, type Command, type Entity, type JsonValue, type Step, type Stage } from '../../types/domain.ts';
import { makeEntity } from './seed.ts';
import { calculatePrice, toCents, type PriceInput } from './pricing.ts';
import { createProcessStages, taskSteps, TASK_MODELS } from './templates.ts';
export class DomainError extends Error { readonly code='VALIDATION'; constructor(message:string){super(message);this.name='DomainError';} }
const fail=(message:string):never=>{throw new DomainError(message);};
const text=(value:unknown):string=>typeof value==='string'?value.trim():'';
const object=(value:unknown):Record<string,JsonValue>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,JsonValue>:{};
const list=(value:unknown):Record<string,JsonValue>[]=>Array.isArray(value)?value.map(object):[];
const finished=(value:unknown)=>['Concluída','Concluído','Finalizado'].includes(String(value));
function normalize(value:string):string{return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[ _-]/g,'');}
export function actorRole(actor:Actor):'socio'|'operacao'|'administrativo'|'leitura' {
 const role=normalize(actor.papel??actor.role??'');
 if(role==='socio'||role==='admin'||role==='owner') return 'socio';
 if(role==='operacao'||role==='operacoes') return 'operacao';
 if(role==='administrativo') return 'administrativo';
 if(['leitura','somenteleitura','readonly'].includes(role)) return 'leitura';
 return fail('Papel de usuário inválido.');
}
const departments=(actor:Actor)=>actor.departamentos??(actor.department?[actor.department]:[]);
const shared:CollectionName[]=['clientes','leads','propostas','documentos','licencas','equipe','servicos','integracoes','metas','cargos','configuracoes'];
function canRead(collection:CollectionName,item:Entity,actor:Actor):boolean {
 const role=actorRole(actor); if(role==='socio') return true;
 if(['faturas','despesas'].includes(collection)) return departments(actor).includes('Financeiro');
 if(collection==='documentos'&&item.departamento) return departments(actor).includes(String(item.departamento));
 if(collection==='avaliacoes') return item.colaboradorId===(actor.memberId??actor.id);
 if(collection==='sistemas') return !item.departamento||departments(actor).includes(String(item.departamento));
 if(shared.includes(collection)) return true;
 return !item.departamento||departments(actor).includes(String(item.departamento))||item.responsavelId===(actor.memberId??actor.id);
}
function authorize(collection:CollectionName,item:Entity|undefined,actor:Actor):void {
 const role=actorRole(actor); if(role==='socio') return;
 if(role==='leitura') fail('Seu perfil permite somente leitura.');
 if(['configuracoes','equipe','cargos','avaliacoes','servicos','integracoes','sistemas'].includes(collection)) fail('Esta alteração exige acesso do sócio.');
 if(['faturas','despesas'].includes(collection)&&!departments(actor).includes('Financeiro')) fail('Esta alteração exige acesso ao departamento Financeiro.');
 if(['leads','propostas'].includes(collection)&&role!=='administrativo'&&!departments(actor).includes('Comercial')) fail('Esta alteração exige acesso Comercial.');
 if(item&&!canRead(collection,item,actor)) fail('Registro fora dos departamentos autorizados.');
}
export function filterStateForActor(state:AppState,actor:Actor):AppState {
 const result=structuredClone(state); const role=actorRole(actor);
 for(const collection of COLLECTIONS) result[collection]=result[collection].filter(item=>canRead(collection,item,actor));
 if(role!=='socio') {
  result.equipe=result.equipe.map(({salario: _salario,...item})=>item as Entity);
  result.cargos=result.cargos.map(item=>({...item,salarioMinimo:null,salarioMaximo:null,faixas:[]}));
  result.configuracoes=result.configuracoes.filter(item=>!['segredo','credencial'].includes(String(item.tipo)));
 }
 return result;
}
function validateJson(value:unknown,depth=0):void {
 if(depth>20) fail('Estrutura de dados muito profunda.');
 if(value===null||typeof value==='boolean'||typeof value==='string') return;
 if(typeof value==='number'){if(!Number.isFinite(value)) fail('Valores numéricos devem ser finitos.');return;}
 if(Array.isArray(value)){if(value.length>10000)fail('Lista muito extensa.');value.forEach(item=>validateJson(item,depth+1));return;}
 if(typeof value==='object') {for(const [key,child] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))fail('Nome de campo inválido.'); if(/^(senha|password|service_role|serviceRole|apiKey|chaveSecreta|accessToken|refreshToken|clientSecret|secret|token|tokenAcesso|tokenRefresh|credential|credencial|chaveApi)$/i.test(key)&&child!==null&&child!=='')fail('Guarde segredos somente no cofre cifrado.');validateJson(child,depth+1);}return;}
 fail('Os dados devem ser JSON válido.');
}
function requireFields(item:Entity,fields:string[]):void{for(const field of fields)if(!text(item[field]))fail(`Preencha o campo obrigatório: ${field}.`);}
function date(value:unknown,label:string):string {
 const s=text(value); if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(`${s}T12:00:00Z`).toISOString().slice(0,10)!==s)fail(`${label}: informe uma data válida.`);return s;
}
function competence(value:unknown):string{const s=text(value);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(s))fail('Informe a competência no formato AAAA-MM.');return s;}
function amount(value:JsonValue|undefined,label:string,positive=false):void{if(typeof value!=='number'||!Number.isFinite(value)||value<0||(positive&&value===0))fail(`${label}: informe um valor ${positive?'maior que zero':'válido'}.`);toCents(value as number);}
function find(state:AppState,collection:CollectionName,id:unknown):Entity {const item=state[collection].find(row=>row.id===id);return item??fail(`Registro não encontrado em ${collection}.`);}
function validDocument(state:AppState,id:unknown,clienteId?:unknown):Entity {
 const document=find(state,'documentos',id);if(!text(document.storageKey)&&!text(document.arquivoId)&&!text(document.url)&&!text(document.caminho))fail('O documento precisa ter um arquivo anexado ou link verificável.');
 if(clienteId&&document.clienteId&&document.clienteId!==clienteId)fail('O documento pertence a outro cliente.');return document;
}
function references(state:AppState,item:Entity):void {
 const refs:Record<string,CollectionName>={clienteId:'clientes',responsavelId:'equipe',leadId:'leads',servicoId:'servicos',propostaId:'propostas',gestorId:'equipe',colaboradorId:'equipe',tarefaId:'tarefas',processoId:'processos',reciboId:'documentos',documentoId:'documentos'};
 for(const [key,collection] of Object.entries(refs))if(item[key]!==null&&item[key]!==undefined&&item[key]!=='')find(state,collection,item[key]);
}
function steps(item:Entity):Step[]{return list(item.passos) as Step[];}
function stages(item:Entity):Stage[]{return list(item.etapas) as Stage[];}
function validateSteps(values:Step[]):void {
 const ids=new Set<string>(); for(const item of values){if(!text(item.id)||!text(item.descricao))fail('Todo passo precisa de identificação e descrição.');if(ids.has(item.id))fail('Identificador de passo duplicado.');ids.add(item.id);if(typeof item.obrigatorio!=='boolean'||typeof item.concluido!=='boolean')fail('Passo inválido.');}
}
function assertPendingClear(values:Step[]):void {const pending=values.filter(step=>step.obrigatorio&&!step.concluido);if(pending.length)fail(`Conclua os itens obrigatórios: ${pending.map(step=>step.descricao).join('; ')}.`);}
function validateRecurrences(state:AppState,client:Entity):void {
 if(client.recorrenciasConfirmadas!==true) fail('Confirme as tarefas recorrentes do cliente antes de ativá-lo.');
 const rules=list(client.recorrencias);if(!rules.length&&!text(client.dispensaRecorrenciasJustificativa)) fail('Defina ao menos uma recorrência ou justifique a dispensa.');
 const ids=new Set<string>();for(const rule of rules){const model=TASK_MODELS.find(item=>item.id===rule.modeloId)??fail('Modelo de recorrência inválido.');if(ids.has(model.id))fail('Há recorrências duplicadas.');ids.add(model.id);find(state,'equipe',rule.responsavelId);const day=Number(rule.diaVencimento);if(!Number.isInteger(day)||day<1||day>31)fail(`Defina o dia de vencimento de ${model.nome}.`);if(rule.periodicidade!==model.periodicidade)fail('A periodicidade deve corresponder ao modelo.');if(model.periodicidade==='anual'){const month=Number(rule.mes??model.mes);if(!Number.isInteger(month)||month<1||month>12)fail(`Defina o mês da recorrência anual ${model.nome}.`);}}
}
function ensureDependencies(state:AppState,task:Entity):void {
 const model=String(task.modeloId??'');if(!['fiscal','folha','prolabore','contabil'].includes(model))return;
 const same=state.tarefas.filter(item=>item.clienteId===task.clienteId&&item.competencia===task.competencia);
 const cleared=(id:string)=>same.some(item=>item.modeloId===id&&(finished(item.status)||(id==='coleta'&&item.status==='Justificada'&&text(item.justificativaColeta).length>=10)));
 if(['fiscal','folha','prolabore'].includes(model)&&!cleared('coleta'))fail('Conclua a Coleta de documentos da mesma competência ou registre uma justificativa.');
 if(model==='contabil') {if(!cleared('fiscal'))fail('Conclua o Fechamento Fiscal da mesma competência.');const client=find(state,'clientes',task.clienteId);const configured=list(client.recorrencias);const needsPayroll=Number(client.funcionarios)>0||client.proLabore===true||Number(client.proLabore)>0||configured.some(item=>['folha','prolabore'].includes(String(item.modeloId)));if(needsPayroll&&!cleared('folha')&&!cleared('prolabore'))fail('Conclua o Fechamento de Folha ou de pró-labore da mesma competência.');}
}
function validateEntity(state:AppState,collection:CollectionName,item:Entity,actor:Actor):void {
 references(state,item);
 for(const key of ['valor','honorario','valorPago','preco','custoMensal','salarioMinimo','salarioMaximo']) if(item[key]!==undefined&&item[key]!==null&&item[key]!=='') amount(item[key],key);
 for(const key of ['prazo','validade','vencimento','dataEntrada','dataPagamento']) if(item[key]!==undefined&&item[key]!==null&&item[key]!=='')date(item[key],key);
 if(item.competencia)competence(item.competencia);
 if(collection==='clientes') {if(!text(item.nome)&&!text(item.razaoSocial))fail('Preencha a razão social ou o nome do cliente.');requireFields(item,['origem']);if(item.status==='Ativo'){amount(item.honorario,'Honorário',true);validateRecurrences(state,item);}if(item.diaVencimento!==undefined&&(!Number.isInteger(item.diaVencimento)||Number(item.diaVencimento)<1||Number(item.diaVencimento)>31))fail('Dia de vencimento deve estar entre 1 e 31.');}
 if(collection==='leads')requireFields(item,['nome','origem','responsavelId']);
 if(collection==='tarefas'){requireFields(item,['nome','tipoDemanda','clienteId','departamento','responsavelId','prazo','prioridade']);date(item.prazo,'Prazo');validateSteps(steps(item));if(['Em andamento','Concluída'].includes(String(item.status)))ensureDependencies(state,item);if(item.status==='Justificada'&&(item.modeloId!=='coleta'||text(item.justificativaColeta).length<10))fail('A dispensa da coleta exige justificativa com pelo menos 10 caracteres.');}
 if(collection==='processos'){requireFields(item,['nome','clienteId','responsavelId','departamento','prazo']);const all=stages(item);if(!all.length)fail('O processo precisa de etapas.');all.forEach(stage=>validateSteps(stage.itens));if(!Number.isInteger(item.etapaAtual)||Number(item.etapaAtual)<0||Number(item.etapaAtual)>=all.length)fail('Etapa atual inválida.');}
 if(collection==='licencas'){requireFields(item,['nome','clienteId','status']);if(item.status==='Ativo')date(item.validade,'Validade');}
 if(collection==='documentos'){requireFields(item,['nome','tipo']);if(item.url&&!/^https:\/\//i.test(text(item.url)))fail('Use um link HTTPS válido para o documento.');}
 if(collection==='faturas'){requireFields(item,['clienteId','competencia','vencimento','status']);amount(item.valor,'Valor da fatura',true);if(item.status==='Paga') {date(item.dataPagamento,'Data de pagamento');requireFields(item,['formaPagamento']);}}
 if(collection==='despesas'){requireFields(item,['fornecedor','categoria','vencimento','status']);amount(item.valor,'Valor da despesa',true);if(item.status==='Paga') date(item.dataPagamento,'Data de pagamento');}
 if(collection==='servicos'){requireFields(item,['nome','departamento']);amount(item.valor,'Preço do serviço');}
 if(collection==='equipe') requireFields(item,['nome']);
 if(collection==='propostas'){requireFields(item,['leadId','plano','validade','condicaoPagamento','responsavelId']);amount(item.valor,'Valor da proposta');for(const extra of list(item.extras)){const service=find(state,'servicos',extra.servicoId);if(service.ativo===false)fail('Serviço inativo não pode entrar em proposta.');if(Number(service.valor)===0&&!(actorRole(actor)==='socio'&&extra.aprovacaoSocio===true))fail('Serviço sem preço exige aprovação explícita do sócio.');}}
 if(collection==='irpf'){requireFields(item,['clienteId','situacao']);if(item.preco!==undefined)amount(item.preco,'Preço do IRPF');}
 if(collection==='configuracoes') requireFields(item,['nome','tipo']);
}
function audit(state:AppState,actor:Actor,action:string,collection:CollectionName,id:string,description:string,now:string):void {state.atividades.push(makeEntity({acao:action,colecao:collection,registroId:id,autorId:actor.id,autor:actor.nome,descricao:description,departamento:state[collection].find(row=>row.id===id)?.departamento??null},crypto.randomUUID(),now));}
function update(state:AppState,collection:CollectionName,item:Entity):void {const index=state[collection].findIndex(row=>row.id===item.id);if(index<0)state[collection].push(item);else state[collection][index]=item;}
function save(state:AppState,command:Command,actor:Actor,now:string):void {
 const collection=command.collection??fail('Informe a coleção.');if(!COLLECTIONS.includes(collection))fail('Coleção inválida.');if(collection==='atividades')fail('O histórico é imutável.');
 const data={...command.data};const id=command.id??(text(data.id)||crypto.randomUUID());const previous=state[collection].find(row=>row.id===id);authorize(collection,previous,actor);
 const transferirPendentes=data.transferirPendentes===true;delete data.transferirPendentes;
 const item:Entity={...(previous??makeEntity({},id,now)),...data,id,createdAt:previous?.createdAt??now,updatedAt:now};
 if(collection==='processos') {
  if(previous){if((data.etapaAtual!==undefined&&data.etapaAtual!==previous.etapaAtual)||data.status!==undefined&&finished(data.status)!==finished(previous.status))fail('Use a ação Avançar etapa para alterar o progresso do processo.');if(data.etapas!==undefined&&JSON.stringify(data.etapas)!==JSON.stringify(previous.etapas))fail('Use a ação de checklist para alterar itens do processo.');}
  else {if(Number(item.etapaAtual??0)!==0||finished(item.status))fail('Novos processos começam na primeira etapa.');item.etapaAtual=0;item.status='Em andamento';item.etapas=item.etapas??createProcessStages(String(item.templateId??'onboarding'));if(stages(item).some(stage=>stage.itens.some(step=>step.concluido)))fail('Novos processos devem começar com os itens pendentes.');}
 }
 if(collection==='tarefas') {
  if(finished(item.status)&&(!previous||!finished(previous.status)))fail('Use a ação Concluir tarefa para validar a entrega.');
  if(previous&&data.passos!==undefined&&JSON.stringify(data.passos)!==JSON.stringify(previous.passos))fail('Use a ação de checklist para alterar passos da tarefa.');
  if(!previous){item.status=item.status??'Pendente';item.periodicidade=item.periodicidade??'avulsa';item.passos=item.passos??(text(item.modeloId)?taskSteps(String(item.modeloId),find(state,'clientes',item.clienteId)):[{id:'entrega',descricao:'Executar e conferir a demanda',obrigatorio:true,concluido:false,natureza:'marcar'}]);if(steps(item).some(step=>step.concluido))fail('Novas tarefas começam com passos pendentes.');}
 }
 if(collection==='integracoes'&&item.status==='Ativa'&&previous?.status!=='Ativa')fail('Uma integração só pode ficar ativa após teste de conexão pelo servidor.');
 if(collection==='servicos'){const changed=previous&&previous.valor!==item.valor;item.versao=changed?Number(previous.versao??1)+1:Number(previous?.versao??1);item.historicoPrecos=changed?[...list(previous.historicoPrecos),{versao:Number(item.versao),valor:item.valor??0,vigenteDesde:now,autorId:actor.id}]:previous?.historicoPrecos??[{versao:1,valor:item.valor??0,vigenteDesde:now}];}
 if(collection==='propostas') {
  if(data.simulacao){const input=object(data.simulacao);const extras=list(input.extras);for(const extra of extras){const service=find(state,'servicos',extra.servicoId);if(service.ativo===false)fail('Serviço inativo não pode ser vendido.');if(Number(extra.valor)!==Number(service.valor))fail('O preço do extra deve corresponder à versão vigente do catálogo.');if(Number(service.valor)===0&&!(actorRole(actor)==='socio'&&extra.aprovacaoSocio===true))fail('Serviço zero exige aprovação do sócio.');}
   const price=calculatePrice(input as unknown as PriceInput);item.valor=price.total;item.composicao=JSON.parse(JSON.stringify(price)) as JsonValue;item.versaoPreco=price.versao;item.extras=extras.map(extra=>({...extra,versaoServico:find(state,'servicos',extra.servicoId).versao??1}));}
  if(item.status==='Enviada'&&previous?.status!=='Enviada'){if(!text(item.comprovanteEnvio)&&!text(item.envioExternoId))fail('Registre o comprovante de envio antes de marcar a proposta como enviada.');item.enviadaEm=now;}
 }
 authorize(collection,item,actor);if(collection==='clientes'){
 if(item.responsavelId)find(state,'equipe',item.responsavelId);
 if(data.recorrencias!==undefined&&list(item.recorrencias).length)validateRecurrences(state,{...item,recorrenciasConfirmadas:true});
 if(transferirPendentes){for(const task of state.tarefas.filter(t=>t.clienteId===id&&t.modeloId&&!finished(t.status))){const rule=list(item.recorrencias).find(r=>r.modeloId===task.modeloId);if(rule&&rule.responsavelId!==task.responsavelId){authorize('tarefas',task,actor);const next={...task,responsavelId:rule.responsavelId,updatedAt:now};validateEntity(state,'tarefas',next,actor);update(state,'tarefas',next);audit(state,actor,'responsável transferido','tarefas',task.id,'Transferiu a tarefa recorrente conforme o cadastro do cliente',now);}}}
 }
 validateEntity(state,collection,item,actor);update(state,collection,item);audit(state,actor,previous?'alterado':'criado',collection,id,`${previous?'Atualizou':'Criou'} ${text(item.nome)||text(item.razaoSocial)||collection}`,now);
}

function stepCommand(state:AppState, command:Command, actor:Actor, now:string):void {
 const collection=command.collection??fail('Informe a coleção do checklist.');
 if(collection!=='tarefas' && collection!=='processos') fail('A ação de checklist exige uma tarefa ou processo.');
 const id=command.id??fail('Informe o registro do checklist.');
 const item=find(state,collection,id);
 authorize(collection,item,actor);
 const data=object(command.data);
 const stepId=text(data.stepId); if(!stepId) fail('Informe o item do checklist.');
 const targetStage=collection==='processos'?Number(data.etapaIndex??item.etapaAtual??0):0;
 if(collection==='processos') {
  const all=stages(item); const stage=all[targetStage]; if(!stage) fail('Etapa do processo não encontrada.');
  const index=stage.itens.findIndex(step=>step.id===stepId); if(index<0) fail('Item do processo não encontrado.');
  const step={...stage.itens[index],concluido:data.concluido===undefined?!stage.itens[index].concluido:Boolean(data.concluido)} as Step;
  if(data.anexoId){validDocument(state,data.anexoId,item.clienteId);step.anexoId=data.anexoId;}
  if(data.valor!==undefined) step.valor=data.valor;
  if(data.justificativa!==undefined) step.justificativa=data.justificativa;
  const next={...item,etapas:all.map((candidate,stageIndex)=>stageIndex===targetStage?{...candidate,itens:candidate.itens.map((candidateStep,stepIndex)=>stepIndex===index?step:candidateStep)}:candidate),updatedAt:now};
  validateEntity(state,'processos',next,actor); update(state,'processos',next); audit(state,actor,'checklist atualizado','processos',id,`Atualizou o checklist de ${item.nome??'processo'}`,now); return;
 }
 const current=steps(item); const index=current.findIndex(step=>step.id===stepId); if(index<0) fail('Passo da tarefa não encontrado.');
 const step={...current[index],concluido:data.concluido===undefined?!current[index].concluido:Boolean(data.concluido)} as Step;
 if(data.anexoId){validDocument(state,data.anexoId,item.clienteId);step.anexoId=data.anexoId;}
 if(data.valor!==undefined) step.valor=data.valor;
 if(data.justificativa!==undefined) step.justificativa=data.justificativa;
 const next={...item,passos:current.map((candidate,stepIndex)=>stepIndex===index?step:candidate),updatedAt:now};
 validateEntity(state,'tarefas',next,actor); update(state,'tarefas',next); audit(state,actor,'checklist atualizado','tarefas',id,`Atualizou o checklist de ${item.nome??'tarefa'}`,now);
}

function advanceProcess(state:AppState,command:Command,actor:Actor,now:string):void {
 const id=command.id??fail('Informe o processo.'); const item=find(state,'processos',id); authorize('processos',item,actor);
 const all=stages(item); const current=all[Number(item.etapaAtual)]; if(!current) fail('Etapa atual não encontrada.'); assertPendingClear(current.itens);
 if(finished(item.status)) fail('O processo já está concluído.');
 const isLast=Number(item.etapaAtual)===all.length-1; const nextIndex=isLast?Number(item.etapaAtual):Number(item.etapaAtual)+1; const next={...item,etapaAtual:nextIndex,status:isLast?'Concluído':'Em andamento',updatedAt:now};
 if(nextIndex>=all.length) fail('O processo já está na última etapa.');
 validateEntity(state,'processos',next,actor); update(state,'processos',next); audit(state,actor,'etapa avançada','processos',id,`Avançou o processo para ${all[nextIndex]?.nome??'próxima etapa'}`,now);
}

function completeTask(state:AppState,command:Command,actor:Actor,now:string):void {
 const id=command.id??fail('Informe a tarefa.'); const item=find(state,'tarefas',id); authorize('tarefas',item,actor);
 assertPendingClear(steps(item));
 const model=TASK_MODELS.find(candidate=>candidate.id===String(item.modeloId));
 if(item.exigeProtocolo===true || model?.exigeProtocolo===true){requireFields(item,['protocolo','reciboId']);validDocument(state,item.reciboId,item.clienteId);}
 ensureDependencies(state,item);
 const next={...item,status:'Concluída',concluidaEm:now,updatedAt:now}; validateEntity(state,'tarefas',next,actor); update(state,'tarefas',next); audit(state,actor,'tarefa concluída','tarefas',id,`Concluiu ${item.nome??'tarefa'}`,now);
}

function generateRecurring(state:AppState,command:Command,actor:Actor,now:string):void {
 const data=object(command.data); const competenciaValue=text(data.competencia); competence(competenciaValue);
 const clients=state.clientes.filter(item=>item.status==='Ativo'&&(!data.clienteId||item.id===data.clienteId));
 if(!clients.length) fail('Não há cliente ativo selecionado para gerar a competência.');
 for(const client of clients){validateRecurrences(state,client); for(const rule of list(client.recorrencias)){
   const model=TASK_MODELS.find(candidate=>candidate.id===String(rule.modeloId)); if(!model) continue;
   if(state.tarefas.some(item=>item.clienteId===client.id&&item.modeloId===model.id&&item.competencia===competenciaValue)) continue;
   const month=Number(competenciaValue.slice(5,7));
   if(model.periodicidade==='anual'&&month!==Number(rule.mes??model.mes)) continue;
   if(model.periodicidade==='trimestral'&&month%3!==0) continue;
   const lastDay=new Date(Date.UTC(Number(competenciaValue.slice(0,4)),month,0)).getUTCDate();
   const day=Math.min(Number(rule.diaVencimento),lastDay); const due=`${competenciaValue}-${String(day).padStart(2,'0')}`;
   const stepsForTask=taskSteps(model.id,client); const item=makeEntity({nome:model.nome,tipoDemanda:model.nome,clienteId:client.id,departamento:model.departamento,responsavelId:rule.responsavelId,prazo:due,competencia:competenciaValue,prioridade:'Normal',status:'Pendente',modeloId:model.id,periodicidade:model.periodicidade,exigeProtocolo:model.exigeProtocolo,passos:stepsForTask},crypto.randomUUID(),now);
   authorize('tarefas',item,actor); validateEntity(state,'tarefas',item,actor); state.tarefas.push(item); audit(state,actor,'tarefa recorrente gerada','tarefas',item.id,`Gerou ${model.nome} para ${competenciaValue}`,now);
 }}
}

function convertLead(state:AppState,command:Command,actor:Actor,now:string):void {
 const leadId=command.id??fail('Informe o lead.'); const lead=find(state,'leads',leadId); authorize('leads',lead,actor);
 if(['Fechado ganho','Convertido'].includes(String(lead.status))) fail('Este lead já foi convertido.');
 const data=object(command.data); const clientData=object(data.cliente);
 const clientId=crypto.randomUUID(); const client=makeEntity({...clientData,nome:text(clientData.nome)||text(lead.nome),razaoSocial:clientData.razaoSocial??lead.razaoSocial??lead.nome,origem:lead.origem,status:'Ativo',honorario:clientData.honorario??0,plano:clientData.plano??'Essencial',regime:clientData.regime??'Simples Nacional',atividade:clientData.atividade??'Serviços',dataEntrada:clientData.dataEntrada??now.slice(0,10),diaVencimento:clientData.diaVencimento??20,responsavelId:clientData.responsavelId??lead.responsavelId,recorrenciasConfirmadas:clientData.recorrenciasConfirmadas??false,recorrencias:clientData.recorrencias??[]},clientId,now);
 if(client.honorario===0) fail('Informe o honorário mensal antes de converter o lead.');
 validateEntity(state,'clientes',client,actor); state.clientes.push(client);
 const process=makeEntity({nome:'Onboarding de cliente',clienteId:clientId,templateId:'onboarding',departamento:'Administrativo',responsavelId:client.responsavelId,prazo:now.slice(0,10),etapaAtual:0,status:'Em andamento',etapas:createProcessStages('onboarding')},crypto.randomUUID(),now); validateEntity(state,'processos',process,actor);state.processos.push(process);
 const nextLead={...lead,status:'Fechado ganho',clienteId:clientId,convertidoEm:now,updatedAt:now};state.leads=state.leads.map(item=>item.id===leadId?nextLead:item);
 audit(state,actor,'lead convertido','leads',leadId,`Converteu ${lead.nome??'lead'} em cliente`,now); audit(state,actor,'onboarding criado','processos',process.id,'Criou o onboarding do novo cliente',now);
}

function messageToTask(state:AppState,command:Command,actor:Actor,now:string):void {
 const data=object(command.data); const message=text(data.mensagem); if(!message) fail('A mensagem precisa ter conteúdo.');
 const clientId=text(data.clienteId); if(!clientId) fail('Vincule a mensagem a um cliente.'); find(state,'clientes',clientId);
 const task=makeEntity({nome:text(data.nome)||'Demanda recebida pelo atendimento',tipoDemanda:text(data.tipoDemanda)||'Consulta e orientação',clienteId:clientId,departamento:text(data.departamento)||'Administrativo',responsavelId:text(data.responsavelId)||actor.memberId||actor.id,prazo:text(data.prazo)||now.slice(0,10),competencia:now.slice(0,7),prioridade:text(data.prioridade)||'Normal',status:'Pendente',descricao:message,origemMensagemId:data.mensagemId??null,passos:[{id:'entrega',descricao:'Executar e conferir a demanda',obrigatorio:true,concluido:false,natureza:'marcar'}]},crypto.randomUUID(),now);
 authorize('tarefas',task,actor); validateEntity(state,'tarefas',task,actor); state.tarefas.push(task); audit(state,actor,'mensagem virou tarefa','tarefas',task.id,'Criou tarefa a partir de uma mensagem',now);
}

function generateInvoices(state:AppState,command:Command,actor:Actor,now:string):void {
 const data=object(command.data); const month=text(data.competencia); competence(month);
 for(const client of state.clientes.filter(item=>item.status==='Ativo'&&(!data.clienteId||item.id===data.clienteId))){
  amount(client.honorario,'Honorário',true); const exists=state.faturas.some(item=>item.clienteId===client.id&&item.competencia===month&&item.tipo==='Honorário'); if(exists)continue;
  const lastDay=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate(); const day=Math.min(Number(client.diaVencimento)||20,lastDay); const invoice=makeEntity({nome:`Honorário ${month}`,clienteId:client.id,competencia:month,valor:client.honorario,vencimento:`${month}-${String(day).padStart(2,'0')}`,status:'Pendente',tipo:'Honorário'},crypto.randomUUID(),now); authorize('faturas',invoice,actor);validateEntity(state,'faturas',invoice,actor);state.faturas.push(invoice);audit(state,actor,'fatura gerada','faturas',invoice.id,`Gerou honorário de ${client.nome??client.id}`,now);
 }
}

export function runCommand(input:AppState,command:Command,actor:Actor):AppState {
 validateJson(command); if(actorRole(actor)==='leitura') fail('Seu perfil permite somente leitura.'); const state=structuredClone(input); const now=new Date().toISOString();
 switch(command.type){
  case 'save': save(state,command,actor,now); break;
  case 'delete': {const collection=command.collection??fail('Informe a coleção.');const item=find(state,collection,command.id);authorize(collection,item,actor);if(collection==='atividades')fail('O histórico é imutável.');state[collection]=state[collection].filter(candidate=>candidate.id!==item.id);audit(state,actor,'excluído',collection,item.id,`Excluiu ${item.nome??collection}`,now);break;}
  case 'toggleStep': stepCommand(state,command,actor,now); break;
  case 'advanceProcess': advanceProcess(state,command,actor,now); break;
  case 'completeTask': completeTask(state,command,actor,now); break;
  case 'generateRecurring': generateRecurring(state,command,actor,now); break;
  case 'convertLead': convertLead(state,command,actor,now); break;
  case 'messageToTask': messageToTask(state,command,actor,now); break;
  case 'generateInvoices': generateInvoices(state,command,actor,now); break;
  default: fail('Ação não reconhecida.');
 }
 state.meta.revision=input.meta.revision+1; return state;
}


