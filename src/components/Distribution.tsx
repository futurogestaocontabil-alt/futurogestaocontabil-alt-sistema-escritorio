import { EmptyState } from './ui';
import { money } from '../utils/records';

type DistributionRow = { label: string; value: number };

function displayLabel(label: string) {
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [year, month] = label.split('-');
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(Number(year), Number(month) - 1, 1)))
      .replace('.', '');
  }
  return label;
}

export default function Distribution({ title, rows, currency = false, onSelect }: { title: string; rows: DistributionRow[]; currency?: boolean; onSelect?: (label: string) => void }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return <section className="card distribution">
    <div className="card-heading distribution-heading">
      <div><h3>{title}</h3><small>{rows.length} {rows.length === 1 ? 'grupo' : 'grupos'}</small></div>
      {rows.length ? <span className="distribution-total">Total: <strong>{currency ? money(total) : total}</strong></span> : null}
    </div>
    {rows.length ? <div className="bar-list">
      {rows.map(row => {
        const percent = total > 0 ? row.value / total * 100 : 0;
        const content = <>
          <span className="bar-copy"><span title={row.label}>{displayLabel(row.label)}</span><strong>{currency ? money(row.value) : row.value}</strong></span>
          <span className="bar-meta"><span className="bar-track" aria-hidden="true"><i style={{ width: `${Math.max(percent, row.value > 0 ? 2 : 0)}%` }}/></span><small>{percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</small></span>
        </>;
        return onSelect
          ? <button type="button" className="bar-row is-clickable" key={row.label} onClick={() => onSelect(row.label)}>{content}</button>
          : <div className="bar-row" key={row.label}>{content}</div>;
      })}
    </div> : <EmptyState title="Ainda não há dados" description="O gráfico será atualizado quando houver registros nesta visão."/>}
  </section>;
}
