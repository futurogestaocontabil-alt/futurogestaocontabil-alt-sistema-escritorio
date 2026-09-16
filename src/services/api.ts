export class ApiError extends Error{constructor(message:string,public status:number){super(message);this.name='ApiError';}}
/**
 * Ambiente de demonstração: a interface não fala com servidor nenhum. As mesmas
 * rotas são atendidas dentro do navegador por `services/demonstracao`, com o
 * mesmo motor de regras. Ligado apenas pelo build `npm run build:demo`.
 */
export const MODO_DEMONSTRACAO=import.meta.env.VITE_MODO_DEMONSTRACAO==='1';

export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  if(MODO_DEMONSTRACAO){
    const {responder,DemoError}=await import('./demonstracao/servidor');
    try{return await responder<T>(path,options);}
    catch(causa){
      if(causa instanceof DemoError)throw new ApiError(causa.message,causa.status);
      throw new ApiError(causa instanceof Error?causa.message:'Não foi possível concluir a operação.',400);
    }
  }
  let response:Response;try{response=await fetch('/api'+path,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...options.headers}});}catch{throw new ApiError('Não foi possível acessar o servidor local. Abra INICIAR-PLATAFORMA.cmd e tente novamente.',0);}const body:unknown=await response.json().catch(()=>null);if(!response.ok){const b=body as {error?:string;message?:string}|null;throw new ApiError(b?.error||b?.message||'Não foi possível concluir a operação.',response.status);}return body as T;}
export const post=<T>(path:string,data:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(data)});
