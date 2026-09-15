import { describe, expect, it } from 'vitest';
import { createInitialState, runCommand } from '../src/services/domain/index';
import { dueDateFor, nextCompetence } from '../src/services/domain/engine';
import type { Actor, AppState, Command, Entity, JsonValue } from '../src/types/domain';

const socio:Actor={id:'gilmar',memberId:'gilmar',nome:'Gilmar',email:'g@example.test',papel:'socio',departamentos:['Comercial','Atendimento','Administrativo','Financeiro','Fiscal','Contábil','Pessoal','Paralegal e Legalização']};
const administrativo:Actor={id:'tamires',memberId:'tamires',nome:'Tamires',email:'t@example.test',papel:'administrativo',departamentos:['Comercial','Atendimento','Administrativo','Financeiro']};
const operacao:Actor={id:'daniel',memberId:'daniel',nome:'Daniel',email:'d@example.test',papel:'operacao',departamentos:['Fiscal','Contábil','Pessoal','Paralegal e Legalização']};
const run=(state:AppState,command:Command,actor:Actor=socio)=>runCommand(state,command,actor);
const first=(state:AppState,collection:'contratos'|'simulacoes'|'clientes'|'onboardings'|'faturas'):Entity=>state[collection][0];

const DADOS_CONTRATO={razaoSocial:'Empresa Teste LTDA',cnpj:'41571817000105',endereco:'Rua de teste, 100',cidade:'Goiânia',uf:'GO',representanteLegal:'Representante de Teste',cpfRepresentante:'00000000191',email:'contato@example.test',atividade:'Serviços',regime:'Simples Nacional'};

function comLead():AppState {
 return run(createInitialState(),{type:'save',collection:'leads',id:'lead-a',data:{
  nome:'Contato do teste',empresa:'Empresa Teste LTDA',cnpj:'41571817000105',origem:'BNI',canal:'WhatsApp',
  responsavelId:'tamires',atividade:'Serviços',cidade:'Goiânia',uf:'GO',
  motivoBusca:'Contador atual não responde',decisor:'Sim, é o sócio',classificacao:'Qualificado',etapa:'Negociação'}});
}

function comPropostaAceita():AppState {
 let state=comLead();
 state=run(state,{type:'save',collection:'propostas',id:'proposta-a',data:{
  nome:'Proposta Mentor',leadId:'lead-a',plano:'Mentor',validade:'2026-10-31',
  condicaoPagamento:'Mensal, boleto',responsavelId:'tamires',valor:977,status:'Gerada'}});
 return run(state,{type:'save',collection:'propostas',id:'proposta-a',data:{status:'Aceita'}});
}

function comContratoAssinado():AppState {
 let state=comPropostaAceita();
 state=run(state,{type:'generateContract',data:{propostaId:'proposta-a',dados:DADOS_CONTRATO,diaVencimento:10,competenciaInicial:'2026-09'}});
 state=run(state,{type:'sendContract',id:first(state,'contratos').id,data:{autentiqueId:'aut-123'}});
 return run(state,{type:'registerSignature',id:first(state,'contratos').id,data:{}});
}

