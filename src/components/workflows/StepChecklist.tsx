import { useState } from 'react';
import { Paperclip, Check } from 'lucide-react';
import type { Command, Entity, JsonValue, Step } from '../../types/domain';
import { text, number } from './WorkflowUi';

interface Props { steps: Step[]; collection: 'tarefas' | 'processos'; item: Entity; execute: (command: Command) => Promise<void>; uploadDocument: (file: File, metadata: Record<string, string>) => Promise<Entity>; busy: boolean; stageIndex?: number; locked?: boolean }
function ChecklistItem({ step, ...props }: Props & { step: Step }) {
  const [value, setValue] = useState(text(step.valor));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const needsFile = step.natureza === 'anexar';
  const needsValue = step.natureza === 'informar valor';
  const saveStep = async (data: Record<string, JsonValue>) => { setError(''); try { await props.execute({ type: 'toggleStep', collection: props.collection, id: props.item.id, data: { stepId: step.id, ...(props.stageIndex === undefined ? {} : { etapaIndex: props.stageIndex }), ...data } }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o item.'); } };
  return <div className="wf-check-row"><label className={`wf-check-label ${step.concluido ? 'is-done' : ''}`}><input type="checkbox" checked={step.concluido} disabled={props.busy || uploading || props.locked || (!step.concluido && needsFile && !text(step.anexoId)) || (!step.concluido && needsValue && !value)} onChange={event => void saveStep({ concluido: event.target.checked, ...(needsValue ? { valor: number(value) } : {}) })}/><span>{step.descricao}<small>{step.obrigatorio ? 'Obrigatório' : 'Opcional'}{step.natureza !== 'marcar' ? ` · ${step.natureza}` : ''}{text(step.concluidoEm) ? ` · ${new Date(text(step.concluidoEm)).toLocaleString('pt-BR')}` : ''}</small></span>{step.concluido ? <Check size={14}/> : null}</label>
    {!props.locked && needsFile ? <div className="wf-check-evidence"><label className="wf-file-label"><Paperclip size={13}/>{uploading ? 'Salvando documento…' : text(step.anexoId) ? 'Substituir comprovante' : 'Anexar comprovante'}<input type="file" disabled={props.busy || uploading} aria-label={`Anexo: ${step.descricao}`} onChange={async event => { const file = event.target.files?.[0]; if (!file) return; setUploading(true); setError(''); try { const doc = await props.uploadDocument(file, { clienteId: text(props.item.clienteId), departamento: text(props.item.departamento), nome: file.name, tarefaId: props.collection === 'tarefas' ? props.item.id : '', processoId: props.collection === 'processos' ? props.item.id : '' }); await saveStep({ anexoId: doc.id, concluido: true }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha no envio do documento.'); } finally { setUploading(false); } }}/></label></div> : null}
    {!props.locked && needsValue ? <div className="wf-check-evidence"><input type="number" min="0" step="0.01" value={value} aria-label={`Valor para ${step.descricao}`} onChange={event => setValue(event.target.value)}/><button type="button" className="button button-secondary" disabled={props.busy || !value} onClick={() => void saveStep({ valor: number(value), concluido: true })}>Registrar valor</button></div> : null}
    {error ? <p role="alert" className="wf-error">{error}</p> : null}
  </div>;
}

export default function StepChecklist(props: Props) { return <div className="wf-checklist">{props.steps.map(step => <ChecklistItem key={step.id} {...props} step={step}/>)}</div>; }
