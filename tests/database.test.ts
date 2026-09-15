import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { createInitialState } from '../src/services/domain/seed';

let db:PGlite;
const user1='11111111-1111-4111-8111-111111111111';const user2='22222222-2222-4222-8222-222222222222';
const org1='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';const org2='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
beforeAll(async()=>{
 db=await PGlite.create();
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE SQL STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA auth TO authenticated,service_role; GRANT SELECT ON auth.users TO service_role; CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint);`);
 const sql=await readFile(new URL('../supabase/migrations/20260907030654_plataforma_futuro_security.sql',import.meta.url),'utf8');await db.exec(sql);
 await db.query('INSERT INTO auth.users(id) VALUES($1),($2)',[user1,user2]);
 await db.query('SELECT public.futuro_bootstrap($1,$2,$3,$4::jsonb)',[user1,org1,'Administrador A',JSON.stringify(createInitialState(org1))]);
 await db.query('SELECT public.futuro_bootstrap($1,$2,$3,$4::jsonb)',[user2,org2,'Administrador B',JSON.stringify(createInitialState(org2))]);
},30_000);
afterAll(async()=>{if(db)await db.close();});
describe.sequential('Migração Supabase validada em PostgreSQL local isolado',()=>{
 it('ativa RLS e mantém buckets privados',async()=>{
  const result=await db.query<{relrowsecurity:boolean}>("SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname LIKE 'futuro_%' AND c.relkind='r'");expect(result.rows).toHaveLength(6);expect(result.rows.every(row=>row.relrowsecurity)).toBe(true);
  const bucket=await db.query<{public:boolean}>('SELECT public FROM storage.buckets WHERE id=$1',['futuro-private']);expect(bucket.rows[0].public).toBe(false);
 });
 it('permite leitura somente da própria associação e nega leitura direta de estados',async()=>{
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user1]);await db.exec('SET ROLE authenticated');
  try {const result=await db.query<{user_id:string}>('SELECT user_id FROM public.futuro_memberships');expect(result.rows).toEqual([{user_id:user1}]);await expect(db.query('SELECT * FROM public.futuro_states')).rejects.toThrow();}finally{await db.exec('RESET ROLE');}
 });
 it('nega RPC de mutação ao navegador mesmo autenticado',async()=>{
  await db.exec('SET ROLE authenticated');
  try {await expect(db.query('SELECT public.futuro_commit($1,$2,$3,$4::jsonb)',[user1,org1,0,JSON.stringify({...createInitialState(org1),meta:{version:1,revision:1,organizacaoId:org1}})])).rejects.toThrow();}finally{await db.exec('RESET ROLE');}
 });
 it('mantém o CAS e recusa cruzamento de organização no serviço',async()=>{
  const next=createInitialState(org1);next.meta.revision=1;await db.exec('SET ROLE service_role');
  try {
   await expect(db.query('SELECT public.futuro_commit($1,$2,$3,$4::jsonb)',[user2,org1,0,JSON.stringify(next)])).rejects.toThrow('ACCESS_DENIED');
   const result=await db.query<{futuro_commit:number}>('SELECT public.futuro_commit($1,$2,$3,$4::jsonb)',[user1,org1,0,JSON.stringify(next)]);expect(result.rows[0].futuro_commit).toBe(1);
   await expect(db.query('SELECT public.futuro_commit($1,$2,$3,$4::jsonb)',[user1,org1,0,JSON.stringify(next)])).rejects.toThrow('REVISION_CONFLICT');
  }finally{await db.exec('RESET ROLE');}
 });
});