describe('Simulação salva', () => {
 it('congela o preço do extra no momento da simulação', () => {
  let state=comLead();
  state=run(state,{type:'save',collection:'servicos',id:'servico-a',data:{nome:'Abertura de filial',departamento:'Paralegal e Legalização',valor:400,ativo:true}});
  state=run(state,{type:'saveSimulation',data:{leadId:'lead-a',entradas:{
   plano:'Mentor',atividade:'Serviços',regime:'Simples Nacional',faturamento:50000,
   colaboradores:4,proLabore:2,contasFinanceiras:2,integracaoContabil:'medio',integracaoFiscal:'alto',
   extras:[{servicoId:'servico-a',nome:'valor errado de propósito',valor:1,quantidade:1}]}}});
  const simulacao=first(state,'simulacoes');
  expect(simulacao.valor).toBe(977+400);
  expect(simulacao.versaoPreco).toBe('escopo-4.5-v1');
  expect(simulacao.responsavelId).toBe('gilmar');
  const entradas=simulacao.entradas as Record<string,Record<string,unknown>[]>;
  expect(entradas.extras[0]).toMatchObject({valor:400,nome:'Abertura de filial'});
  // Mudar o catálogo depois não altera a simulação já gravada.
  const depois=run(state,{type:'save',collection:'servicos',id:'servico-a',data:{valor:900}});
  expect((first(depois,'simulacoes').entradas as Record<string,Record<string,unknown>[]>).extras[0].valor).toBe(400);
  expect(first(depois,'simulacoes').valor).toBe(1377);
 });

 it('exige aprovação do sócio para serviço sem preço e recusa serviço inativo', () => {
  let state=comLead();
  state=run(state,{type:'save',collection:'servicos',id:'gratis',data:{nome:'Cortesia',departamento:'Administrativo',valor:0,ativo:true,situacaoPreco:'Cortesia com aprovação do sócio'}});
  state=run(state,{type:'save',collection:'servicos',id:'inativo',data:{nome:'Descontinuado',departamento:'Administrativo',valor:100,ativo:false}});
  const entradas={plano:'Essencial',atividade:'Serviços',regime:'Simples Nacional',faturamento:6750};
  expect(()=>run(state,{type:'saveSimulation',data:{leadId:'lead-a',entradas:{...entradas,extras:[{servicoId:'gratis',nome:'Cortesia',valor:0,quantidade:1}]}}},administrativo)).toThrow(/aprovação explícita do sócio/);
  expect(()=>run(state,{type:'saveSimulation',data:{leadId:'lead-a',entradas:{...entradas,extras:[{servicoId:'inativo',nome:'Descontinuado',valor:100,quantidade:1}]}}})).toThrow(/inativo/);
  const aprovado=run(state,{type:'saveSimulation',data:{leadId:'lead-a',entradas:{...entradas,extras:[{servicoId:'gratis',nome:'Cortesia',valor:0,quantidade:1,aprovacaoSocio:true}]}}});
  expect(first(aprovado,'simulacoes').valor).toBe(199);
 });

 it('exige vínculo com lead ou cliente e mantém Daniel fora do comercial', () => {
  const state=comLead();
  const entradas={plano:'Essencial',atividade:'Serviços',regime:'Simples Nacional',faturamento:6750};
  expect(()=>run(state,{type:'saveSimulation',data:{entradas}})).toThrow(/lead ou a um cliente/);
  expect(()=>run(state,{type:'saveSimulation',data:{leadId:'lead-a',entradas}},operacao)).toThrow(/acesso Comercial/);
 });
});

