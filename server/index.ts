import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink, stat, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { createInitialState, runCommand, filterStateForActor } from '../src/services/domain/index';
import { mapOpenCnpj, normalizeCnpj, validCnpjFormat } from '../src/services/cnpj';
import { COMMAND_TYPES, type Actor, type AppState, type Command, type JsonValue } from '../src/types/domain';
import { ApiError, LOCAL_ORG_ID, openDatabase, readState, updateState } from './database';
import { actorFromRow, clearSession, createSession, currentAccount, decryptSecret, encryptSecret, hashPassword, loadVaultKey, verifyPassword, type AccountRow } from './auth';

const EMAIL = z.string().trim().email().max(254).transform(value => value.toLowerCase());
const PASSWORD = z.string().min(12, 'Use uma senha com pelo menos 12 caracteres.').max(256);
const NAME = z.string().trim().min(2).max(200);
const authSchema = z.object({ email: EMAIL, password: z.string().min(1).max(256) });
const setupSchema = z.object({ nome: NAME, email: EMAIL, password: PASSWORD });
const userSchema = setupSchema.extend({ papel: z.enum(['socio','operacao','administrativo','leitura']), departamentos: z.array(z.string().max(80)).max(10).default([]), memberId: z.string().max(100).optional() });
const commandSchema = z.object({ type: z.enum(COMMAND_TYPES), collection: z.string().max(80).optional(), id: z.string().max(100).optional(), data: z.record(z.string(), z.json()).optional() }).strict();
const commandBodySchema = z.object({ command: commandSchema, expectedVersion: z.number().int().nonnegative().optional(), expectedRevision: z.number().int().nonnegative().optional() });
const attachmentSchema = z.object({ name: z.string().min(1).max(250).optional(), nome: z.string().min(1).max(250).optional(), mimeType: z.string().max(150).default('application/octet-stream'), contentBase64: z.string().min(1).max(14_000_000), clientId: z.string().max(100).optional(), clienteId: z.string().max(100).optional(), tipo: z.string().min(1).max(80).default('Documento'), competencia: z.string().max(20).optional(), departamento: z.string().max(80).optional(), expectedVersion: z.number().int().nonnegative().optional() });
const vaultSchema = z.object({ name: NAME.optional(), nome: NAME.optional(), login: z.string().max(254).default(''), secret: z.string().min(1).max(20_000), url: z.string().max(500).default(''), clientId: z.string().max(100).optional(), clienteId: z.string().max(100).optional(), department: z.string().max(80).optional(), departamento: z.string().max(80).optional() });
const whatsappConfigSchema = z.object({ provider: z.literal('evolution'), baseUrl: z.string().url(), instanceName: z.string().trim().min(2).max(200).regex(/^[A-Za-z0-9_-]+$/), apiKey: z.string().trim().min(16).max(500), webhookToken: z.string().trim().min(16).max(200).optional() }).strict();
const autentiqueConfigSchema = z.object({ token: z.string().trim().min(20).max(500), webhookToken: z.string().trim().min(16).max(200).optional(), sandbox: z.boolean().default(false) }).strict();
const AUTENTIQUE_API = 'https://api.autentique.com.br/v2/graphql';
/** Situações da Autentique mapeadas para as situações do contrato no sistema. */
const AUTENTIQUE_EVENTOS: Record<string,'Assinado'|'Recusado'|'Aguardando assinatura'> = { 'signed':'Assinado', 'document.signed':'Assinado', 'finished':'Assinado', 'rejected':'Recusado', 'document.rejected':'Recusado', 'refused':'Recusado', 'viewed':'Aguardando assinatura', 'document.viewed':'Aguardando assinatura' };
interface VaultMeta { id:string; nome:string; login:string; url:string; clienteId?:string; departamento:string; createdAt:string }
interface VaultRow { id:string; ciphertext:string; metadata:VaultMeta }
interface WhatsAppCredentials { provider:'evolution'; baseUrl:string; instanceName:string; apiKey:string }
interface ServerOptions { dataDirectory?:string; staticDirectory?:string; allowedOrigins?:string[]; providerFetch?:typeof fetch }

function send(res:ServerResponse,status:number,body:unknown) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
}
async function readJson(req:IncomingMessage,limit=1_048_576):Promise<unknown> {
  if (!(req.headers['content-type']??'').startsWith('application/json')) throw new ApiError(415,'Envie os dados no formato JSON.');
  const chunks:Buffer[]=[]; let bytes=0;
  for await (const chunk of req) { const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk as string); bytes+=buffer.length; if(bytes>limit) throw new ApiError(413,'O arquivo ou solicitação ultrapassa o limite permitido.'); chunks.push(buffer); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; } catch { throw new ApiError(400,'Os dados enviados estão inválidos.'); }
}
export function normalizePhone(value:unknown) {
  const digits=String(value??'').split('@')[0].split(':')[0].replace(/\D/g,'');
  if(!digits) return '';
  if(digits.startsWith('55')&&digits.length>=12&&digits.length<=13) return digits;
  if(digits.length===10||digits.length===11) return `55${digits}`;
  return digits;
}
function canAccessVault(actor:Actor,meta?:VaultMeta) {
  if(actor.papel==='socio') return true;
  if(actor.papel!=='operacao') return false;
  return !meta || (actor.departamentos??[]).includes(meta.departamento);
}
function assertAdmin(actor:Actor) { if(actor.papel!=='socio') throw new ApiError(403,'Somente o sócio pode gerenciar os acessos.'); }
const MIMES:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.json':'application/json'};

