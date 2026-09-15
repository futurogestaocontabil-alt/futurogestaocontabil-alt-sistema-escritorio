import { useMemo, useState } from 'react';
import { Badge } from './ui';
import Distribution from './Distribution';
import MonthlyColumnChart from './MonthlyColumnChart';
import ResourceTable from './ResourceTable';
import { useApp } from '../hooks/useApp';
import { groupBy } from '../services/analytics';
import { money, number, text, today } from '../utils/records';
import type { Entity } from '../types/domain';

type ClientView = 'tabela' | 'enquadramento' | 'estado' | 'onboarding' | 'entradas';
type Period = '12' | 'year' | 'all';

const views: Array<{ id: ClientView; label: string }> = [
  { id: 'tabela', label: 'Tabela completa' },
  { id: 'enquadramento', label: 'Enquadramento' },
  { id: 'estado', label: 'Por estado' },
  { id: 'onboarding', label: 'Onboarding 90 dias' },
  { id: 'entradas', label: 'Vendas e entradas' },
];

function daysSince(value: Entity[string]) {
  const parsed = Date.parse(`${text(value)}T12:00:00`);
  return Number.isFinite(parsed) ? Math.floor((Date.now() - parsed) / 86_400_000) : Number.POSITIVE_INFINITY;
}

function onboardingPhase(client: Entity) {
  const days = daysSince(client.dataEntrada);
  if (days <= 30) return '0 a 30 dias';
  if (days <= 60) return '31 a 60 dias';
  return '61 a 90 dias';
}

function monthSequence(start: string, end: string) {
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  const result: string[] = [];
  const cursor = new Date(Date.UTC(startYear, startMonth - 1, 1));
  const limit = new Date(Date.UTC(endYear, endMonth - 1, 1));
  while (cursor <= limit) {
    result.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

function monthsForPeriod(clients: Entity[], period: Period) {
  const current = today().slice(0, 7);
  if (period === 'year') return monthSequence(`${current.slice(0, 4)}-01`, current);
  if (period === '12') {
    const [year, month] = current.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 12, 1));
    return monthSequence(`${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`, current);
  }
  const valid = clients.map(client => text(client.dataEntrada).slice(0, 7)).filter(value => /^\d{4}-\d{2}$/.test(value)).sort();
  return monthSequence(valid[0] ?? current, current);
}

function monthlyRows(clients: Entity[], months: string[], metric: 'count' | 'sum' | 'average') {
  const values = new Map<string, { count: number; sum: number }>(months.map(month => [month, { count: 0, sum: 0 }]));
  for (const client of clients) {
    const month = text(client.dataEntrada).slice(0, 7);
    const current = values.get(month);
    if (!current) continue;
    current.count += 1;
    current.sum += number(client.honorario);
  }
  return months.map(month => {
    const value = values.get(month) ?? { count: 0, sum: 0 };
    return { month, value: metric === 'count' ? value.count : metric === 'sum' ? value.sum : value.count ? value.sum / value.count : 0 };
  });
}

