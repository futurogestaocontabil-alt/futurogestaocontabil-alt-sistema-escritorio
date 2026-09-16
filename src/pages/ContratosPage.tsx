import { useState } from 'react';
import { FileSignature, PenLine, Send, ShieldCheck, UserCheck } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { Badge, Card, EmptyState, PageHeader } from '../components/ui';
import { DIAS_VENCIMENTO, FORMAS_ASSINATURA } from '../services/domain/catalogos';
import type { Entity } from '../types/domain';
import { FieldError, FormActions, WorkflowDialog } from '../components/workflows/WorkflowUi';

const texto = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const dinheiro = (value: unknown) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (value: unknown) => texto(value) ? new Date(String(value)).toLocaleDateString('pt-BR') : 'Não informada';
const CAMPOS = [
  { campo: 'razaoSocial', rotulo: 'Razão social' }, { campo: 'cnpj', rotulo: 'CNPJ' },
  { campo: 'endereco', rotulo: 'Endereço' }, { campo: 'cidade', rotulo: 'Cidade' }, { campo: 'uf', rotulo: 'UF' },
  { campo: 'representanteLegal', rotulo: 'Representante legal' }, { campo: 'cpfRepresentante', rotulo: 'CPF do representante' },
  { campo: 'email', rotulo: 'E-mail' }, { campo: 'atividade', rotulo: 'Atividade' }, { campo: 'regime', rotulo: 'Regime tributário' },
] as const;
const TOM: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  'Assinado': 'success', 'Aguardando assinatura': 'warning', 'Enviado para assinatura': 'warning',
  'Recusado': 'danger', 'Cancelado': 'danger', 'Expirado': 'danger',
};

function GerarContrato({ proposta, onClose }: { proposta: Entity; onClose: () => void }) {
  const { state, execute, busy, notice } = useApp();
  const [erro, setErro] = useState('');
  const lead = state.leads.find(item => item.id === proposta.leadId);
  return <WorkflowDialog title="Gerar contrato" onClose={onClose} wide><form onSubmit={async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const dados = Object.fromEntries(CAMPOS.map(item => [item.campo, String(form.get(item.campo) ?? '')]));
      try {
        await execute({ type: 'generateContract', data: {
          propostaId: proposta.id, dados,
          diaVencimento: Number(form.get('diaVencimento') ?? 30),
          competenciaInicial: String(form.get('competenciaInicial') ?? ''),
          formaAssinatura: String(form.get('formaAssinatura') ?? 'Autentique'),
          justificativaExcecaoAssinatura: String(form.get('justificativaExcecaoAssinatura') ?? ''),
        } });
        notice('Contrato gerado a partir da proposta aceita.'); onClose();
      } catch (causa) { setErro(causa instanceof Error ? causa.message : 'Não foi possível gerar o contrato.'); }
    }}>
      <p className="wf-help-block">Honorário de {dinheiro(proposta.valor)}, plano {texto(proposta.plano)}. O que já foi levantado no lead é preenchido automaticamente e pode ser corrigido.</p>
      <div className="wf-grid">
        {CAMPOS.map(item => <label className="field" key={item.campo}><span>{item.rotulo} *</span>
          <input name={item.campo} required defaultValue={texto(lead?.[item.campo]) || (item.campo === 'razaoSocial' ? texto(lead?.empresa) : '')}/>
        </label>)}
        <label className="field"><span>Dia de vencimento *</span>
          <select name="diaVencimento" defaultValue="30">{DIAS_VENCIMENTO.map(dia => <option key={dia} value={dia}>Dia {dia}</option>)}</select>
          <small>Mês sem o dia escolhido usa o último dia válido.</small></label>
        <label className="field"><span>Competência inicial *</span><input name="competenciaInicial" type="month" required defaultValue={new Date().toISOString().slice(0, 7)}/></label>
        <label className="field"><span>Forma de assinatura</span>
          <select name="formaAssinatura" defaultValue="Autentique">{FORMAS_ASSINATURA.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="field field-wrap"><span>Justificativa da exceção</span>
          <textarea name="justificativaExcecaoAssinatura" placeholder="Obrigatória quando a assinatura sair da Autentique."/></label>
      </div>
      <FieldError error={erro}/>
      <FormActions busy={busy} label="Gerar contrato" onClose={onClose}/>
    </form></WorkflowDialog>;
}

