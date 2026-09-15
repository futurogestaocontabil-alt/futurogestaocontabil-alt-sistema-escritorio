import { useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../services/api';
import { normalizeCnpj, validCnpjFormat, type CnpjLookupResult } from '../services/cnpj';
import type { JsonValue } from '../types/domain';

export default function ClientCnpjLookup({ value, onChange, onApply }: {
  value: string;
  onChange: (value: string) => void;
  onApply: (data: Record<string, JsonValue>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<'success' | 'error' | 'neutral'>('neutral');

  async function lookup() {
    const cnpj = normalizeCnpj(value);
    if (!validCnpjFormat(cnpj)) {
      setTone('error'); setMessage('Informe um CNPJ com 14 caracteres.'); return;
    }
    setBusy(true); setTone('neutral'); setMessage('Consultando a base pública...');
    try {
      const result = await api<CnpjLookupResult>(`/cnpj/${encodeURIComponent(cnpj)}?consulta=${Date.now()}`);
      onApply(result.data); setTone('success'); setMessage(`Dados encontrados em ${result.source}. ${result.warning}`);
    } catch (cause) {
      setTone('error'); setMessage(cause instanceof Error ? cause.message : 'Não foi possível consultar o CNPJ.');
    } finally { setBusy(false); }
  }

  return <div className="cnpj-lookup"><div className="cnpj-lookup-row"><input value={value} onChange={event => onChange(event.target.value)} placeholder="00.000.000/0000-00"/><button type="button" className="button button-secondary" disabled={busy} onClick={lookup}><Search size={15}/>{busy ? 'Consultando...' : 'Consultar CNPJ'}</button></div>{message ? <small className={`cnpj-lookup-message ${tone}`}>{message}</small> : <small>Preenche dados públicos. Revise tudo antes de salvar.</small>}</div>;
}
