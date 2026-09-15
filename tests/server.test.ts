import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { AddressInfo } from 'node:net';
import { createApp } from '../server/index';
import type { AppState } from '../src/types/domain';

let app:Awaited<ReturnType<typeof createApp>>;
let directory:string;let base:string;let cookie='';let adminCookie='';let state:AppState;
const origin='http://127.0.0.1:4317';
const evolutionCalls:{url:string;apiKey:string;body:string}[]=[];
const providerFetch:typeof fetch=async(input,init)=>{
 const url=String(input);const headers=new Headers(init?.headers);
 evolutionCalls.push({url,apiKey:headers.get('apikey')??'',body:typeof init?.body==='string'?init.body:''});
 if(url.includes('/instance/connectionState/'))return new Response(JSON.stringify({instance:{instanceName:'INSTANCIA_TESTE',state:'close'}}),{status:200,headers:{'Content-Type':'application/json'}});
 if(url.includes('/instance/connect/'))return new Response(JSON.stringify({base64:'data:image/png;base64,iVBORw0KGgo=',pairingCode:'TESTE01'}),{status:200,headers:{'Content-Type':'application/json'}});
 if(url.includes('/message/sendText/'))return new Response(JSON.stringify({key:{id:'mensagem-de-teste'},status:'PENDING'}),{status:200,headers:{'Content-Type':'application/json'}});
 return new Response(JSON.stringify({message:'Endpoint externo inesperado'}),{status:404,headers:{'Content-Type':'application/json'}});
};
const CREDENCIAIS_EVOLUTION={provider:'evolution',baseUrl:'http://127.0.0.1:8080',instanceName:'INSTANCIA_TESTE',apiKey:'chave-evolution-apenas-para-teste'} as const;
async function request(route:string,body?:unknown,session=cookie,customOrigin=origin) {
 const response=await fetch(`${base}${route}`,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),Origin:customOrigin,...(session?{Cookie:session}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const setCookie=response.headers.get('set-cookie');
 return {response,setCookie,json:await response.json() as Record<string,unknown>};
}
beforeAll(async()=>{
 directory=await mkdtemp(path.join(os.tmpdir(),'futuro-server-test-'));
 app=await createApp({dataDirectory:directory,providerFetch});
 await new Promise<void>(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 base=`http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
},30_000);
afterAll(async()=>{if(app)await app.close();if(directory){const resolved=path.resolve(directory);if(!resolved.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(resolved).startsWith('futuro-server-test-'))throw new Error('Diretório de teste inválido para limpeza.');await rm(resolved,{recursive:true,force:true});}},30_000);

describe.sequential('Servidor autenticado e persistência PostgreSQL',()=>{
 it('não expõe estado sem autenticação e rejeita origem externa',async()=>{
  expect((await request('/api/state')).response.status).toBe(401);
  const session=await request('/api/session');expect(session.json.configured).toBe(false);
  expect((await request('/api/setup',{},'','https://malicious.invalid')).response.status).toBe(403);
 });
 it('exige senha forte e permite somente uma configuração inicial',async()=>{
  expect((await request('/api/setup',{nome:'Administrador de teste',email:'admin@example.test',password:'123'})).response.status).toBe(400);
  const created=await request('/api/setup',{nome:'Administrador de teste',email:'admin@example.test',password:'test-password-strong-2026'});
  expect(created.response.status).toBe(201);expect(created.setCookie).toContain('HttpOnly');expect(created.setCookie).toContain('SameSite=Strict');
  cookie=created.setCookie!.split(';')[0];adminCookie=cookie;state=created.json.state as AppState;
  expect(state.clientes).toHaveLength(0);
  expect((await request('/api/setup',{nome:'Outro administrador',email:'other@example.test',password:'test-password-strong-2026'})).response.status).toBe(409);
 });
 it('grava alterações com CAS e rejeita uma revisão obsoleta',async()=>{
  const old=state.meta.revision;
  const saved=await request('/api/command',{expectedVersion:old,command:{type:'save',collection:'metas',data:{nome:'Meta de teste isolado',valorMeta:10}}});
  expect(saved.response.status).toBe(200);state=saved.json.state as AppState;
  expect(state.meta.revision).toBe(old+1);
  expect((await request('/api/command',{expectedVersion:old,command:{type:'save',collection:'metas',data:{nome:'Alteração obsoleta'}}})).response.status).toBe(409);
 });
 it('criptografa o segredo e só o revela autenticado',async()=>{
  const added=await request('/api/vault',{nome:'Cofre de teste',login:'teste',secret:'segredo-isolado-nunca-producao',departamento:'Fiscal'});
  expect(added.response.status).toBe(201);const entry=added.json.entry as {id:string};
  const rows=await app.db.query<{ciphertext:string}>('SELECT ciphertext FROM app_private.vault_secrets WHERE id=$1',[entry.id]);expect(rows.rows[0].ciphertext).not.toContain('segredo-isolado');
  expect((await request(`/api/vault/${entry.id}/reveal`,{},'')).response.status).toBe(401);
  expect((await request(`/api/vault/${entry.id}/reveal`,{})).json.secret).toBe('segredo-isolado-nunca-producao');
  const list=await request('/api/vault');expect(JSON.stringify(list.json)).not.toContain('segredo-isolado');
 });
 it('protege as credenciais da Evolution API e entrega QR Code sem expor a chave',async()=>{
  expect((await request('/api/whatsapp/config',{provider:'evolution',baseUrl:'nao-e-url',instanceName:'x',apiKey:'curta'})).response.status).toBe(400);
  expect((await request('/api/whatsapp/config',{...CREDENCIAIS_EVOLUTION,provider:'z-api'})).response.status).toBe(400);
  const saved=await request('/api/whatsapp/config',CREDENCIAIS_EVOLUTION);expect(saved.response.status).toBe(200);
  const rows=await app.db.query<{ciphertext:string;metadata:Record<string,unknown>}>("SELECT ciphertext,metadata FROM app_private.vault_secrets WHERE metadata->>'nome'='Evolution WhatsApp'");
  expect(rows.rows).toHaveLength(1);
  expect(rows.rows[0].ciphertext).not.toContain(CREDENCIAIS_EVOLUTION.apiKey);
  expect(JSON.stringify(rows.rows[0].metadata)).not.toContain(CREDENCIAIS_EVOLUTION.apiKey);
  const status=await request('/api/whatsapp/status');expect(status.json).toMatchObject({configured:true,connected:false,smartphoneConnected:false,detail:'close'});
  expect(JSON.stringify(status.json)).not.toContain(CREDENCIAIS_EVOLUTION.apiKey);
  const qr=await request('/api/whatsapp/qr',{});expect(qr.response.status).toBe(200);expect(String(qr.json.qrCode)).toMatch(/^data:image\/png;base64,/);
  const chamadas=evolutionCalls.filter(call=>call.url.startsWith(CREDENCIAIS_EVOLUTION.baseUrl));
  expect(chamadas.some(call=>call.url.endsWith(`/instance/connectionState/${CREDENCIAIS_EVOLUTION.instanceName}`))).toBe(true);
  expect(chamadas.some(call=>call.url.endsWith(`/instance/connect/${CREDENCIAIS_EVOLUTION.instanceName}`))).toBe(true);
  expect(chamadas.every(call=>call.apiKey===CREDENCIAIS_EVOLUTION.apiKey)).toBe(true);
  expect((await request('/api/whatsapp/status',undefined,'')).response.status).toBe(401);
  expect((await request('/api/whatsapp/qr',{},'')).response.status).toBe(401);
 });
 it('recebe mensagem pelo webhook e envia resposta pela Evolution API',async()=>{
  const recebido=await request('/api/webhooks/evolution/messages-upsert',{event:'messages.upsert',instance:CREDENCIAIS_EVOLUTION.instanceName,data:{key:{remoteJid:'5562999990000@s.whatsapp.net',fromMe:false,id:'ABC123'},message:{conversation:'Preciso do DAS deste mês.'}}},'');
  expect(recebido.response.status).toBe(202);
  const comWebhook=await request('/api/state',undefined,adminCookie);
  const conversa=(comWebhook.json.state as AppState).conversas.find(item=>String(item.telefone)==='5562999990000');
  expect(conversa).toBeDefined();
  expect(conversa!.origem).toBe('WhatsApp');
  const mensagens=conversa!.mensagens as {texto:string;autor:string}[];
  expect(mensagens.at(-1)).toMatchObject({texto:'Preciso do DAS deste mês.',autor:'cliente'});
  const textoExtendido=await request('/api/webhooks/evolution/messages-upsert',{event:'messages.upsert',data:{key:{remoteJid:'5562999990000@s.whatsapp.net',fromMe:false,id:'ABC124'},message:{extendedTextMessage:{text:'Segue o comprovante.'}}}},'');
  expect(textoExtendido.response.status).toBe(202);
  const enviado=await request('/api/whatsapp/send',{telefone:'(62) 99999-0000',text:'Recebemos, vamos verificar.'},adminCookie);
  expect(enviado.response.status).toBe(200);expect(enviado.json).toMatchObject({sent:true});
  const envio=evolutionCalls.filter(call=>call.url.endsWith(`/message/sendText/${CREDENCIAIS_EVOLUTION.instanceName}`)).at(-1)!;
  expect(JSON.parse(envio.body)).toEqual({number:'5562999990000',text:'Recebemos, vamos verificar.'});
  const depois=await request('/api/state',undefined,adminCookie);
  const atualizada=(depois.json.state as AppState).conversas.find(item=>String(item.telefone)==='5562999990000')!;
  const historico=atualizada.mensagens as {texto:string;autor:string}[];
  expect(historico).toHaveLength(3);
  expect(historico.map(item=>item.autor)).toEqual(['cliente','cliente','equipe']);
  expect((await request('/api/whatsapp/send',{telefone:'5562999990000',text:'Sem sessão'},'')).response.status).toBe(401);
  expect((await request('/api/whatsapp/send',{telefone:'',text:''},adminCookie)).response.status).toBe(400);
 });
 it('atribui o autor pelo fromMe, marca a origem e não duplica o que o sistema enviou',async()=>{
  const conversa=async()=>{
   const atual=await request('/api/state',undefined,adminCookie);
   return (atual.json.state as AppState).conversas.find(item=>String(item.telefone)==='5562999990000')!;
  };
  const antes=await conversa();
  const historicoAntes=(antes.mensagens as {texto:string}[]).length;
  // A Evolution devolve pelo webhook a mensagem que a própria API enviou.
  const enviadaPeloSistema=(antes.mensagens as {externoId:string|null}[]).at(-1)!.externoId;
  expect(enviadaPeloSistema).toBe('mensagem-de-teste');
  const eco=await request('/api/webhooks/evolution/messages-upsert',{event:'messages.upsert',data:{key:{remoteJid:'5562999990000@s.whatsapp.net',fromMe:true,id:'mensagem-de-teste'},message:{conversation:'Recebemos, vamos verificar.'}}},'');
  expect(eco.response.status).toBe(202);
  expect(((await conversa()).mensagens as unknown[]).length).toBe(historicoAntes);
  // Mensagem que Gilmar mandou pelo celular entra como da equipe, não do cliente.
  await request('/api/webhooks/evolution/messages-upsert',{event:'messages.upsert',data:{key:{remoteJid:'5562999990000@s.whatsapp.net',fromMe:true,id:'do-celular'},message:{conversation:'Respondi por aqui mesmo.'}}},'');
  const comCelular=await conversa();
  const ultima=(comCelular.mensagens as {texto:string;autor:string;origem:string}[]).at(-1)!;
  expect(ultima).toMatchObject({texto:'Respondi por aqui mesmo.',autor:'equipe',origem:'Dispositivo externo'});
  expect(comCelular.ultimaMensagem).toBe('Respondi por aqui mesmo.');
  // Mensagem de grupo não vira conversa de cliente.
  await request('/api/webhooks/evolution/messages-upsert',{event:'messages.upsert',data:{key:{remoteJid:'120363000000000000@g.us',fromMe:false,id:'do-grupo'},message:{conversation:'Mensagem de grupo'}}},'');
  const depois=await request('/api/state',undefined,adminCookie);
  expect((depois.json.state as AppState).conversas.some(item=>String(item.telefone).startsWith('12036'))).toBe(false);
 });
 it('fecha o webhook da Evolution assim que existe token configurado',async()=>{
  const comToken={...CREDENCIAIS_EVOLUTION,webhookToken:'token-de-webhook-para-teste'};
  expect((await request('/api/whatsapp/config',comToken,adminCookie)).response.status).toBe(200);
  const semToken=await fetch(`${base}/api/webhooks/evolution/messages-upsert`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'messages.upsert',data:{key:{remoteJid:'5562988880000@s.whatsapp.net',fromMe:false,id:'sem-token'},message:{conversation:'Mensagem sem token'}}})});
  expect(semToken.status).toBe(401);
  const tokenErrado=await fetch(`${base}/api/webhooks/evolution/messages-upsert`,{method:'POST',headers:{'Content-Type':'application/json','x-webhook-token':'token-errado-de-tamanho-x'},body:JSON.stringify({event:'messages.upsert',data:{key:{remoteJid:'5562988880000@s.whatsapp.net',fromMe:false,id:'token-errado'},message:{conversation:'Mensagem com token errado'}}})});
  expect(tokenErrado.status).toBe(401);
  const correto=await fetch(`${base}/api/webhooks/evolution/messages-upsert`,{method:'POST',headers:{'Content-Type':'application/json','x-webhook-token':'token-de-webhook-para-teste'},body:JSON.stringify({event:'messages.upsert',data:{key:{remoteJid:'5562988880000@s.whatsapp.net',fromMe:false,id:'com-token'},message:{conversation:'Mensagem autorizada'}}})});
  expect(correto.status).toBe(202);
  const atual=await request('/api/state',undefined,adminCookie);
  const conversa=(atual.json.state as AppState).conversas.find(item=>String(item.telefone)==='5562988880000');
  expect(conversa).toBeDefined();
  expect((conversa!.mensagens as {texto:string}[]).map(item=>item.texto)).toEqual(['Mensagem autorizada']);
  // Volta ao estado sem token para não afetar os testes seguintes.
  expect((await request('/api/whatsapp/config',CREDENCIAIS_EVOLUTION,adminCookie)).response.status).toBe(200);
 });
 it('guarda o token da Autentique no cofre e protege o webhook de assinatura',async()=>{
  expect((await request('/api/autentique/config',{token:'curto'},adminCookie)).response.status).toBe(400);
  const salvo=await request('/api/autentique/config',{token:'token-da-autentique-apenas-para-teste',webhookToken:'webhook-autentique-teste'},adminCookie);
  expect(salvo.response.status).toBe(200);
  const rows=await app.db.query<{ciphertext:string;metadata:Record<string,unknown>}>("SELECT ciphertext,metadata FROM app_private.vault_secrets WHERE metadata->>'nome'='Autentique'");
  expect(rows.rows).toHaveLength(1);
  expect(rows.rows[0].ciphertext).not.toContain('token-da-autentique');
  expect(JSON.stringify(rows.rows[0].metadata)).not.toContain('token-da-autentique');
  const status=await request('/api/autentique/status',undefined,adminCookie);
  expect(status.json).toMatchObject({configured:true,webhookProtegido:true});
  expect(JSON.stringify(status.json)).not.toContain('token-da-autentique');
  expect((await request('/api/autentique/status',undefined,'')).response.status).toBe(401);
  const semToken=await fetch(`${base}/api/webhooks/autentique`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'document.signed',document:{id:'doc-1'}})});
  expect(semToken.status).toBe(401);
  const comToken=await fetch(`${base}/api/webhooks/autentique`,{method:'POST',headers:{'Content-Type':'application/json','x-webhook-token':'webhook-autentique-teste'},body:JSON.stringify({event:'document.signed',document:{id:'doc-inexistente'}})});
  expect(comToken.status).toBe(202);
 });
 it('armazena arquivos privados e impede metadados de upload forjados',async()=>{
  const upload=await request('/api/documents',{name:'verificacao.txt',mimeType:'text/plain',contentBase64:Buffer.from('Documento exclusivo do teste').toString('base64'),tipo:'Protocolo',departamento:'Fiscal'});
  expect(upload.response.status).toBe(201);state=upload.json.state as AppState;const doc=upload.json.document as {id:string};
  const privateResponse=await fetch(`${base}/api/documents/${doc.id}`);expect(privateResponse.status).toBe(401);
  const download=await fetch(`${base}/api/documents/${doc.id}`,{headers:{Cookie:cookie}});expect(await download.text()).toBe('Documento exclusivo do teste');expect(download.headers.get('content-disposition')).toContain('attachment');
  expect((await request('/api/command',{expectedVersion:state.meta.revision,command:{type:'save',collection:'documentos',data:{nome:'Falso',tipo:'Protocolo',arquivoId:doc.id}}})).response.status).toBe(400);
 });
 it('restringe contas de leitura e documentos de outros departamentos',async()=>{
  const created=await request('/api/users',{nome:'Pessoa de leitura',email:'reader@example.test',password:'reader-password-strong-2026',papel:'leitura',departamentos:['Administrativo']});expect(created.response.status).toBe(201);
  await request('/api/logout',{});
  const login=await request('/api/login',{email:'reader@example.test',password:'reader-password-strong-2026'},'');expect(login.response.status).toBe(200);cookie=login.setCookie!.split(';')[0];state=login.json.state as AppState;
  expect((await request('/api/command',{expectedVersion:state.meta.revision,command:{type:'save',collection:'metas',data:{nome:'Sem permissão'}}})).response.status).toBeGreaterThanOrEqual(400);
  expect((await request('/api/users')).response.status).toBe(403);expect((await request('/api/vault')).response.status).toBe(403);
  expect(state.documentos).toHaveLength(0);
 });
 it('mantém RLS ativo em todas as tabelas e sessões são revogadas no logout',async()=>{
  const tables=await app.db.query<{relname:string;relrowsecurity:boolean}>("SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app_private' AND c.relkind='r'");expect(tables.rows.length).toBe(6);expect(tables.rows.every(row=>row.relrowsecurity)).toBe(true);
  const hashes=await app.db.query<{password_hash:string}>('SELECT password_hash FROM app_private.accounts');expect(hashes.rows.every(row=>row.password_hash.startsWith('scrypt:'))).toBe(true);expect(JSON.stringify(hashes.rows)).not.toContain('test-password');
  await request('/api/logout',{});expect((await request('/api/state')).response.status).toBe(401);
  const login=await request('/api/login',{email:'admin@example.test',password:'test-password-strong-2026'},'');cookie=login.setCookie!.split(';')[0];adminCookie=cookie;
 });
 it('trata duas gravações simultâneas sem perder dados',async()=>{
  const current=await request('/api/state');const revision=(current.json.state as AppState).meta.revision;
  const responses=await Promise.all([request('/api/command',{expectedVersion:revision,command:{type:'save',collection:'metas',data:{nome:'Concorrente A'}}}),request('/api/command',{expectedVersion:revision,command:{type:'save',collection:'metas',data:{nome:'Concorrente B'}}})]);
  expect(responses.map(result=>result.response.status).sort()).toEqual([200,409]);
 });
 it('revoga a sessão ao desativar uma conta e protege o último sócio',async()=>{
  const reader=await request('/api/login',{email:'reader@example.test',password:'reader-password-strong-2026'},'');const readerSession=reader.setCookie!.split(';')[0];const readerActor=reader.json.actor as {id:string};
  expect((await request('/api/state',undefined,readerSession)).response.status).toBe(200);
  const patch=await fetch(`${base}/api/users/${readerActor.id}`,{method:'PATCH',headers:{'Content-Type':'application/json',Origin:origin,Cookie:adminCookie},body:JSON.stringify({ativo:false})});expect(patch.status).toBe(200);
  expect((await request('/api/state',undefined,readerSession)).response.status).toBe(401);
  const active=await request('/api/session',undefined,adminCookie);const admin=active.json.actor as {id:string};
  const demote=await fetch(`${base}/api/users/${admin.id}`,{method:'PATCH',headers:{'Content-Type':'application/json',Origin:origin,Cookie:adminCookie},body:JSON.stringify({papel:'leitura'})});expect(demote.status).toBe(400);
 });
 it('preserva os dados e o cofre depois de reiniciar o servidor',async()=>{
  await app.close();app=await createApp({dataDirectory:directory,providerFetch});await new Promise<void>(resolve=>app.server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  const result=await request('/api/state',undefined,adminCookie);expect(result.response.status).toBe(200);expect((result.json.state as AppState).metas.some(item=>item.nome==='Meta de teste isolado')).toBe(true);
  const list=await request('/api/vault',undefined,adminCookie);const entry=(list.json.entries as {id:string;nome:string}[]).find(item=>item.nome==='Cofre de teste')!;expect((await request(`/api/vault/${entry.id}/reveal`,{},adminCookie)).json.secret).toBe('segredo-isolado-nunca-producao');
 });
});