export default function ClientPortfolioBI() {
  const { state } = useApp();
  const [view, setView] = useState<ClientView>('tabela');
  const [period, setPeriod] = useState<Period>('12');
  const active = useMemo(() => state.clientes.filter(client => text(client.status) === 'Ativo'), [state.clientes]);
  const onboarding = useMemo(() => active.filter(client => { const days = daysSince(client.dataEntrada); return days >= 0 && days <= 90; }), [active]);
  const mrr = active.reduce((sum, client) => sum + number(client.honorario), 0);
  const states = new Set(active.map(client => text(client.uf)).filter(Boolean)).size;
  const newThisMonth = active.filter(client => text(client.dataEntrada).slice(0, 7) === today().slice(0, 7)).length;
  const months = useMemo(() => monthsForPeriod(state.clientes, period), [state.clientes, period]);

  return <>
    <div className="bi-stat-grid">
      <div className="stat-card"><span className="stat-label">Clientes ativos</span><strong>{active.length}</strong><small>Carteira atual</small></div>
      <div className="stat-card"><span className="stat-label">Onboarding</span><strong>{onboarding.length}</strong><small>Primeiros 90 dias</small></div>
      <div className="stat-card"><span className="stat-label">Receita recorrente</span><strong>{money(mrr)}</strong><small>Honorários ativos</small></div>
      <div className="stat-card"><span className="stat-label">Ticket médio</span><strong>{active.length ? money(mrr / active.length) : money(0)}</strong><small>Média da carteira ativa</small></div>
      <div className="stat-card"><span className="stat-label">Estados atendidos</span><strong>{states}</strong><small>Atuação geográfica</small></div>
      <div className="stat-card"><span className="stat-label">Entradas no mês</span><strong>{newThisMonth}</strong><small>Novos clientes ativos</small></div>
    </div>
    <div className="bi-view-tabs" role="tablist" aria-label="Visões da carteira">
      {views.map(item => <button key={item.id} role="tab" aria-selected={view === item.id} onClick={() => setView(item.id)}>{item.label}{item.id === 'onboarding' ? <Badge tone="warning">{onboarding.length}</Badge> : null}</button>)}
    </div>
    {view === 'tabela' ? <ResourceTable collection="clientes"/> : null}
    {view === 'enquadramento' ? <div className="dashboard-columns compact-columns"><Distribution title="Clientes por regime tributário" rows={groupBy(active, 'regime')}/><Distribution title="Clientes por porte" rows={groupBy(active, 'porte')}/><Distribution title="Clientes por atividade" rows={groupBy(active, 'atividade')}/><Distribution title="Clientes por plano" rows={groupBy(active, 'plano')}/></div> : null}
    {view === 'estado' ? <div className="dashboard-columns compact-columns"><Distribution title="Clientes por estado" rows={groupBy(active, 'uf')}/><Distribution title="Clientes por cidade" rows={groupBy(active, 'cidade')}/></div> : null}
    {view === 'onboarding' ? <><div className="dashboard-columns compact-columns"><Distribution title="Fases dos primeiros 90 dias" rows={groupBy(onboarding.map(client => ({ ...client, faseBi: onboardingPhase(client) })), 'faseBi')}/><section className="card bi-explanation"><Badge tone="warning">Acompanhamento inicial</Badge><h3>Como o sistema considera o onboarding</h3><p>Todo cliente ativo permanece nesta visão por 90 dias a partir da data de entrada. Depois desse período, ele sai automaticamente da lista, sem alterar seu cadastro.</p></section></div><ResourceTable collection="clientes" rows={onboarding}/></> : null}
    {view === 'entradas' ? <div className="entries-bi">
      <div className="bi-period-filter"><div><strong>Período dos gráficos</strong><span>Os meses aparecem separadamente, inclusive quando não houve entrada.</span></div><div role="group" aria-label="Filtrar período dos gráficos"><button className={period === '12' ? 'is-active' : ''} onClick={() => setPeriod('12')}>12 meses</button><button className={period === 'year' ? 'is-active' : ''} onClick={() => setPeriod('year')}>Ano atual</button><button className={period === 'all' ? 'is-active' : ''} onClick={() => setPeriod('all')}>Todo o histórico</button></div></div>
      <div className="bi-monthly-stack"><MonthlyColumnChart title="Entradas por mês" subtitle="Quantidade de clientes que entraram em cada mês" rows={monthlyRows(state.clientes, months, 'count')}/><MonthlyColumnChart title="Honorários dos clientes que entraram" subtitle="Soma dos novos honorários mensais por mês" rows={monthlyRows(state.clientes, months, 'sum')} currency/><MonthlyColumnChart title="Ticket médio dos novos clientes" subtitle="Honorário médio dos clientes que entraram em cada mês" rows={monthlyRows(state.clientes, months, 'average')} currency/></div>
      <div className="dashboard-columns compact-columns"><Distribution title="Entradas por grupo" rows={groupBy(state.clientes, 'grupo')}/><Distribution title="Entradas por origem" rows={groupBy(state.clientes, 'origem')}/></div>
    </div> : null}
  </>;
}
