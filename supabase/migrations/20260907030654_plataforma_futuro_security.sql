-- Prepared locally. Apply only to a dedicated, explicitly selected Supabase project.
create table public.futuro_organizations (
  id uuid primary key, nome text not null,
  created_at timestamptz not null default now()
);
create table public.futuro_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organizacao_id uuid not null references public.futuro_organizations(id) on delete cascade,
  nome text not null, papel text not null check (papel in ('socio','operacao','administrativo','leitura')),
  departamentos jsonb not null default '[]', ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index futuro_memberships_org_idx on public.futuro_memberships(organizacao_id);
create table public.futuro_states (
  organizacao_id uuid primary key references public.futuro_organizations(id) on delete cascade,
  revision integer not null default 0 check(revision>=0),
  content jsonb not null,
  updated_at timestamptz not null default now(),
  constraint state_revision_matches check ((content->'meta'->>'revision')::integer=revision),
  constraint state_org_matches check (content->'meta'->>'organizacaoId'=organizacao_id::text)
);
create table public.futuro_files (
  id uuid primary key, organizacao_id uuid not null references public.futuro_organizations(id) on delete cascade,
  storage_path text not null unique, original_name text not null, mime_type text not null,
  bytes integer not null check (bytes>0 and bytes<=10485760),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.futuro_vault (
  id uuid primary key, organizacao_id uuid not null references public.futuro_organizations(id) on delete cascade,
  ciphertext text not null, metadata jsonb not null,
  created_at timestamptz not null default now()
);
create table public.futuro_security_events (
  id bigint generated always as identity primary key,
  organizacao_id uuid not null references public.futuro_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id), action text not null, target_id text,
  created_at timestamptz not null default now()
);
alter table public.futuro_organizations enable row level security;
alter table public.futuro_memberships enable row level security;
alter table public.futuro_states enable row level security;
alter table public.futuro_files enable row level security;
alter table public.futuro_vault enable row level security;
alter table public.futuro_security_events enable row level security;
revoke all on public.futuro_organizations,public.futuro_memberships,public.futuro_states,public.futuro_files,public.futuro_vault,public.futuro_security_events from anon,authenticated;
grant select on public.futuro_memberships to authenticated;
create policy membership_self_read on public.futuro_memberships for select to authenticated using ((select auth.uid())=user_id and ativo);
grant all on public.futuro_organizations,public.futuro_memberships,public.futuro_states,public.futuro_files,public.futuro_vault,public.futuro_security_events to service_role;
grant usage,select on sequence public.futuro_security_events_id_seq to service_role;

-- Service-only, security invoker: no definer bypass exposed to browser roles.
create function public.futuro_bootstrap(p_user_id uuid,p_org_id uuid,p_nome text,p_content jsonb)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'AUTH_REQUIRED'; end if;
  if exists(select 1 from public.futuro_memberships where user_id=p_user_id) then raise exception 'ALREADY_CONFIGURED'; end if;
  insert into public.futuro_organizations(id,nome) values(p_org_id,'Futuro Contabilidade Digital');
  insert into public.futuro_memberships(user_id,organizacao_id,nome,papel,departamentos)
    values(p_user_id,p_org_id,p_nome,'socio','["Fiscal","Pessoal","Contábil","Paralegal e Legalização","Financeiro"]');
  insert into public.futuro_states(organizacao_id,revision,content) values(p_org_id,(p_content->'meta'->>'revision')::integer,p_content);
end;
$$;
create function public.futuro_commit(p_user_id uuid,p_org_id uuid,p_expected_revision integer,p_content jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare result_revision integer;
begin
  if not exists(select 1 from public.futuro_memberships where user_id=p_user_id and organizacao_id=p_org_id and ativo and papel<>'leitura') then raise exception 'ACCESS_DENIED'; end if;
  if (p_content->'meta'->>'revision')::integer <> p_expected_revision+1 then raise exception 'INVALID_REVISION'; end if;
  update public.futuro_states set content=p_content,revision=p_expected_revision+1,updated_at=now()
    where organizacao_id=p_org_id and revision=p_expected_revision returning revision into result_revision;
  if result_revision is null then raise exception 'REVISION_CONFLICT'; end if;
  return result_revision;
end;
$$;
revoke all on function public.futuro_bootstrap(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.futuro_commit(uuid,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.futuro_bootstrap(uuid,uuid,text,jsonb) to service_role;
grant execute on function public.futuro_commit(uuid,uuid,integer,jsonb) to service_role;

-- Objects are only reachable through the authenticated Edge handler after domain checks.
insert into storage.buckets(id,name,public,file_size_limit) values('futuro-private','futuro-private',false,10485760) on conflict(id) do nothing;