describe('Contrato', () => {
 it('só é gerado a partir de proposta aceita e não duplica', () => {
  let state=comLead();
  state=run(state,{type:'save',collection:'propostas',id:'proposta-a',data:{nome:'Proposta',leadId:'lead-a',plano:'Mentor',validade:'2026-10-31',condicaoPagamento:'Mensal',responsavelId:'tamires',valor:977,status:'Gerada'}});
  expect(()=>run(state,{type:'generateContract',data:{propostaId:'proposta-a',dados:DADOS_CONTRATO}})).toThrow(/proposta aceita/);
  state=run(state,{type:'save',collection:'propostas',id:'proposta-a',data:{status:'Aceita'}});
  state=run(state,{type:'generateContract',data:{propostaId:'proposta-a',dados:DADOS_CONTRATO,diaVencimento:5,competenciaInicial:'2026-09'}});
  expect(first(state,'contratos')).toMatchObject({status:'Gerado',propostaId:'proposta-a',leadId:'lead-a',honorario:977,diaVencimento:5,modeloVersao:'contrato-v1',formaAssinatura:'Autentique'});
  expect(()=>run(state,{type:'generateContract',data:{propostaId:'proposta-a',dados:DADOS_CONTRATO}})).toThrow(/já existe contrato vigente/i);
 });

 it('não gera com dado obrigatório faltando e nomeia o que falta', () => {
  const state=comPropostaAceita();
  // endereco e representanteLegal não existem no lead, então os dois são cobrados.
  const {endereco:_endereco,representanteLegal:_representante,...incompleto}=DADOS_CONTRATO;
  expect(()=>run(state,{type:'generateContract',data:{propostaId:'proposta-a',dados:incompleto}})).toThrow(/endereco, representanteLegal/);
 });

 it('completa pelo lead o dado que já foi levantado na qualificação', () => {
  const state=comPropostaAceita();
  // O lead já traz cnpj, atividade, cidade e uf. Só o que falta nos dois é cobrado.
  const {cnpj:_cnpj,atividade:_atividade,...semRepetir}=DADOS_CONTRATO;
  const gerado=run(state,{type:'generateContract',data:{propostaId:'proposta-a',dados:semRepetir,competenciaInicial:'2026-09'}});
  expect(first(gerado,'contratos').status).toBe('Gerado');
 });

 it('aceita apenas vencimento no dia 30, 5 ou 10', () => {
  const state=comPropostaAceita();
  expect(()=>run(state,{type:'generateContract',data:{propostaId:'proposta-a',dados:DADOS_CONTRATO,diaVencimento:20}})).toThrow(/dia 30, 5 ou 10/);
 });

 it('exige justificativa quando a assinatura sai da Autentique', () => {
  const state=comPropostaAceita();
  expect(()=>run(state,{type:'generateContract',data:{propostaId:'proposta-a',dados:DADOS_CONTRATO,formaAssinatura:'Papel'}})).toThrow(/exceção e exige justificativa/);
  const comJustificativa=run(state,{type:'generateContract',data:{propostaId:'proposta-a',dados:DADOS_CONTRATO,formaAssinatura:'Papel',justificativaExcecaoAssinatura:'Cliente sem e-mail'}});
  expect(first(comJustificativa,'contratos').formaAssinatura).toBe('Papel');
 });

 it('exige o identificador da Autentique no envio e registra os eventos', () => {
  let state=comPropostaAceita();
  state=run(state,{type:'generateContract',data:{propostaId:'proposta-a',dados:DADOS_CONTRATO,competenciaInicial:'2026-09'}});
  const id=first(state,'contratos').id;
  expect(()=>run(state,{type:'sendContract',id,data:{}})).toThrow(/identificador devolvido pela Autentique/);
  state=run(state,{type:'sendContract',id,data:{autentiqueId:'aut-123'}});
  expect(first(state,'contratos')).toMatchObject({status:'Aguardando assinatura',autentiqueId:'aut-123'});
  state=run(state,{type:'registerSignature',id,data:{}});
  const contrato=first(state,'contratos');
  expect(contrato.status).toBe('Assinado');
  expect((contrato.eventos as Record<string,unknown>[]).map(evento=>evento.tipo)).toEqual(['enviado','assinado']);
  expect(()=>run(state,{type:'registerSignature',id,data:{}})).toThrow(/já está assinado/);
 });

 it('registra recusa com motivo', () => {
  let state=comPropostaAceita();
  state=run(state,{type:'generateContract',data:{propostaId:'proposta-a',dados:DADOS_CONTRATO,competenciaInicial:'2026-09'}});
  const id=first(state,'contratos').id;
  state=run(state,{type:'sendContract',id,data:{autentiqueId:'aut-9'}});
  expect(()=>run(state,{type:'registerSignature',id,data:{recusado:true}})).toThrow(/motivo da recusa/);
  state=run(state,{type:'registerSignature',id,data:{recusado:true,motivo:'Cliente desistiu'}});
  expect(first(state,'contratos')).toMatchObject({status:'Recusado',motivoRecusa:'Cliente desistiu'});
 });
});

