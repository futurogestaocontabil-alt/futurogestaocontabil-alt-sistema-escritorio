import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, Building2, CalendarCheck2, ChevronRight, CircleDollarSign, ClipboardList, FileArchive, FileText, LayoutDashboard, LogOut, Menu, MessageCircle, Settings2, ShieldCheck, Users, X, Landmark } from 'lucide-react';
import AppProvider from './components/AppProvider';
import { Card, EmptyState, PageHeader, Badge } from './components/ui';
import ResourceTable from './components/ResourceTable';
import ClientPortfolioBI from './components/ClientPortfolioBI';
import FinanceDashboard from './components/FinanceDashboard';
import WhatsAppConnection from './components/WhatsAppConnection';
import ChatInbox from './components/ChatInbox';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import CrmPage from './pages/CrmPage';
import ProcessesPage from './pages/ProcessesPage';
import { api } from './services/api';
import { useApp } from './hooks/useApp';
import { schemas } from './services/resourceSchema';
import { entityName, text } from './utils/records';
import type { Actor, AppState, CollectionName } from './types/domain';

interface SessionResponse { configured: boolean; actor: Actor | null; mode: 'local' }

const navigation = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/crm', label: 'CRM', icon: Users },
  { path: '/atendimento', label: 'Atendimento', icon: MessageCircle },
  { path: '/clientes', label: 'Clientes', icon: BriefcaseBusiness },
  { path: '/legalizacao', label: 'Legalização', icon: ShieldCheck },
  { path: '/tarefas', label: 'Tarefas', icon: ClipboardList },
  { path: '/financeiro', label: 'Financeiro', icon: CircleDollarSign },
  { path: '/contabil', label: 'Contábil', icon: Landmark },
  { path: '/portfolio', label: 'Portfólio de serviços', icon: FileText },
  { path: '/escritorio', label: 'Escritório', icon: Building2 },
  { path: '/documentos', label: 'Documentos', icon: FileArchive },
  { path: '/configuracoes', label: 'Configurações', icon: Settings2 },
] as const;

function LoadingScreen() {
  return <div className="loading-screen"><img src="/brand/Logo.png" alt="Futuro Contabilidade Digital"/><span className="loading-mark"/><p>Preparando sua plataforma…</p></div>;
}

function Shell({ children }: { children: ReactNode }) {
  const { actor, logout, state } = useApp();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [location.pathname]);
  const firstName = text(actor.nome).split(' ')[0] || 'Equipe';
  const initials = text(actor.nome).split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'F';
  return <div className="app-shell">
    <div className={'mobile-overlay '+(open?'is-open':'')} onClick={() => setOpen(false)}/>
    <aside className={'sidebar '+(open?'is-open':'')}>
      <div className="sidebar-brand"><img src="/brand/Logo.png" alt="Futuro Contabilidade Digital"/><button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Fechar menu"><X size={18}/></button></div>
      <div className="sidebar-context"><span className="context-dot"/> <span>Futuro Contabilidade Digital</span></div>
      <nav className="main-nav" aria-label="Navegação principal">{navigation.map(item => { const Icon = item.icon; return <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon size={18}/><span>{item.label}</span>{item.path==='/tarefas'&&state.tarefas.filter(task=>!['Concluída','Concluído'].includes(text(task.status))).length>0?<em>{state.tarefas.filter(task=>!['Concluída','Concluído'].includes(text(task.status))).length}</em>:null}</NavLink>; })}</nav>
      <div className="sidebar-footer"><button className="profile-mini" onClick={() => navigate('/escritorio?aba=equipe')}><span className="avatar">{initials}</span><span><strong>{firstName}</strong><small>{text(actor.papel) || 'Acesso interno'}</small></span><ChevronRight size={15}/></button><button className="logout-link" onClick={() => void logout()}><LogOut size={16}/>Sair da plataforma</button></div>
    </aside>
    <main className="main-area"><header className="topbar"><button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={21}/></button><div className="breadcrumb"><span>Plataforma Futuro</span><ChevronRight size={14}/><strong>{navigation.find(item => item.path===location.pathname)?.label || 'Visão geral'}</strong></div><div className="topbar-actions"><span className="topbar-date"><CalendarCheck2 size={15}/> {new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium'}).format(new Date())}</span><span className="topbar-avatar">{initials}</span></div></header><div className="page-content">{children}</div></main>
  </div>;
}

function ClientsPage() {
  const location = useLocation();
  return <><PageHeader eyebrow="CARTEIRA E INTELIGÊNCIA" title="Clientes" description="Tabela, enquadramento, distribuição geográfica, entradas e acompanhamento dos primeiros 90 dias."/>{new URLSearchParams(location.search).get('novo') === '1' ? <ResourceTable collection="clientes" createOnMount/> : <ClientPortfolioBI/>}</>;
}

