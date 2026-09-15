import { useState, type FormEvent } from 'react';
import { Calculator, CalendarPlus, CheckCircle2, Copy, FileText, MessageCircle, Pencil, Save } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import type { Entity, JsonValue } from '../types/domain';
import { FieldError, FormField, WorkflowDialog, dateLabel, money, recordName, records, text } from './workflows/WorkflowUi';

const detailTabs = ['Resumo', 'Qualificação', 'Mapa da reunião', 'Diagnóstico', 'Simulação', 'Proposta', 'Follow-ups', 'Histórico'] as const;
type DetailTab = typeof detailTabs[number];

const qualificationFields = [
  ['cnpj', 'CNPJ'], ['regime', 'Regime tributário atual'], ['faturamento', 'Faturamento médio mensal'],
  ['socios', 'Quantidade de sócios'], ['funcionarios', 'Quantidade de funcionários'], ['segmento', 'Segmento de atuação'],
  ['cidade', 'Cidade e UF'], ['contadorAtual', 'Possui contador atual?'], ['honorarioAtual', 'Honorário atual'],
  ['motivoBusca', 'Motivo da busca'], ['dorPrincipal', 'Principal dor percebida'], ['urgencia', 'Urgência da troca'],
  ['decisor', 'Quem decide a contratação?'], ['servicoDesejado', 'Qual serviço deseja?'], ['disponibilidade', 'Disponibilidade para reunião'],
] as const;

const notionOptions: Record<string, string[]> = {
  regime: ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'Não sabe'],
  faturamento: ['Até R$10 mil', 'R$10 mil a R$30 mil', 'R$30 mil a R$60 mil', 'R$60 mil a R$100 mil', 'Acima de R$100 mil'],
  segmento: ['Serviços', 'Comércio', 'Saúde/Clínica', 'Odontologia', 'Estética', 'Buffet/Eventos', 'Locação', 'Outro'],
  contadorAtual: ['Sim', 'Não'],
  honorarioAtual: ['Até R$200', 'R$201 a R$350', 'R$351 a R$500', 'R$501 a R$800', 'Acima de R$800', 'Não informado'],
  dorPrincipal: ['Pago muito imposto', 'Não sei meu lucro', 'Contador não orienta', 'Falta organização financeira', 'Tenho pendências', 'Quero trocar de contador', 'Quero crescer com controle', 'Outro'],
  urgencia: ['Alta', 'Média', 'Baixa'],
  decisor: ['O próprio lead', 'Lead + sócio', 'Sócio', 'Familiar', 'Outro'],
  servicoDesejado: ['Assessoria mensal - Regime Normal', 'IRPF', 'Assessoria mensal - MEI', 'Assessoria mensal - Simples Nacional', 'Baixa do CNPJ', 'Desenquadramento', 'Troca de contabilidade', 'Abertura de empresa', 'Regularização', 'Diagnóstico Fiscal e Financeiro', 'Consultoria pontual'],
};

function QualificationControl({ fieldKey, value }: { fieldKey: string; value: JsonValue | undefined }) {
  const options = notionOptions[fieldKey];
  if (!options) return <input name={fieldKey} defaultValue={text(value)}/>;
  return <select name={fieldKey} defaultValue={text(value)}><option value="">Selecione</option>{options.map(option => <option key={option}>{option}</option>)}</select>;
}

const meetingSections = [
  { key: 'rapport', title: '1. Abertura e rapport', questions: ['Como começou a empresa?', 'Como funciona a operação hoje?', 'Como é a rotina do gestor?'] },
  { key: 'diagnostico', title: '2. Diagnóstico', questions: ['Como é feita a gestão financeira?', 'Quais sistemas utiliza?', 'Como acompanha margem, precificação e emissão de notas?', 'Como funciona o atendimento contábil atual?'] },
  { key: 'valor', title: '3. Construção de valor', questions: ['Quais riscos ou desperdícios foram encontrados?', 'Quais melhorias tributárias e gerenciais são possíveis?', 'Como a Futuro Contabilidade Digital pode apoiar?'] },
  { key: 'impacto', title: '4. Quantificação do impacto', questions: ['Quanto isso custa por mês?', 'Qual o impacto anual?', 'O que acontece se a empresa adiar a decisão?'] },
  { key: 'recomendacao', title: '5. Recomendação', questions: ['Qual plano faz sentido e por quê?', 'Quais entregas resolvem as dores prioritárias?'] },
  { key: 'objecoes', title: '6. Objeções', questions: ['Qual é a objeção real?', 'O que precisa acontecer para avançar?', 'É investimento, momento, sócio ou segurança na troca?'] },
  { key: 'fechamento', title: '7. Fechamento', questions: ['Qual o próximo passo concreto?', 'Quem é o responsável?', 'Qual data ficou combinada?'] },
] as const;

