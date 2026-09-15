import { useState, type FormEvent } from 'react';
import RecurrenceEditor from './RecurrenceEditor';
import ClientCnpjLookup from './ClientCnpjLookup';
import type { CollectionName, Entity, JsonValue } from '../types/domain';
import { useApp } from '../hooks/useApp';
import { schemas, type ResourceField } from '../services/resourceSchema';
import { text, entityName, today, money } from '../utils/records';
import { Modal, Button } from './ui';

interface ClientStep { id: string; title: string; shortTitle: string; description: string; fields?: string[]; kind?: 'recurrences' | 'review' }

const CLIENT_STEPS: ClientStep[] = [
  { id: 'empresa', shortTitle: 'Empresa', title: 'Identificação da empresa', description: 'Comece pelo CNPJ para preencher os dados públicos e depois confira as informações.', fields: ['cnpj', 'nome', 'razaoSocial', 'nomeFantasia', 'situacaoCadastral', 'dataSituacaoCadastral', 'naturezaJuridica', 'dataAbertura', 'capitalSocial', 'quadroSocietario'] },
  { id: 'atendimento', shortTitle: 'Atendimento', title: 'Contato e atendimento', description: 'Defina como a empresa chegou, quem será o responsável e os dados usados na comunicação.', fields: ['origem', 'email', 'telefone', 'status', 'dataEntrada', 'responsavelId', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'endereco'] },
  { id: 'fiscal', shortTitle: 'Perfil fiscal', title: 'Perfil fiscal e operacional', description: 'Estas respostas definem obrigações, recorrências e regras de atendimento do cliente.', fields: ['regime', 'atividade', 'cnaes', 'atividadePrincipal', 'codigoSistema', 'anexo', 'funcionarios', 'proLabore', 'retencoes', 'inscricaoEstadual', 'inscricaoMunicipal', 'nicho', 'grupo', 'porte'] },
  { id: 'documentos', shortTitle: 'Documentos', title: 'Documentos e entregáveis', description: 'Registre o que o cliente envia, os canais combinados e os serviços contratados.', fields: ['clienteEnviaDocumentos', 'observacoesEnvio', 'canaisFechamento', 'entregaveis', 'pastaDrive'] },
  { id: 'contrato', shortTitle: 'Contrato', title: 'Contrato, honorários e financeiro', description: 'Defina os dados do contrato e habilite a geração das contas a receber do cliente.', fields: ['plano', 'honorario', 'diaVencimento', 'financeiroAtivo', 'gerarHonorarioAutomatico', 'competenciaInicialFinanceiro', 'composicao', 'indiceReajuste', 'mesReajuste', 'inicioContrato', 'situacaoContrato', 'socioAdministrador', 'cpfAdministrador', 'emailRepresentante', 'cargoRepresentante'] },
  { id: 'acompanhamento', shortTitle: 'Acompanhamento', title: 'Acompanhamento interno', description: 'Organize integração, riscos, oportunidades e orientações para cada departamento.', fields: ['risco', 'engajamento', 'statusIntegracao', 'inicioIntegracao', 'faseIntegracao', 'upsell', 'oportunidadeExpansao', 'grupoEconomicoId', 'orientacaoFiscal', 'orientacaoContabil', 'orientacaoPessoal', 'observacoes'] },
  { id: 'rotinas', shortTitle: 'Rotinas', title: 'Tarefas recorrentes', description: 'Confira as tarefas sugeridas para o perfil e escolha responsáveis e prazos.', kind: 'recurrences' },
  { id: 'revisao', shortTitle: 'Revisão', title: 'Revisar e salvar', description: 'Confira os dados principais antes de criar ou atualizar o cliente.', kind: 'review' },
];

function isBlank(value: JsonValue | undefined) { return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0); }

