/**
 * Servidor de demonstração que roda dentro do navegador.
 *
 * Existe para responder uma pergunta prática: dar um endereço onde a equipe
 * consegue clicar no sistema e dizer se o processo está certo, sem depender de
 * hospedagem contratada. Não é o sistema em produção e não substitui nada.
 *
 * Duas regras o mantêm honesto:
 *
 * 1. As regras de negócio são exatamente as mesmas do servidor real. Este
 *    arquivo chama `runCommand` e `filterStateForActor` do mesmo módulo que
 *    `server/index.ts` importa. Uma regra que bloqueia aqui bloqueia lá, e o
 *    que a equipe validar clicando vale para o sistema de verdade.
 *
 * 2. Nada sai do navegador de quem abriu. Não há servidor, não há banco
 *    compartilhado e não há rede. O estado vive na memória da aba e no
 *    `sessionStorage`, e some quando a aba é fechada.
 *
 * O que depende de serviço externo (WhatsApp, Autentique, consulta de CNPJ)
 * responde com uma recusa explicando o motivo, em vez de fingir que funcionou.
 */
import { createInitialState, filterStateForActor, runCommand } from '../domain';
import type { Actor, AppState, Command, Entity } from '../../types/domain';
import { COMANDOS_DEMONSTRACAO } from './dados';

const CHAVE = 'futuro:demonstracao';

export class DemoError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'DemoError'; }
}

const ATOR: Actor = {
  id: 'demonstracao',
  memberId: 'gilmar',
  nome: 'Visitante da demonstração',
  email: 'demonstracao@example.test',
  papel: 'socio',
  departamentos: ['Fiscal', 'Pessoal', 'Contábil', 'Paralegal e Legalização', 'Financeiro'],
};

/** Monta a carteira fictícia passando cada registro pelo motor de regras. */
function montarEstado(): AppState {
  let estado = createInitialState('demonstracao');
  for (const comando of COMANDOS_DEMONSTRACAO) {
    // Um comando recusado significa regra nova que a carteira fictícia não
    // respeita. Falhar aqui é melhor do que abrir a demonstração incompleta
    // sem ninguém perceber.
    estado = runCommand(estado, comando, ATOR);
  }
  return estado;
}

let estadoAtual: AppState | null = null;
let autenticado = false;

const guardar = () => {
  try { sessionStorage.setItem(CHAVE, JSON.stringify({ estado: estadoAtual, autenticado })); }
  catch { /* aba anônima ou armazenamento bloqueado: a demonstração segue só em memória */ }
};

const recuperar = (): boolean => {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    if (!bruto) return false;
    const salvo = JSON.parse(bruto) as { estado: AppState; autenticado: boolean };
    if (!salvo?.estado?.meta) return false;
    estadoAtual = salvo.estado;
    autenticado = salvo.autenticado === true;
    return true;
  } catch { return false; }
};

/**
 * Restaura o que foi salvo, ou monta a carteira do zero. Precisa rodar antes de
 * qualquer rota, inclusive `/session`, que é a primeira que a interface chama:
 * sem isso, quem recarrega a página cai de volta na tela de entrada mesmo tendo
 * entrado segundos antes.
 */
function estado(): AppState {
  if (!estadoAtual && !recuperar()) { estadoAtual = montarEstado(); guardar(); }
  return estadoAtual as AppState;
}

/** Reconstrói a carteira fictícia do zero, para quem quer recomeçar o teste. */
export function reiniciarDemonstracao(): void {
  estadoAtual = montarEstado();
  guardar();
}

const semServico = (nome: string) =>
  new DemoError(`${nome} não funciona na demonstração, porque depende de credencial e de servidor próprio. No sistema instalado essa integração funciona normalmente.`, 503);

const respostaComEstado = () => ({ actor: ATOR, state: filterStateForActor(estado(), ATOR) });

/**
 * Espelha as rotas de `server/index.ts` que a interface consome.
 * Recebe o caminho já sem o prefixo `/api`.
 */
export async function responder<T>(caminho: string, opcoes: RequestInit): Promise<T> {
  const metodo = (opcoes.method ?? 'GET').toUpperCase();
  const rota = caminho.split('?')[0];
  const corpo = typeof opcoes.body === 'string' && opcoes.body ? JSON.parse(opcoes.body) as Record<string, unknown> : {};
  estado();
  // Um respiro curto para a interface exibir os estados de carregamento como
  // exibiria com um servidor real.
  await new Promise(resolve => setTimeout(resolve, 90));

  if (rota === '/session') return { configured: true, actor: autenticado ? ATOR : null, mode: 'local' } as T;

  // A carteira precisa existir antes de gravar, senão o `sessionStorage` guarda
  // um estado vazio e a sessão se perde no primeiro recarregamento de página.
  if (rota === '/setup' || rota === '/login') { estado(); autenticado = true; guardar(); return respostaComEstado() as T; }

  if (rota === '/logout') { estado(); autenticado = false; guardar(); return { ok: true } as T; }

  if (rota === '/state') return respostaComEstado() as T;

  if (rota === '/command' && metodo === 'POST') {
    const comando = corpo.command as Command;
    const esperada = (corpo.expectedVersion ?? corpo.expectedRevision) as number | undefined;
    const atual = estado();
    if (esperada !== undefined && esperada !== atual.meta.revision) {
      throw new DemoError('Os dados mudaram enquanto você editava. Recarregue e tente de novo.', 409);
    }
    try { estadoAtual = runCommand(atual, comando, ATOR); }
    catch (causa) { throw new DemoError(causa instanceof Error ? causa.message : 'Não foi possível concluir a operação.', 400); }
    guardar();
    return { state: filterStateForActor(estadoAtual, ATOR) } as T;
  }

  if (rota === '/documents' && metodo === 'POST') {
    // O arquivo em si nunca é guardado na demonstração. Só o registro, para a
    // tela de documentos mostrar o comportamento.
    const agora = new Date().toISOString();
    const documento: Entity = {
      id: crypto.randomUUID(), nome: String(corpo.name ?? 'Documento'), tipo: 'Recebido',
      clienteId: String(corpo.clientId ?? ''), departamento: String(corpo.department ?? ''),
      origem: 'Demonstração', createdAt: agora, updatedAt: agora,
    };
    const atual = estado();
    estadoAtual = { ...atual, documentos: [...atual.documentos, documento], meta: { ...atual.meta, revision: atual.meta.revision + 1 } };
    guardar();
    return { document: documento, state: filterStateForActor(estadoAtual, ATOR) } as T;
  }

  if (rota === '/whatsapp/status') return { configured: false, connected: false, smartphoneConnected: false, detail: 'Demonstração sem conexão de WhatsApp.' } as T;
  if (rota.startsWith('/whatsapp')) throw semServico('O envio pelo WhatsApp');

  if (rota === '/autentique/status') return { configured: false, webhookProtegido: false, conectado: null, detalhe: 'Demonstração sem credencial da Autentique.' } as T;
  if (rota.startsWith('/autentique')) throw semServico('A assinatura pela Autentique');

  if (rota.startsWith('/cnpj')) throw semServico('A consulta de CNPJ');

  if (rota === '/users') return { users: estado().equipe.map(pessoa => ({ id: pessoa.id, nome: pessoa.nome, email: `${pessoa.id}@example.test`, papel: pessoa.papel, departamentos: pessoa.departamentos ?? [], ativo: true, member_id: pessoa.id })) } as T;

  throw new DemoError('Esta ação não existe no ambiente de demonstração.', 404);
}
