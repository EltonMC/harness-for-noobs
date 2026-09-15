# 9. Incidente de segurança: o que fazer

Use este guia quando suspeitar que uma chave vazou, que alguém entrou onde não devia ou que dados de pessoas foram expostos. **Aja rápido, mas não apague provas.**

Primeiro passo, sempre: peça ao agente **"use harness-recovery: incidente de segurança"** e conte o que viu. Ele não vai rodar nada em produção. O papel dele é organizar os passos abaixo com você.

## 1. Conter (primeiros minutos)

| O que vazou ou aconteceu | Faça agora |
| --- | --- |
| Token do Supabase (`sbp_…`) | Supabase → Account → Access Tokens → **Revoke**. Crie outro e atualize o secret no ambiente `production` do GitHub. |
| Senha do banco de produção | Supabase → Project Settings → Database → **Reset database password**. Atualize `SUPABASE_DB_PASSWORD` no ambiente `production`. |
| Chave `service_role` / `sb_secret_…` | Supabase → Project Settings → API Keys → gere uma nova chave secreta e **desative a antiga**. Atualize os segredos das Edge Functions. |
| Token da Cloudflare | Cloudflare → My Profile → API Tokens → **Roll** ou **Delete**. Atualize os ambientes `production` e `preview`. |
| Token do GitHub (`ghp_…`, `github_pat_…`, `HARNESS_UPDATE_TOKEN`) | GitHub → Settings → Developer settings → Tokens → **Delete**. |
| Chave de IA (Anthropic, OpenAI) | Painel do provedor → apague a chave e confira o consumo. |
| Conta de administrador suspeita | Troque a senha, ative 2FA e encerre as sessões (Supabase → Authentication → Users → usuário → **Sign out**). |
| Site alterado ou com comportamento estranho | Cloudflare → Workers → Deployments → volte para uma versão anterior conhecida. |
| Dados expostos por regra errada no banco | Peça ao agente uma migration de correção **urgente**, via PR, e faça o merge assim que os checks passarem. |

> Apagar o commit **não** desfaz o vazamento: quem viu a chave ainda a tem. Revogar é o que resolve.

## 2. Entender (primeiras horas)

Anote num documento privado, com data e hora:

- o que aconteceu e quando você percebeu;
- o que foi exposto (quais dados, de quantas pessoas, por quanto tempo);
- o que já foi feito.

Onde olhar: Supabase → Logs (Auth e API), GitHub → Settings → Security log e Actions, Cloudflare → Analytics.

## 3. Comunicar (LGPD)

Se **dados pessoais** foram expostos e isso pode causar risco ou dano relevante às pessoas (dados sensíveis, financeiros, senhas, dados de crianças, ou muitas pessoas afetadas):

1. Comunique a **ANPD** (Autoridade Nacional de Proteção de Dados) pelo site gov.br/anpd. Hoje o prazo é de **3 dias úteis** a partir de quando você soube.
2. Comunique as **pessoas afetadas**, em linguagem simples: o que aconteceu, quais dados, o que você fez e o que elas devem fazer (por exemplo, trocar a senha).
3. Guarde o registro do incidente, mesmo que decida não comunicar.

Na dúvida sobre comunicar ou não, procure orientação jurídica. Este guia não substitui um advogado.

## 4. Corrigir e aprender

- A causa é corrigida num PR, com um teste que prove a correção (por exemplo, um teste de "negar acesso" no banco).
- Peça ao agente para registrar o aprendizado em `.harness/memory/gotchas/`.
- Se a falha foi relatada por outra pessoa, agradeça e avise quando estiver corrigida (veja `.github/SECURITY.md`).