describe('Ativação do cliente', () => {
 it('só cria o cliente depois do contrato assinado e só pelo sócio', () => {
  let state=comPropostaAceita();
  state=run(state,{type:'generateContract',data:{propostaId:'proposta-a',dados:DADOS_CONTRATO,competenciaInicial:'2026-09'}});
  const id=first(state,'contratos').id;
  expect(()=>run(state,{type:'activateClient',id,data:{}})).toThrow(/depois do contrato assinado/);
  state=run(state,{type:'sendContract',id,data:{autentiqueId:'aut-1'}});
  state=run(state,{type:'registerSignature',id,data:{}});
  expect(()=>run(state,{type:'activateClient',id,data:{}},administrativo)).toThrow(/aprovada pelo sócio/);
 });

 it('cria cliente, financeiro, onboarding interno e externo, e fecha o lead', () => {
  let state=comContratoAssinado();
  const contratoId=first(state,'contratos').id;
  state=run(state,{type:'activateClient',id:contratoId,data:{cliente:{recorrenciasConfirmadas:true,recorrencias:[{modeloId:'coleta',responsavelId:'tamires',diaVencimento:5,periodicidade:'mensal'}]}}});
  const cliente=first(state,'clientes');
  expect(cliente).toMatchObject({status:'Ativo',honorario:977,diaVencimento:10,razaoSocial:'Empresa Teste LTDA',cnpj:'41571817000105',origem:'BNI',canal:'WhatsApp',contratoId,leadId:'lead-a',regime:'Simples Nacional'});
  // 5.A não definido: o padrão é o mês seguinte à assinatura.
  expect(cliente.competenciaInicialFinanceiro).toBe('2026-10');
  expect(first(state,'faturas')).toMatchObject({clienteId:cliente.id,competencia:'2026-10',valor:977,vencimento:'2026-10-10',status:'Pendente'});
  const interno=state.onboardings.find(item=>item.tipo==='interno')!;
  const externo=state.onboardings.find(item=>item.tipo==='externo')!;
  expect(interno.clienteId).toBe(cliente.id);
  expect((interno.sistemas as Record<string,unknown>[]).map(sistema=>sistema.sistemaId)).toEqual(['alterdata-fiscal','alterdata-contabil','alterdata-dp','nf-estoque','econtador','veri']);
  expect(externo.status).toBe('Aguardando agendamento');
  expect(state.leads[0]).toMatchObject({etapa:'Fechado ganho',clienteId:cliente.id});
  expect(state.contratos[0].clienteId).toBe(cliente.id);
  expect(()=>run(state,{type:'activateClient',id:contratoId,data:{}})).toThrow(/já gerou um cliente/);
 });

 it('permite começar a cobrar no mês da assinatura quando a proposta disser isso', () => {
  let state=comContratoAssinado();
  state=run(state,{type:'activateClient',id:first(state,'contratos').id,data:{inicioCobranca:'mesDaAssinatura',cliente:{recorrenciasConfirmadas:true,recorrencias:[{modeloId:'coleta',responsavelId:'tamires',diaVencimento:5,periodicidade:'mensal'}]}}});
  expect(first(state,'clientes').competenciaInicialFinanceiro).toBe('2026-09');
  expect(first(state,'faturas')).toMatchObject({competencia:'2026-09',vencimento:'2026-09-10'});
 });

 it('recusa um início de cobrança fora das duas opções previstas', () => {
  const state=comContratoAssinado();
  expect(()=>run(state,{type:'activateClient',id:first(state,'contratos').id,data:{inicioCobranca:'quandoDerNaCabeca'}})).toThrow(/mesDaAssinatura ou mesSeguinte/);
 });

 it('marca o parceiro de ticket alto sem inventar limite de valor', () => {
  let state=comContratoAssinado();
  state=run(state,{type:'activateClient',id:first(state,'contratos').id,data:{ticketAlto:true,cliente:{recorrenciasConfirmadas:true,recorrencias:[{modeloId:'coleta',responsavelId:'tamires',diaVencimento:5,periodicidade:'mensal'}]}}});
  const interno=state.onboardings.find(item=>item.tipo==='interno')!;
  expect(interno).toMatchObject({tickerAlto:true,parceiroTicketAlto:'Mister Contador',cadastroParceiroFeito:false});
  state=run(state,{type:'completeOnboardingStep',id:interno.id,data:{cadastroParceiroFeito:true}});
  expect(state.onboardings.find(item=>item.tipo==='interno')!.cadastroParceiroFeito).toBe(true);
 });
});

