import { money } from '../utils/records';

type MonthlyPoint = { month: string; value: number };

function monthParts(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const short = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)))
    .replace('.', '');
  return { short, year: String(year) };
}

function compact(value: number, currency: boolean) {
  if (!currency) return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  if (Math.abs(value) >= 1000) return `R$ ${new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`;
  return money(value).replace(/,00$/, '');
}

export default function MonthlyColumnChart({ title, subtitle, rows, currency = false }: { title: string; subtitle: string; rows: MonthlyPoint[]; currency?: boolean }) {
  const max = Math.max(...rows.map(row => row.value), 1);
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return <section className="card monthly-chart">
    <div className="card-heading monthly-chart-heading">
      <div><h3>{title}</h3><small>{subtitle}</small></div>
      <span className="distribution-total">Total: <strong>{currency ? money(total) : total}</strong></span>
    </div>
    <div className="monthly-chart-scroll" role="img" aria-label={`${title}. Valores separados por mês.`}>
      <div className="monthly-chart-plot" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(54px, 1fr))` }}>
        {rows.map(row => {
          const height = row.value > 0 ? Math.max(row.value / max * 100, 6) : 2;
          const label = monthParts(row.month);
          return <div className="monthly-column" key={row.month} title={`${label.short} de ${label.year}: ${currency ? money(row.value) : row.value}`}>
            <strong className={row.value ? '' : 'is-zero'}>{compact(row.value, currency)}</strong>
            <span className="monthly-column-stage"><i className={row.value ? '' : 'is-zero'} style={{ height: `${height}%` }}/></span>
            <span className="monthly-column-label"><b>{label.short}</b><small>{label.year}</small></span>
          </div>;
        })}
      </div>
    </div>
  </section>;
}
