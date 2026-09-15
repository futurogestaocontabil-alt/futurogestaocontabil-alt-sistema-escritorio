import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Actor } from '../src/types/domain';
import { ApiError, type Database } from './database';
const scrypt = promisify(scryptCallback);
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export interface AccountRow { id: string; org_id: string; nome: string; email: string; papel: string; departamentos: string[]; password_hash: string; ativo: boolean; member_id: string }
export function actorFromRow(row: AccountRow): Actor {
  return { id: row.id, nome: row.nome, email: row.email, papel: row.papel, departamentos: row.departamentos, memberId: row.member_id };
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32).toString('hex');
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, saved: string): Promise<boolean> {
  const [algorithm, salt, hash] = saved.split(':');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const key = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return key.length === expected.length && timingSafeEqual(key, expected);
}
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export function sessionToken(req: IncomingMessage): string | undefined {
  return req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('futuro_session='))?.slice('futuro_session='.length);
}
export async function currentAccount(db: Database, req: IncomingMessage): Promise<AccountRow | null> {
  const token = sessionToken(req);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await db.query<AccountRow>(`SELECT a.* FROM app_private.accounts a JOIN app_private.sessions s ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>now() AND a.ativo=true`, [hashToken(token)]);
  return result.rows[0] ?? null;
}
export async function createSession(db: Database, accountId: string, res: ServerResponse) {
  await db.query('DELETE FROM app_private.sessions WHERE expires_at<=now()');
  const token = randomBytes(32).toString('hex');
  await db.query('INSERT INTO app_private.sessions(token_hash,account_id,expires_at) VALUES($1,$2,$3)', [hashToken(token), accountId, new Date(Date.now() + SESSION_TTL_MS).toISOString()]);
  res.setHeader('Set-Cookie', `futuro_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`);
}
export async function clearSession(db: Database, req: IncomingMessage, res: ServerResponse) {
  const token = sessionToken(req);
  if (token) await db.query('DELETE FROM app_private.sessions WHERE token_hash=$1', [hashToken(token)]);
  res.setHeader('Set-Cookie', 'futuro_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
}
export async function loadVaultKey(directory: string): Promise<Buffer> {
  const filename = path.join(directory, 'vault.key');
  try {
    const key = await readFile(filename);
    if (key.length !== 32) throw new Error('A chave do cofre local está inválida. Restaure a cópia de segurança.');
    return key;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const key = randomBytes(32);
    await writeFile(filename, key, { flag: 'wx', mode: 0o600 });
    return key;
  }
}
export function encryptSecret(value: string, key: Buffer, id: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(id));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.');
}
export function decryptSecret(value: string, key: Buffer, id: string): string {
  const [iv, tag, content] = value.split('.');
  if (!iv || !tag || !content) throw new ApiError(500, 'O registro do cofre está inválido.');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from(id));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(content, 'base64')), decipher.final()]).toString('utf8');
}

