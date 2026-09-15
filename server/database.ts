import { PGlite } from '@electric-sql/pglite';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { COLLECTIONS, type AppState } from '../src/types/domain';

export const LOCAL_ORG_ID = 'futuro';
export async function openDatabase(dataDirectory: string) {
  await mkdir(dataDirectory, { recursive: true });
  const db = await PGlite.create(path.join(dataDirectory, 'database'));
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS app_private;
    CREATE TABLE IF NOT EXISTS app_private.accounts (
      id text PRIMARY KEY, org_id text NOT NULL, email text NOT NULL UNIQUE,
      nome text NOT NULL, papel text NOT NULL CHECK (papel IN ('socio','operacao','administrativo','leitura')),
      departamentos jsonb NOT NULL DEFAULT '[]', password_hash text NOT NULL,
      ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS app_private.sessions (
      token_hash text PRIMARY KEY, account_id text NOT NULL REFERENCES app_private.accounts(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS app_private.app_states (
      org_id text PRIMARY KEY, revision integer NOT NULL DEFAULT 0 CHECK (revision>=0),
      content jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS app_private.files (
      id text PRIMARY KEY, org_id text NOT NULL, filename text NOT NULL, original_name text NOT NULL,
      mime_type text NOT NULL, bytes integer NOT NULL CHECK(bytes>0 AND bytes<=10485760),
      created_by text NOT NULL REFERENCES app_private.accounts(id), created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS app_private.vault_secrets (
      id text PRIMARY KEY, org_id text NOT NULL, ciphertext text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS app_private.security_events (
      id bigserial PRIMARY KEY, account_id text, action text NOT NULL, target_id text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE app_private.accounts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE app_private.sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE app_private.app_states ENABLE ROW LEVEL SECURITY;
    ALTER TABLE app_private.files ENABLE ROW LEVEL SECURITY;
    ALTER TABLE app_private.vault_secrets ENABLE ROW LEVEL SECURITY;
    ALTER TABLE app_private.security_events ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
    REVOKE ALL ON ALL TABLES IN SCHEMA app_private FROM PUBLIC;
    ALTER TABLE app_private.accounts ADD COLUMN IF NOT EXISTS member_id text; UPDATE app_private.accounts SET member_id=id WHERE member_id IS NULL; CREATE UNIQUE INDEX IF NOT EXISTS accounts_member_idx ON app_private.accounts(org_id,member_id); CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON app_private.sessions(expires_at);
  `);
  return db;
}
export type Database = Awaited<ReturnType<typeof openDatabase>>;
function normalizeState(state: AppState): AppState {
  const next = structuredClone(state);
  for (const collection of COLLECTIONS) next[collection] = next[collection] ?? [];
  return next;
}
export async function readState(db: Database, orgId: string): Promise<AppState> {
  const result = await db.query<{content: AppState}>('SELECT content FROM app_private.app_states WHERE org_id=$1', [orgId]);
  if (!result.rows[0]) throw new Error('A organização ainda não foi configurada.');
  return normalizeState(result.rows[0].content);
}
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function updateState(db: Database, orgId: string, expectedRevision: number, change: (state: AppState) => AppState): Promise<AppState> {
  return db.transaction(async tx => {
    const result = await tx.query<{content: AppState; revision: number}>('SELECT content, revision FROM app_private.app_states WHERE org_id=$1 FOR UPDATE', [orgId]);
    const row = result.rows[0];
    if (!row) throw new ApiError(409, 'Configure a organização primeiro.');
    if (row.revision !== expectedRevision) throw new ApiError(409, 'Outra pessoa alterou os dados. Atualize a tela e tente novamente.');
    const next = change(normalizeState(row.content));
    next.meta.revision = row.revision + 1;
    const updated = await tx.query('UPDATE app_private.app_states SET content=$1::jsonb,revision=revision+1,updated_at=now() WHERE org_id=$2 AND revision=$3 RETURNING revision', [JSON.stringify(next), orgId, expectedRevision]);
    if (updated.rows.length !== 1) throw new ApiError(409, 'Os dados foram alterados. Atualize a tela.');
    return next;
  });
}

