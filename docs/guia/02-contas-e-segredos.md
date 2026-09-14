# 2. Contas e segredos

Você só precisa disto quando quiser **publicar** a aplicação. Para desenvolver no seu computador, nada aqui é necessário.

## Regra de ouro

- **Segredo** (senha, token, chave privada) nunca vai para arquivo do projeto, conversa com o agente ou print. Vai só para **GitHub → Settings → Secrets and variables → Actions → Secrets**.
- **Valor público** (URL do Supabase, chave *publishable*) vai em **Variables**, no mesmo lugar.
- Se um segredo vazar: **revogue e gere outro no painel do serviço**. Apagar o commit não resolve.

O Harness bloqueia segredos em commits, em arquivos editados pelo agente e no pacote publicado, mas a regra acima continua sendo sua.

## Dois ambientes

Crie **dois projetos no Supabase**: `meu-app-preview` (para as prévias dos PRs) e `meu-app-prod` (produção). Assim, testar uma prévia nunca mexe nos dados reais.

> O banco de preview **não recebe migrations automaticamente**. Quando um PR muda o banco, o comentário da prévia avisa e você testa no computador (`pnpm db:reset` e `pnpm dev`). Para as prévias com login funcionarem, no projeto de preview vá em **Authentication → URL Configuration** e adicione `https://*.workers.dev/**` em *Redirect URLs*; crie um usuário de teste em **Authentication → Users → Add user**.

## Supabase

1. Crie a conta em [supabase.com](https://supabase.com) e os dois projetos. Anote a senha do banco de produção.
2. Em cada projeto: **Project Settings → API**. Copie a *Project URL* e a *Publishable key*.
3. Crie um token pessoal em **Account → Access Tokens**.

| Onde no GitHub | Nome | Valor |
| --- | --- | --- |
| Variables | `SUPABASE_PROJECT_REF` | O ID do projeto de produção (aparece na URL do painel) |
| Variables | `PRODUCTION_SUPABASE_URL` | Project URL de produção |
| Variables | `PRODUCTION_SUPABASE_PUBLISHABLE_KEY` | Publishable key de produção |
| Variables | `PREVIEW_SUPABASE_URL` | Project URL do preview |
| Variables | `PREVIEW_SUPABASE_PUBLISHABLE_KEY` | Publishable key do preview |
| Secrets | `SUPABASE_ACCESS_TOKEN` | Token pessoal |
| Secrets | `SUPABASE_DB_PASSWORD` | Senha do banco de produção |

> Nunca use a chave `service_role` ou `sb_secret_…` na aplicação. Ela ignora todas as regras de acesso.

## Cloudflare

1. Crie a conta em [cloudflare.com](https://dash.cloudflare.com).
2. **My Profile → API Tokens → Create Token → template "Edit Cloudflare Workers"**. Restrinja à sua conta.
3. Copie o **Account ID** (barra lateral de Workers).

| Onde no GitHub | Nome | Valor |
| --- | --- | --- |
| Secrets | `CLOUDFLARE_API_TOKEN` | Token criado |
| Secrets | `CLOUDFLARE_ACCOUNT_ID` | Account ID |
| Variables | `PRODUCTION_URL` | Endereço público (depois do primeiro deploy, ex.: `https://meu-app.sua-conta.workers.dev`) |

Enquanto esses valores não existirem, os jobs de deploy aparecem como "pulados" no GitHub, sem erro.

## Arquivo `.env.local`

Para desenvolver, copie `.env.example` para `.env.local` e cole os valores que `pnpm db:start` mostra (Supabase **local**). Esse arquivo não vai para o Git, e o agente é impedido de lê-lo.

Próximo guia: [Dia a dia](03-dia-a-dia.md).
