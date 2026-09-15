import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Calculator, Save } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { calculatePrice } from '../services/domain';
import { DESCONTO_SEM_APROVACAO, type PriceExtra, type PriceInput, type PriceResult } from '../services/domain/pricing';
import type { Entity } from '../types/domain';

const PLANOS = ['Essencial', 'Mentor', 'Estratégico'] as const;
const ATIVIDADES = ['Serviços', 'Comércio', 'Indústria'] as const;
const REGIMES = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'Imunes ou Isentas'] as const;
const NIVEIS = [
  { valor: 'alto', rotulo: 'Alto', ajuda: 'Informações organizadas e integração simples. Sem acréscimo.' },
  { valor: 'medio', rotulo: 'Médio', ajuda: 'Exige conferência e ajustes periódicos. Acréscimo de R$ 90,00.' },
  { valor: 'baixo', rotulo: 'Baixo', ajuda: 'Exige muita intervenção manual da equipe. Acréscimo de R$ 150,00.' },
] as const;
const QUANTIDADES = [
  { campo: 'colaboradores', rotulo: 'Colaboradores' },
  { campo: 'proLabore', rotulo: 'Sócios com pró-labore', ajuda: 'A tabela só cobre até três.' },
  { campo: 'contasFinanceiras', rotulo: 'Contas financeiras' },
  { campo: 'pontoColaboradores', rotulo: 'Colaboradores com ponto' },
  { campo: 'guiasDifal', rotulo: 'Guias DIFAL por mês' },
  { campo: 'notas', rotulo: 'Notas emitidas pelo escritório' },
  { campo: 'contasPagar', rotulo: 'Contas a pagar por mês' },
] as const;
const MARCADORES = [
  { campo: 'pontoEletronico', rotulo: 'Ponto eletrônico', ajuda: 'Acréscimo de R$ 100,00.' },
  { campo: 'icmsSt', rotulo: 'ICMS-ST interestadual', ajuda: 'Acréscimo de R$ 100,00.' },
  { campo: 'monofasico', rotulo: 'PIS/COFINS monofásico', ajuda: 'Acréscimo de R$ 100,00.' },
] as const;
const ETAPAS = ['Empresa', 'Plano', 'Operação', 'Integração', 'Extras', 'Resultado'] as const;
const CATEGORIAS: Record<string, string> = { base: 'Faixa de faturamento', plano: 'Plano contratado', criterio: 'Critérios operacionais', integracao: 'Nível de integração', extra: 'Serviços adicionais', ajuste: 'Ajuste comercial' };

const dinheiro = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const texto = (value: unknown) => typeof value === 'string' ? value.trim() : '';

/**
 * O que já está no lead entra na simulação. Antes a atividade era reduzida a
 * Comércio ou Serviços, então Indústria virava Serviços em silêncio e a tabela
 * aplicada era a errada. Agora o valor só é aproveitado quando existe na lista,
 * e o que não deu para aproveitar aparece na tela em vez de sumir.
 */
