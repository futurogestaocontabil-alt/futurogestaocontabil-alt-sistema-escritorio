# Validação da entrega local

Data: 07/09/2026.

## Evidências

- 29 testes automatizados passaram: domínio, API local e migração SQL em banco isolado.
- Compilação e análise TypeScript concluídas com `npm run build`.
- Tela inicial aberta e conferida no navegador em uma instância isolada.
- Não foi configurada senha padrão nem criado acesso de produção para o usuário.
- Corrigidas conclusão antecipada de processo, recorrências fora da periodicidade, vencimentos no último dia do mês e escrita indireta por perfil de leitura.

## Alcance

Os testes incluem travas de checklist, campos obrigatórios, preços, recorrências sem duplicação, permissões, isolamento SQL, sessão, documentos e cofre. Não equivalem à homologação com Daniel e Tamires nem a testes de serviços externos.

## Critérios ainda não homologados integralmente

- Job automático de competências: geração manual disponível; agendamento de produção pendente.
- WhatsApp e fluxo real de três cliques: atendimento manual disponível; webhook externo pendente.
- Motor comercial contra dez casos reais: testes de regras disponíveis; casos reais não fornecidos.
- Contratos e assinatura: modelos completos e provedor pendentes.
- Cora, emissão de NFS-e e conciliação bancária: integrações pendentes.
- Todos os KPIs do escopo e comparação com a base antiga: requerem importação e reconciliação dos dados.
- Cadastro autônomo por Tamires: precisa de validação com a própria usuária.
- Migração integral, publicação Supabase/Vercel e desligamento dos sistemas anteriores: não executados.

A entrega atual é um MVP local. O escopo integral não deve ser declarado concluído ou pronto para produção antes dessas etapas.