function FinancePage() {
  return <><PageHeader eyebrow="BI FINANCEIRO" title="Financeiro" description="Receita recorrente, cobranças, inadimplência, custos e resultado do escritório em uma única visão."/><FinanceDashboard/></>;
}

function AccountingPage() {
  const { state, busy, execute, uploadDocument, notice } = useApp();
  const [clientId,setClientId]=useState('');
  const [version,setVersion]=useState(new Date().toISOString().slice(0,7));
  const activePlans=state.planosContabeis.filter(plan=>text(plan.status)==='Ativo');
  return <><PageHeader eyebrow="CONCILIAÇÃO E PLANO DE CONTAS" title="Contábil" description="Cada arquivo abre uma versão vinculada a uma única empresa. As contas dessa versão nunca são compartilhadas com outro cliente."/><Card><div className="card-heading"><div><span className="heading-icon gold"><FileArchive size={19}/></span><h3>Subir novo plano de contas</h3></div><Badge tone="warning">Revisão obrigatória</Badge></div><form onSubmit={event=>event.preventDefault()}><div className="form-grid"><label className="field"><span>Empresa *</span><select required value={clientId} onChange={event=>setClientId(event.target.value)}><option value="">Selecione o cliente</option>{state.clientes.map(client=><option key={client.id} value={client.id}>{entityName(client)}</option>)}</select></label><label className="field"><span>Versão ou competência *</span><input required value={version} onChange={event=>setVersion(event.target.value)} placeholder="2026-07 ou versão 1"/></label><label className="field field-wrap"><span>Arquivo do plano *</span><input type="file" accept=".pdf,.csv,.xls,.xlsx,.txt" disabled={busy||!clientId||!version.trim()} onChange={async event=>{const input=event.currentTarget;const file=input.files?.[0];if(!file)return;try{const document=await uploadDocument(file,{clienteId:clientId,departamento:'Contábil',tipo:'Plano de contas',nome:file.name});await execute({type:'save',collection:'planosContabeis',data:{clienteId:clientId,nome:file.name,versao:version.trim(),arquivoId:document.id,status:'Em análise',contasImportadas:0}});notice('Plano salvo na empresa selecionada e aberto para conferência.');}catch(error){notice(error instanceof Error?error.message:'Não foi possível salvar o plano de contas.');}finally{input.value='';}}}/><small>PDF, CSV, XLS, XLSX ou TXT, com até 10 MB.</small></label></div></form></Card><div className="stat-grid"><div className="stat-card"><span className="stat-label">Planos ativos</span><strong>{activePlans.length}</strong><small>Um plano ativo por cliente</small></div><div className="stat-card"><span className="stat-label">Contas cadastradas</span><strong>{state.contasContabeis.length}</strong><small>Isoladas por cliente e versão</small></div><div className="stat-card"><span className="stat-label">Versões em análise</span><strong>{state.planosContabeis.filter(plan=>text(plan.status)==='Em análise').length}</strong><small>Exigem conferência antes de ativar</small></div><div className="stat-card"><span className="stat-label">Próxima etapa</span><strong>Importar</strong><small>Extratos e conciliação serão adicionados após o plano</small></div></div><ResourceTable collection="planosContabeis"/><ResourceTable collection="contasContabeis"/></>;
}

function AtendimentoPage() {
  const { reload } = useApp();
  useEffect(() => { void reload(); const timer = window.setInterval(() => { void reload(); }, 3000); return () => window.clearInterval(timer); }, [reload]);
  return <><PageHeader eyebrow="ATENDIMENTO" title="Caixa de entrada" description="Organize as conversas do WhatsApp e transforme solicitações em tarefas."/><ChatInbox/></>;
}

function DocumentsPage() {
  const { state, uploadDocument, notice } = useApp();
  return <><PageHeader eyebrow="CENTRAL DE ARQUIVOS" title="Documentos" description="Arquivos recebidos por cliente, tipo e competência. O armazenamento fica privado."/><Card><label className="upload-zone"><FileArchive size={25}/><strong>Receber documento</strong><span>Até 10 MB. O arquivo será vinculado ao cliente depois do upload.</span><input type="file" onChange={async event => { const file=event.target.files?.[0]; if(!file) return; try { await uploadDocument(file,{tipo:'Documento',departamento:'Administrativo'}); } catch(error){ notice(error instanceof Error?error.message:'Não foi possível receber o arquivo.'); } finally { event.currentTarget.value=''; } }}/></label></Card>{state.documentos.length?<ResourceTable collection="documentos" readOnly/>:<EmptyState title="Nenhum documento recebido" description="Uploads e comprovantes vinculados às tarefas aparecerão aqui."/>}</>;
}

