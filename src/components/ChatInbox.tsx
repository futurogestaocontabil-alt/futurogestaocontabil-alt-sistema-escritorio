import { useMemo, useState } from 'react';
import { CheckCheck, MoreVertical, Paperclip, Search, Send, Smile, UserRound } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import type { Entity } from '../types/domain';
import { post } from '../services/api';
import './ChatInbox.css';

type Message = { id?: string; texto?: string; autor?: string; criadoEm?: string };
const messagesOf = (conversation: Entity): Message[] => Array.isArray(conversation.mensagens) ? conversation.mensagens as Message[] : [];
const displayPhone = (value: unknown) => String(value ?? '').replace('@s.whatsapp.net','');

export default function ChatInbox(){
  const { state } = useApp();
  const conversations = state.conversas;
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const selected = conversations.find(item=>item.id===selectedId) ?? conversations[0];
  const filtered = useMemo(()=>conversations.filter(item=>displayPhone(item.telefone).includes(query)),[conversations,query]);
  const sendMessage = async()=>{const text=draft.trim();if(!text||!selected||sending)return;setSending(true);try{await post('/whatsapp/send',{telefone:displayPhone(selected.telefone),text});setDraft('');}finally{setSending(false);}};
  return <section className="chat-inbox">
    <aside className="chat-sidebar">
      <div className="chat-sidebar-head"><strong>Conversas</strong><button aria-label="Mais opções"><MoreVertical size={18}/></button></div>
      <label className="chat-search"><Search size={16}/><input aria-label="Pesquisar conversas" placeholder="Pesquisar ou iniciar nova conversa" value={query} onChange={event=>setQuery(event.target.value)}/></label>
      <div className="chat-filter"><button className="active">Todas</button><button>Não lidas</button><button>Grupos</button></div>
      <div className="chat-list">{filtered.map(item=>{const last=messagesOf(item).at(-1); return <button key={item.id} className={'chat-list-item '+(selected?.id===item.id?'selected':'')} onClick={()=>setSelectedId(item.id)}><span className="chat-avatar"><UserRound size={18}/></span><span className="chat-list-copy"><strong>{displayPhone(item.telefone)}</strong><small>{last?.texto ?? 'Nenhuma mensagem'}</small></span><span className="chat-list-meta"><small>{last?.criadoEm ? new Date(last.criadoEm).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : ''}</small>{item.status==='Não iniciado'&&<i/>}</span></button>})}</div>
    </aside>
    <main className="chat-main">{selected?<><header className="chat-main-head"><span className="chat-avatar"><UserRound size={18}/></span><div><strong>{displayPhone(selected.telefone)}</strong><small>{selected.status==='Finalizado'?'Atendimento finalizado':'online recentemente'}</small></div><button aria-label="Mais opções"><MoreVertical size={19}/></button></header><div className="chat-messages">{messagesOf(selected).map(message=><div key={message.id ?? message.texto} className={'chat-bubble '+(message.autor==='cliente'?'incoming':'outgoing')}><span>{message.texto}</span><small>{message.criadoEm ? new Date(message.criadoEm).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : ''}{message.autor!=='cliente'&&<CheckCheck size={14}/>}</small></div>)}</div><div className="chat-composer"><button aria-label="Emoji"><Smile size={20}/></button><button aria-label="Anexar arquivo"><Paperclip size={19}/></button><input placeholder="Digite uma mensagem" value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')void sendMessage();}}/><button className="send-button" aria-label="Enviar" disabled={sending||!draft.trim()} onClick={()=>void sendMessage()}><Send size={18}/></button></div></>:<div className="chat-empty"><UserRound size={38}/><h3>Selecione uma conversa</h3><p>As mensagens recebidas pelo WhatsApp aparecerão aqui.</p></div>}</main>
  </section>;
}