const naLista = <T extends string>(valores: readonly T[], bruto: unknown): T | undefined => {
  const alvo = texto(bruto).toLocaleLowerCase('pt-BR');
  return alvo ? valores.find(item => item.toLocaleLowerCase('pt-BR') === alvo) : undefined;
};
const numeroPositivo = (bruto: unknown): number | undefined => {
  const valor = typeof bruto === 'number' ? bruto : Number(texto(bruto).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(valor) && valor > 0 ? valor : undefined;
};

export default function SimulationWizard({ lead, onClose, onSaved }: { lead?: Entity; onClose: () => void; onSaved?: (valor: number) => void }) {
  const { state, actor, execute, busy, notice } = useApp();
  const [etapa, setEtapa] = useState(0);
  const [erro, setErro] = useState('');
  const atividadeDoLead = naLista(ATIVIDADES, lead?.atividade);
  const regimeDoLead = naLista(REGIMES, lead?.regime);
  const faturamentoDoLead = numeroPositivo(lead?.faturamento);
  const naoAproveitado = lead ? [
    texto(lead.atividade) && !atividadeDoLead ? `atividade "${texto(lead.atividade)}"` : '',
    texto(lead.regime) && !regimeDoLead ? `regime "${texto(lead.regime)}"` : '',
  ].filter(Boolean) : [];
  const [entradas, setEntradas] = useState<Record<string, unknown>>({
    plano: 'Essencial',
    atividade: atividadeDoLead ?? 'Serviços',
    regime: regimeDoLead ?? 'Simples Nacional',
    faturamento: faturamentoDoLead ?? 0,
  });
  const [extras, setExtras] = useState<PriceExtra[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [ajusteTipo, setAjusteTipo] = useState<'' | 'desconto' | 'acrescimo'>('');
  const [ajustePercentual, setAjustePercentual] = useState('');
  const [ajusteJustificativa, setAjusteJustificativa] = useState('');
  const socio = actor.papel === 'socio';
  const tabelaAprovada = state.configuracoes.find(item => item.id === 'tabela-precos')?.tabelaIndustriaAprovada === true;
  const ajuste = ajusteTipo && ajustePercentual
    ? { tipo: ajusteTipo, percentual: Number(ajustePercentual), justificativa: ajusteJustificativa, ...(socio ? { aprovadoPorId: actor.memberId || actor.id } : {}) }
    : undefined;

  const servicosAtivos = state.servicos.filter(item => item.ativo !== false);
  const definir = (campo: string, valor: unknown) => setEntradas(atual => ({ ...atual, [campo]: valor }));

  const { resultado, bloqueio } = useMemo(() => {
    try {
      return { resultado: calculatePrice({ ...entradas, extras, ajuste, tabelaIndustriaAprovada: tabelaAprovada } as unknown as PriceInput) as PriceResult, bloqueio: '' };
    } catch (causa) {
      return { resultado: null, bloqueio: causa instanceof Error ? causa.message : 'Não foi possível calcular.' };
    }
  }, [entradas, extras, ajuste, tabelaAprovada]);

  const salvar = async () => {
    if (!resultado) { setErro(bloqueio); return; }
    try {
      await execute({ type: 'saveSimulation', data: {
        leadId: lead?.id ?? '',
        entradas: JSON.parse(JSON.stringify({ ...entradas, extras })),
        ajuste: ajuste ? JSON.parse(JSON.stringify(ajuste)) : {},
        observacoes,
      } });
      notice('Simulação salva com a versão da tabela usada.');
      onSaved?.(resultado.total);
      onClose();
    } catch (causa) { setErro(causa instanceof Error ? causa.message : 'Não foi possível salvar a simulação.'); }
  };

  const agrupado = useMemo(() => {
    if (!resultado) return [] as { categoria: string; itens: PriceResult['itens'] }[];
    return Object.keys(CATEGORIAS)
      .map(categoria => ({ categoria, itens: resultado.itens.filter(linha => linha.categoria === categoria) }))
      .filter(grupo => grupo.itens.length);
  }, [resultado]);

  return <div className="wf-dialog wf-dialog-wide sim-wizard" role="dialog" aria-modal="true" aria-label="Simulação de honorário">
    <div className="sim-inner">
      <header className="sim-head">
        <div><span className="heading-icon gold"><Calculator size={18}/></span><h3>Simulação de honorário</h3>
          <p>{lead ? `${texto(lead.empresa) || texto(lead.nome)}` : 'Sem lead vinculado'} · regra {resultado?.versao ?? 'escopo-4.4-v1'}</p></div>
        <button type="button" className="sim-close" onClick={onClose} aria-label="Fechar">×</button>
      </header>

      <ol className="sim-steps">{ETAPAS.map((nome, indice) => <li key={nome} className={indice === etapa ? 'atual' : indice < etapa ? 'feita' : ''}>
        <button type="button" onClick={() => setEtapa(indice)}><span>{indice + 1}</span>{nome}</button>
      </li>)}</ol>

      <div className="sim-body">
        {etapa === 0 ? <div className="sim-grid">
          <label>Atividade<select value={String(entradas.atividade)} onChange={event => definir('atividade', event.target.value)}>{ATIVIDADES.map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Regime tributário<select value={String(entradas.regime)} onChange={event => definir('regime', event.target.value)}>{REGIMES.map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Faturamento mensal (R$)<input type="number" min="0" step="0.01" value={String(entradas.faturamento ?? 0)} onChange={event => definir('faturamento', Number(event.target.value))}/></label>
          {lead ? <p className="sim-note">Lead: {texto(lead.empresa) || texto(lead.nome)}{texto(lead.cnpj) ? ` · CNPJ ${texto(lead.cnpj)}` : ''}{texto(lead.cidade) ? ` · ${texto(lead.cidade)}/${texto(lead.uf)}` : ''}</p> : null}
          {naoAproveitado.length ? <p className="sim-note sim-note-aviso">
            Não foi possível aproveitar {naoAproveitado.join(' e ')} do cadastro do lead. Confira os campos acima antes de calcular, porque a faixa aplicada depende deles.
          </p> : null}
          {lead && !faturamentoDoLead ? <p className="sim-note">O lead não tem faturamento cadastrado. Informe o valor para a faixa ser aplicada.</p> : null}
        </div> : null}

        {etapa === 1 ? <div className="sim-plans">{PLANOS.map(plano => {
          const acrescimo = plano === 'Essencial' ? 0 : plano === 'Mentor' ? 100 : 560;
          return <button type="button" key={plano} className={'sim-plan ' + (entradas.plano === plano ? 'ativo' : '')} onClick={() => definir('plano', plano)}>
            <strong>{plano}</strong>
            <span>{acrescimo ? `+ ${acrescimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sobre a faixa` : 'Sem acréscimo sobre a faixa'}</span>
          </button>;
        })}</div> : null}

        {etapa === 2 ? <div className="sim-grid">
          {QUANTIDADES.map(item => <label key={item.campo}>{item.rotulo}
            <input type="number" min="0" step="1" value={String(entradas[item.campo] ?? '')} placeholder="0" onChange={event => definir(item.campo, event.target.value === '' ? undefined : Number(event.target.value))}/>
            {'ajuda' in item && item.ajuda ? <small>{item.ajuda}</small> : null}
          </label>)}
          <div className="sim-checks">{MARCADORES.map(item => <label key={item.campo} className="sim-check">
            <input type="checkbox" checked={entradas[item.campo] === true} onChange={event => definir(item.campo, event.target.checked)}/>
            <span>{item.rotulo}<small>{item.ajuda}</small></span>
          </label>)}</div>
        </div> : null}

        {etapa === 3 ? <div className="sim-grid">
          <label>Integração contábil<select value={String(entradas.integracaoContabil ?? '')} onChange={event => definir('integracaoContabil', event.target.value || undefined)}>
            <option value="">Não avaliado</option>{NIVEIS.map(item => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}</select>
            <small>{NIVEIS.find(item => item.valor === entradas.integracaoContabil)?.ajuda ?? 'Escolha o nível para ver o efeito no preço.'}</small></label>
          <label>Integração fiscal<select value={String(entradas.integracaoFiscal ?? '')} onChange={event => definir('integracaoFiscal', event.target.value || undefined)}>
            <option value="">Não avaliado</option>{NIVEIS.map(item => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}</select>
            <small>{NIVEIS.find(item => item.valor === entradas.integracaoFiscal)?.ajuda ?? 'Escolha o nível para ver o efeito no preço.'}</small></label>
          <label className="sim-check sim-span">
            <input type="checkbox" checked={entradas.teraPontoIntegrado === false} onChange={event => definir('teraPontoIntegrado', event.target.checked ? false : undefined)}/>
            <span>O ponto não será integrado<small>Acréscimo de R$ 50,00. Deixe desmarcado enquanto não estiver definido.</small></span>
          </label>
        </div> : null}

        {etapa === 4 ? <div className="sim-extras">
          {servicosAtivos.length ? servicosAtivos.map(servico => {
            const atual = extras.find(item => item.servicoId === servico.id);
            const preco = Number(servico.valor ?? 0);
            return <div className="sim-extra" key={servico.id}>
              <label className="sim-check">
                <input type="checkbox" checked={Boolean(atual)} onChange={event => setExtras(lista => event.target.checked
                  ? [...lista, { servicoId: servico.id, nome: texto(servico.nome), valor: preco, quantidade: 1 }]
                  : lista.filter(item => item.servicoId !== servico.id))}/>
                <span>{texto(servico.nome)}<small>{preco ? dinheiro(Math.round(preco * 100)) : 'Sem preço no catálogo, exige aprovação do sócio'}</small></span>
              </label>
              {atual ? <div className="sim-extra-linha">
                <label>Quantidade<input type="number" min="1" step="1" value={atual.quantidade} onChange={event => setExtras(lista => lista.map(item => item.servicoId === servico.id ? { ...item, quantidade: Math.max(1, Number(event.target.value) || 1) } : item))}/></label>
                {preco === 0 ? <label className="sim-check"><input type="checkbox" checked={atual.aprovacaoSocio === true} onChange={event => setExtras(lista => lista.map(item => item.servicoId === servico.id ? { ...item, aprovacaoSocio: event.target.checked } : item))}/><span>Aprovado pelo sócio</span></label> : null}
              </div> : null}
            </div>;
          }) : <p className="sim-note">Nenhum serviço ativo no portfólio. Cadastre em Portfólio de serviços para oferecer extras.</p>}
          <p className="sim-note">O preço do extra é congelado no momento em que a simulação é salva. Mudança futura no catálogo não altera a simulação nem a proposta.</p>
        </div> : null}

        {etapa === 5 ? <div className="sim-resultado">
          {bloqueio ? <p className="sim-bloqueio">{bloqueio}</p> : null}
          {resultado ? <>
            <div className="sim-total">
              {resultado.ajusteCentavos !== 0 ? <p className="sim-total-linha"><span>Valor original</span><b>{dinheiro(resultado.subtotalCentavos)}</b></p> : null}
              {resultado.ajusteCentavos !== 0 ? <p className="sim-total-linha"><span>{resultado.ajusteCentavos < 0 ? 'Desconto' : 'Acréscimo'}</span><b>{dinheiro(resultado.ajusteCentavos)}</b></p> : null}
              <small>Total mensal</small><strong>{dinheiro(resultado.totalCentavos)}</strong>
            </div>
            <div className="sim-grid" style={{ marginBottom: 18 }}>
              <label>Ajuste comercial<select value={ajusteTipo} onChange={event => setAjusteTipo(event.target.value as 'desconto' | 'acrescimo' | '')}>
                <option value="">Sem ajuste</option><option value="desconto">Desconto</option><option value="acrescimo">Acréscimo</option>
              </select>
              <small>O total nunca é digitado. Todo ajuste entra como linha identificada.</small></label>
              {ajusteTipo ? <label>Percentual<input type="number" min="0.1" max="100" step="0.1" value={ajustePercentual} onChange={event => setAjustePercentual(event.target.value)} placeholder="Ex.: 10"/>
                <small>{ajusteTipo === 'desconto' ? `Acima de ${DESCONTO_SEM_APROVACAO}% só com aprovação do sócio.${socio ? ' Você é sócio, então a aprovação fica registrada em seu nome.' : ''}` : 'Acréscimo também exige justificativa.'}</small></label> : null}
              {ajusteTipo ? <label className="sim-span">Justificativa<input value={ajusteJustificativa} onChange={event => setAjusteJustificativa(event.target.value)} placeholder="Por que este ajuste está sendo aplicado"/></label> : null}
            </div>
            {agrupado.map(grupo => <div className="sim-grupo" key={grupo.categoria}>
              <h4>{CATEGORIAS[grupo.categoria]}</h4>
              <table><tbody>{grupo.itens.map(linha => <tr key={linha.nome}>
                <td>{linha.nome}</td>
                <td>{linha.quantidade > 1 ? `${linha.quantidade} × ${dinheiro(linha.valorUnitarioCentavos)}` : ''}</td>
                <td className="sim-valor">{dinheiro(linha.totalCentavos)}</td>
              </tr>)}</tbody></table>
            </div>)}
            <label className="sim-span">Observações<textarea rows={3} value={observacoes} onChange={event => setObservacoes(event.target.value)} placeholder="O que foi combinado e o que ficou de fora."/></label>
            {resultado.alertas.map(alerta => <p className={'sim-alerta' + (/sugerida/i.test(alerta) ? ' destaque' : '')} key={alerta}>{alerta}</p>)}
          </> : null}
        </div> : null}
      </div>

      {erro ? <p className="sim-erro">{erro}</p> : null}

      <footer className="sim-foot">
        <button type="button" onClick={() => setEtapa(valor => Math.max(0, valor - 1))} disabled={etapa === 0}><ArrowLeft size={15}/>Voltar</button>
        {etapa < ETAPAS.length - 1
          ? <button type="button" className="primary" onClick={() => setEtapa(valor => Math.min(ETAPAS.length - 1, valor + 1))}>Avançar<ArrowRight size={15}/></button>
          : <button type="button" className="primary" onClick={() => void salvar()} disabled={busy || !resultado}><Save size={15}/>Salvar simulação</button>}
      </footer>
    </div>
  </div>;
}