describe('Onboarding interno e externo', () => {
 const ativado=():AppState=>{
  const state=comContratoAssinado();
  return run(state,{type:'activateClient',id:first(state,'contratos').id,data:{cliente:{recorrenciasConfirmadas:true,recorrencias:[{modeloId:'coleta',responsavelId:'tamires',diaVencimento:5,periodicidade:'mensal'}]}}});
 };

 it('exige código da empresa para concluir os módulos do Alterdata', () => {
  let state=ativado();
  const interno=state.onboardings.find(item=>item.tipo==='interno')!;
  expect(()=>run(state,{type:'completeOnboardingStep',id:interno.id,data:{sistemaId:'alterdata-fiscal',concluido:true}})).toThrow(/código da empresa no Alterdata Fiscal/);
  state=run(state,{type:'completeOnboardingStep',id:interno.id,data:{sistemaId:'alterdata-fiscal',concluido:true,codigoEmpresa:'1234'}});
  const sistemas=state.onboardings.find(item=>item.tipo==='interno')!.sistemas as Record<string,unknown>[];
  expect(sistemas.find(sistema=>sistema.sistemaId==='alterdata-fiscal')).toMatchObject({concluido:true,codigoEmpresa:'1234'});
 });

 it('exige data de envio do login para concluir o eContador', () => {
  let state=ativado();
  const interno=state.onboardings.find(item=>item.tipo==='interno')!;
  expect(()=>run(state,{type:'completeOnboardingStep',id:interno.id,data:{sistemaId:'econtador',concluido:true}})).toThrow(/envio do login do eContador/);
  state=run(state,{type:'completeOnboardingStep',id:interno.id,data:{sistemaId:'econtador',concluido:true,loginEnviadoEm:'2026-09-16'}});
  expect((state.onboardings.find(item=>item.tipo==='interno')!.sistemas as Record<string,unknown>[]).find(sistema=>sistema.sistemaId==='econtador')).toMatchObject({concluido:true,loginEnviadoEm:'2026-09-16'});
 });

 it('nunca aceita senha gravada no onboarding', () => {
  const state=ativado();
  const interno=state.onboardings.find(item=>item.tipo==='interno')!;
  expect(()=>run(state,{type:'save',collection:'onboardings',id:interno.id,data:{sistemas:[{sistemaId:'veri',senha:'segredo'}]}})).toThrow(/cofre/);
 });

 it('exige ata para marcar a reunião externa como realizada', () => {
  let state=ativado();
  const externo=state.onboardings.find(item=>item.tipo==='externo')!;
  state=run(state,{type:'completeOnboardingStep',id:externo.id,data:{status:'Agendada'}});
  expect(()=>run(state,{type:'completeOnboardingStep',id:externo.id,data:{status:'Realizada'}})).toThrow(/ata da reunião/);
  state=run(state,{type:'completeOnboardingStep',id:externo.id,data:{status:'Realizada',ata:'Apresentada a equipe, canais e calendário.'}});
  expect(state.onboardings.find(item=>item.tipo==='externo')).toMatchObject({status:'Realizada',ata:'Apresentada a equipe, canais e calendário.'});
 });

 it('não encerra o onboarding externo enquanto o interno tiver item obrigatório pendente', () => {
  let state=ativado();
  const externo=state.onboardings.find(item=>item.tipo==='externo')!;
  state=run(state,{type:'completeOnboardingStep',id:externo.id,data:{status:'Realizada',ata:'Ata registrada'}});
  expect(()=>run(state,{type:'completeOnboardingStep',id:externo.id,data:{status:'Concluída'}})).toThrow(/onboarding interno/);
  const interno=state.onboardings.find(item=>item.tipo==='interno')!;
  for(const passo of (interno.passos as Record<string,unknown>[]).filter(step=>step.obrigatorio))
   state=run(state,{type:'completeOnboardingStep',id:interno.id,data:{stepId:passo.id as string,concluido:true}});
  state=run(state,{type:'completeOnboardingStep',id:externo.id,data:{status:'Concluída'}});
  expect(state.onboardings.find(item=>item.tipo==='externo')!.status).toBe('Concluída');
 });

 it('recusa situação do externo fora da lista prevista', () => {
  const state=ativado();
  const externo=state.onboardings.find(item=>item.tipo==='externo')!;
  expect(()=>run(state,{type:'completeOnboardingStep',id:externo.id,data:{status:'Quase lá'}})).toThrow(/Situação do onboarding externo/);
 });
});

describe('Vencimento e competência', () => {
 it('usa o último dia válido quando o mês não tem o dia escolhido', () => {
  expect(dueDateFor('2026-02',30)).toBe('2026-02-28');
  expect(dueDateFor('2028-02',30)).toBe('2028-02-29');
  expect(dueDateFor('2026-04',30)).toBe('2026-04-30');
  expect(dueDateFor('2026-01',30)).toBe('2026-01-30');
  expect(dueDateFor('2026-09',5)).toBe('2026-09-05');
  expect(dueDateFor('2026-09',10)).toBe('2026-09-10');
 });

 it('vira o ano corretamente na competência seguinte', () => {
  expect(nextCompetence('2026-09')).toBe('2026-10');
  expect(nextCompetence('2026-12')).toBe('2027-01');
 });
});