function OfficePage() {
  return <><PageHeader eyebrow="ESCRITÓRIO" title="Estrutura do escritório" description="Equipe, sistemas, metas e desenvolvimento ficam organizados neste espaço."/><div className="quick-cards"><NavLink to="/escritorio/equipe"><Users size={21}/><strong>Equipe</strong><span>Responsabilidades e carga</span></NavLink><NavLink to="/escritorio/sistemas"><Settings2 size={21}/><strong>Sistemas</strong><span>Ferramentas e custos</span></NavLink><NavLink to="/escritorio/metas"><BarChart3 size={21}/><strong>Metas e OKRs</strong><span>Objetivos em acompanhamento</span></NavLink><NavLink to="/escritorio/cargos"><BriefcaseBusiness size={21}/><strong>Cargos e salários</strong><span>Critérios de crescimento</span></NavLink></div></>;
}

function ConfigPage() {
  const { actor } = useApp();
  return <><PageHeader eyebrow="ADMINISTRAÇÃO" title="Configurações" description="Parâmetros, integrações, roteiros e acessos que orientam a operação."/><WhatsAppConnection/><div className="settings-grid"><NavLink to="/configuracoes/instrucoes"><FileText size={21}/><strong>Processos e instruções</strong><span>POP, scripts e modelos de mensagem</span></NavLink><NavLink to="/configuracoes/acessos"><ShieldCheck size={21}/><strong>Usuários e permissões</strong><span>Perfis, departamentos e acesso por função</span></NavLink><div className="settings-note"><Badge tone="success">Sessão protegida</Badge><h3>{actor.nome}</h3><p>O cofre cifra segredos localmente. A chave fica na pasta de dados privada e deve entrar no backup protegido.</p></div></div></>;
}

function GenericResource({ collection, title, description }: { collection: CollectionName; title?: string; description?: string }) {
  const schema = schemas[collection];
  return <><PageHeader eyebrow="CADASTRO" title={title || schema?.title || collection} description={description || schema?.description}/><ResourceTable collection={collection}/></>;
}

function AuthenticatedApp({ actor, state, onLogout }: { actor: Actor; state: AppState; onLogout: () => void }) {
  return <AppProvider actor={actor} initialState={state} onLogout={onLogout}><Shell><Routes>
    <Route path="/" element={<DashboardPage/>}/><Route path="/crm" element={<CrmPage/>}/><Route path="/atendimento" element={<AtendimentoPage/>}/><Route path="/clientes" element={<ClientsPage/>}/><Route path="/legalizacao" element={<ProcessesPage/>}/><Route path="/tarefas" element={<TasksPage/>}/><Route path="/financeiro" element={<FinancePage/>}/><Route path="/contabil" element={<AccountingPage/>}/><Route path="/portfolio" element={<GenericResource collection="servicos"/>}/><Route path="/escritorio" element={<OfficePage/>}/><Route path="/escritorio/equipe" element={<GenericResource collection="equipe"/>}/><Route path="/escritorio/sistemas" element={<GenericResource collection="sistemas"/>}/><Route path="/escritorio/metas" element={<GenericResource collection="metas"/>}/><Route path="/escritorio/cargos" element={<GenericResource collection="cargos"/>}/><Route path="/documentos" element={<DocumentsPage/>}/><Route path="/configuracoes" element={<ConfigPage/>}/><Route path="/configuracoes/instrucoes" element={<GenericResource collection="configuracoes"/>}/><Route path="/configuracoes/acessos" element={<GenericResource collection="equipe" title="Usuários e permissões" description="A criação de contas e a alteração de permissões exigem acesso de sócio."/>}/><Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></Shell></AppProvider>;
}

export default function App() {
  const [loading, setLoading] = useState(true); const [session, setSession] = useState<SessionResponse | null>(null); const [actor, setActor] = useState<Actor | null>(null); const [state, setState] = useState<AppState | null>(null);
  const load = async () => { try { const result=await api<SessionResponse>('/session'); setSession(result); if(result.actor){const current=await api<{actor:Actor;state:AppState}>('/state');setActor(current.actor);setState(current.state);} } catch { setSession({configured:false,actor:null,mode:'local'}); } finally { setLoading(false); } };
  useEffect(()=>{void load();},[]);
  if(loading||!session) return <LoadingScreen/>;
  if(!actor||!state) return <BrowserRouter><AuthPage configured={session.configured} onAuthenticated={(nextActor,nextState)=>{setActor(nextActor);setState(nextState);setSession({configured:true,actor:nextActor,mode:'local'});}}/></BrowserRouter>;
  return <BrowserRouter><AuthenticatedApp actor={actor} state={state} onLogout={()=>{setActor(null);setState(null);setSession({...session,actor:null});}}/></BrowserRouter>;
}