export default function EntityForm({ collection, entity, onClose, onSaved }: { collection: CollectionName; entity?: Entity; onClose: () => void; onSaved?: () => void }) {
  const { state, actor, execute, busy } = useApp();
  const schema = schemas[collection]!;
  const [values, setValues] = useState<Record<string, JsonValue>>(() => ({ ...schema?.defaults, dataEntrada: today(), competencia: today().slice(0, 7), competenciaInicialFinanceiro: today().slice(0, 7), responsavelId: state.equipe.find(item => item.id === actor.id || text(item.email) === actor.email)?.id ?? '', ...entity }));
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(Boolean(entity?.recorrenciasConfirmadas));
  const [clientStep, setClientStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(entity ? CLIENT_STEPS.length - 1 : 0);
  function update(key: string, value: JsonValue) {
    setValues(current => ({ ...current, [key]: value }));
    if (['regime', 'atividade', 'funcionarios', 'proLabore', 'retencoes', 'inscricaoEstadual', 'plano'].includes(key)) setConfirmed(false);
  }
  const requiredMissing = (fieldKeys?: string[]) => schema.fields.filter(field => field.required && (!fieldKeys || fieldKeys.includes(field.key)) && isBlank(values[field.key]));
  function goToStep(index: number) { setError(''); setClientStep(index); }
  function nextClientStep() {
    const step = CLIENT_STEPS[clientStep];
    const missing = requiredMissing(step.fields);
    if (missing.length) { setError(`Preencha os campos obrigatórios: ${missing.map(field => field.label).join(', ')}.`); return; }
    if (step.kind === 'recurrences' && text(values.status) === 'Ativo' && !confirmed) { setError('Revise e confirme a configuração das tarefas recorrentes antes de continuar.'); return; }
    const next = Math.min(clientStep + 1, CLIENT_STEPS.length - 1);
    setError(''); setClientStep(next); setFurthestStep(current => Math.max(current, next));
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    const missing = requiredMissing();
    if (missing.length) {
      const target = CLIENT_STEPS.findIndex(step => step.fields?.includes(missing[0].key));
      if (collection === 'clientes' && target >= 0) setClientStep(target);
      setError(`Preencha os campos obrigatórios: ${missing.map(field => field.label).join(', ')}.`); return;
    }
    if (collection === 'clientes' && text(values.status) === 'Ativo' && !confirmed) { setClientStep(CLIENT_STEPS.findIndex(step => step.kind === 'recurrences')); setError('Revise e confirme a configuração das tarefas recorrentes antes de salvar.'); return; }
    try {
      let data = { ...values };
      if (collection === 'clientes') data = { ...data, recorrenciasConfirmadas: confirmed, recorrencias: values.recorrencias ?? [] };
      await execute({ type: 'save', collection, id: entity?.id, data }); onSaved?.(); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.'); }
  }
  function control(field: ResourceField) {
    if (collection === 'clientes' && field.key === 'cnpj') return <ClientCnpjLookup value={text(values.cnpj)} onChange={value => update('cnpj', value)} onApply={data => { setValues(current => ({ ...current, ...(!entity && !data.regime ? { regime: '', atividade: '' } : {}), ...data })); setConfirmed(false); }}/>;
    if (field.type === 'multiselect') { const selected = Array.isArray(values[field.key]) ? values[field.key] as JsonValue[] : []; return <select multiple size={Math.min(field.options?.length ?? 4, 7)} value={selected.map(String)} onChange={event => update(field.key, Array.from(event.target.selectedOptions, option => option.value))}>{field.options?.map(option => <option key={option} value={option}>{option}</option>)}</select>; }
    if (field.type === 'checkbox') return <input type="checkbox" checked={Boolean(values[field.key])} onChange={event => update(field.key, event.target.checked)}/>;
    if (field.reference) { const choices = state[field.reference]; return <select required={field.required} value={text(values[field.key])} onChange={event => update(field.key, event.target.value)}><option value="">Selecione</option>{choices.filter(item => !(field.key === 'gestorId' && item.id === entity?.id)).map(item => <option key={item.id} value={item.id}>{entityName(item)}</option>)}</select>; }
    if (field.type === 'select') return <select value={text(values[field.key])} required={field.required} onChange={event => update(field.key, event.target.value)}><option value="">Selecione</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select>;
    if (field.type === 'textarea') return <textarea rows={3} value={text(values[field.key])} required={field.required} onChange={event => update(field.key, event.target.value)}/>;
    return <input type={field.type === 'money' ? 'number' : field.type ?? 'text'} min={field.type === 'money' || field.type === 'number' ? 0 : undefined} max={field.key === 'diaVencimento' ? 31 : field.key === 'mesReajuste' ? 12 : undefined} step={field.type === 'money' ? '0.01' : field.type === 'number' ? '1' : undefined} value={text(values[field.key])} required={field.required} onChange={event => update(field.key, field.type === 'money' || field.type === 'number' ? event.target.value === '' ? '' : Number(event.target.value) : event.target.value)}/>;
  }
  function renderFields(fields: ResourceField[]) {
    return <div className="form-grid">{fields.map(field => <div key={field.key} className={field.type === 'textarea' || field.type === 'multiselect' ? 'form-span field-wrap' : 'field-wrap'}><label className={`field ${field.type === 'checkbox' ? 'field-check client-checkbox' : ''}`}><span>{field.label}{field.required ? ' *' : ''}</span>{control(field)}{field.hint ? <small>{field.hint}</small> : null}</label></div>)}</div>;
  }
  function summaryValue(key: string) {
    const field = schema.fields.find(candidate => candidate.key === key); const value = values[key];
    if (field?.reference) return entityName(state[field.reference].find(item => item.id === text(value))) || 'Não informado';
    if (field?.type === 'money') return money(Number(value) || 0);
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (Array.isArray(value)) return value.map(String).join(', ') || 'Não informado';
    return text(value) || 'Não informado';
  }
  function clientContent() {
    const step = CLIENT_STEPS[clientStep];
    if (step.kind === 'recurrences') return <section><RecurrenceEditor value={values.recorrencias} profile={values} team={state.equipe} responsible={text(values.responsavelId)} onChange={rules => { update('recorrencias', rules); setConfirmed(false); }}/>{entity ? <label className="field-check client-transfer"><input type="checkbox" checked={values.transferirPendentes === true} onChange={event => update('transferirPendentes', event.target.checked)}/>Transferir também as tarefas recorrentes já geradas e ainda não concluídas para os responsáveis escolhidos acima.</label> : null}<label className="field">Justificativa se não houver recorrências<textarea value={text(values.dispensaRecorrenciasJustificativa)} onChange={event => update('dispensaRecorrenciasJustificativa', event.target.value)}/></label><label className="field-check client-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)}/>Revisei e confirmo a configuração das recorrências.</label></section>;
    if (step.kind === 'review') {
      const contractMissing = ['socioAdministrador', 'cpfAdministrador', 'emailRepresentante'].filter(key => isBlank(values[key]));
      return <div className="client-review"><div className={`client-contract-status ${contractMissing.length ? 'is-warning' : 'is-ready'}`}><strong>{contractMissing.length ? 'Cadastro salvo, contrato ainda precisa de dados' : 'Dados principais do contrato preenchidos'}</strong><span>{contractMissing.length ? 'Antes de gerar o contrato, complete representante legal, CPF e e-mail para assinatura.' : 'A identificação do representante está pronta para a futura geração do contrato.'}</span></div><div className="client-review-grid"><section><h4>Empresa</h4><dl><div><dt>Razão social</dt><dd>{summaryValue('razaoSocial')}</dd></div><div><dt>CNPJ</dt><dd>{summaryValue('cnpj')}</dd></div><div><dt>Contato</dt><dd>{summaryValue('telefone')}</dd></div><div><dt>Responsável</dt><dd>{summaryValue('responsavelId')}</dd></div></dl><button type="button" className="text-button" onClick={() => goToStep(0)}>Editar empresa</button></section><section><h4>Perfil fiscal</h4><dl><div><dt>Regime</dt><dd>{summaryValue('regime')}</dd></div><div><dt>Atividade</dt><dd>{summaryValue('atividade')}</dd></div><div><dt>Funcionários</dt><dd>{summaryValue('funcionarios')}</dd></div><div><dt>Pró-labore</dt><dd>{summaryValue('proLabore')}</dd></div></dl><button type="button" className="text-button" onClick={() => goToStep(2)}>Editar perfil fiscal</button></section><section><h4>Contrato e financeiro</h4><dl><div><dt>Plano</dt><dd>{summaryValue('plano')}</dd></div><div><dt>Honorário</dt><dd>{summaryValue('honorario')}</dd></div><div><dt>Financeiro</dt><dd>{summaryValue('financeiroAtivo')}</dd></div><div><dt>Primeira cobrança</dt><dd>{summaryValue('competenciaInicialFinanceiro')}</dd></div><div><dt>Representante</dt><dd>{summaryValue('socioAdministrador')}</dd></div></dl><button type="button" className="text-button" onClick={() => goToStep(4)}>Editar contrato</button></section><section><h4>Operação</h4><dl><div><dt>Envia documentos</dt><dd>{summaryValue('clienteEnviaDocumentos')}</dd></div><div><dt>Entregáveis</dt><dd>{summaryValue('entregaveis')}</dd></div><div><dt>Rotinas selecionadas</dt><dd>{Array.isArray(values.recorrencias) ? values.recorrencias.length : 0}</dd></div><div><dt>Recorrências confirmadas</dt><dd>{confirmed ? 'Sim' : 'Não'}</dd></div></dl><button type="button" className="text-button" onClick={() => goToStep(6)}>Editar rotinas</button></section></div></div>;
    }
    const fields = schema.fields.filter(field => step.fields?.includes(field.key));
    return <>{step.id === 'empresa' ? <div className="client-step-callout"><strong>Preenchimento rápido pelo CNPJ</strong><span>Informe o CNPJ e use a consulta pública. Os dados encontrados entram no formulário para sua conferência.</span></div> : null}{renderFields(fields)}</>;
  }
  if (collection === 'clientes') {
    const step = CLIENT_STEPS[clientStep]; const percent = Math.round(((clientStep + 1) / CLIENT_STEPS.length) * 100);
    return <Modal title={`${entity ? 'Editar' : 'Novo'} cliente`} onClose={onClose} wide><form onSubmit={submit}><div className="modal-body client-wizard"><aside className="client-stepper" aria-label="Etapas do cadastro"><div className="client-progress-copy"><strong>Etapa {clientStep + 1} de {CLIENT_STEPS.length}</strong><span>{percent}% concluído</span></div><div className="client-progress" role="progressbar" aria-valuemin={1} aria-valuemax={CLIENT_STEPS.length} aria-valuenow={clientStep + 1}><span style={{ width: `${percent}%` }}/></div><ol>{CLIENT_STEPS.map((item, index) => <li key={item.id} className={index === clientStep ? 'is-current' : index <= furthestStep ? 'is-available' : ''}><button type="button" disabled={index > furthestStep} aria-current={index === clientStep ? 'step' : undefined} onClick={() => goToStep(index)}><span>{index + 1}</span><strong>{item.shortTitle}</strong></button></li>)}</ol></aside><section className="client-step-content"><header><span className="eyebrow">CADASTRO DO CLIENTE</span><h3>{step.title}</h3><p>{step.description}</p></header>{clientContent()}{error ? <p className="error-box" role="alert">{error}</p> : null}</section></div><div className="modal-footer client-wizard-footer"><Button variant="secondary" onClick={onClose} type="button">Cancelar</Button><span className="client-footer-spacer"/>{clientStep > 0 ? <Button variant="secondary" onClick={() => goToStep(clientStep - 1)} type="button">Voltar</Button> : null}{clientStep < CLIENT_STEPS.length - 1 ? <Button onClick={nextClientStep} type="button">Continuar</Button> : <Button type="submit" disabled={busy}>{busy ? 'Salvando…' : `Salvar ${schema.singular}`}</Button>}</div></form></Modal>;
  }
  return <Modal title={`${entity ? 'Editar ' : 'Novo '}${schema.singular}`} onClose={onClose} wide><form onSubmit={submit}><div className="modal-body"><p className="muted form-intro">Preencha os dados disponíveis. Campos com * são obrigatórios.</p><div className="form-grid">{schema.fields.map(field => <div key={field.key} className={field.type === 'textarea' ? 'form-span' : 'field-wrap'}>{field.group ? <h3 className="form-section">{field.group}</h3> : null}<label className={`field ${field.type === 'checkbox' ? 'field-check' : ''}`}><span>{field.label}{field.required ? ' *' : ''}</span>{control(field)}{field.hint ? <small>{field.hint}</small> : null}</label></div>)}</div>{error ? <p className="error-box" role="alert">{error}</p> : null}</div><div className="modal-footer"><Button variant="secondary" onClick={onClose} type="button">Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Salvando…' : `Salvar ${schema.singular}`}</Button></div></form></Modal>;
}
