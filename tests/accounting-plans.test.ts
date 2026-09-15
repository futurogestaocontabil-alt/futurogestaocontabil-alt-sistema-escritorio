import {describe,expect,it} from 'vitest';
import {createInitialState,runCommand} from '../src/services/domain';
import type {Actor,AppState,Command} from '../src/types/domain';

const actor:Actor={id:'gilmar',memberId:'gilmar',nome:'Gilmar Santos',papel:'socio',departamentos:['Contábil']};
const run=(state:AppState,command:Command)=>runCommand(state,command,actor);
function clients(){
 let state=run(createInitialState(),{type:'save',collection:'clientes',id:'cliente-a',data:{nome:'Empresa A',origem:'Teste',status:'Em implantação',responsavelId:'gilmar'}});
 state=run(state,{type:'save',collection:'clientes',id:'cliente-b',data:{nome:'Empresa B',origem:'Teste',status:'Em implantação',responsavelId:'gilmar'}});
 for(const [id,clienteId] of [['arquivo-a','cliente-a'],['arquivo-b','cliente-b'],['arquivo-a1','cliente-a'],['arquivo-a2','cliente-a']]) state=run(state,{type:'save',collection:'documentos',id,data:{nome:id+'.pdf',tipo:'Plano de contas',clienteId,storageKey:'private/'+id+'.pdf'}});
 return state;
}

describe('Planos de contas segregados por cliente',()=>{
 it('vincula conta à versão do mesmo cliente e bloqueia cruzamento',()=>{
  let state=run(clients(),{type:'save',collection:'planosContabeis',id:'plano-a',data:{clienteId:'cliente-a',nome:'Plano A',versao:'2026-09',arquivoId:'arquivo-a',status:'Em análise'}});
  state=run(state,{type:'save',collection:'contasContabeis',id:'conta-a',data:{clienteId:'cliente-a',planoContabilId:'plano-a',codigo:'1001',descricao:'Banco A',tipo:'A'}});
  expect(state.contasContabeis[0]).toMatchObject({clienteId:'cliente-a',planoContabilId:'plano-a',codigo:'1001'});
  expect(()=>run(state,{type:'save',collection:'contasContabeis',data:{clienteId:'cliente-b',planoContabilId:'plano-a',codigo:'1001',descricao:'Conta cruzada',tipo:'A'}})).toThrow('mesmo cliente');
 });

 it('impede código repetido na mesma versão e preserva o mesmo código em outra empresa',()=>{
  let state=run(clients(),{type:'save',collection:'planosContabeis',id:'plano-a',data:{clienteId:'cliente-a',nome:'Plano A',versao:'1',arquivoId:'arquivo-a',status:'Em análise'}});
  state=run(state,{type:'save',collection:'contasContabeis',data:{clienteId:'cliente-a',planoContabilId:'plano-a',codigo:'42',descricao:'Banco',tipo:'A'}});
  expect(()=>run(state,{type:'save',collection:'contasContabeis',data:{clienteId:'cliente-a',planoContabilId:'plano-a',codigo:'42',descricao:'Duplicada',tipo:'A'}})).toThrow('Já existe');
  state=run(state,{type:'save',collection:'planosContabeis',id:'plano-b',data:{clienteId:'cliente-b',nome:'Plano B',versao:'1',arquivoId:'arquivo-b',status:'Em análise'}});
  state=run(state,{type:'save',collection:'contasContabeis',data:{clienteId:'cliente-b',planoContabilId:'plano-b',codigo:'42',descricao:'Banco B',tipo:'A'}});
  expect(state.contasContabeis).toHaveLength(2);
 });

 it('exige conta analítica antes de ativar e substitui somente plano ativo do mesmo cliente',()=>{
  let state=run(clients(),{type:'save',collection:'planosContabeis',id:'plano-a1',data:{clienteId:'cliente-a',nome:'Plano A',versao:'1',arquivoId:'arquivo-a1',status:'Em análise'}});
  expect(()=>run(state,{type:'save',collection:'planosContabeis',id:'plano-a1',data:{status:'Ativo'}})).toThrow('analítica');
  state=run(state,{type:'save',collection:'contasContabeis',data:{clienteId:'cliente-a',planoContabilId:'plano-a1',codigo:'1',descricao:'Banco',tipo:'A'}});
  state=run(state,{type:'save',collection:'planosContabeis',id:'plano-a1',data:{status:'Ativo'}});
  state=run(state,{type:'save',collection:'planosContabeis',id:'plano-a2',data:{clienteId:'cliente-a',nome:'Plano A',versao:'2',arquivoId:'arquivo-a2',status:'Em análise'}});
  state=run(state,{type:'save',collection:'contasContabeis',data:{clienteId:'cliente-a',planoContabilId:'plano-a2',codigo:'2',descricao:'Banco novo',tipo:'A'}});
  state=run(state,{type:'save',collection:'planosContabeis',id:'plano-a2',data:{status:'Ativo'}});
  expect(state.planosContabeis.find(plan=>plan.id==='plano-a1')?.status).toBe('Substituído');
  expect(state.planosContabeis.find(plan=>plan.id==='plano-a2')?.status).toBe('Ativo');
 });
});
