import { useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCheck, CheckCircle2, ClipboardList, Link2, Paperclip, Phone, Search, Send, Smile, Smartphone, UserRound, X } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { DEMANDAS_ATENDIMENTO, DEPARTAMENTOS } from '../services/domain/catalogos';
import type { Entity } from '../types/domain';
import { post } from '../services/api';
import './ChatInbox.css';

type Message = { id?: string; texto?: string; autor?: string; criadoEm?: string; origem?: string; externoId?: string | null };
type Fila = 'Fila' | 'Ativos' | 'Finalizados' | 'Aguardando resposta' | 'Com tarefa' | 'Sem tarefa';
const FILAS: Fila[] = ['Fila', 'Ativos', 'Finalizados', 'Aguardando resposta', 'Com tarefa', 'Sem tarefa'];

const messagesOf = (conversation: Entity): Message[] => Array.isArray(conversation.mensagens) ? conversation.mensagens as Message[] : [];
const displayPhone = (value: unknown) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return String(value ?? '');
};
const hora = (value?: string) => value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
const texto = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export default function ChatInbox() {
  const { state, actor, execute, busy, notice } = useApp();
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [fila, setFila] = useState<Fila>('Ativos');
  const [verDeTodos, setVerDeTodos] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [painel, setPainel] = useState<'transferir' | 'finalizar' | 'tarefa' | 'vincular' | null>(null);

  const eu = actor.memberId || actor.id;
  const atendimentoDe = (conversaId: string) => state.atendimentos.find(item => item.conversaId === conversaId && item.status !== 'Finalizado');
  const tarefasDe = (conversaId: string) => state.tarefas.filter(item => item.conversaId === conversaId);

  const naFila = (conversa: Entity, alvo: Fila) => {
    const atendimento = atendimentoDe(conversa.id);
    if (alvo === 'Fila') return !atendimento || atendimento.status === 'Fila';
    if (alvo === 'Ativos') return atendimento?.status === 'Em atendimento';
    if (alvo === 'Aguardando resposta') return atendimento?.status === 'Aguardando resposta';
    if (alvo === 'Finalizados') return !atendimento && state.atendimentos.some(item => item.conversaId === conversa.id);
    if (alvo === 'Com tarefa') return tarefasDe(conversa.id).length > 0;
    return tarefasDe(conversa.id).length === 0;
  };
  const minha = (conversa: Entity) => {
    const atendimento = atendimentoDe(conversa.id);
    return !atendimento || !atendimento.responsavelId || atendimento.responsavelId === eu;
  };
  const contagem = (alvo: Fila) => state.conversas.filter(item => naFila(item, alvo) && (verDeTodos || minha(item))).length;

  const lista = useMemo(() => state.conversas
    .filter(item => naFila(item, fila))
    .filter(item => verDeTodos || minha(item))
    .filter(item => {
      const busca = query.trim().toLowerCase();
      if (!busca) return true;
      return [item.telefone, item.nome, item.ultimaMensagem].some(campo => String(campo ?? '').toLowerCase().includes(busca));
    })
    .sort((a, b) => String(b.ultimaInteracaoEm ?? b.updatedAt).localeCompare(String(a.ultimaInteracaoEm ?? a.updatedAt))),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [state.conversas, state.atendimentos, state.tarefas, fila, query, verDeTodos, eu]);

  const selected = state.conversas.find(item => item.id === selectedId) ?? lista[0];
  const atendimento = selected ? atendimentoDe(selected.id) : undefined;
  const cliente = selected ? state.clientes.find(item => item.id === selected.clienteId) : undefined;
  const responsavel = atendimento ? state.equipe.find(item => item.id === atendimento.responsavelId) : undefined;
  const emAndamento = atendimento?.status === 'Em atendimento' || atendimento?.status === 'Aguardando resposta';

  const rodar = async (acao: () => Promise<void>, mensagem: string) => {
    try { await acao(); setPainel(null); notice(mensagem); }
    catch (cause) { notice(cause instanceof Error ? cause.message : 'Não foi possível concluir a ação.'); }
  };

  const enviar = async () => {
    const conteudo = draft.trim();
    if (!conteudo || !selected || sending) return;
    if (!emAndamento) { notice('Inicie um atendimento antes de responder.'); return; }
    setSending(true);
    try { await post('/whatsapp/send', { telefone: String(selected.telefone), text: conteudo }); setDraft(''); }
    catch (cause) { notice(cause instanceof Error ? cause.message : 'Não foi possível enviar a mensagem.'); }
    finally { setSending(false); }
  };

  return <section className="chat-inbox">
    <aside className="chat-sidebar">
      <div className="chat-sidebar-head"><strong>Atendimento</strong>
        <label className="chat-toggle"><input type="checkbox" checked={verDeTodos} onChange={event => setVerDeTodos(event.target.checked)}/> Ver de todos</label>
      </div>
      <label className="chat-search"><Search size={16}/><input aria-label="Pesquisar conversas" placeholder="Buscar por nome, telefone ou mensagem" value={query} onChange={event => setQuery(event.target.value)}/></label>
      <div className="chat-filter" role="tablist">{FILAS.map(item => {
        const total = contagem(item);
        return <button key={item} role="tab" aria-selected={fila === item} className={fila === item ? 'active' : ''} onClick={() => setFila(item)}>{item}{total ? <em>{total}</em> : null}</button>;
      })}</div>
      <div className="chat-list">{lista.length ? lista.map(item => {
        const ultima = messagesOf(item).at(-1);
        const aberto = atendimentoDe(item.id);
        const naoLidas = messagesOf(item).filter(message => message.autor === 'cliente').length && !aberto;
        return <button key={item.id} className={'chat-list-item ' + (selected?.id === item.id ? 'selected' : '')} onClick={() => { setSelectedId(item.id); setPainel(null); }}>
          <span className="chat-avatar"><UserRound size={18}/></span>
          <span className="chat-list-copy">
            <strong>{texto(item.nome) || displayPhone(item.telefone)}</strong>
            <small>{texto(ultima?.texto) || 'Nenhuma mensagem'}</small>
            <span className="chat-tags">
              <i className={'chat-tag vinculo-' + String(item.vinculo ?? 'Não identificado').toLowerCase().replace(/\s/g, '-')}>{texto(item.vinculo) || 'Não identificado'}</i>
              {tarefasDe(item.id).length ? <i className="chat-tag com-tarefa">Com tarefa</i> : null}
              {aberto?.departamento ? <i className="chat-tag">{String(aberto.departamento)}</i> : null}
            </span>
          </span>
          <span className="chat-list-meta"><small>{hora(String(item.ultimaInteracaoEm ?? ultima?.criadoEm ?? ''))}</small>{naoLidas ? <i/> : null}</span>
        </button>;
      }) : <p className="chat-list-empty">Nenhuma conversa nesta fila.</p>}</div>
    </aside>

    <main className="chat-main">{selected ? <>
      <header className="chat-main-head">
        <span className="chat-avatar"><UserRound size={18}/></span>
        <div>
          <strong>{texto(cliente?.razaoSocial) || texto(cliente?.nome) || texto(selected.nome) || displayPhone(selected.telefone)}</strong>
          <small>{texto(selected.nome) ? `${texto(selected.nome)} · ` : ''}{displayPhone(selected.telefone)}{responsavel ? ` · Atend: ${texto(responsavel.nome)}` : atendimento ? ' · Na fila' : ' · Sem atendimento aberto'}</small>
        </div>
        <div className="chat-head-actions">
          {emAndamento ? <>
            <button type="button" onClick={() => setPainel('transferir')} disabled={busy}><ArrowRightLeft size={16}/>Transferir</button>
            <button type="button" onClick={() => setPainel('tarefa')} disabled={busy}><ClipboardList size={16}/>Criar tarefa</button>
            <button type="button" onClick={() => setPainel('finalizar')} disabled={busy}><CheckCircle2 size={16}/>Finalizar</button>
          </> : <button type="button" className="primary" disabled={busy} onClick={() => void rodar(() => execute({ type: 'openService', data: { conversaId: selected.id } }), 'Atendimento aberto.')}>Iniciar atendimento</button>}
          {!selected.clienteId ? <button type="button" onClick={() => setPainel('vincular')} disabled={busy}><Link2 size={16}/>Vincular cliente</button> : null}
        </div>
      </header>

      <div className="chat-body">
        <div className="chat-messages">{messagesOf(selected).map((message, index) => <div key={message.id ?? `${index}`} className={'chat-bubble ' + (message.autor === 'cliente' ? 'incoming' : 'outgoing')}>
          {message.autor !== 'cliente' && message.origem === 'Dispositivo externo' ? <em className="chat-origin"><Smartphone size={12}/> Dispositivo externo</em> : null}
          <span>{message.texto}</span>
          <small>{hora(message.criadoEm)}{message.autor !== 'cliente' && <CheckCheck size={14}/>}</small>
        </div>)}
        {state.atendimentos.filter(item => item.conversaId === selected.id && item.status === 'Finalizado').map(item => <p key={item.id} className="chat-system">
          Atendimento encerrado em {new Date(String(item.encerradoEm)).toLocaleString('pt-BR')} · {String(item.demanda)}
        </p>)}
        </div>

        <aside className="chat-contact">
          <h4>Contato</h4>
          <dl>
            <dt>Telefone</dt><dd>{displayPhone(selected.telefone)}</dd>
            <dt>Vínculo</dt><dd>{texto(selected.vinculo) || 'Não identificado'}</dd>
            {cliente ? <><dt>Cliente</dt><dd>{texto(cliente.razaoSocial) || texto(cliente.nome)}</dd>
              <dt>CNPJ</dt><dd>{texto(cliente.cnpj) || 'Não informado'}</dd>
              <dt>Regime</dt><dd>{texto(cliente.regime) || 'Não informado'}</dd>
              <dt>Plano</dt><dd>{texto(cliente.plano) || 'Não informado'}</dd>
              <dt>Situação</dt><dd>{texto(cliente.status)}</dd>
              <dt>Entrada</dt><dd>{texto(cliente.dataEntrada) || 'Não informada'}</dd></> : null}
          </dl>
          <p className="chat-contact-note">Regime, plano e responsável vêm do cadastro do cliente. Etiqueta livre serve só para o que não cabe em campo.</p>
          {tarefasDe(selected.id).length ? <><h4>Tarefas desta conversa</h4><ul className="chat-task-list">{tarefasDe(selected.id).map(item => <li key={item.id}><strong>{texto(item.nome)}</strong><small>{texto(item.status)} · prazo {texto(item.prazo)}</small></li>)}</ul></> : null}
        </aside>
      </div>

      {painel ? <div className="chat-panel">
        <div className="chat-panel-head"><strong>{painel === 'transferir' ? 'Transferir atendimento' : painel === 'finalizar' ? 'Finalizar atendimento' : painel === 'tarefa' ? 'Criar tarefa a partir da conversa' : 'Vincular a um cliente'}</strong><button type="button" aria-label="Fechar" onClick={() => setPainel(null)}><X size={16}/></button></div>

        {painel === 'transferir' ? <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void rodar(() => execute({ type: 'transferService', id: atendimento!.id, data: { responsavelId: String(form.get('responsavelId') ?? ''), departamento: String(form.get('departamento') ?? ''), motivo: String(form.get('motivo') ?? '') } }), 'Atendimento transferido.'); }}>
          <label>Para a pessoa<select name="responsavelId" defaultValue=""><option value="">Manter sem responsável</option>{state.equipe.map(item => <option key={item.id} value={item.id}>{texto(item.nome)}</option>)}</select></label>
          <label>Para o departamento<select name="departamento" defaultValue=""><option value="">Manter o departamento atual</option>{DEPARTAMENTOS.map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Motivo<input name="motivo" placeholder="Por que está repassando"/></label>
          <p className="chat-panel-note">Informe a pessoa, o departamento, ou os dois. Sem responsável, o atendimento volta para a fila do departamento.</p>
          <button className="primary" disabled={busy}>Transferir</button>
        </form> : null}

        {painel === 'finalizar' ? <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void rodar(() => execute({ type: 'closeService', id: atendimento!.id, data: { demanda: String(form.get('demanda') ?? ''), motivoEncerramento: String(form.get('motivoEncerramento') ?? '') } }), 'Atendimento finalizado.'); }}>
          <label>Demanda tratada<select name="demanda" required defaultValue="">
            <option value="" disabled>Classifique o atendimento</option>
            {DEMANDAS_ATENDIMENTO.map(item => <option key={item}>{item}</option>)}
          </select></label>
          <label>Motivo do encerramento<textarea name="motivoEncerramento" required rows={3} placeholder="O que foi resolvido ou por que está sendo encerrado"/></label>
          <p className="chat-panel-note">Depois de finalizar, a resposta fica bloqueada até alguém iniciar um novo atendimento. Use Sem demanda quando não houver solicitação.</p>
          <button className="primary" disabled={busy}>Finalizar atendimento</button>
        </form> : null}

        {painel === 'tarefa' ? <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const ultima = messagesOf(selected).at(-1);
          void rodar(() => execute({ type: 'messageToTask', data: {
            clienteId: String(selected.clienteId ?? ''), conversaId: selected.id, atendimentoId: atendimento?.id ?? '',
            mensagemId: ultima?.id ?? '', telefone: String(selected.telefone), mensagem: texto(ultima?.texto) || 'Demanda registrada pelo atendimento',
            nome: String(form.get('nome') ?? ''), departamento: String(form.get('departamento') ?? ''), responsavelId: String(form.get('responsavelId') ?? ''),
            prazo: String(form.get('prazo') ?? ''), prioridade: String(form.get('prioridade') ?? ''), competencia: String(form.get('competencia') ?? ''),
            tipoDemanda: String(form.get('tipoDemanda') ?? ''),
          } }), 'Tarefa criada e vinculada à conversa.'); }}>
          {!selected.clienteId ? <p className="chat-panel-note aviso">Vincule a conversa a um cliente antes de criar a tarefa.</p> : null}
          <label>Título<input name="nome" required defaultValue={texto(messagesOf(selected).at(-1)?.texto).slice(0, 60)}/></label>
          <label>Tipo de demanda<select name="tipoDemanda" defaultValue="Dúvida geral">{DEMANDAS_ATENDIMENTO.map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Departamento<select name="departamento" required defaultValue="Administrativo">{DEPARTAMENTOS.map(item => <option key={item}>{item}</option>)}</select></label>
          <label>Responsável<select name="responsavelId" required defaultValue={eu}>{state.equipe.map(item => <option key={item.id} value={item.id}>{texto(item.nome)}</option>)}</select></label>
          <label>Prazo<input name="prazo" type="date" required defaultValue={new Date().toISOString().slice(0, 10)}/></label>
          <label>Competência<input name="competencia" type="month" defaultValue={new Date().toISOString().slice(0, 7)}/></label>
          <label>Prioridade<select name="prioridade" defaultValue="Normal"><option>Baixa</option><option>Normal</option><option>Alta</option><option>Urgente</option></select></label>
          <p className="chat-panel-note">A última mensagem da conversa fica guardada na tarefa como evidência.</p>
          <button className="primary" disabled={busy || !selected.clienteId}>Criar tarefa</button>
        </form> : null}

        {painel === 'vincular' ? <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const clienteId = String(form.get('clienteId') ?? '');
          void rodar(() => execute({ type: 'save', collection: 'conversas', id: selected.id, data: { clienteId, vinculo: clienteId ? 'Cliente' : 'Não cliente', nome: String(form.get('nome') ?? '') } }), 'Conversa vinculada.'); }}>
          <label>Cliente<select name="clienteId" defaultValue=""><option value="">Não é cliente</option>{state.clientes.map(item => <option key={item.id} value={item.id}>{texto(item.razaoSocial) || texto(item.nome)}</option>)}</select></label>
          <label>Nome do contato<input name="nome" defaultValue={texto(selected.nome)}/></label>
          <button className="primary" disabled={busy}>Salvar vínculo</button>
        </form> : null}
      </div> : null}

      <div className="chat-composer">
        {emAndamento ? <>
          <button type="button" aria-label="Emoji"><Smile size={20}/></button>
          <button type="button" aria-label="Anexar arquivo"><Paperclip size={19}/></button>
          <input placeholder="Digite uma mensagem" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void enviar(); }}/>
          <button type="button" className="send-button" aria-label="Enviar" disabled={sending || !draft.trim()} onClick={() => void enviar()}><Send size={18}/></button>
        </> : <p className="chat-locked"><Phone size={15}/> Este atendimento não está em andamento. Inicie um atendimento para responder.</p>}
      </div>
    </> : <div className="chat-empty"><UserRound size={38}/><h3>Selecione uma conversa</h3><p>As mensagens recebidas pelo WhatsApp aparecem aqui, separadas por fila.</p></div>}</main>
  </section>;
}
