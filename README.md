# Plataforma Futuro

Sistema da Futuro Contabilidade Digital salvo em `C:\projetos\codex\sistema escritorio`.

## Estado da entrega

MVP local implementado em React, Vite e TypeScript, com servidor Node e PostgreSQL embarcado (PGlite). Inclui autenticação, painel, CRM e propostas, clientes, tarefas e recorrências, legalização com checklists, registros financeiros, atendimento manual, portfólio, documentos privados e configurações de acesso.

Esta edição funciona neste computador. A arquitetura e a migração Supabase estão preparadas, mas não foram implantadas. Nenhum arquivo foi publicado nem sistema anterior foi desligado.

## Como abrir

1. Abra `INICIAR-PLATAFORMA.cmd` nesta pasta.
2. Aguarde a mensagem de servidor disponível.
3. Acesse http://127.0.0.1:4318 no navegador.
4. No primeiro acesso, cadastre seu nome, e-mail e uma senha de pelo menos 12 caracteres. Não há senha padrão.
5. Mantenha a janela do servidor aberta durante o uso. Para encerrar, pressione Ctrl+C nela.

As dependências e a compilação estão salvas. O comando de início executa a compilação existente. Depois de alterar código, execute `npm run build` antes de iniciar.

## Verificações

- `npm run typecheck`: análise de tipos.
- `npm test`: regras de negócio, permissões, persistência e migração em banco isolado.
- `npm run build`: compilação da interface.
- `npm run dev`: desenvolvimento em http://127.0.0.1:4317.

## Dados e cópia de segurança

Os dados locais ficam em `.local-data`, fora dos arquivos públicos. Para fazer backup, encerre o servidor e copie essa pasta inteira para um local protegido. Preserve `vault.key` junto ao banco: sem essa chave, os segredos do cofre não podem ser recuperados. O backup contém dados confidenciais.

O documento original está em `docs/private`; a cópia sanitizada está em `docs/requisitos/escopo-plataforma-futuro.md`. `.local-data`, `docs/private` e arquivos de ambiente estão excluídos do Git. Nunca selecione essas pastas para upload público.

## Limites e próximos requisitos

Integrações de WhatsApp, NFS-e, assinatura e automações externas não estão conectadas. Não há importação das bases antigas. A tabela de Indústria e os modelos completos de contrato não foram fornecidos. O cálculo de Indústria permanece bloqueado para evitar preço inventado. Propostas e recorrências precisam de validação operacional com dados reais antes da adoção pela equipe.

Consulte `docs/pendencias.md`, `docs/estrutura.md` e `docs/arquitetura/backend.md` para detalhes. Todo código e documentação devem permanecer salvos nesta pasta antes de qualquer publicação.