describe('Catálogo de serviços e desconto', () => {
 const catalogo = (situacaoPreco: string, valor = 250) => ({ nome: 'Serviço de teste', departamento: 'Administrativo', valor, ativo: true, situacaoPreco });
 const entradas = { plano: 'Essencial', atividade: 'Serviços', regime: 'Simples Nacional', faturamento: 50000 };

 it('exige classificação explícita para serviço com valor zero', () => {
  const state=comLead();
  expect(()=>run(state,{type:'save',collection:'servicos',id:'zerado',data:{nome:'Sem preço',departamento:'Administrativo',valor:0}})).toThrow(/exige classificação/);
  const classificado=run(state,{type:'save',collection:'servicos',id:'zerado',data:catalogo('Incluído no plano',0)});
  expect(classificado.servicos.find(item=>item.id==='zerado')!.situacaoPreco).toBe('Incluído no plano');
  expect(()=>run(state,{type:'save',collection:'servicos',id:'z2',data:{...catalogo('Situação inventada',0)}})).toThrow(/Situação do preço/);
 });

 it('impede que serviço aguardando preço entre em simulação ou proposta', () => {
  let state=comLead();
  state=run(state,{type:'save',collection:'servicos',id:'pendente',data:catalogo('Aguardando definição de preço')});
  expect(()=>run(state,{type:'saveSimulation',data:{leadId:'lead-a',entradas:{...entradas,extras:[{servicoId:'pendente',nome:'Serviço de teste',valor:250,quantidade:1}]}}})).toThrow(/Aguardando definição de preço/);
  state=run(state,{type:'save',collection:'servicos',id:'pendente',data:{situacaoPreco:'Preço aprovado'}});
  expect(run(state,{type:'saveSimulation',data:{leadId:'lead-a',entradas:{...entradas,extras:[{servicoId:'pendente',nome:'Serviço de teste',valor:250,quantidade:1}]}}}).simulacoes[0].valor).toBe(797);
 });

 it('só deixa o sócio classificar um serviço como cortesia', () => {
  const state=comLead();
  // O catálogo já é restrito ao sócio. A trava da cortesia é a segunda camada,
  // para o caso de o acesso ao catálogo ser afrouxado no futuro.
  expect(()=>run(state,{type:'save',collection:'servicos',id:'cortesia',data:catalogo('Cortesia com aprovação do sócio',0)},administrativo)).toThrow(/sócio/);
  expect(run(state,{type:'save',collection:'servicos',id:'cortesia',data:catalogo('Cortesia com aprovação do sócio',0)}).servicos.find(item=>item.id==='cortesia')).toBeDefined();
 });

 it('aceita desconto de até dez por cento sem aprovação e barra acima disso', () => {
  const state=comLead();
  const simular=(ajuste:Record<string,JsonValue>,ator=administrativo)=>run(state,{type:'saveSimulation',data:{leadId:'lead-a',entradas,ajuste}},ator);
  const dentro=simular({tipo:'desconto',percentual:10,justificativa:'Fechamento imediato'});
  expect(dentro.simulacoes[0]).toMatchObject({valor:492.3,subtotal:547,ajuste:-54.7,justificativaAjuste:'Fechamento imediato'});
  expect(()=>simular({tipo:'desconto',percentual:15,justificativa:'Negociação'})).toThrow(/exige aprovação do sócio/);
  // O sócio aprova pelo próprio ato de simular.
  const aprovado=simular({tipo:'desconto',percentual:15,justificativa:'Cliente estratégico'},socio);
  expect(aprovado.simulacoes[0]).toMatchObject({valor:464.95,aprovadorAjusteId:'gilmar'});
 });

 it('marca a simulação de Indústria como parametrização sugerida', () => {
  const state=comLead();
  const simulada=run(state,{type:'saveSimulation',data:{leadId:'lead-a',entradas:{...entradas,atividade:'Indústria'}}});
  expect(simulada.simulacoes[0]).toMatchObject({valor:725,parametrizacaoSugerida:true});
 });
});
