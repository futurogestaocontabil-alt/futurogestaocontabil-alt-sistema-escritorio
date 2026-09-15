import { useEffect, useState } from 'react';
import { FileSignature, ShieldCheck } from 'lucide-react';
import { Badge, Card } from './ui';
import { api, post } from '../services/api';
import { useApp } from '../hooks/useApp';

interface Situacao { configured: boolean; webhookProtegido: boolean; conectado: boolean | null; detalhe: string }

export default function AutentiqueConnection() {
  const { actor, notice } = useApp();
  const [situacao, setSituacao] = useState<Situacao | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const socio = actor.papel === 'socio';

  const carregar = async (testar = false) => {
    try { setSituacao(await api<Situacao>(`/autentique/status${testar ? '?testar=1' : ''}`)); }
    catch (causa) { notice(causa instanceof Error ? causa.message : 'Não foi possível ler a situação da Autentique.'); }
  };
  useEffect(() => { void carregar(); }, []);

  return <Card>
    <div className="card-heading">
      <div><span className="heading-icon gold"><FileSignature size={19}/></span><h3>Autentique</h3></div>
      {situacao?.configured
        ? <Badge tone={situacao.conectado === false ? 'danger' : situacao.conectado ? 'success' : 'neutral'}>{situacao.conectado === false ? 'Token recusado' : situacao.conectado ? 'Conexão confirmada' : 'Configurada'}</Badge>
        : <Badge tone="warning">Não configurada</Badge>}
    </div>
    <p className="wf-help-block">
      O contrato é enviado para assinatura pela Autentique e volta pelo webhook. O token fica no cofre cifrado e nunca vai para o navegador.
      {situacao?.webhookProtegido ? ' O webhook está protegido por token.' : ' O webhook ainda não tem token, então aceita qualquer chamada que alcance a porta.'}
    </p>

    {socio ? <form onSubmit={async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      setOcupado(true);
      try {
        await post('/autentique/config', {
          token: String(form.get('token') ?? ''),
          webhookToken: String(form.get('webhookToken') ?? '') || undefined,
          sandbox: form.get('sandbox') === 'on',
        });
        notice('Credenciais da Autentique guardadas no cofre.');
        await carregar();
      } catch (causa) { notice(causa instanceof Error ? causa.message : 'Não foi possível salvar as credenciais.'); }
      finally { setOcupado(false); }
    }}>
      <div className="form-grid">
        <label className="field"><span>Token da API *</span><input name="token" type="password" required minLength={20} autoComplete="off" placeholder="Cole o token gerado na Autentique"/>
          <small>Guardado cifrado. Não aparece mais depois de salvo.</small></label>
        <label className="field"><span>Token do webhook</span><input name="webhookToken" type="password" minLength={16} autoComplete="off" placeholder="Pelo menos 16 caracteres"/>
          <small>No plano Pro da Autentique, cadastre no cabeçalho x-webhook-token. Nos demais planos, acrescente <code>?token=SEU_TOKEN</code> ao final da URL do webhook. Sem token a rota de retorno fica aberta.</small></label>
        <label className="wf-toggle"><input type="checkbox" name="sandbox"/>Ambiente de testes</label>
      </div>
      <div className="wf-inline-actions">
        <button className="button button-primary" disabled={ocupado}>Salvar credenciais</button>
        <button type="button" className="button button-secondary" disabled={ocupado || !situacao?.configured} onClick={() => void carregar(true)}><ShieldCheck size={15}/>Testar conexão</button>
      </div>
      {situacao?.detalhe ? <p className="wf-muted" style={{ marginTop: 12 }}>{situacao.detalhe}</p> : null}
      <p className="wf-muted">URL do webhook, quando houver endereço público: <code>https://SEU-DOMINIO/api/webhooks/autentique?token=SEU_TOKEN</code>. Enquanto o sistema rodar apenas em 127.0.0.1, a Autentique não alcança essa rota e a assinatura precisa ser registrada à mão em Contratos.</p>
      <p className="wf-muted">O formato das respostas da Autentique ainda não foi conferido com credenciais reais. Teste a conexão antes de usar em produção.</p>
    </form> : <p className="wf-muted">Somente o sócio configura integrações.</p>}
  </Card>;
}