export default function ContratosPage() {
  const { state, execute, busy, notice, actor } = useApp();
  const [gerarDe, setGerarDe] = useState<Entity | null>(null);
  const [enviarDe, setEnviarDe] = useState<Entity | null>(null);

  const aceitasSemContrato = state.propostas.filter(proposta => proposta.status === 'Aceita'
    && !state.contratos.some(contrato => contrato.propostaId === proposta.id && !['Recusado', 'Cancelado', 'Expirado'].includes(String(contrato.status))));

  const rodar = async (acao: () => Promise<void>, mensagem: string) => {
    try { await acao(); notice(mensagem); }
    catch (causa) { notice(causa instanceof Error ? causa.message : 'Não foi possível concluir a ação.'); }
  };

  return <>
    <PageHeader eyebrow="COMERCIAL" title="Contratos" description="O contrato nasce da proposta aceita, é assinado pela Autentique e é o que transforma o lead em cliente."/>

    {aceitasSemContrato.length ? <Card>
      <div className="card-heading"><div><span className="heading-icon gold"><FileSignature size={19}/></span><h3>Propostas aceitas esperando contrato</h3></div><Badge tone="warning">{aceitasSemContrato.length}</Badge></div>
      <table className="wf-table"><thead><tr><th>Empresa</th><th>Plano</th><th>Valor</th><th/></tr></thead><tbody>
        {aceitasSemContrato.map(proposta => {
          const lead = state.leads.find(item => item.id === proposta.leadId);
          return <tr key={proposta.id}>
            <td><strong>{texto(lead?.empresa) || texto(lead?.nome) || 'Lead sem nome'}</strong></td>
            <td>{texto(proposta.plano)}</td><td>{dinheiro(proposta.valor)}</td>
            <td><button className="button button-primary" onClick={() => setGerarDe(proposta)}>Gerar contrato</button></td>
          </tr>;
        })}
      </tbody></table>
    </Card> : null}

    {state.contratos.length ? <Card>
      <div className="card-heading"><div><span className="heading-icon"><ShieldCheck size={19}/></span><h3>Contratos</h3></div></div>
      <table className="wf-table"><thead><tr><th>Contrato</th><th>Situação</th><th>Honorário</th><th>Vencimento</th><th>Assinado em</th><th/></tr></thead><tbody>
        {state.contratos.map(contrato => {
          const assinado = contrato.status === 'Assinado';
          const jaVirouCliente = Boolean(texto(contrato.clienteId));
          return <tr key={contrato.id}>
            <td><strong>{texto(contrato.nome)}</strong><small>Modelo {texto(contrato.modeloVersao)}{texto(contrato.autentiqueId) ? ` · Autentique ${texto(contrato.autentiqueId)}` : ''}</small></td>
            <td><Badge tone={TOM[String(contrato.status)] ?? 'neutral'}>{texto(contrato.status)}</Badge></td>
            <td>{dinheiro(contrato.honorario)}</td>
            <td>Dia {String(contrato.diaVencimento)} · {texto(contrato.competenciaInicial)}</td>
            <td>{assinado ? data(contrato.assinadoEm) : '—'}</td>
            <td className="wf-inline-actions">
              {contrato.status === 'Gerado' ? <button className="button button-secondary" onClick={() => setEnviarDe(contrato)}><Send size={14}/>Enviar para assinatura</button> : null}
              {['Enviado para assinatura', 'Aguardando assinatura'].includes(String(contrato.status)) ? <>
                <button className="button button-secondary" disabled={busy} onClick={() => void rodar(() => execute({ type: 'registerSignature', id: contrato.id, data: {} }), 'Assinatura registrada.')}><PenLine size={14}/>Registrar assinatura</button>
                <button className="button button-secondary" disabled={busy} onClick={() => { const motivo = window.prompt('Motivo da recusa'); if (motivo) void rodar(() => execute({ type: 'registerSignature', id: contrato.id, data: { recusado: true, motivo } }), 'Recusa registrada.'); }}>Registrar recusa</button>
              </> : null}
              {assinado && !jaVirouCliente ? <button className="button button-primary" disabled={busy || actor.papel !== 'socio'} title={actor.papel !== 'socio' ? 'A ativação final é aprovada pelo sócio.' : ''} onClick={() => void rodar(() => execute({ type: 'activateClient', id: contrato.id, data: {} }), 'Cliente ativado, com financeiro e onboarding criados.')}><UserCheck size={14}/>Ativar cliente</button> : null}
              {jaVirouCliente ? <span className="wf-muted">Cliente criado</span> : null}
            </td>
          </tr>;
        })}
      </tbody></table>
      <p className="wf-muted">A assinatura também chega sozinha pelo webhook da Autentique, quando o token estiver configurado em Configurações.</p>
    </Card> : <EmptyState title="Nenhum contrato ainda" description="Aceite uma proposta no CRM para gerar o primeiro contrato."/>}

    {gerarDe ? <GerarContrato proposta={gerarDe} onClose={() => setGerarDe(null)}/> : null}
    {enviarDe ? <WorkflowDialog title="Enviar para assinatura" onClose={() => setEnviarDe(null)}><form onSubmit={async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await rodar(() => execute({ type: 'sendContract', id: enviarDe.id, data: { autentiqueId: String(form.get('autentiqueId') ?? '') } }), 'Contrato enviado para assinatura.');
        setEnviarDe(null);
      }}>
        <p className="wf-help-block">Informe o identificador que a Autentique devolveu para o documento. É por ele que o webhook reconhece a assinatura depois.</p>
        <label className="field"><span>Identificador da Autentique *</span><input name="autentiqueId" required defaultValue={texto(enviarDe.autentiqueId)}/></label>
        <FormActions busy={busy} label="Confirmar envio" onClose={() => setEnviarDe(null)}/>
      </form></WorkflowDialog> : null}
  </>;
}