function objectValue(value: JsonValue | undefined): Record<string, JsonValue> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <div className="crm-summary-card"><span>{label}</span><strong>{value || 'Não informado'}</strong></div>;
}

export default function OpportunityWorkspace({ id, onClose, onEdit, onSimulate, onFollowup, onConvert, onProposal }: {
  id: string; onClose: () => void; onEdit: (lead: Entity) => void; onSimulate: (id: string) => void;
  onFollowup: (lead: Entity) => void; onConvert: (lead: Entity, proposal: Entity) => void; onProposal: (proposal: Entity) => void;
}) {
  const { state, execute, busy, notice } = useApp();
  const lead = state.leads.find(item => item.id === id);
  const [tab, setTab] = useState<DetailTab>('Resumo');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(text(lead?.resumoReuniao));
  const qualification = objectValue(lead?.qualificacaoComercial || lead?.qualificacao);
  const meeting = objectValue(lead?.mapaReuniao);
  const diagnostic = objectValue(lead?.diagnosticoComercial);
  const proposals = state.propostas.filter(item => text(item.leadId) === id);
  const accepted = proposals.find(item => text(item.status) === 'Aceita');
  const followups = state.tarefas.filter(item => text(item.leadId) === id).sort((a, b) => text(a.prazo).localeCompare(text(b.prazo)));
  const activity = state.atividades.filter(item => text(item.entidadeId || item.registroId || item.leadId) === id).slice(-20).reverse();
  const conversation = state.conversas.find(item => text(item.leadId) === id || text(item.telefone) === text(lead?.telefone));
  const messages = records(conversation?.mensagens).slice(-8).reverse();
  const qualificationProgress = Math.round((qualificationFields.filter(([key]) => text(qualification[key])).length / qualificationFields.length) * 100);
  if (!lead) return null;

  async function saveObject(field: string, data: Record<string, JsonValue>, extra: Record<string, JsonValue> = {}) {
    if (field === 'resumoComercial' && text(extra.etapa) === 'Fechado ganho' && text(lead!.etapa) !== 'Fechado ganho') {
      setError('Para marcar como ganho, registre o aceite da proposta e use a conversão para criar o cliente e o onboarding.');
      return;
    }
    try {
      await execute({ type: 'save', collection: 'leads', id: lead!.id, data: { [field]: data, ...extra } });
      setError(''); notice('Informações comerciais salvas.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar as informações.'); }
  }

  function collect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const result: Record<string, JsonValue> = {};
    for (const [key, value] of data.entries()) result[key] = value.toString(); return result;
  }

  function generateBrief(event: FormEvent<HTMLFormElement>) {
    const values = collect(event);
    const brief = [`REUNIÃO COMERCIAL | ${text(lead!.empresa || lead!.nome)}`, `Contato: ${text(lead!.nome)} | ${text(lead!.telefone)}`, `Perfil: ${text(values.segmento)} | ${text(values.regime)} | faturamento ${text(values.faturamento)}`, `Estrutura: ${text(values.socios)} sócio(s) e ${text(values.funcionarios)} funcionário(s).`, `Cenário atual: ${text(values.contadorAtual)} | honorário ${text(values.honorarioAtual)}.`, `Motivo da busca: ${text(values.motivoBusca)}`, `Dor principal: ${text(values.dorPrincipal)}`, `Urgência: ${text(values.urgencia)} | Decisor: ${text(values.decisor)}`, 'Objetivo da reunião: aprofundar impacto, prioridade, segurança da transição e próximo passo concreto.'].join('\n');
    setSummary(brief); void saveObject('qualificacaoComercial', values, { resumoReuniao: brief, reuniaoEm: text(values.reuniaoEm), linkReuniao: text(values.linkReuniao), etapa: 'Reunião agendada' });
  }

  const whatsappScript = `Olá, ${text(lead.nome)}! Aqui é a Tamires, da Futuro Contabilidade Digital. Para o contador preparar uma conversa objetiva sobre a ${text(lead.empresa)}, preciso confirmar algumas informações rápidas sobre regime, faturamento, equipe e o principal desafio atual. Leva cerca de 3 minutos. Podemos seguir por aqui?`;

  return <WorkflowDialog title={text(lead.empresa || lead.nome)} onClose={onClose} wide>
    <div className="crm-opportunity-head"><div><span className="wf-pill wf-pill-gold">{text(lead.etapa) || 'Lead'}</span><h3>{text(lead.nome)}</h3><p>{text(lead.telefone)} · {text(lead.email) || 'E-mail não informado'} · {text(lead.origem)}</p></div><div className="wf-inline-actions"><button className="button button-primary" onClick={() => onSimulate(lead.id)}><Calculator size={15}/>Simular</button><button className="button button-secondary" onClick={() => onFollowup(lead)}><CalendarPlus size={15}/>Follow-up</button><button className="button button-secondary" onClick={() => onEdit(lead)}><Pencil size={14}/>Editar</button></div></div>
    <div className="crm-detail-tabs" role="tablist" aria-label="Dossiê da oportunidade">{detailTabs.map(item => <button type="button" role="tab" aria-selected={tab === item} key={item} onClick={() => setTab(item)}>{item}</button>)}</div>
    <div className="crm-detail-body">
      {tab === 'Resumo' && <section><div className="crm-summary-grid"><SummaryCard label="Responsável" value={recordName(state.equipe, lead.responsavelId)}/><SummaryCard label="Potencial mensal" value={money(lead.valorEstimado)}/><SummaryCard label="Qualificação" value={`${qualificationProgress}% preenchida`}/><SummaryCard label="Próximo passo" value={text(lead.proximoPasso)}/></div><form onSubmit={async event => { const values = collect(event); await saveObject('resumoComercial', values, { etapa: text(values.etapa), proximoPasso: text(values.proximoPasso), motivoPerda: text(values.motivoPerda), observacoes: text(values.observacoes) }); }}><div className="wf-grid"><FormField label="Etapa"><select name="etapa" defaultValue={text(lead.etapa) || 'Lead'}>{['Lead','Qualificação','Reunião agendada','Diagnóstico','Proposta enviada','Negociação','Fechado ganho','Fechado perdido'].map(item => <option key={item}>{item}</option>)}</select></FormField><FormField label="Próximo passo"><input name="proximoPasso" defaultValue={text(lead.proximoPasso)} placeholder="Ação, responsável e data combinada"/></FormField><FormField label="Motivo de perda" full><select name="motivoPerda" defaultValue={text(lead.motivoPerda)}><option value="">Não se aplica</option><option>Preço</option><option>Momento inadequado</option><option>Permaneceu com contador atual</option><option>Não respondeu</option><option>Sem aderência ao perfil</option><option>Concorrência</option><option>Outro</option></select></FormField><FormField label="Contexto geral" full><textarea name="observacoes" defaultValue={text(lead.observacoes)}/></FormField></div><button className="button button-secondary" disabled={busy}><Save size={14}/>Salvar resumo</button></form>{accepted && text(lead.etapa) !== 'Fechado ganho' ? <button className="button button-primary" style={{ marginTop: 18 }} onClick={() => onConvert(lead, accepted)}><CheckCircle2 size={15}/>Converter em cliente e iniciar onboarding</button> : null}</section>}
      {tab === 'Qualificação' && <section><div className="wf-note"><strong>Roteiro interno da Tamires</strong><br/>Os campos seguem as opções do CRM Comercial do Notion. Selecione as respostas conhecidas e deixe o restante em branco.</div><form onSubmit={generateBrief}><div className="wf-grid">{qualificationFields.map(([key, label]) => <FormField key={key} label={label}><QualificationControl fieldKey={key} value={qualification[key]}/></FormField>)}<FormField label="Sabe o lucro mensal?"><select name="sabeLucro" defaultValue={text(qualification.sabeLucro)}><option value="">Selecione</option><option>Sim</option><option>Mais ou menos</option><option>Não</option></select></FormField><FormField label="Qualidade do lead"><select name="qualidadeLead" defaultValue={text(qualification.qualidadeLead) || 'Não qualificado'}><option>Bom perfil</option><option>Perfil médio</option><option>Baixo perfil</option><option>Não qualificado</option></select></FormField><FormField label="Temperatura"><select name="temperatura" defaultValue={text(qualification.temperatura) || 'Morno'}><option>Quente</option><option>Morno</option><option>Frio</option></select></FormField><FormField label="Objeção provável"><select name="objecaoProvavel" defaultValue={text(qualification.objecaoProvavel)}><option value="">Selecione</option>{['Preço','Vou pensar','Timing','Medo de trocar','Contador atual','Sócio','Falta de caixa','Sem urgência','Só pesquisando'].map(option => <option key={option}>{option}</option>)}</select></FormField><FormField label="Oferta recomendada"><select name="ofertaRecomendada" defaultValue={text(qualification.ofertaRecomendada)}><option value="">Selecione após qualificar</option>{['Plano Essencial','Plano Mentor','Plano Estratégico','Diagnóstico Fiscal e Financeiro','Consultoria pontual','Nutrição'].map(option => <option key={option}>{option}</option>)}</select></FormField><FormField label="Retomar em"><input name="retomarEm" type="date" defaultValue={text(qualification.retomarEm)}/></FormField><FormField label="Reunião confirmada para"><input name="reuniaoEm" type="datetime-local" defaultValue={text(lead.reuniaoEm)}/></FormField><FormField label="Link da reunião"><input name="linkReuniao" type="url" defaultValue={text(lead.linkReuniao)}/></FormField></div><div className="wf-inline-actions" style={{ marginTop: 18 }}><button className="button button-primary" disabled={busy}>Salvar e gerar resumo</button><button type="button" className="button button-secondary" onClick={async () => { await navigator.clipboard.writeText(whatsappScript); notice('Script da Tamires copiado.'); }}><Copy size={14}/>Copiar script do WhatsApp</button></div></form>{summary && <FormField label="Resumo preparado para o contador" full><textarea rows={10} value={summary} onChange={event => setSummary(event.target.value)} onBlur={() => void saveObject('resumoManual', {}, { resumoReuniao: summary })}/></FormField>}</section>}
      {tab === 'Mapa da reunião' && <form onSubmit={event => { const values = collect(event); void saveObject('mapaReuniao', values, { etapa: 'Diagnóstico' }); }}><p className="wf-help-block">O roteiro já vem preenchido. Marque cada pergunta como respondida e registre somente os pontos relevantes.</p>{meetingSections.map(section => <fieldset className="crm-meeting-section" key={section.key}><legend>{section.title}</legend>{section.questions.map((question, index) => <div className="crm-question-row" key={question}><div><strong>{question}</strong><textarea name={`${section.key}_${index}`} defaultValue={text(meeting[`${section.key}_${index}`])} placeholder="Anotação da resposta"/></div><select aria-label={`Situação: ${question}`} name={`${section.key}_${index}_status`} defaultValue={text(meeting[`${section.key}_${index}_status`]) || 'Pendente'}><option>Pendente</option><option>Respondido</option><option>Não se aplica</option></select></div>)}<label className="wf-toggle"><input type="checkbox" name={`${section.key}_concluido`} value="sim" defaultChecked={text(meeting[`${section.key}_concluido`]) === 'sim'}/>Etapa concluída</label></fieldset>)}<button className="button button-primary" disabled={busy}><Save size={14}/>Salvar mapa da reunião</button></form>}
      {tab === 'Diagnóstico' && <form onSubmit={event => { const values = collect(event); void saveObject('diagnosticoComercial', values, { etapa: 'Diagnóstico', proximoPasso: text(values.proximoPasso) }); }}><div className="wf-grid"><FormField label="Dor principal"><select name="dorPrincipal" defaultValue={text(diagnostic.dorPrincipal || qualification.dorPrincipal)}><option value="">Selecione</option>{notionOptions.dorPrincipal.map(option => <option key={option}>{option}</option>)}</select></FormField><FormField label="Urgência"><select name="nivelUrgencia" defaultValue={text(diagnostic.nivelUrgencia || qualification.urgencia)}><option value="">Selecione</option><option>Alta</option><option>Média</option><option>Baixa</option></select></FormField><FormField label="Qualidade do lead"><select name="qualidadeLead" defaultValue={text(diagnostic.qualidadeLead || qualification.qualidadeLead) || 'Não qualificado'}><option>Bom perfil</option><option>Perfil médio</option><option>Baixo perfil</option><option>Não qualificado</option></select></FormField><FormField label="Temperatura"><select name="temperatura" defaultValue={text(diagnostic.temperatura || qualification.temperatura) || 'Morno'}><option>Quente</option><option>Morno</option><option>Frio</option></select></FormField><FormField label="Objeção provável"><select name="objecaoProvavel" defaultValue={text(diagnostic.objecaoProvavel || qualification.objecaoProvavel)}><option value="">Selecione</option>{['Preço','Vou pensar','Timing','Medo de trocar','Contador atual','Sócio','Falta de caixa','Sem urgência','Só pesquisando'].map(option => <option key={option}>{option}</option>)}</select></FormField><FormField label="Oferta recomendada"><select name="ofertaRecomendada" defaultValue={text(diagnostic.ofertaRecomendada || qualification.ofertaRecomendada)}><option value="">Selecione</option>{['Plano Essencial','Plano Mentor','Plano Estratégico','Diagnóstico Fiscal e Financeiro','Consultoria pontual','Nutrição'].map(option => <option key={option}>{option}</option>)}</select></FormField><FormField label="Dores e consequências" full><textarea name="dores" defaultValue={text(diagnostic.dores)}/></FormField><FormField label="Riscos identificados" full><textarea name="riscos" defaultValue={text(diagnostic.riscos)} placeholder="Registre riscos como hipótese até validar documentos."/></FormField><FormField label="Perdas estimadas" full><textarea name="perdas" defaultValue={text(diagnostic.perdas)} placeholder="Informe premissas, período e cálculo. Não prometa economia."/></FormField><FormField label="Oportunidades de melhoria" full><textarea name="oportunidades" defaultValue={text(diagnostic.oportunidades)}/></FormField><FormField label="Objeções percebidas" full><textarea name="objecoes" defaultValue={text(diagnostic.objecoes)}/></FormField><FormField label="Prontidão para compra"><select name="prontidao" defaultValue={text(diagnostic.prontidao)}><option value="">Selecione</option><option>Explorando</option><option>Avaliando</option><option>Pronto para proposta</option><option>Sem aderência agora</option></select></FormField><FormField label="Próximo passo recomendado" full><textarea name="proximoPasso" defaultValue={text(diagnostic.proximoPasso)}/></FormField></div><button className="button button-primary" disabled={busy}><Save size={14}/>Salvar diagnóstico</button></form>}
      {tab === 'Simulação' && <section>{proposals.length ? proposals.map(item => <div className="wf-activity" key={item.id}><strong>Plano {text(item.plano)} · {money(item.valor)}</strong>{text(item.justificativaRecomendacao) || 'Simulação vinculada à oportunidade'} · {dateLabel(item.createdAt)}</div>) : <p className="wf-muted">Ainda não há simulação salva para esta oportunidade.</p>}<button className="button button-primary" onClick={() => onSimulate(lead.id)}><Calculator size={15}/>Abrir simulador de honorários</button></section>}
      {tab === 'Proposta' && <section>{proposals.length ? proposals.map(item => <article className="crm-proposal-card" key={item.id}><div><strong>Plano {text(item.plano)} · {money(item.valor)}</strong><p>{text(item.status)} · válida até {dateLabel(item.validade)}</p><small>{text(item.justificativaRecomendacao)}</small></div><button className="button button-secondary" onClick={() => onProposal(item)}><FileText size={14}/>Revisar</button></article>) : <p className="wf-muted">Nenhuma proposta gerada.</p>}</section>}
      {tab === 'Follow-ups' && <section><div className="wf-note"><strong>Cadência sugerida após a proposta</strong><br/>D+2: confirmar recebimento · D+4: tratar dúvidas · D+7: pedir decisão ou combinar nova data · D+14: encerrar ou reativar no período acordado.</div><button className="button button-primary" style={{ marginTop: 16 }} onClick={() => onFollowup(lead)}><CalendarPlus size={15}/>Agendar follow-up</button>{followups.length ? followups.map(item => <div className="wf-activity" key={item.id}><strong>{dateLabel(item.prazo)} {text(item.hora)} · {text(item.status)}</strong>{text(item.descricao)} · {recordName(state.equipe, item.responsavelId)}</div>) : <p className="wf-muted">Nenhum retorno agendado.</p>}</section>}
      {tab === 'Histórico' && <section>{activity.map(item => <div className="wf-activity" key={item.id}><strong>{text(item.descricao || item.nome || item.acao)}</strong>{dateLabel(item.createdAt)}</div>)}{messages.map((message, index) => <div className="wf-activity" key={text(message.id) || index}><strong>{text(message.autor || message.remetente) || 'Mensagem'}</strong>{text(message.texto || message.conteudo)}</div>)}{!activity.length && !messages.length ? <p className="wf-muted">Os eventos e contatos aparecerão aqui.</p> : null}<a href="/atendimento" className="button button-secondary"><MessageCircle size={15}/>Abrir atendimento</a></section>}
      <FieldError error={error}/>
    </div>
  </WorkflowDialog>;
}
