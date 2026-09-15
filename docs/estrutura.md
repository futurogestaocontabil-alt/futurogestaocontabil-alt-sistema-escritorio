# Estrutura local da Plataforma Futuro

Pasta principal: C:\projetos\codex\sistema escritorio

| Caminho | Finalidade |
|---|---|
| src/components | Componentes reutilizáveis de interface |
| src/components/ui | Componentes de interface base |
| src/pages | Páginas dos módulos |
| src/hooks | Hooks React |
| src/services/domain | Regras de negócio |
| src/services/supabase | Acesso ao banco e autenticação |
| src/services/integrations | Adaptadores de integrações |
| src/types | Tipos das entidades e contratos de dados |
| src/utils | Utilitários puros |
| src/lib | Configuração compartilhada de bibliotecas |
| src/assets | Recursos usados pela aplicação |
| public/brand | Logo e recursos públicos da marca |
| supabase/migrations | Migração SQL com RLS testada em banco isolado |
| supabase/functions | Funções de servidor |
| supabase/tests | Validações de banco, permissões e travas |
| scripts/migration | Ferramentas de migração a implementar |
| scripts/validation | Ferramentas de conferência a implementar |
| tests | Testes de comportamento e fluxos |
| docs/requisitos | Escopo sanitizado e requisitos |
| docs/arquitetura | Decisões de arquitetura |
| docs/private | Original sensível e registro local, excluídos do Git |

## Módulos da edição local

Dashboard, CRM, Atendimento, Clientes, Legalização, Tarefas, Financeiro, Portfólio de Serviços, Escritório, Documentos e Configurações.

## Ordem registrada no escopo

1. Fundação.
2. Operação.
3. Atendimento.
4. Tarefas recorrentes.
5. Comercial.
6. Financeiro.
7. Gestão.

A edição local está implementada. O servidor e a persistência ficam em server; os dados privados são criados em .local-data no primeiro uso. Integrações externas e implantação Supabase permanecem pendentes, conforme docs/pendencias.md.

