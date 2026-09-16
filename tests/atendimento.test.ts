import { describe, expect, it } from 'vitest';
import { createInitialState, runCommand } from '../src/services/domain/index';
import type { Actor, AppState, Command, Entity } from '../src/types/domain';

const socio:Actor={id:'gilmar',memberId:'gilmar',nome:'Gilmar',email:'g@example.test',papel:'socio',departamentos:['Comercial','Atendimento','Administrativo','Financeiro','Fiscal','Contábil','Pessoal','Paralegal e Legalização']};
const operacao:Actor={id:'daniel',memberId:'daniel',nome:'Daniel',email:'d@example.test',papel:'operacao',departamentos:['Fiscal','Contábil','Pessoal','Paralegal e Legalização']};
const administrativo:Actor={id:'tamires',memberId:'tamires',nome:'Tamires',email:'t@example.test',papel:'administrativo',departamentos:['Comercial','Atendimento','Administrativo','Financeiro']};
const run=(state:AppState,command:Command,actor:Actor=socio)=>runCommand(state,command,actor);
const only=(state:AppState,collection:'atendimentos'|'conversas'|'tarefas'):Entity[]=>state[collection];

function comConversa():AppState {
 let state=run(createInitialState(),{type:'save',collection:'clientes',id:'cliente-a',data:{nome:'Empresa do teste',origem:'Indicação',status:'Em implantação',responsavelId:'gilmar'}});
 state=run(state,{type:'save',collection:'conversas',id:'conversa-a',data:{telefone:'5562999990000',nome:'Contato do teste',clienteId:'cliente-a',vinculo:'Cliente',canal:'WhatsApp',status:'Não iniciado',mensagens:[{id:'m1',texto:'Preciso do DAS',autor:'cliente',criadoEm:new Date().toISOString(),origem:'Recebida',externoId:'ABC1'}]}});
 return state;
}

