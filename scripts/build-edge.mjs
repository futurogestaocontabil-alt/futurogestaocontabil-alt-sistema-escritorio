import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
for (const relative of ['src/types', 'src/services/domain']) {
  const from = path.join(root, relative);
  const to = path.join(root, 'supabase/functions/_shared', relative);
  await mkdir(to, { recursive: true });
  for (const file of await readdir(from)) {
    if (!file.endsWith('.ts')) continue;
    const content = await readFile(path.join(from, file), 'utf8');
    const denoContent = content.replace(/(from\s+['"])(\.[^'"]+)(['"])/g, (_, prefix, specifier, suffix) => `${prefix}${specifier.endsWith('.ts') ? specifier : `${specifier}.ts`}${suffix}`);
    await writeFile(path.join(to, file), denoContent, 'utf8');
  }
}
console.info('Regras de domínio copiadas para a Edge Function. Nenhum arquivo foi publicado.');
