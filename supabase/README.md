# Banco e funções de servidor

Migração SQL e Edge Function preparadas para um projeto Supabase dedicado. Nenhum projeto remoto foi alterado e nenhuma função foi publicada.

Os testes automatizados executam a migração em PostgreSQL PGlite isolado com estruturas Auth e Storage simuladas. Isso valida regras SQL e isolamento; não valida os serviços remotos.

A edição local usa o servidor em `server/`. Consulte `docs/arquitetura/backend.md` para autenticação, persistência, RLS, cofre e passos de implantação. Nunca exponha a chave service_role ao navegador.
