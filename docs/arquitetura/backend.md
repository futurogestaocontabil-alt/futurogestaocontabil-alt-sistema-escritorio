# Servidor e persistência

## Execução entregue

A edição local roda em React/Vite e servidor Node ligado exclusivamente a `127.0.0.1`. O servidor responde em `http://127.0.0.1:4318`; durante desenvolvimento, a interface usa a porta 4317 com proxy `/api`.

Os dados são persistidos em PostgreSQL embarcado com PGlite, dentro de `.local-data/database`. O usuário configura o primeiro administrador na primeira abertura. Não existe senha padrão. Não foram inseridos clientes fictícios ou documentos reais de clientes para testes.

A sessão dura oito horas e fica em cookie HttpOnly e SameSite Strict. Senhas são derivadas com scrypt e salt aleatório. A API rejeita origens externas, valida entradas, aplica limitação de tentativas de login e filtra os registros de acordo com perfil e departamento. Alterações sensíveis de conta revogam suas sessões. Somente sócios gerenciam acessos e nunca é possível remover o último sócio ativo.

A confirmação de gravação depende de uma transação do PostgreSQL com comparação da revisão. Alterações concorrentes recebem conflito HTTP 409 para impedir que uma tela antiga sobrescreva o trabalho de outra pessoa.

Todas as seis tabelas locais ficam no schema privado `app_private`, com RLS habilitado, sem permissões públicas. O servidor utiliza a conexão proprietária privada e aplica a autorização de domínio. O navegador não possui conexão SQL, chave de serviço nem acesso direto aos arquivos.

## Documentos e cofre

Arquivos de até 10 MB ficam em `.local-data/documents` com nome aleatório, fora do diretório público. O download exige sessão e permissão sobre os metadados; sempre é entregue como anexo, com cache desativado. Arquivos não executam dentro da página.

O cofre guarda apenas metadados na listagem e criptografa os segredos com AES-256-GCM, autenticação por identificador e chave aleatória de 32 bytes em `.local-data/vault.key`. Somente sócios e operações dos departamentos permitidos podem revelar uma senha. Cada revelação deixa registro de auditoria sem o conteúdo da senha.

O cofre protege os dados persistidos, mas a conta Windows que executa a aplicação tem acesso à chave. Proteja o login do Windows e o backup. Uma cópia de segurança precisa incluir a pasta `.local-data` inteira, com o servidor desligado. Não copie apenas o banco: sem a chave original, os segredos não podem ser recuperados. Não exponha este servidor de uso local na internet.

## API local

| Rota | Uso |
|---|---|
| `GET /api/session` | Estado da configuração e conta conectada |
| `POST /api/setup` | Primeiro administrador: nome, email, password com pelo menos 12 caracteres |
| `POST /api/login` | Acesso com email e password |
| `POST /api/logout` | Revogação da sessão atual |
| `GET /api/state` | Estado autorizado e perfil atual |
| `POST /api/command` | `{ command, expectedVersion }`, com `expectedVersion = state.meta.revision` |
| `GET/POST /api/users` | Listagem e criação de acessos pelo sócio |
| `PATCH /api/users/:id` | Nome, papel, departamentos, ativo ou nova senha |
| `POST /api/documents` | nome/name, tipo, mimeType, contentBase64, clienteId opcional, departamento |
| `GET /api/documents/:id` | Download autorizado |
| `GET/POST /api/vault` | Metadados e criação de segredo cifrado |
| `POST /api/vault/:id/reveal` | Revelação autorizada e auditada |

## Caminho Supabase preparado

A migração em `supabase/migrations` foi criada pela CLI Supabase e testada em PostgreSQL PGlite isolado. As estruturas `auth` e `storage` foram simuladas apenas nesse teste. Isso valida a sintaxe, RLS, permissões, isolamento de associação e concorrência, mas não equivale a migração aplicada no Supabase remoto nem a teste de entrega do Storage remoto.

As tabelas de negócio remotas têm RLS ativo e acesso direto de `anon` e `authenticated` revogado. A tabela de associações permite que a pessoa autenticada leia apenas a própria associação ativa. RPCs de bootstrap e commit são `security invoker` e executáveis apenas pela função de serviço. A Edge Function verifica o JWT em `auth.getUser`, consulta a associação ativa e aplica exatamente as mesmas regras de domínio antes de salvar ou responder.

`node scripts/build-edge.mjs` copia as regras atuais de domínio para a pasta compartilhada da Edge Function. A função `futuro-api` implementa consulta e comandos, upload/download privado e cofre. O bucket `futuro-private` é privado e não oferece políticas de acesso direto pelo navegador. URLs de download emitidas pela função expiram em 60 segundos.

Nenhum projeto Supabase existente foi alterado. A função ainda não foi implantada nem validada em runtime Deno remoto. Para publicar depois, será necessário selecionar um projeto dedicado, aplicar a migração, configurar Auth, cadastrar as associações reais de usuários, configurar uma origem HTTPS permitida e publicar a função. O frontend local entregue continua sendo a opção testada de ponta a ponta.

Segredos remotos exclusivos do servidor: `SUPABASE_SERVICE_ROLE_KEY` (fornecido pelo runtime) e `FUTURO_VAULT_KEY` (32 bytes aleatórios codificados em base64). `FUTURO_ALLOWED_ORIGINS` deve conter os domínios HTTPS autorizados separados por vírgula. `FUTURO_ALLOW_BOOTSTRAP=true` libera a criação da primeira organização e deve permanecer desativado após a configuração. Nenhuma chave secreta usa prefixo `VITE_`.

## Fontes técnicas consultadas

- [PGlite API e transações](https://pglite.dev/docs/api)
- [Segurança de Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
- CLI Supabase instalada: `2.116.0`; comandos conferidos com `--help`.

A leitura do índice markdown de changelog falhou neste ambiente; as páginas atuais acima foram consultadas diretamente. Não foi feita consulta, alteração ou publicação em projetos remotos.
