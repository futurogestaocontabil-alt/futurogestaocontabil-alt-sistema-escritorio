import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, QrCode, RefreshCw, Settings2, Smartphone } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../hooks/useApp';
import { Badge, Button, Card } from './ui';

interface WhatsAppStatus { configured:boolean; connected:boolean; smartphoneConnected:boolean; detail?:string }
interface QrResponse { qrCode:string; expiresInSeconds:number }

export default function WhatsAppConnection() {
  const { actor, notice } = useApp();
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [expired, setExpired] = useState(false);
  const [attempts, setAttempts] = useState(0);

  async function loadStatus(silent = false) {
    try { const result = await api<WhatsAppStatus>('/whatsapp/status'); setStatus(result); if (result.connected) { setQrCode(''); setExpired(false); } return result; }
    catch (error) { if (!silent) notice(error instanceof Error ? error.message : 'Não foi possível consultar o WhatsApp.'); return null; }
    finally { setLoading(false); }
  }

  async function requestQr(reset = false) {
    setLoading(true);
    try {
      const result = await api<QrResponse>('/whatsapp/qr', { method: 'POST', body: '{}' });
      setQrCode(result.qrCode);setAttempts(previous => reset ? 1 : previous + 1);setExpired(false);
    } catch (error) { notice(error instanceof Error ? error.message : 'Não foi possível gerar o QR Code.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadStatus(); }, []);
  useEffect(() => {
    if (!qrCode || status?.connected) return;
    const timer = window.setTimeout(async () => {
      const current = await loadStatus(true);
      if (current?.connected) { notice('WhatsApp conectado com sucesso.'); return; }
      if (attempts < 3) await requestQr();
      else { setQrCode('');setExpired(true); }
    }, 15_000);
    return () => window.clearTimeout(timer);
  }, [qrCode, attempts, status?.connected]);

  async function saveConfiguration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await api('/whatsapp/config', { method: 'POST', body: JSON.stringify({ provider:'evolution', baseUrl: form.get('baseUrl'), instanceName: form.get('instanceName'), apiKey: form.get('apiKey') }) });
      setShowConfig(false);setStatus({ configured:true, connected:false, smartphoneConnected:false });notice('Credenciais protegidas no cofre. Agora gere o QR Code.');
    } catch (error) { notice(error instanceof Error ? error.message : 'Não foi possível salvar a configuração.'); }
    finally { setSaving(false); }
  }

  const connected = status?.connected === true;
  return <>
    <Card><div className="whatsapp-connection-head"><div><span className={`heading-icon ${connected ? '' : 'gold'}`}>{connected ? <CheckCircle2 size={20}/> : <Smartphone size={20}/>}</span><div><h3>WhatsApp do escritório</h3><p>Conexão por QR Code usando a Evolution API local.</p></div></div><div className="whatsapp-head-actions"><Badge tone={connected ? 'success' : status?.configured ? 'warning' : 'neutral'}>{loading ? 'Verificando' : connected ? 'Conectado' : status?.configured ? 'Aguardando leitura' : 'Não configurado'}</Badge>{actor.papel === 'socio' ? <Button variant="secondary" size="sm" onClick={() => setShowConfig(value => !value)}><Settings2 size={14}/>{status?.configured ? 'Alterar credenciais' : 'Configurar'}</Button> : null}</div></div>
      {showConfig ? <form className="whatsapp-config" onSubmit={saveConfiguration}><div className="whatsapp-config-intro"><strong>Configuração da Evolution API</strong><span>Elas serão cifradas no cofre local e nunca retornarão para o navegador.</span></div><div className="form-grid"><label className="field"><span>Nome da instância</span><input name="instanceName" autoComplete="off" required minLength={4}/></label><label className="field"><span>URL base da API</span><input name="baseUrl" type="url" autoComplete="new-password" required minLength={4}/></label><label className="field form-span"><span>Chave da API</span><input name="apiKey" type="password" autoComplete="new-password" required minLength={4}/></label></div><div className="whatsapp-config-actions"><Button type="button" variant="secondary" onClick={() => setShowConfig(false)}>Cancelar</Button><Button disabled={saving}>{saving ? 'Protegendo credenciais...' : 'Salvar configuração'}</Button></div></form> : null}
      {status?.configured && !showConfig ? <div className="whatsapp-connect-body"><div className="whatsapp-connect-copy"><span className="eyebrow">CONEXÃO DO APARELHO</span><h3>{connected ? 'Número conectado ao atendimento' : 'Leia o QR Code com o celular do escritório'}</h3>{connected ? <><p>O aparelho está vinculado à instância. Use Atualizar status se o telefone perder a conexão.</p><Button variant="secondary" onClick={() => void loadStatus()} disabled={loading}><RefreshCw size={15}/>Atualizar status</Button></> : <><ol><li>Abra o WhatsApp Business no celular.</li><li>Acesse Aparelhos conectados e toque em Conectar aparelho.</li><li>Leia o QR Code exibido ao lado.</li></ol>{!qrCode ? <Button onClick={() => void requestQr(true)} disabled={loading}><QrCode size={16}/>{expired ? 'Gerar novo QR Code' : 'Gerar QR Code'}</Button> : <p className="whatsapp-refresh-note"><RefreshCw size={14}/>Atualização automática {attempts} de 3. O código muda a cada 15 segundos.</p>}</>}</div><div className={`whatsapp-qr-panel ${connected ? 'is-connected' : ''}`}>{connected ? <><CheckCircle2 size={44}/><strong>WhatsApp conectado</strong><span>{status.smartphoneConnected ? 'Celular disponível' : 'Confira a conexão do celular'}</span></> : qrCode ? <><img src={qrCode} alt="QR Code para conectar o WhatsApp"/><span>Leia antes que o código seja renovado</span></> : <><QrCode size={48}/><strong>{expired ? 'QR Code expirado' : 'QR Code ainda não gerado'}</strong><span>Use o botão ao lado para iniciar</span></>}</div></div> : null}
    </Card>
    <div className="whatsapp-safety-note"><strong>Uso individual de atendimento</strong><span>A tela foi preparada para conversas com clientes conhecidos. Ela não ativa disparos em massa. A sincronização das mensagens exige webhook HTTPS quando a plataforma for publicada.</span></div>
  </>;
}

