import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Entity, JsonValue, Step } from '../../types/domain';
import './workflows.css';

export const text = (value: JsonValue | undefined): string => typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
export const number = (value: JsonValue | undefined): number => typeof value === 'number' ? value : Number(value) || 0;
export const money = (value: JsonValue | undefined): string => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number(value));
export const dateLabel = (value: JsonValue | undefined): string => { const date = text(value); return date ? new Date(date.length === 10 ? `${date}T12:00:00` : date).toLocaleDateString('pt-BR') : 'Sem prazo'; };
export const today = (): string => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
export const month = (): string => today().slice(0, 7);
export const recordName = (items: Entity[], id: JsonValue | undefined): string => { const item = items.find(row => row.id === text(id)); return item ? text(item.nome || item.razaoSocial || item.email) : 'Não atribuído'; };
export const listSteps = (value: JsonValue | undefined): Step[] => Array.isArray(value) ? value.filter((item): item is Step => typeof item === 'object' && item !== null && !Array.isArray(item) && typeof item.id === 'string' && typeof item.descricao === 'string') : [];
export const records = (value: JsonValue | undefined): Record<string, JsonValue>[] => Array.isArray(value) ? value.filter((item): item is Record<string, JsonValue> => typeof item === 'object' && item !== null && !Array.isArray(item)) : [];
export const formValues = (event: FormEvent<HTMLFormElement>): FormData => { event.preventDefault(); return new FormData(event.currentTarget); };
export const inputText = (data: FormData, key: string): string => String(data.get(key) ?? '').trim();
export const inputNumber = (data: FormData, key: string): number => Number(data.get(key)) || 0;
export const departments = ['Fiscal', 'Pessoal', 'Contábil', 'Paralegal e Legalização', 'Financeiro', 'Administrativo', 'Comercial'];

export function WorkflowDialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { const node = dialogRef.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={dialogRef} className={`wf-dialog ${wide ? 'wf-dialog-wide' : ''}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}>
    <header className="wf-dialog-header"><div><span className="wf-eyebrow">PLATAFORMA FUTURO</span><h2 id={titleId}>{title}</h2></div><button type="button" className="wf-icon-button" aria-label="Fechar janela" onClick={onClose}><X size={20}/></button></header>
    <div className="wf-dialog-body">{children}</div>
  </dialog>;
}

export function FormField({ label, children, help, full = false }: { label: string; children: ReactNode; help?: string; full?: boolean }) {
  return <label className={`wf-field ${full ? 'wf-span' : ''}`}><span>{label}</span>{children}{help ? <small>{help}</small> : null}</label>;
}

export function TeamSelect({ team, value = '', name = 'responsavelId', required = true }: { team: Entity[]; value?: string; name?: string; required?: boolean }) {
  return <select name={name} defaultValue={value} required={required}><option value="">Selecione um responsável</option>{team.filter(item => text(item.status) !== 'Inativo').map(item => <option key={item.id} value={item.id}>{text(item.nome)}</option>)}</select>;
}

export function ClientSelect({ clients, value = '', required = true }: { clients: Entity[]; value?: string; required?: boolean }) {
  return <select name="clienteId" defaultValue={value} required={required}><option value="">{required ? 'Selecione o cliente' : 'Sem cliente vinculado'}</option>{clients.map(item => <option key={item.id} value={item.id}>{text(item.razaoSocial || item.nome)}</option>)}</select>;
}

export function EmptyWorkflow({ title, description, children, icon }: { title: string; description: string; children?: ReactNode; icon?: ReactNode }) {
  return <div className="wf-empty"><div className="wf-empty-icon">{icon}</div><h3>{title}</h3><p>{description}</p>{children}</div>;
}

export function ProgressBar({ done, total }: { done: number; total: number }) {
  return <div className="wf-progress-group"><div className="wf-progress" role="progressbar" aria-label="Progresso dos itens" aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={done}><span style={{ width: `${total ? done / total * 100 : 0}%` }}/></div><small>{done}/{total}</small></div>;
}

export function FieldError({ error }: { error: string }) { return error ? <p role="alert" className="wf-error">{error}</p> : null; }

export function WorkflowToolbar({ children }: { children: ReactNode }) { return <div className="wf-toolbar">{children}</div>; }

export function FormActions({ busy, label = 'Salvar', onClose }: { busy: boolean; label?: string; onClose: () => void }) {
  return <footer className="wf-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Salvando…' : label}</button></footer>;
}