async function acquireDataLock(directory:string):Promise<()=>Promise<void>> {
  await mkdir(directory,{recursive:true});const lockPath=path.join(directory,'server.lock');
  for(let attempt=0;attempt<2;attempt++) {
    try {await writeFile(lockPath,String(process.pid),{flag:'wx',mode:0o600});return async()=>{await unlink(lockPath).catch(()=>undefined);};}
    catch(error) {
      if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;
      const previous=Number(await readFile(lockPath,'utf8'));let alive=true;
      if(Number.isInteger(previous)&&previous>0){try{process.kill(previous,0);}catch(reason){if((reason as NodeJS.ErrnoException).code==='ESRCH')alive=false;}}
      if(alive)throw new Error('A plataforma já está usando esta pasta de dados. Abra a instância existente ou encerre-a antes de reiniciar.');
      await unlink(lockPath).catch(()=>undefined);
    }
  }
  throw new Error('Não foi possível obter acesso exclusivo aos dados locais.');
}
export async function createApp(options:ServerOptions={}) {
  const directory=options.dataDirectory??path.resolve('.local-data');
  const staticDirectory=path.resolve(options.staticDirectory??'dist');
  const releaseLock=await acquireDataLock(directory);
  let db:Awaited<ReturnType<typeof openDatabase>>;try{db=await openDatabase(directory);}catch(error){await releaseLock();throw error;}
  await db.exec('ALTER TABLE app_private.vault_secrets ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT \'{}\'');
  const secretsExist=(await db.query('SELECT id FROM app_private.vault_secrets LIMIT 1')).rows.length>0;
  if(secretsExist){try{await stat(path.join(directory,'vault.key'));}catch{await db.close();await releaseLock();throw new Error('A chave do cofre está ausente. Restaure vault.key a partir do backup antes de abrir a plataforma.');}}
  const vaultKey=await loadVaultKey(directory);
  const filesDirectory=path.join(directory,'documents');
  await mkdir(filesDirectory,{recursive:true});
  const allowedOrigins=new Set(options.allowedOrigins??['http://127.0.0.1:4317','http://localhost:4317','http://127.0.0.1:4318','http://localhost:4318']);
  const attempts=new Map<string,{count:number;reset:number}>();
  const failure=(key:string)=> { const entry=attempts.get(key); if(!entry||entry.reset<Date.now()) attempts.set(key,{count:1,reset:Date.now()+900_000}); else entry.count++; };
  const rateLimit=(key:string)=> { const entry=attempts.get(key); if(entry&&entry.reset>Date.now()&&entry.count>=10) throw new ApiError(429,'Muitas tentativas. Aguarde 15 minutos e tente novamente.'); if(attempts.size>5000) { for(const [candidate,value] of attempts) if(value.reset<Date.now()) attempts.delete(candidate); } };
  const audit=(actor:Actor|null,action:string,id?:string)=>db.query('INSERT INTO app_private.security_events(account_id,action,target_id) VALUES($1,$2,$3)',[actor?.id??null,action,id??null]);
  const providerFetch=options.providerFetch??fetch;
  const whatsappVault=async(orgId:string)=> (await db.query<VaultRow>("SELECT id,ciphertext,metadata FROM app_private.vault_secrets WHERE org_id=$1 AND metadata->>'nome'=$2 ORDER BY created_at DESC LIMIT 1",[orgId,'Evolution WhatsApp'])).rows[0];
  const whatsappCredentials=async(orgId:string):Promise<WhatsAppCredentials|null>=> {
    const row=await whatsappVault(orgId);if(!row)return null;
    try{return whatsappConfigSchema.parse(JSON.parse(decryptSecret(row.ciphertext,vaultKey,row.id))) as WhatsAppCredentials;}catch{throw new ApiError(500,'As credenciais do WhatsApp no cofre estão inválidas. Salve a configuração novamente.');}
  };
  const evolution=async(credentials:WhatsAppCredentials,endpoint:string,method:'GET'|'POST'='GET',body?:unknown)=> {
    let response:Response;
    try{response=await providerFetch(`${credentials.baseUrl.replace(/\/$/,'')}${endpoint}`,{method,headers:{Accept:'application/json','Content-Type':'application/json',apikey:credentials.apiKey},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10_000)});}catch{throw new ApiError(503,'A Evolution API não respondeu. Verifique o serviço local.');}
    const payload=await response.json().catch(()=>null) as Record<string,unknown>|null;
    if(response.status===401||response.status===403)throw new ApiError(400,'A Evolution API recusou a chave informada.');
    if(!response.ok)throw new ApiError(503,typeof payload?.message==='string'?payload.message:'Não foi possível consultar a Evolution API.');
    return payload??{};
  };
  // Um segredo por integração, guardado no cofre cifrado com o mesmo mecanismo
  // das credenciais do WhatsApp.
  const segredoDe=async(orgId:string,nome:string)=> (await db.query<VaultRow>("SELECT id,ciphertext,metadata FROM app_private.vault_secrets WHERE org_id=$1 AND metadata->>'nome'=$2 ORDER BY created_at DESC LIMIT 1",[orgId,nome])).rows[0];
  const gravarSegredo=async(orgId:string,nome:string,departamento:string,conteudo:unknown,actor:Actor)=> {
    const previous=await segredoDe(orgId,nome); const id=previous?.id??randomUUID();
    const meta:VaultMeta={id,nome,login:'',url:'',departamento,createdAt:previous?.metadata.createdAt??new Date().toISOString()};
    const ciphertext=encryptSecret(JSON.stringify(conteudo),vaultKey,id);
    if(previous)await db.query('UPDATE app_private.vault_secrets SET ciphertext=$1,metadata=$2::jsonb WHERE id=$3 AND org_id=$4',[ciphertext,JSON.stringify(meta),id,orgId]);
    else await db.query('INSERT INTO app_private.vault_secrets(id,org_id,ciphertext,metadata) VALUES($1,$2,$3,$4::jsonb)',[id,orgId,ciphertext,JSON.stringify(meta)]);
    await audit(actor,'integration_secret_saved',id); return id;
  };
  const lerSegredo=async<T>(orgId:string,nome:string):Promise<T|null>=> {
    const row=await segredoDe(orgId,nome); if(!row)return null;
    try{return JSON.parse(decryptSecret(row.ciphertext,vaultKey,row.id)) as T;}catch{throw new ApiError(500,`O segredo de ${nome} no cofre está inválido. Salve a configuração novamente.`);}
  };
  /**
   * Comparação em tempo constante. Comparar com === vaza o tamanho do prefixo
   * correto pelo tempo de resposta.
   */
  const tokenConfere=(esperado:string,recebido:string)=> {
    const a=Buffer.from(esperado,'utf8'); const b=Buffer.from(recebido,'utf8');
    if(a.length!==b.length)return false;
    return timingSafeEqual(a,b);
  };
  /**
   * Enquanto não houver token configurado, o webhook segue aberto, porque o
   * servidor só escuta em 127.0.0.1. Assim que existir endereço público, basta
   * cadastrar o token dos dois lados para fechar a rota.
   */
  const conferirTokenWebhook=async(req:IncomingMessage,integracao:string)=> {
    const configurado=await lerSegredo<{webhookToken?:string}>(LOCAL_ORG_ID,integracao);
    const esperado=String(configurado?.webhookToken??'');
    if(!esperado)return;
    // O cabeçalho é o caminho preferido. A Autentique só permite cabeçalho
    // personalizado no plano Pro, então o token também é aceito na própria URL,
    // em ?token= ou ?webhookToken=. É mais fraco, porque URL costuma aparecer em
    // log de proxy, mas é muito melhor que rota aberta.
    const naUrl=new URL(req.url??'/','http://local').searchParams;
    const recebido=String(req.headers['x-webhook-token']??req.headers['x-hub-signature']??naUrl.get('token')??naUrl.get('webhookToken')??'');
    if(!recebido||!tokenConfere(esperado,recebido))throw new ApiError(401,'Webhook sem token válido.');
  };
  /**
   * Chamada à API da Autentique. O token nunca sai do servidor.
   *
   * ATENÇÃO: o formato exato das respostas da Autentique ainda não foi
   * conferido com credenciais reais. Esta função devolve ok/detalhe em vez de
   * afirmar sucesso, justamente para não registrar um resultado de integração
   * que não foi observado. Validar antes de usar em produção.
   */
  const autentique=async(token:string,query:string,variables?:Record<string,unknown>):Promise<{ok:boolean;detalhe:string;dados:Record<string,unknown>|null}>=> {
    let response:Response;
    try{response=await providerFetch(AUTENTIQUE_API,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({query,variables:variables??{}}),signal:AbortSignal.timeout(15_000)});}
    catch{return {ok:false,detalhe:'A Autentique não respondeu. Confira a conexão e tente novamente.',dados:null};}
    const payload=await response.json().catch(()=>null) as Record<string,unknown>|null;
    if(response.status===401||response.status===403)return {ok:false,detalhe:'A Autentique recusou o token informado.',dados:null};
    if(!response.ok)return {ok:false,detalhe:`A Autentique respondeu com erro ${response.status}.`,dados:null};
    if(Array.isArray(payload?.errors)&&payload.errors.length)return {ok:false,detalhe:'A Autentique recusou a solicitação. Confira o token e o formato esperado pela API.',dados:null};
    return {ok:true,detalhe:'Conexão confirmada.',dados:(payload?.data as Record<string,unknown>)??null};
  };
  const server=createServer(async(req,res)=> {
    res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('X-Frame-Options','DENY'); res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const host=req.headers.host??'';
      if(!/^(127\.0\.0\.1|localhost|host\.docker\.internal)(:\d+)?$/.test(host)) throw new ApiError(403,'Host não autorizado.');
      const requestPath=new URL(req.url??'/',`http://${host}`).pathname;
      const isApi=requestPath.startsWith('/api/');
      const origin=req.headers.origin;
      if(origin&&!allowedOrigins.has(origin)) throw new ApiError(403,'Origem não autorizada.');
      // Serviço externo não envia Origin. Todo webhook é isento desta exigência
      // e se protege pelo token compartilhado, conferido em cada rota.
      if(isApi&&!requestPath.startsWith('/api/webhooks/')&&req.method!=='GET'&&req.method!=='HEAD'&&!origin) throw new ApiError(403,'A origem da solicitação é obrigatória.');
      if(req.method==='OPTIONS') { if(origin) res.setHeader('Access-Control-Allow-Origin',origin); res.setHeader('Access-Control-Allow-Credentials','true'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH'); res.writeHead(204);res.end();return; }
      if(origin) {res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');}
      if(!isApi) {
        if(req.method!=='GET'&&req.method!=='HEAD') throw new ApiError(405,'Método não permitido.');
        const decoded=decodeURIComponent(requestPath);
        let candidate=path.resolve(staticDirectory,`.${decoded}`);
        if(!candidate.startsWith(staticDirectory+path.sep)&&candidate!==staticDirectory) throw new ApiError(404,'Arquivo não encontrado.');
        try { if(!(await stat(candidate)).isFile()) candidate=path.join(staticDirectory,'index.html'); } catch { if(path.extname(candidate)) throw new ApiError(404,'Arquivo não encontrado.'); candidate=path.join(staticDirectory,'index.html'); }
        let content:Buffer; try{content=await readFile(candidate);}catch{throw new ApiError(503,'Execute npm run build para preparar a interface.');}
        res.writeHead(200,{'Content-Type':MIMES[path.extname(candidate)]??'application/octet-stream','Cache-Control':candidate.includes(`${path.sep}assets${path.sep}`)?'public, max-age=31536000, immutable':'no-cache'});res.end(req.method==='HEAD'?undefined:content);return;
      }
      if(requestPath==='/api/session'&&req.method==='GET') {
        const configured=(await db.query('SELECT id FROM app_private.accounts LIMIT 1')).rows.length>0;
        const account=await currentAccount(db,req);send(res,200,{configured,actor:account?actorFromRow(account):null,mode:'local'});return;
      }
      if((requestPath==='/api/webhooks/evolution'||requestPath.startsWith('/api/webhooks/evolution/'))&&req.method==='POST') {
        await conferirTokenWebhook(req,'Evolution WhatsApp');
        const payload=await readJson(req,5_000_000); await appendFile(path.join(directory,'evolution-webhooks.jsonl'),JSON.stringify({receivedAt:new Date().toISOString(),payload})+'\n',{mode:0o600});
        const event=payload as Record<string,unknown>; const data=event.data as Record<string,unknown>|undefined; const key=data?.key as Record<string,unknown>|undefined;
        const message=data?.message as Record<string,unknown>|undefined; const conversation=typeof message?.conversation==='string'?message.conversation:typeof (message?.extendedTextMessage as Record<string,unknown>|undefined)?.text==='string'?String((message?.extendedTextMessage as Record<string,unknown>).text):'';
        const remoteJid=typeof key?.remoteJid==='string'?key.remoteJid:''; const telefone=normalizePhone(remoteJid);
        const daEquipe=key?.fromMe===true; const externoId=typeof key?.id==='string'?key.id:'';
        const grupo=/@g\.us$/i.test(remoteJid);
        if(telefone&&conversation&&!grupo){
          const current=await readState(db,LOCAL_ORG_ID); const existing=current.conversas.find(item=>normalizePhone(item.telefone)===telefone);
          const mensagensAnteriores=Array.isArray(existing?.mensagens)?existing.mensagens as Record<string,JsonValue>[]:[];
          // A Evolution devolve pelo webhook o que o próprio sistema enviou.
          // Sem esta checagem, toda mensagem enviada apareceria duas vezes.
          const jaRegistrada=externoId&&mensagensAnteriores.some(item=>item.externoId===externoId);
          if(!jaRegistrada){
            const mensagem={id:randomUUID(),texto:conversation,autor:daEquipe?'equipe':'cliente',criadoEm:new Date().toISOString(),origem:daEquipe?'Dispositivo externo':'Recebida',externoId:externoId||null};
            const actor:Actor={id:'evolution-webhook',memberId:'evolution-webhook',nome:'Evolution API',email:'evolution@local',papel:'socio',departamentos:['Atendimento']};
            await updateState(db,LOCAL_ORG_ID,current.meta.revision,state=>runCommand(state,{type:'save',collection:'conversas',id:existing?.id??`whatsapp-${telefone}`,data:{telefone,status:existing?.status??'Não iniciado',origem:'WhatsApp',canal:'WhatsApp',vinculo:existing?.vinculo??'Não identificado',ultimaMensagem:conversation,ultimaInteracaoEm:new Date().toISOString(),mensagens:[...mensagensAnteriores,mensagem]}},actor));
          }
        }
        send(res,202,{received:true}); return;
      }
      if(requestPath==='/api/webhooks/autentique'&&req.method==='POST') {
        await conferirTokenWebhook(req,'Autentique');
        const payload=await readJson(req,5_000_000) as Record<string,unknown>;
        await appendFile(path.join(directory,'autentique-webhooks.jsonl'),JSON.stringify({receivedAt:new Date().toISOString(),payload})+'\n',{mode:0o600});
        const evento=String(payload.event??payload.type??'').toLowerCase();
        const documento=payload.document as Record<string,unknown>|undefined;
        const externoId=String(documento?.id??payload.document_id??payload.id??'');
        const situacao=AUTENTIQUE_EVENTOS[evento];
        if(externoId&&situacao){
          const current=await readState(db,LOCAL_ORG_ID);
          const contrato=current.contratos.find(item=>String(item.autentiqueId??'')===externoId);
          if(contrato&&contrato.status!=='Assinado'){
            const webhookActor:Actor={id:'autentique-webhook',memberId:'autentique-webhook',nome:'Autentique',email:'autentique@local',papel:'socio',departamentos:['Comercial']};
            if(situacao==='Assinado')await updateState(db,LOCAL_ORG_ID,current.meta.revision,state=>runCommand(state,{type:'registerSignature',id:contrato.id,data:{}},webhookActor));
            else if(situacao==='Recusado')await updateState(db,LOCAL_ORG_ID,current.meta.revision,state=>runCommand(state,{type:'registerSignature',id:contrato.id,data:{recusado:true,motivo:'Assinatura recusada na Autentique'}},webhookActor));
          }
        }
        send(res,202,{received:true});return;
      }
      if(requestPath==='/api/setup'&&req.method==='POST') {
        const key=`setup:${req.socket.remoteAddress}`;rateLimit(key);failure(key);
        const body=setupSchema.parse(await readJson(req));
        const hash=await hashPassword(body.password);const id=randomUUID();
        const initial=createInitialState(LOCAL_ORG_ID); const memberId=initial.equipe.find(person=>String(person.nome).trim().toLocaleLowerCase('pt-BR')===body.nome.toLocaleLowerCase('pt-BR'))?.id??id;
        const actor:Actor={id,memberId,nome:body.nome,email:body.email,papel:'socio',departamentos:['Fiscal','Pessoal','Contábil','Paralegal e Legalização','Financeiro']};
        const state=runCommand(initial,{type:'save',collection:'equipe',id:memberId,data:{nome:body.nome,email:body.email,papel:'socio',departamentos:actor.departamentos??[],status:'Ativo'}},actor);
        await db.transaction(async tx=> {
          // A lock independent of rows also protects a simultaneous first setup.
          await tx.query('LOCK TABLE app_private.accounts IN EXCLUSIVE MODE');
          if((await tx.query('SELECT id FROM app_private.accounts LIMIT 1')).rows.length) throw new ApiError(409,'A plataforma já possui um administrador. Entre com sua conta.');
          await tx.query('INSERT INTO app_private.accounts(id,org_id,email,nome,papel,departamentos,password_hash,member_id) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8)',[id,LOCAL_ORG_ID,body.email,body.nome,'socio',JSON.stringify(actor.departamentos),hash,memberId]);
          await tx.query('INSERT INTO app_private.app_states(org_id,revision,content) VALUES($1,$2,$3::jsonb)',[LOCAL_ORG_ID,state.meta.revision,JSON.stringify(state)]);
        });
        await createSession(db,id,res);await audit(actor,'setup');send(res,201,{actor,state:filterStateForActor(state,actor)});return;
      }
      if(requestPath==='/api/login'&&req.method==='POST') {
        const key=`login:${req.socket.remoteAddress}`;rateLimit(key);
        const body=authSchema.parse(await readJson(req));failure(key);
        const result=await db.query<AccountRow>('SELECT * FROM app_private.accounts WHERE email=$1 AND ativo=true',[body.email]);const row=result.rows[0];
        const valid=await verifyPassword(body.password,row?.password_hash??'scrypt:0123456789abcdef:'+ '0'.repeat(128));
        if(!row||!valid) throw new ApiError(401,'E-mail ou senha incorretos.');
        attempts.delete(key);const actor=actorFromRow(row);await createSession(db,row.id,res);await audit(actor,'login');send(res,200,{actor,state:filterStateForActor(await readState(db,row.org_id),actor)});return;
      }
      const account=await currentAccount(db,req);if(!account) throw new ApiError(401,'Entre na plataforma para continuar.');
      const actor=actorFromRow(account);const orgId=account.org_id;
      if(requestPath==='/api/logout'&&req.method==='POST') {await clearSession(db,req,res);await audit(actor,'logout');send(res,200,{ok:true});return;}
      if(requestPath==='/api/whatsapp/config'&&req.method==='POST') {
        assertAdmin(actor);const credentials=whatsappConfigSchema.parse(await readJson(req));const previous=await whatsappVault(orgId);const id=previous?.id??randomUUID();
        const meta:VaultMeta={id,nome:'Evolution WhatsApp',login:credentials.instanceName,url:credentials.baseUrl,departamento:'Atendimento',createdAt:previous?.metadata.createdAt??new Date().toISOString()};
        const ciphertext=encryptSecret(JSON.stringify(credentials),vaultKey,id);
        if(previous)await db.query('UPDATE app_private.vault_secrets SET ciphertext=$1,metadata=$2::jsonb WHERE id=$3 AND org_id=$4',[ciphertext,JSON.stringify(meta),id,orgId]);
        else await db.query('INSERT INTO app_private.vault_secrets(id,org_id,ciphertext,metadata) VALUES($1,$2,$3,$4::jsonb)',[id,orgId,ciphertext,JSON.stringify(meta)]);
        await audit(actor,'whatsapp_credentials_saved',id);send(res,200,{configured:true});return;
      }
      if(requestPath==='/api/whatsapp/status'&&req.method==='GET') {
        const credentials=await whatsappCredentials(orgId);if(!credentials){send(res,200,{configured:false,connected:false,smartphoneConnected:false});return;}
        const status=await evolution(credentials,`/instance/connectionState/${encodeURIComponent(credentials.instanceName)}`);const state=typeof status.instance==='object'&&status.instance?status.instance as Record<string,unknown>:status;send(res,200,{configured:true,connected:state.state==='open',smartphoneConnected:state.state==='open',detail:typeof state.state==='string'?state.state:''});return;
      }
      if(requestPath==='/api/whatsapp/qr'&&req.method==='POST') {
        const credentials=await whatsappCredentials(orgId);if(!credentials)throw new ApiError(400,'Cadastre primeiro a Evolution API.');
        const result=await evolution(credentials,`/instance/connect/${encodeURIComponent(credentials.instanceName)}`);const qrCode=typeof result.base64==='string'?result.base64:'';
        if(!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(qrCode)||qrCode.length>2_000_000)throw new ApiError(502,'A Evolution API não retornou um QR Code válido.');
        await audit(actor,'whatsapp_qr_requested');send(res,200,{qrCode,expiresInSeconds:20});return;
      }
      if(requestPath==='/api/whatsapp/send'&&req.method==='POST') {
        const body=await readJson(req) as {telefone?:unknown;text?:unknown};
        const telefone=normalizePhone(body.telefone); const message=String(body.text??'').trim();
        if(!telefone||!message) throw new ApiError(400,'Informe o telefone e a mensagem.');
        const credentials=await whatsappCredentials(orgId);if(!credentials)throw new ApiError(400,'Cadastre primeiro a Evolution API.');
        const envio=await evolution(credentials,`/message/sendText/${encodeURIComponent(credentials.instanceName)}`,'POST',{number:telefone,text:message});
        const chaveEnvio=envio.key as Record<string,unknown>|undefined; const externoId=typeof chaveEnvio?.id==='string'?chaveEnvio.id:'';
        const current=await readState(db,orgId);const existing=current.conversas.find(item=>normalizePhone(item.telefone)===telefone);const mensagens=Array.isArray(existing?.mensagens)?existing.mensagens:[];
        await updateState(db,orgId,current.meta.revision,state=>runCommand(state,{type:'save',collection:'conversas',id:existing?.id??`whatsapp-${telefone}`,data:{telefone,status:'Em atendimento',origem:'WhatsApp',canal:'WhatsApp',vinculo:existing?.vinculo??'Não identificado',ultimaMensagem:message,ultimaInteracaoEm:new Date().toISOString(),mensagens:[...mensagens,{id:randomUUID(),texto:message,autor:'equipe',criadoEm:new Date().toISOString(),origem:'Enviada pelo sistema',externoId:externoId||null}]}},actor));
        await audit(actor,'whatsapp_message_sent',telefone);send(res,200,{sent:true});return;
      }
      if(requestPath==='/api/autentique/config'&&req.method==='POST') {
        assertAdmin(actor);
        const credenciais=autentiqueConfigSchema.parse(await readJson(req));
        await gravarSegredo(orgId,'Autentique','Comercial',credenciais,actor);
        send(res,200,{configured:true});return;
      }
      if(requestPath==='/api/autentique/status'&&req.method==='GET') {
        const credenciais=await lerSegredo<{token:string;webhookToken?:string}>(orgId,'Autentique');
        if(!credenciais){send(res,200,{configured:false,webhookProtegido:false,conectado:false,detalhe:'Cadastre o token da Autentique em Configurações.'});return;}
        const conferir=new URL(req.url??'/','http://local').searchParams.get('testar')==='1';
        if(!conferir){send(res,200,{configured:true,webhookProtegido:Boolean(credenciais.webhookToken),conectado:null,detalhe:'Use Testar conexão para conferir o token.'});return;}
        const resultado=await autentique(credenciais.token,'query { me { id email } }');
        await audit(actor,'autentique_connection_tested');
        send(res,200,{configured:true,webhookProtegido:Boolean(credenciais.webhookToken),conectado:resultado.ok,detalhe:resultado.detalhe});return;
      }
      const cnpjMatch=requestPath.match(/^\/api\/cnpj\/([0-9A-Za-z.\/-]+)$/);
      if(cnpjMatch&&req.method==='GET') {
        const cnpj=normalizeCnpj(cnpjMatch[1]);
        if(!validCnpjFormat(cnpj))throw new ApiError(400,'Informe um CNPJ válido com 14 caracteres.');
        let response:Response;
        try {response=await fetch(`https://api.opencnpj.org/${encodeURIComponent(cnpj)}?datasets=receita`,{headers:{Accept:'application/json','User-Agent':'Futuro-Contabilidade-Digital/1.0'},signal:AbortSignal.timeout(10_000)});}
        catch {throw new ApiError(503,'A consulta pública está indisponível no momento. Tente novamente em alguns minutos.');}
        if(response.status===404)throw new ApiError(404,'CNPJ não encontrado na base pública.');
        if(response.status===429)throw new ApiError(429,'O serviço público limitou as consultas. Aguarde alguns minutos.');
        if(!response.ok)throw new ApiError(503,'Não foi possível consultar o CNPJ na base pública.');
        const payload=await response.json() as Record<string,unknown>;
        const result=mapOpenCnpj(payload);await audit(actor,'cnpj_public_lookup',cnpj);send(res,200,result);return;
      }
      if(requestPath==='/api/state'&&req.method==='GET') {
        const current=await readState(db,orgId); const webhookPath=path.join(directory,'evolution-webhooks.jsonl');
        // Rede de segurança: se a gravação do webhook falhou por conflito de
        // revisão, a conversa ainda aparece a partir do arquivo de eventos.
        // As regras de autor, grupo e origem são as mesmas do webhook.
        try {
          const lines=(await readFile(webhookPath,'utf8')).split(/\r?\n/).filter(Boolean).slice(-200);
          for(const line of lines){
            const event=JSON.parse(line).payload as Record<string,unknown>;
            const data=event.data as Record<string,unknown>|undefined; const key=data?.key as Record<string,unknown>|undefined;
            const message=data?.message as Record<string,unknown>|undefined;
            const textValue=typeof message?.conversation==='string'?message.conversation:typeof (message?.extendedTextMessage as Record<string,unknown>|undefined)?.text==='string'?String((message?.extendedTextMessage as Record<string,unknown>).text):'';
            const remoteJid=typeof key?.remoteJid==='string'?key.remoteJid:'';
            if(/@g\.us$/i.test(remoteJid)) continue;
            const phone=normalizePhone(remoteJid);
            if(!phone||!textValue||current.conversas.some(item=>normalizePhone(item.telefone)===phone)) continue;
            const daEquipe=key?.fromMe===true; const externoId=typeof key?.id==='string'?key.id:null;
            const agora=new Date().toISOString();
            current.conversas.push({id:`whatsapp-${phone}`,telefone:phone,origem:'WhatsApp',canal:'WhatsApp',vinculo:'Não identificado',status:'Não iniciado',ultimaMensagem:textValue,ultimaInteracaoEm:agora,mensagens:[{id:randomUUID(),autor:daEquipe?'equipe':'cliente',texto:textValue,criadoEm:agora,origem:daEquipe?'Dispositivo externo':'Recebida',externoId}],createdAt:agora,updatedAt:agora});
          }
        } catch { /* arquivo de eventos pode ainda não existir */ }
        const visible=filterStateForActor(current,actor); send(res,200,{actor,state:visible});return;
      }
      if(requestPath==='/api/command'&&req.method==='POST') {
        const body=commandBodySchema.parse(await readJson(req));
        const revision=body.expectedVersion??body.expectedRevision;if(revision===undefined) throw new ApiError(400,'A versão dos dados é obrigatória.');
        if(body.command.type==='save'&&body.command.collection==='documentos') throw new ApiError(400,'Use o envio de arquivo para cadastrar documentos.');
        if(body.command.type==='save'&&body.command.collection==='equipe'&&body.command.data) {
          const current=await db.query<AccountRow>('SELECT * FROM app_private.accounts WHERE member_id=$1 AND org_id=$2',[body.command.id??String(body.command.data.id??''),orgId]);
          if(current.rows.length&&(body.command.data.papel||body.command.data.departamentos||body.command.data.status==='Inativo')) throw new ApiError(400,'Altere permissões e status na gestão de acessos.');
        }
        const next=await updateState(db,orgId,revision,state=>runCommand(state,body.command as Command,actor));send(res,200,{state:filterStateForActor(next,actor)});return;
      }
      if(requestPath==='/api/users'&&req.method==='GET') {
        assertAdmin(actor);const rows=await db.query<Omit<AccountRow,'password_hash'>>('SELECT id,nome,email,papel,departamentos,ativo,member_id FROM app_private.accounts WHERE org_id=$1 ORDER BY nome',[orgId]);send(res,200,{users:rows.rows});return;
      }
      if(requestPath==='/api/users'&&req.method==='POST') {
        assertAdmin(actor);const body=userSchema.parse(await readJson(req));const id=randomUUID();const hash=await hashPassword(body.password);
        const state=await readState(db,orgId);
        const memberId=body.memberId??state.equipe.find(person=>String(person.nome).trim().toLocaleLowerCase('pt-BR')===body.nome.toLocaleLowerCase('pt-BR'))?.id??id;
        if(body.memberId&&!state.equipe.some(person=>person.id===memberId))throw new ApiError(400,'Perfil de equipe não encontrado.');
        if((await db.query('SELECT id FROM app_private.accounts WHERE org_id=$1 AND member_id=$2',[orgId,memberId])).rows.length)throw new ApiError(409,'Este perfil de equipe já possui acesso.');
        const next=runCommand(state,{type:'save',collection:'equipe',id:memberId,data:{nome:body.nome,email:body.email,papel:body.papel,departamentos:body.departamentos,status:'Ativo'}},actor);
        await db.transaction(async tx=> {if((await tx.query('SELECT id FROM app_private.accounts WHERE email=$1',[body.email])).rows.length)throw new ApiError(409,'Este e-mail já possui acesso.');await tx.query('INSERT INTO app_private.accounts(id,org_id,email,nome,papel,departamentos,password_hash,member_id) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8)',[id,orgId,body.email,body.nome,body.papel,JSON.stringify(body.departamentos),hash,memberId]);const changed=await tx.query('UPDATE app_private.app_states SET content=$1::jsonb,revision=$2,updated_at=now() WHERE org_id=$3 AND revision=$4 RETURNING org_id',[JSON.stringify(next),next.meta.revision,orgId,state.meta.revision]);if(!changed.rows.length)throw new ApiError(409,'Os dados foram alterados. Tente novamente.');});
        await audit(actor,'user_created',id);send(res,201,{user:{id,nome:body.nome,email:body.email,papel:body.papel,departamentos:body.departamentos,ativo:true,memberId},state:filterStateForActor(next,actor)});return;
      }
      const userMatch=requestPath.match(/^\/api\/users\/([a-f0-9-]{36})$/);
      if(userMatch&&req.method==='PATCH') {
        assertAdmin(actor);
        const body=z.object({nome:NAME.optional(),papel:z.enum(['socio','operacao','administrativo','leitura']).optional(),departamentos:z.array(z.string().max(80)).max(10).optional(),ativo:z.boolean().optional(),password:PASSWORD.optional()}).strict().parse(await readJson(req));
        const id=userMatch[1];if(id===actor.id&&body.ativo===false)throw new ApiError(400,'Você não pode desativar o próprio acesso.');
        const hash=body.password?await hashPassword(body.password):undefined;
        let next:AppState|undefined;
        await db.transaction(async tx=>{
          const row=(await tx.query<AccountRow>('SELECT * FROM app_private.accounts WHERE id=$1 AND org_id=$2 FOR UPDATE',[id,orgId])).rows[0];if(!row)throw new ApiError(404,'Usuário não encontrado.');
          if(row.papel==='socio'&&(body.papel&&body.papel!=='socio'||body.ativo===false)){
            const others=await tx.query('SELECT id FROM app_private.accounts WHERE org_id=$1 AND papel=$2 AND ativo=true AND id<>$3',[orgId,'socio',id]);if(!others.rows.length)throw new ApiError(400,'Mantenha pelo menos um sócio ativo na plataforma.');
          }
          const updated={...row,...body};
          await tx.query('UPDATE app_private.accounts SET nome=$1,papel=$2,departamentos=$3::jsonb,ativo=$4,password_hash=$5 WHERE id=$6 AND org_id=$7',[updated.nome,updated.papel,JSON.stringify(updated.departamentos),updated.ativo,hash??row.password_hash,id,orgId]);
          if(hash||body.ativo===false||body.papel||body.departamentos)await tx.query('DELETE FROM app_private.sessions WHERE account_id=$1',[id]);
          const current=(await tx.query<{content:AppState}>('SELECT content FROM app_private.app_states WHERE org_id=$1 FOR UPDATE',[orgId])).rows[0].content;
          next=runCommand(current,{type:'save',collection:'equipe',id:row.member_id,data:{nome:updated.nome,papel:updated.papel,departamentos:updated.departamentos,status:updated.ativo?'Ativo':'Inativo'}},actor);
          await tx.query('UPDATE app_private.app_states SET content=$1::jsonb,revision=$2,updated_at=now() WHERE org_id=$3',[JSON.stringify(next),next.meta.revision,orgId]);
        });
        await audit(actor,'user_updated',id);send(res,200,{ok:true,state:next?filterStateForActor(next,actor):undefined});return;
      }
      if(requestPath==='/api/documents'&&req.method==='POST') {
        const body=attachmentSchema.parse(await readJson(req,15_000_000));const originalName=(body.name??body.nome??'').trim();if(!originalName)throw new ApiError(400,'Informe o nome do arquivo.');
        if(!/^[A-Za-z0-9+/]*={0,2}$/.test(body.contentBase64))throw new ApiError(400,'Arquivo inválido.');const bytes=Buffer.from(body.contentBase64,'base64');if(!bytes.length||bytes.length>10_485_760)throw new ApiError(413,'Envie um arquivo de até 10 MB.');
        const id=randomUUID();const filename=`${id}.bin`;const state=await readState(db,orgId);const metadata={id,nome:originalName,tipo:body.tipo,clienteId:body.clienteId??body.clientId??'',competencia:body.competencia??'',departamento:body.departamento??'',arquivoId:id,mimeType:body.mimeType,tamanho:bytes.length,origem:'upload'};
        runCommand(state,{type:'save',collection:'documentos',data:metadata},actor);
        await writeFile(path.join(filesDirectory,filename),bytes,{flag:'wx',mode:0o600});
        try {
          let next:AppState=state;
          await db.transaction(async tx=> {
            const revision=body.expectedVersion??state.meta.revision;
            const row=(await tx.query<{content:AppState;revision:number}>('SELECT content,revision FROM app_private.app_states WHERE org_id=$1 FOR UPDATE',[orgId])).rows[0];if(!row||row.revision!==revision)throw new ApiError(409,'Os dados foram alterados. Atualize a tela e envie novamente.');
            next=runCommand(row.content,{type:'save',collection:'documentos',data:metadata},actor);
            await tx.query('INSERT INTO app_private.files(id,org_id,filename,original_name,mime_type,bytes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,orgId,filename,originalName,body.mimeType,bytes.length,actor.id]);
            await tx.query('UPDATE app_private.app_states SET content=$1::jsonb,revision=$2,updated_at=now() WHERE org_id=$3',[JSON.stringify(next),next.meta.revision,orgId]);
          });
          await audit(actor,'document_uploaded',id);send(res,201,{document:metadata,state:filterStateForActor(next,actor)});return;
        }catch(error){await unlink(path.join(filesDirectory,filename)).catch(()=>undefined);throw error;}
      }
      const documentMatch=requestPath.match(/^\/api\/documents\/([a-f0-9-]{36})$/);
      if(documentMatch&&req.method==='GET') {
        const id=documentMatch[1];const state=filterStateForActor(await readState(db,orgId),actor);if(!state.documentos.some(item=>item.id===id))throw new ApiError(404,'Documento não encontrado ou sem permissão.');
        const row=(await db.query<{filename:string;original_name:string;mime_type:string}>('SELECT filename,original_name,mime_type FROM app_private.files WHERE id=$1 AND org_id=$2',[id,orgId])).rows[0];if(!row)throw new ApiError(404,'Arquivo não encontrado.');
        const content=await readFile(path.join(filesDirectory,row.filename));await audit(actor,'document_downloaded',id);res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(row.original_name)}`,'Content-Length':content.length,'Cache-Control':'no-store'});res.end(content);return;
      }
      if(requestPath==='/api/vault'&&req.method==='GET') {
        if(!canAccessVault(actor))throw new ApiError(403,'Seu perfil não possui acesso ao cofre.');const rows=await db.query<{metadata:VaultMeta}>('SELECT metadata FROM app_private.vault_secrets WHERE org_id=$1 ORDER BY created_at DESC',[orgId]);send(res,200,{entries:rows.rows.map(row=>row.metadata).filter(meta=>canAccessVault(actor,meta))});return;
      }
      if(requestPath==='/api/vault'&&req.method==='POST') {
        if(!canAccessVault(actor))throw new ApiError(403,'Seu perfil não possui acesso ao cofre.');const body=vaultSchema.parse(await readJson(req));const nome=body.nome??body.name;if(!nome)throw new ApiError(400,'Informe o nome do acesso.');if(body.url&&!/^https?:\/\//i.test(body.url))throw new ApiError(400,'Informe um endereço iniciado por https:// ou http://.');
        const id=randomUUID();const meta:VaultMeta={id,nome,login:body.login,url:body.url,clienteId:body.clienteId??body.clientId,departamento:body.departamento??body.department??'',createdAt:new Date().toISOString()};
        if(!canAccessVault(actor,meta))throw new ApiError(403,'Selecione um departamento permitido no seu perfil.');
        if(meta.clienteId&&!filterStateForActor(await readState(db,orgId),actor).clientes.some(item=>item.id===meta.clienteId))throw new ApiError(400,'Cliente não encontrado ou sem acesso.');
        await db.query('INSERT INTO app_private.vault_secrets(id,org_id,ciphertext,metadata) VALUES($1,$2,$3,$4::jsonb)',[id,orgId,encryptSecret(body.secret,vaultKey,id),JSON.stringify(meta)]);await audit(actor,'vault_created',id);send(res,201,{entry:meta});return;
      }
      const vaultMatch=requestPath.match(/^\/api\/vault\/([a-f0-9-]{36})\/reveal$/);
      if(vaultMatch&&req.method==='POST') {
        if(!canAccessVault(actor))throw new ApiError(403,'Seu perfil não possui acesso ao cofre.');const row=(await db.query<VaultRow>('SELECT id,ciphertext,metadata FROM app_private.vault_secrets WHERE id=$1 AND org_id=$2',[vaultMatch[1],orgId])).rows[0];if(!row||!canAccessVault(actor,row.metadata))throw new ApiError(404,'Acesso não encontrado ou sem permissão.');await audit(actor,'vault_revealed',row.id);send(res,200,{secret:decryptSecret(row.ciphertext,vaultKey,row.id)});return;
      }
      throw new ApiError(404,'Recurso não encontrado.');
    }catch(error){
      if(error instanceof ApiError)send(res,error.status,{error:error.message});
      else if(error instanceof z.ZodError)send(res,400,{error:error.issues[0]?.message??'Revise os campos informados.'});
      else if(error instanceof Error&&('code' in error||error.name==='DomainError'))send(res,400,{error:error.name==='DomainError'?error.message:'Não foi possível concluir. Revise os campos ou tente novamente.'});
      else if(error instanceof Error)send(res,400,{error:error.message.slice(0,300)});
      else send(res,500,{error:'Não foi possível concluir esta operação.'});
    }
  });
  server.requestTimeout=30_000;server.headersTimeout=10_000;
  return {server,db,close:async()=>{if(server.listening)await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await db.close();await releaseLock();}};
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
  const app=await createApp();const port=Number(process.env.PORT??4318);
  if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Porta inválida.');
  app.server.once('error',error=>{console.error(error.message);void app.close().finally(()=>process.exit(1));});
  app.server.listen(port,process.env.HOST??'0.0.0.0',()=>console.info(`Plataforma Futuro disponível em http://127.0.0.1:${port}`));
  const shutdown=()=>{void app.close().then(()=>process.exit(0));};process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
}





