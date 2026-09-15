# Ambiente online de teste

## Arquitetura

- Vercel: interface React/Vite.
- Supabase: PostgreSQL, autenticação, Storage e RLS.
- Oracle Cloud Always Free: Docker, backend Node, Redis e Evolution API.
- Registro.br: DNS do domínio.

## Regra de segurança

O ambiente de teste usa banco e Storage separados. Não importar clientes reais antes da validação da equipe.

## Variáveis necessárias

Copie `.env.staging.example` para o ambiente correspondente. Nunca publique chaves privadas no repositório ou no navegador.

## Ordem de implantação

1. Criar o projeto Supabase de teste.
2. Aplicar as migrations e habilitar RLS.
3. Configurar o Storage privado para documentos.
4. Publicar o frontend na Vercel.
5. Publicar backend e Evolution em uma VM Docker.
6. Configurar o webhook HTTPS.
7. Apontar um subdomínio de teste do Registro.br.
8. Criar usuários da equipe e testar com dados fictícios.
