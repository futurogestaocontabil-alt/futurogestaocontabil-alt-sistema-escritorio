import type {Entity, JsonValue} from '../types/domain';
export function text(value: JsonValue | undefined): string { return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''; }
export function number(value: JsonValue | undefined): number { return typeof value === 'number' && Number.isFinite(value) ? value : Number(text(value)) || 0; }
export function records(value: JsonValue | undefined): Record<string,JsonValue>[] { return Array.isArray(value) ? value.filter((v):v is Record<string,JsonValue> => v !== null && typeof v === 'object' && !Array.isArray(v)) : []; }
export const money = (value:number):string => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
export function date(value:JsonValue|undefined):string { const raw=text(value); if(!raw)return 'Não informado'; const parsed=new Date(raw.length===10?raw+'T12:00:00':raw);return Number.isNaN(parsed.getTime())?raw:new Intl.DateTimeFormat('pt-BR').format(parsed); }
export function entityName(entity:Entity|undefined):string { return entity ? text(entity.nome)||text(entity.razaoSocial)||text(entity.descricao)||entity.id : 'Não informado'; }
export function today():string { const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
export function downloadText(name:string,content:string,type='text/plain'):void { const url=URL.createObjectURL(new Blob([content],{type})); const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
export function exportCsv(name:string,rows:Entity[],fields:{key:string;label:string}[]):void { const cell=(v:unknown)=>{const s=String(v??'');return '"'+(/^[=+@\-\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';}; const csv=[fields.map(f=>cell(f.label)).join(';'),...rows.map(r=>fields.map(f=>cell(r[f.key])).join(';'))].join('\r\n');downloadText(name,'\ufeff'+csv,'text/csv;charset=utf-8'); }
