import { useState } from 'react';
import { CalendarCheck2, CheckCircle2, Handshake, Server } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { Badge, Card, EmptyState, PageHeader } from '../components/ui';
import { PARCEIRO_TICKET_ALTO, STATUS_ONBOARDING_EXTERNO } from '../services/domain/catalogos';


const texto = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const lista = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value as Record<string, unknown>[] : [];
const TOM: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  'Concluída': 'success', 'Realizada': 'success', 'Bloqueada': 'danger',
  'Pendências do cliente': 'warning', 'Aguardando agendamento': 'warning', 'Agendada': 'neutral', 'Em implantação': 'neutral',
};

export default function OnboardingPage() {
  const { state, execute, busy, notice } = useApp();
  const [clienteId, setClienteId] = useState('');

  const clientesComOnboarding = state.clientes.filter(cliente => state.onboardings.some(item => item.clienteId === cliente.id));
  const selecionado = clienteId || clientesComOnboarding[0]?.id || '';
  const interno = state.onboardings.find(item => item.clienteId === selecionado && item.tipo === 'interno');
  const externo = state.onboardings.find(item => item.clienteId === selecionado && item.tipo === 'externo');

  const rodar = async (acao: () => Promise<void>, mensagem: string) => {
    try { await acao(); notice(mensagem); }
    catch (causa) { notice(causa instanceof Error ? causa.message : 'Não foi possível concluir a ação.'); }
  };
  const atualizar = (id: string, dados: Record<string, unknown>, mensagem: string) =>
    void rodar(() => execute({ type: 'completeOnboardingStep', id, data: JSON.parse(JSON.stringify(dados)) }), mensagem);

  const passos = interno ? lista(interno.passos) : [];
  const pendentes = passos.filter(passo => passo.obrigatorio && !passo.concluido).length;

  return <>
    <PageHeader eyebrow="IMPLANTAÇÃO" title="Onboarding" description="O interno é da equipe, por sistema, com código da empresa e evidência. O externo é a reunião com o cliente, que gera ata."/>

    {!clientesComOnboarding.length
      ? <EmptyState title="Nenhum onboarding aberto" description="O onboarding nasce quando um contrato assinado é ativado em Contratos."/>
      : <>
        <Card>
          <label className="field"><span>Cliente</span>
            <select value={selecionado} onChange={event => setClienteId(event.target.value)}>
              {clientesComOnboarding.map(cliente => <option key={cliente.id} value={cliente.id}>{texto(cliente.razaoSocial) || texto(cliente.nome)}</option>)}
            </select>
          </label>
        </Card>

        {interno ? <Card>
          <div className="card-heading"><div><span className="heading-icon"><Server size={19}/></span><h3>Onboarding interno</h3></div>
            <Badge tone={pendentes ? 'warning' : 'success'}>{pendentes ? `${pendentes} item obrigatório pendente` : 'Itens obrigatórios concluídos'}</Badge></div>

          <h4 className="wf-section-title">Cadastro nos sistemas</h4>
          <table className="wf-table"><thead><tr><th>Sistema</th><th>Departamento</th><th>Código da empresa</th><th>Login enviado</th><th>Pendências</th><th/></tr></thead><tbody>
            {lista(interno.sistemas).map(sistema => {
              const id = String(sistema.sistemaId);
              const exigeCodigo = id.startsWith('alterdata');
              const exigeLogin = id === 'econtador';
              return <tr key={id}>
                <td><strong>{String(sistema.nome)}</strong></td>
                <td>{String(sistema.departamento)}</td>
                <td>{exigeCodigo ? <input defaultValue={texto(sistema.codigoEmpresa)} placeholder="Obrigatório" onBlur={event => { const valor = event.target.value.trim(); if (valor !== texto(sistema.codigoEmpresa)) atualizar(interno.id, { sistemaId: id, concluido: sistema.concluido === true, codigoEmpresa: valor }, 'Código registrado.'); }}/> : <span className="wf-muted">Não se aplica</span>}</td>
                <td>{exigeLogin ? <input type="date" defaultValue={texto(sistema.loginEnviadoEm)} onChange={event => atualizar(interno.id, { sistemaId: id, concluido: sistema.concluido === true, loginEnviadoEm: event.target.value }, 'Data do envio registrada.')}/> : <span className="wf-muted">Não se aplica</span>}</td>
                <td><input defaultValue={texto(sistema.pendencias)} placeholder="Nenhuma" onBlur={event => { const valor = event.target.value.trim(); if (valor !== texto(sistema.pendencias)) atualizar(interno.id, { sistemaId: id, concluido: sistema.concluido === true, pendencias: valor }, 'Pendência registrada.'); }}/></td>
                <td><label className="wf-toggle"><input type="checkbox" checked={sistema.concluido === true} disabled={busy} onChange={event => atualizar(interno.id, { sistemaId: id, concluido: event.target.checked }, event.target.checked ? 'Cadastro concluído.' : 'Cadastro reaberto.')}/>Concluído</label></td>
              </tr>;
            })}
          </tbody></table>
          <p className="wf-muted">Senha nunca é gravada aqui. Guarde no cofre cifrado, em Configurações.</p>

          <h4 className="wf-section-title">Etapas da equipe</h4>
          <ul className="wf-checklist">{passos.map(passo => <li key={String(passo.id)}>
            <label className="wf-toggle">
              <input type="checkbox" checked={passo.concluido === true} disabled={busy} onChange={event => atualizar(interno.id, { stepId: String(passo.id), concluido: event.target.checked }, event.target.checked ? 'Etapa concluída.' : 'Etapa reaberta.')}/>
              {String(passo.descricao)}{passo.obrigatorio ? <Badge tone="warning">Obrigatória</Badge> : null}
            </label>
          </li>)}</ul>

          {interno.tickerAlto === true ? <div className="wf-note">
            <strong>Cliente de ticket alto.</strong> A vinculação de extrato vai para o parceiro {PARCEIRO_TICKET_ALTO}. O sistema registra apenas se o cadastro foi feito lá.
            <label className="wf-toggle" style={{ marginTop: 10 }}>
              <input type="checkbox" checked={interno.cadastroParceiroFeito === true} disabled={busy} onChange={event => atualizar(interno.id, { cadastroParceiroFeito: event.target.checked }, 'Registro do parceiro atualizado.')}/>
              Cadastro no {PARCEIRO_TICKET_ALTO} feito
            </label>
          </div> : null}
        </Card> : null}

        {externo ? <Card>
          <div className="card-heading"><div><span className="heading-icon gold"><Handshake size={19}/></span><h3>Onboarding externo</h3></div>
            <Badge tone={TOM[String(externo.status)] ?? 'neutral'}>{texto(externo.status)}</Badge></div>
          <p className="wf-help-block">Reunião com o cliente para apresentar a equipe, os canais, o envio de documentos, os prazos, o financeiro e o calendário de tarefas. Gera ata e tarefas.</p>
          <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget);
            atualizar(externo.id, { status: String(form.get('status') ?? ''), ata: String(form.get('ata') ?? '') }, 'Onboarding externo atualizado.'); }}>
            <div className="form-grid">
              <label className="field"><span>Situação</span><select name="status" defaultValue={texto(externo.status)}>{STATUS_ONBOARDING_EXTERNO.map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="field field-wrap"><span>Ata da reunião</span>
                <textarea name="ata" rows={4} defaultValue={texto(externo.ata)} placeholder="O que foi apresentado, o que o cliente confirmou, o que ficou pendente e os próximos passos."/>
                <small>Obrigatória para marcar como Realizada.</small></label>
            </div>
            <button className="button button-primary" disabled={busy}><CalendarCheck2 size={15}/>Salvar onboarding externo</button>
          </form>
          {pendentes ? <p className="wf-muted"><CheckCircle2 size={14}/> O externo só pode ser concluído depois que o interno não tiver item obrigatório pendente.</p> : null}
        </Card> : null}
      </>}
  </>;
}
