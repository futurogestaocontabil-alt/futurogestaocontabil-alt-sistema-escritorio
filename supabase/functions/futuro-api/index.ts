// Native Supabase Edge Function. Build shared domain files using node scripts/build-edge.mjs.
import { createClient } from 'npm:@supabase/supabase-js@2.115.0';
import { createInitialState, runCommand, filterStateForActor } from '../_shared/src/services/domain/index.ts';
import type { AppState, Actor, Command, JsonValue } from '../_shared/src/types/domain.ts';

const required = (key: string): string => { const value = Deno.env.get(key); if (!value) throw new Error(`Configuração ausente: ${key}`); return value; };
const admin = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
const allowedOrigins = new Set((Deno.env.get('FUTURO_ALLOWED_ORIGINS') ?? '').split(',').map(value => value.trim()).filter(Boolean));
class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
interface Membership { user_id:string; organizacao_id:string; nome:string; papel:string; departamentos:string[] }
interface VaultMeta { id:string; nome:string; login:string; url:string; clienteId?:string; departamento:string; createdAt:string }
function record(value: unknown): Record<string,unknown> { if(!value||typeof value!=='object'||Array.isArray(value))throw new HttpError(400,'Dados inválidos.');return value as Record<string,unknown>; }
function text(value:unknown,label:string,max=250,optional=false):string { if(optional&&(value===undefined||value===null))return '';if(typeof value!=='string'||(!optional&&!value.trim())||value.length>max)throw new HttpError(400,`Revise ${label}.`);return value.trim(); }
function command(value:unknown):Command {
  const body=record(value);const types=['save','delete','advanceProcess','toggleStep','completeTask','generateRecurring','convertLead','messageToTask','generateInvoices'];
  if(!types.includes(String(body.type)))throw new HttpError(400,'Comando inválido.');
  if(Object.keys(body).some(key=>!['type','collection','id','data'].includes(key)))throw new HttpError(400,'Comando contém campos desconhecidos.');
  if(body.data!==undefined)record(body.data);
  if(body.type==='save'&&body.collection==='documentos')throw new HttpError(400,'Use o envio de arquivo para cadastrar documentos.');
  return body as unknown as Command;
}
const vaultAccess=(actor:Actor,meta?:VaultMeta)=>actor.papel==='socio'||(actor.papel==='operacao'&&(!meta||(actor.departamentos??[]).includes(meta.departamento)));
function bytesFromBase64(value:string):Uint8Array { try{return Uint8Array.from(atob(value),char=>char.charCodeAt(0));}catch{throw new HttpError(400,'Arquivo inválido.');} }
function toBase64(bytes:Uint8Array):string { let output='';for(let i=0;i<bytes.length;i+=8192)output+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(output); }
async function cryptoKey():Promise<CryptoKey> { const bytes=bytesFromBase64(required('FUTURO_VAULT_KEY'));if(bytes.length!==32)throw new HttpError(503,'Chave do cofre não configurada.');return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']); }
async function encrypt(value:string,id:string):Promise<string> { const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(id)},await cryptoKey(),new TextEncoder().encode(value));return `${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`; }
async function decrypt(value:string,id:string):Promise<string> { const [iv,ciphertext]=value.split('.');const result=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytesFromBase64(iv),additionalData:new TextEncoder().encode(id)},await cryptoKey(),bytesFromBase64(ciphertext));return new TextDecoder().decode(result); }
async function stateFor(org:string):Promise<AppState> { const result=await admin.from('futuro_states').select('content').eq('organizacao_id',org).single();if(result.error)throw new HttpError(409,'A organização ainda não foi configurada.');return result.data.content as AppState; }
async function commit(userId:string,org:string,revision:number,state:AppState):Promise<void> { const result=await admin.rpc('futuro_commit',{p_user_id:userId,p_org_id:org,p_expected_revision:revision,p_content:state});if(result.error)throw new HttpError(result.error.message.includes('REVISION_CONFLICT')?409:400,result.error.message.includes('REVISION_CONFLICT')?'Os dados foram alterados. Atualize a tela.':'Não foi possível salvar os dados.'); }
async function audit(userId:string,org:string,action:string,targetId?:string):Promise<void> { const {error}=await admin.from('futuro_security_events').insert({user_id:userId,organizacao_id:org,action,target_id:targetId});if(error)throw new HttpError(503,'Não foi possível registrar a auditoria.'); }

