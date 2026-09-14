# Harness for Noobs

Um kit pronto para construir uma aplicação **React + Supabase** com agentes de IA (Claude Code, Codex, Cursor, Copilot, Cline), mesmo sem experiência com desenvolvimento de software. Ele não cria o produto por você: dá ao agente um processo seguro, proteções que funcionam de verdade e comandos que economizam tokens.

*English overview: [docs/en/README.md](../docs/en/README.md).*

## O que você ganha

| Preocupação | Como o Harness resolve |
| --- | --- |
| "Não sei por onde começar" | Peça ao agente: **"use harness-start"**. Ele diagnostica e escolhe o caminho. |
| "O agente pode estragar algo" | Hooks e Git hooks **bloqueiam** push na `main`, segredos no código, leitura de `.env`, deploy local e mudanças no banco de produção. |
| "Não sei revisar código" | Cada pull request traz um resumo no seu idioma, um roteiro "Como testar" e um **link de prévia** para você clicar. |
| "Gasto tokens demais" | Scripts fazem o trabalho repetitivo (criar app, verificar, diagnosticar) e mostram só os erros. |
| "Banco de dados inseguro" | Revisão tipo DBA, migrations versionadas e um teste que falha se alguma tabela ficar sem RLS. |
| "E quando o Harness evoluir?" | Toda semana o GitHub abre um PR (ou uma issue, se você não configurou o token) explicando a nova versão. Você lê, confere os checks e faz o merge. |

## Começando (15–30 minutos, uma vez)

Guia detalhado, com macOS, Windows e Linux: **[docs/guia/01-instalacao.md](../docs/guia/01-instalacao.md)**.

```bash
# 1. Ferramentas (macOS). Windows/Linux: veja o guia.
curl -fsSL https://raw.githubusercontent.com/EltonMC/harness-for-noobs/v0.3.0/Brewfile -o "$TMPDIR/harness-Brewfile"
brew bundle --file="$TMPDIR/harness-Brewfile"

# 2. Crie SEU projeto a partir do Harness (não use git clone)
uvx copier@9.18.2 copy gh:EltonMC/harness-for-noobs meu-app
cd meu-app
git init -b main && git add -A && git commit -m "chore: create project from Harness"

# 3. Prepare tudo (skills, Git hooks, proteções) e siga o que ele indicar
npm run harness -- setup

# 4. Abra o agente e converse
claude          # ou codex, cursor…
#   → "use harness-start: quero criar um controle de gastos pessoais"
```

Quando o projeto estiver no GitHub (`gh repo create --private --source . --push`), rode `npm run harness -- github-protect` para ver e aplicar as proteções da `main`, e configure o `HARNESS_UPDATE_TOKEN` para receber atualizações como PR ([guia 07](../docs/guia/07-atualizando-o-harness.md)).

## Dia a dia

| Quero… | Faça |
| --- | --- |
| Começar algo novo ou retomar | "use harness-start" |
| Ver a aplicação rodando | `pnpm db:start` e `pnpm dev` |
| Conferir se está tudo certo | `npm run harness -- verify` |
| Entregar para revisão | "prepare o pull request" → teste o link de prévia → merge |
| Algo deu errado | "use harness-recovery" |
| Diagnosticar o computador | `npm run harness -- doctor` |

Mais em [docs/guia/03-dia-a-dia.md](../docs/guia/03-dia-a-dia.md) e [docs/guia/04-socorro.md](../docs/guia/04-socorro.md).

## Guias

1. [Instalação](../docs/guia/01-instalacao.md)
2. [Contas e segredos](../docs/guia/02-contas-e-segredos.md) — GitHub, Supabase, Cloudflare
3. [Dia a dia](../docs/guia/03-dia-a-dia.md)
4. [Socorro](../docs/guia/04-socorro.md)
5. [Antes de lançar em produção](../docs/guia/05-producao.md)
6. [Custos e tokens](../docs/guia/06-custos-e-tokens.md)
7. [Atualizando o Harness](../docs/guia/07-atualizando-o-harness.md)
8. [Glossário](../docs/guia/glossario.md)

## Arquitetura escolhida

React + Vite + TypeScript (SPA) na Cloudflare Workers Static Assets, Supabase como backend, pnpm, Vitest, Playwright e Biome. Node roda no seu computador; o Docker é usado só para o Supabase local. Mudanças de arquitetura passam por um ADR em `docs/decisions/`.

## Limites honestos

- Nenhuma ferramenta garante que o código gerado por IA está correto. Testes, CI, prévia e a sua revisão são as travas.
- Hooks de agente são uma rede de segurança; a proteção definitiva é a `main` protegida no GitHub e o deploy feito só pelo CI.
- Repositórios **privados** no plano gratuito do GitHub não permitem proteger a `main` nem ativar secret scanning. Nesse caso use repositório público ou um plano pago; o scanner local e o CI continuam ativos.

## Para quem mantém o Harness

- `npm test` e `npm run check` validam os scripts, hooks, skills e segredos.
- Lançar versão: atualize `.harness/VERSION`, `CHANGELOG.md` (com passos manuais para arquivos do produto) e o link fixo do Brewfile nos guias; faça merge e crie a tag `vX.Y.Z`. Os projetos recebem a atualização na segunda-feira seguinte.
- Os workflows `skill-source-maintenance.yml` e `harness-template-smoke.yml` rodam só neste repositório.
- Decisões: `docs/decisions/`. Instruções para agentes: `AGENTS.md`.

## Licença

Arquivos do Harness sob [MIT](../LICENSE) (copiada para `.harness/LICENSE` em cada projeto). BMad Method, Impeccable e Caveman mantêm suas licenças: [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