describe('Atendimento como ocorrência dentro da conversa', () => {
 it('abre um atendimento e impede um segundo em paralelo na mesma conversa', () => {
  let state=comConversa();
  state=run(state,{type:'openService',data:{conversaId:'conversa-a',departamento:'Fiscal'}});
  expect(only(state,'atendimentos')).toHaveLength(1);
  expect(only(state,'atendimentos')[0]).toMatchObject({conversaId:'conversa-a',status:'Em atendimento',responsavelId:'gilmar',departamento:'Fiscal',clienteId:'cliente-a'});
  expect(only(state,'conversas')[0].status).toBe('Em atendimento');
  expect(()=>run(state,{type:'openService',data:{conversaId:'conversa-a'}})).toThrow(/já tem um atendimento/);
 });

 it('exige demanda e motivo para finalizar, e trava a conversa até um novo atendimento', () => {
  let state=comConversa();
  state=run(state,{type:'openService',data:{conversaId:'conversa-a'}});
  const id=only(state,'atendimentos')[0].id;
  expect(()=>run(state,{type:'closeService',id,data:{motivoEncerramento:'Resolvido'}})).toThrow(/Demanda do encerramento/);
  expect(()=>run(state,{type:'closeService',id,data:{demanda:'Assunto inventado',motivoEncerramento:'Resolvido'}})).toThrow(/Demanda do encerramento/);
  expect(()=>run(state,{type:'closeService',id,data:{demanda:'Fiscal'}})).toThrow(/motivo do encerramento/);
  state=run(state,{type:'closeService',id,data:{demanda:'Fiscal',motivoEncerramento:'Guia enviada ao cliente'}});
  const atendimento=only(state,'atendimentos')[0];
  expect(atendimento).toMatchObject({status:'Finalizado',demanda:'Fiscal',motivoEncerramento:'Guia enviada ao cliente',encerradoPorId:'gilmar'});
  expect(atendimento.encerradoEm).toBeTruthy();
  expect(only(state,'conversas')[0]).toMatchObject({status:'Finalizado',atendimentoAtualId:null});
  expect(()=>run(state,{type:'closeService',id,data:{demanda:'Fiscal',motivoEncerramento:'De novo'}})).toThrow(/já foi finalizado/);
  state=run(state,{type:'openService',data:{conversaId:'conversa-a'}});
  expect(only(state,'atendimentos')).toHaveLength(2);
 });

 it('aceita Sem demanda como encerramento válido', () => {
  let state=comConversa();
  state=run(state,{type:'openService',data:{conversaId:'conversa-a'}});
  state=run(state,{type:'closeService',id:only(state,'atendimentos')[0].id,data:{demanda:'Sem demanda',motivoEncerramento:'Contato sem solicitação'}});
  expect(only(state,'atendimentos')[0]).toMatchObject({status:'Finalizado',demanda:'Sem demanda'});
 });

 it('transfere para pessoa e para departamento, guardando o rastro', () => {
  let state=comConversa();
  state=run(state,{type:'openService',data:{conversaId:'conversa-a',departamento:'Atendimento'}});
  const id=only(state,'atendimentos')[0].id;
  state=run(state,{type:'transferService',id,data:{responsavelId:'daniel',motivo:'Assunto fiscal'}});
  expect(only(state,'atendimentos')[0]).toMatchObject({responsavelId:'daniel',status:'Em atendimento'});
  state=run(state,{type:'transferService',id,data:{departamento:'Fiscal'}});
  const atendimento=only(state,'atendimentos')[0];
  expect(atendimento).toMatchObject({departamento:'Fiscal',status:'Fila',responsavelId:null});
  const rastro=atendimento.transferencias as Record<string,unknown>[];
  expect(rastro).toHaveLength(2);
  expect(rastro[0]).toMatchObject({de:'gilmar',para:'daniel',motivo:'Assunto fiscal',porId:'gilmar'});
  expect(rastro[1]).toMatchObject({departamentoDe:'Atendimento',departamentoPara:'Fiscal'});
 });

 it('recusa transferência sem destino, para pessoa inexistente e de atendimento finalizado', () => {
  let state=comConversa();
  state=run(state,{type:'openService',data:{conversaId:'conversa-a'}});
  const id=only(state,'atendimentos')[0].id;
  expect(()=>run(state,{type:'transferService',id,data:{}})).toThrow(/pessoa ou o departamento/);
  expect(()=>run(state,{type:'transferService',id,data:{responsavelId:'ninguem'}})).toThrow(/não encontrado/);
  const finalizado=run(state,{type:'closeService',id,data:{demanda:'Dúvida geral',motivoEncerramento:'Encerrado'}});
  expect(()=>run(finalizado,{type:'transferService',id,data:{responsavelId:'daniel'}})).toThrow(/finalizado não pode ser transferido/);
 });

 it('cria tarefa a partir de uma mensagem, guardando a evidência e ligando à conversa', () => {
  let state=comConversa();
  state=run(state,{type:'openService',data:{conversaId:'conversa-a'}});
  const atendimentoId=only(state,'atendimentos')[0].id;
  state=run(state,{type:'messageToTask',data:{
   clienteId:'cliente-a',conversaId:'conversa-a',atendimentoId,mensagemId:'m1',telefone:'5562999990000',
   mensagem:'Preciso do DAS deste mês.',nome:'Emitir DAS',departamento:'Fiscal',responsavelId:'daniel',
   prazo:'2026-09-20',prioridade:'Alta',competencia:'2026-09',
   checklist:[{id:'apurar',descricao:'Apurar o período',obrigatorio:true},{id:'enviar',descricao:'Enviar ao cliente',obrigatorio:true}],
  }});
  const tarefa=only(state,'tarefas')[0];
  expect(tarefa).toMatchObject({nome:'Emitir DAS',clienteId:'cliente-a',departamento:'Fiscal',responsavelId:'daniel',prioridade:'Alta',competencia:'2026-09',conversaId:'conversa-a',atendimentoId,origemMensagemId:'m1',mensagemOriginal:'Preciso do DAS deste mês.',telefoneOrigem:'5562999990000',criadaPorId:'gilmar'});
  expect((tarefa.passos as Record<string,unknown>[]).map(step=>step.id)).toEqual(['apurar','enviar']);
  expect(only(state,'conversas')[0].comTarefa).toBe(true);
  expect(only(state,'atendimentos')[0].tarefaIds).toContain(tarefa.id);
 });

 it('recusa mensagem sem conteúdo, sem cliente e com conversa inexistente', () => {
  const state=comConversa();
  expect(()=>run(state,{type:'messageToTask',data:{clienteId:'cliente-a',mensagem:'   '}})).toThrow(/conteúdo/);
  expect(()=>run(state,{type:'messageToTask',data:{mensagem:'Texto'}})).toThrow(/Vincule a mensagem a um cliente/);
  expect(()=>run(state,{type:'messageToTask',data:{clienteId:'cliente-a',mensagem:'Texto',conversaId:'inexistente'}})).toThrow(/não encontrado/);
 });

 it('recusa mensagem com autor fora de cliente e equipe e identificador repetido', () => {
  const state=comConversa();
  const agora=new Date().toISOString();
  expect(()=>run(state,{type:'save',collection:'conversas',id:'conversa-a',data:{mensagens:[{id:'m1',texto:'a',autor:'robo',criadoEm:agora}]}})).toThrow(/cliente ou da equipe/);
  expect(()=>run(state,{type:'save',collection:'conversas',id:'conversa-a',data:{mensagens:[{id:'m1',texto:'a',autor:'cliente',criadoEm:agora},{id:'m1',texto:'b',autor:'equipe',criadoEm:agora}]}})).toThrow(/duplicado/);
 });

 it('permite a Tamires atender e impede quem só tem leitura', () => {
  let state=comConversa();
  state=run(state,{type:'openService',data:{conversaId:'conversa-a'}},administrativo);
  expect(only(state,'atendimentos')[0].responsavelId).toBe('tamires');
  const leitura:Actor={id:'leitor',memberId:'leitor',nome:'Leitor',email:'l@example.test',papel:'leitura',departamentos:['Atendimento']};
  expect(()=>run(state,{type:'openService',data:{conversaId:'conversa-a'}},leitura)).toThrow(/somente leitura/);
 });

 it('deixa Daniel receber a conversa de cliente já cadastrado e repassar adiante', () => {
  let state=comConversa();
  state=run(state,{type:'openService',data:{conversaId:'conversa-a',departamento:'Fiscal',responsavelId:'daniel'}},operacao);
  const id=only(state,'atendimentos')[0].id;
  state=run(state,{type:'transferService',id,data:{departamento:'Comercial'}},operacao);
  expect(only(state,'atendimentos')[0]).toMatchObject({departamento:'Comercial',status:'Fila'});
 });
});