Deno.serve(async request=>{
  const origin=request.headers.get('origin');const headers:Record<string,string>={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if(origin&&allowedOrigins.has(origin)){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='authorization, apikey, content-type, x-client-info';headers['Access-Control-Allow-Methods']='POST, OPTIONS';}
  const answer=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
  try {
    if(origin&&!allowedOrigins.has(origin))throw new HttpError(403,'Origem não autorizada.');
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')throw new HttpError(405,'Método não permitido.');
    const authorization=request.headers.get('authorization')??'';if(!authorization.startsWith('Bearer '))throw new HttpError(401,'Entre para continuar.');
    const {data:auth,error:authError}=await admin.auth.getUser(authorization.slice(7));if(authError||!auth.user)throw new HttpError(401,'Sessão inválida. Entre novamente.');
    const bodyText=await request.text();if(bodyText.length>15_000_000)throw new HttpError(413,'Envie arquivos de até 10 MB.');
    let parsed:unknown;try{parsed=JSON.parse(bodyText);}catch{throw new HttpError(400,'JSON inválido.');}const body=record(parsed);const action=text(body.action,'a ação',80);
    const {data:member,error:memberError}=await admin.from('futuro_memberships').select('user_id,organizacao_id,nome,papel,departamentos').eq('user_id',auth.user.id).eq('ativo',true).maybeSingle();
    if(memberError)throw new HttpError(503,'Não foi possível conferir as permissões.');
    if(action==='bootstrap') {
      if(member)throw new HttpError(409,'O usuário já está vinculado à organização.');
      // Organization creation is disabled until explicitly enabled for the dedicated project.
      if(Deno.env.get('FUTURO_ALLOW_BOOTSTRAP')!=='true')throw new HttpError(403,'A criação da organização deve ser liberada pelo administrador.');
      const nome=text(body.nome,'o nome',200);const org=crypto.randomUUID();const actor:Actor={id:auth.user.id,nome,email:auth.user.email,papel:'socio',departamentos:['Fiscal','Pessoal','Contábil','Paralegal e Legalização','Financeiro']};
      const state=runCommand(createInitialState(org),{type:'save',collection:'equipe',data:{id:actor.id,nome,email:actor.email??'',papel:'socio',departamentos:actor.departamentos??[],status:'Ativo'}},actor);
      const {error}=await admin.rpc('futuro_bootstrap',{p_user_id:actor.id,p_org_id:org,p_nome:nome,p_content:state});if(error)throw new HttpError(409,'Não foi possível configurar a organização.');return answer({actor,state},201);
    }
    if(!member)throw new HttpError(403,'Usuário sem acesso à organização.');
    const membership=member as Membership;const org=membership.organizacao_id;const actor:Actor={id:membership.user_id,nome:membership.nome,email:auth.user.email,papel:membership.papel,departamentos:membership.departamentos};
    if(action==='state')return answer({actor,state:filterStateForActor(await stateFor(org),actor)});
    if(action==='command') {
      const state=await stateFor(org);const revision=body.expectedVersion;
      if(!Number.isInteger(revision)||revision!==state.meta.revision)throw new HttpError(409,'Os dados foram alterados. Atualize a tela.');
      const operation=command(body.command);
      if(operation.collection==='equipe')throw new HttpError(400,'Gerencie usuários no acesso administrativo.');
      const next=runCommand(state,operation,actor);await commit(actor.id,org,revision as number,next);return answer({state:filterStateForActor(next,actor)});
    }
    if(action==='document-upload') {
      const state=await stateFor(org);const nome=text(body.name??body.nome,'o nome do arquivo');const mimeType=text(body.mimeType??'application/octet-stream','o tipo',150);
      const content=bytesFromBase64(text(body.contentBase64,'o arquivo',14_000_000));if(content.length===0||content.length>10_485_760)throw new HttpError(413,'Envie arquivos de até 10 MB.');
      const id=crypto.randomUUID();const storagePath=`${org}/${id}`;const metadata:Record<string,JsonValue>={id,nome,tipo:text(body.tipo??'Documento','a categoria',80),clienteId:text(body.clienteId??body.clientId,'o cliente',100,true),competencia:text(body.competencia,'a competência',20,true),departamento:text(body.departamento,'o departamento',80,true),arquivoId:id,mimeType,tamanho:content.length,origem:'upload'};
      const next=runCommand(state,{type:'save',collection:'documentos',data:metadata},actor);
      const upload=await admin.storage.from('futuro-private').upload(storagePath,content,{contentType:'application/octet-stream',upsert:false});if(upload.error)throw new HttpError(503,'Não foi possível guardar o arquivo.');
      try { const file=await admin.from('futuro_files').insert({id,organizacao_id:org,storage_path:storagePath,original_name:nome,mime_type:mimeType,bytes:content.length,created_by:actor.id});if(file.error)throw new HttpError(503,'Não foi possível registrar o arquivo.');await commit(actor.id,org,state.meta.revision,next); } catch(error){await admin.storage.from('futuro-private').remove([storagePath]);await admin.from('futuro_files').delete().eq('id',id).eq('organizacao_id',org);throw error;}
      await audit(actor.id,org,'document_uploaded',id);return answer({document:metadata,state:filterStateForActor(next,actor)},201);
    }
    if(action==='document-download') {
      const id=text(body.id,'o documento',100);const state=filterStateForActor(await stateFor(org),actor);if(!state.documentos.some(item=>item.id===id))throw new HttpError(404,'Documento não encontrado ou sem acesso.');
      const file=await admin.from('futuro_files').select('storage_path,original_name').eq('id',id).eq('organizacao_id',org).single();if(file.error)throw new HttpError(404,'Arquivo não encontrado.');
      await audit(actor.id,org,'document_downloaded',id);const signed=await admin.storage.from('futuro-private').createSignedUrl(file.data.storage_path,60,{download:file.data.original_name});if(signed.error)throw new HttpError(503,'Não foi possível abrir o arquivo.');return answer({url:signed.data.signedUrl,expiresIn:60});
    }
    if(action.startsWith('vault-')) {
      if(!vaultAccess(actor))throw new HttpError(403,'Seu perfil não possui acesso ao cofre.');
      if(action==='vault-list'){const result=await admin.from('futuro_vault').select('metadata').eq('organizacao_id',org);if(result.error)throw new HttpError(503,'Não foi possível consultar o cofre.');return answer({entries:result.data.map(item=>item.metadata as VaultMeta).filter(meta=>vaultAccess(actor,meta))});}
      if(action==='vault-save') {
        const id=crypto.randomUUID();const secret=text(body.secret,'o segredo',20_000);const meta:VaultMeta={id,nome:text(body.nome??body.name,'o nome',200),login:text(body.login,'o usuário',254,true),url:text(body.url,'o endereço',500,true),departamento:text(body.departamento??body.department,'o departamento',80,true),createdAt:new Date().toISOString()};
        if(meta.url&&!/^https?:\/\//i.test(meta.url))throw new HttpError(400,'O endereço deve iniciar por http:// ou https://.');
        const clientId=text(body.clienteId??body.clientId,'o cliente',100,true);if(clientId){if(!filterStateForActor(await stateFor(org),actor).clientes.some(item=>item.id===clientId))throw new HttpError(403,'Cliente não encontrado ou sem acesso.');meta.clienteId=clientId;}
        if(!vaultAccess(actor,meta))throw new HttpError(403,'Selecione um departamento permitido.');
        const result=await admin.from('futuro_vault').insert({id,organizacao_id:org,ciphertext:await encrypt(secret,id),metadata:meta});if(result.error)throw new HttpError(503,'Não foi possível guardar o segredo.');await audit(actor.id,org,'vault_created',id);return answer({entry:meta},201);
      }
      if(action==='vault-reveal'){const id=text(body.id,'o acesso',100);const result=await admin.from('futuro_vault').select('id,ciphertext,metadata').eq('id',id).eq('organizacao_id',org).single();if(result.error||!vaultAccess(actor,result.data.metadata as VaultMeta))throw new HttpError(404,'Acesso não encontrado ou sem permissão.');await audit(actor.id,org,'vault_revealed',id);return answer({secret:await decrypt(result.data.ciphertext,id)});}
    }
    throw new HttpError(404,'Ação não encontrada.');
  }catch(error){if(error instanceof HttpError)return answer({error:error.message},error.status);return answer({error:error instanceof Error&&error.name==='DomainError'?error.message:'Não foi possível concluir. Revise os campos informados.'},400);}
});
