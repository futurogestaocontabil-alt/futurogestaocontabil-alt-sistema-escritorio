import { useMemo, useState } from 'react';
import { CalendarPlus, CircleDollarSign } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { financeMetrics, groupBy } from '../services/analytics';
import { entityName, money, number, text, today } from '../utils/records';
import Distribution from './Distribution';
import ResourceTable from './ResourceTable';
import { Badge, Button, Card, EmptyState } from './ui';

function previousMonths(reference: string, count: number) {
  const [year, month] = reference.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - index - 1), 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

export default function FinanceDashboard() {
  const { state, execute, busy, notice } = useApp();
  const [month, setMonth] = useState(today().slice(0, 7));
  const metrics = financeMetrics(state, month);
  const activeFinance = state.clientes.filter(client => text(client.status) === 'Ativo' && client.financeiroAtivo !== false && client.gerarHonorarioAutomatico !== false && number(client.honorario) > 0);
  const mrr = activeFinance.reduce((sum, client) => sum + number(client.honorario), 0);
  const monthInvoices = state.faturas.filter(invoice => text(invoice.competencia) === month && text(invoice.status) !== 'Cancelado');
  const monthExpenses = state.despesas.filter(expense => text(expense.competencia) === month && text(expense.status) !== 'Cancelado');
  const paidCosts = monthExpenses.filter(expense => ['Pago', 'Paga'].includes(text(expense.status))).reduce((sum, expense) => sum + number(expense.valor), 0);
  const cashResult = metrics.received - paidCosts;
  const pendingValue = monthInvoices.filter(invoice => !['Pago', 'Paga'].includes(text(invoice.status))).reduce((sum, invoice) => sum + number(invoice.valor), 0);
  const dueInvoices = state.faturas.filter(invoice => text(invoice.status) !== 'Cancelado' && text(invoice.vencimento) < today());
  const dueValue = dueInvoices.reduce((sum, invoice) => sum + number(invoice.valor), 0);
  const delinquency = dueValue ? Math.round((metrics.overdueValue / dueValue) * 100) : 0;
  const trend = useMemo(() => previousMonths(month, 6).map(competence => {
    const invoices = state.faturas.filter(item => text(item.competencia) === competence && text(item.status) !== 'Cancelado');
    const expenses = state.despesas.filter(item => text(item.competencia) === competence && text(item.status) !== 'Cancelado');
    return { competence, revenue: invoices.reduce((sum, item) => sum + number(item.valor), 0), costs: expenses.reduce((sum, item) => sum + number(item.valor), 0) };
  }), [month, state.faturas, state.despesas]);

  async function generateInvoices() {
    try { await execute({ type: 'generateInvoices', data: { competencia: month } }); notice('Contas a receber da competência conferidas e geradas sem duplicidade.'); }
    catch (cause) { notice(cause instanceof Error ? cause.message : 'Não foi possível gerar as contas a receber.'); }
  }

  return <>
    <Card><div className="finance-command"><div><span className="heading-icon gold"><CalendarPlus size={19}/></span><div><h3>Honorários recorrentes</h3><p>{activeFinance.length} cliente(s) com financeiro e cobrança mensal habilitados.</p></div></div><label className="field"><span>Competência</span><input type="month" value={month} onChange={event => setMonth(event.target.value)}/></label><Button disabled={busy || !month} onClick={() => void generateInvoices()}><CircleDollarSign size={16}/>Gerar contas a receber</Button></div><p className="finance-command-note">O cadastro de um novo cliente pode gerar a primeira conta automaticamente. Este botão completa a competência e ignora cobranças já existentes. Nenhum boleto ou mensagem é enviado sem integração ativa.</p></Card>
    <div className="bi-stat-grid finance-bi-stats">
      <div className="stat-card"><span className="stat-label">MRR contratado</span><strong>{money(mrr)}</strong><small>{activeFinance.length} clientes recorrentes</small></div>
      <div className="stat-card"><span className="stat-label">Faturado</span><strong>{money(metrics.billed)}</strong><small>{month}</small></div>
      <div className="stat-card"><span className="stat-label">Recebido</span><strong>{money(metrics.received)}</strong><small>{metrics.billed ? Math.round(metrics.received / metrics.billed * 100) : 0}% do faturado</small></div>
      <div className="stat-card"><span className="stat-label">A receber</span><strong>{money(pendingValue)}</strong><small>Contas pendentes da competência</small></div>
      <div className="stat-card"><span className="stat-label">Inadimplência</span><strong>{delinquency}%</strong><small>{money(metrics.overdueValue)} vencidos</small></div>
      <div className="stat-card"><span className="stat-label">Resultado de caixa</span><strong className={cashResult < 0 ? 'negative' : ''}>{money(cashResult)}</strong><small>Recebimentos menos despesas pagas</small></div>
      <div className="stat-card"><span className="stat-label">Resultado projetado</span><strong className={metrics.margin < 0 ? 'negative' : ''}>{money(metrics.margin)}</strong><small>Faturado menos despesas cadastradas</small></div>
      <div className="stat-card"><span className="stat-label">Custos</span><strong>{money(metrics.costs)}</strong><small>Despesas da competência</small></div>
    </div>
    <div className="dashboard-columns compact-columns"><Distribution title="Receita dos últimos 6 meses" rows={trend.map(item => ({ label: item.competence, value: item.revenue }))} currency/><Distribution title="Custos dos últimos 6 meses" rows={trend.map(item => ({ label: item.competence, value: item.costs }))} currency/><Distribution title="Contas a receber por situação" rows={groupBy(monthInvoices, 'status', 'valor')} currency/><Distribution title="Despesas por categoria" rows={groupBy(monthExpenses, 'categoria', 'valor')} currency/></div>
    <Card><div className="card-heading"><div><span className="heading-icon danger"><CircleDollarSign size={19}/></span><h3>Clientes com valores vencidos</h3></div><Badge tone={metrics.overdue.length ? 'danger' : 'success'}>{metrics.overdue.length}</Badge></div>{metrics.overdue.length ? <div className="action-list">{metrics.overdue.slice(0, 8).map(invoice => <div key={invoice.id}><span><strong>{entityName(state.clientes.find(client => client.id === invoice.clienteId))}</strong><small>{text(invoice.nome)} · vencimento {text(invoice.vencimento)}</small></span><Badge tone="danger">{money(number(invoice.valor))}</Badge></div>)}</div> : <EmptyState title="Nenhum valor vencido" description="As cobranças vencidas e não recebidas aparecerão aqui."/>}</Card>
    <div className="bi-resource-section"><h2>Contas a receber</h2><ResourceTable collection="faturas"/></div>
    <div className="bi-resource-section"><h2>Contas a pagar</h2><ResourceTable collection="despesas"/></div>
  </>;
}
