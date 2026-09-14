# Changelog

Mudanças do Harness, da mais nova para a mais antiga. Cada versão diz se você precisa fazer algo depois do merge do PR de atualização.

## [0.3.0] — 2026-09-14

### O que mudou

- **Proteções que funcionam de verdade.**
  - Hooks do agente (Bash, edição e leitura de arquivos) e Git hooks bloqueiam commit ou push na `main` já publicada, force push, segredos, `.env`, deploy local e mudanças no banco de produção.
  - O primeiro publish da `main` continua permitido.
- **Um comando de preparação:** `npm run harness -- setup`. O `npm run harness -- doctor` mostra o comando de instalação de cada ferramenta e avisa quando o Docker só está parado.
- **Aplicação em um comando:** `npm run harness -- init-app` cria React + Supabase a partir de um template com lockfile, testes, lint e E2E.
- **CI e deploy gerenciados pelo Harness** (`app-ci.yml`, `app-deploy.yml`):
  - prévia por PR depois do Quality gate;
  - aviso quando o PR muda o banco;
  - produção só depois de verificar o commit.
- **`verify`** roda todas as verificações, inclusive as do banco quando o Supabase local está ligado, e mostra só o que falhou.
- **Skills de entrada e socorro:** `harness-start` e `harness-recovery`.
- **Menos tokens:**
  - `AGENTS.md` mais curto;
  - BMad no perfil essencial, com 14 das 29 skills;
  - subagente `harness-scout` só de leitura;
  - memória sem duplicação.
- **Idiomas separados:** `owner_locale` define o idioma da conversa e dos PRs, e `product_locale` o da interface.
- **Correções:**
  - o Impeccable agora carrega de verdade;
  - o Claude Code lê as instruções (`CLAUDE.md`);
  - as skills são instaladas só para os agentes escolhidos;
  - o `clean` remove sobras de instalações antigas.
- **Atualizações automáticas:** PR semanal com `HARNESS_UPDATE_TOKEN`, ou issue quando o token não existe.
- **Guias em português** em `docs/guia/`.
- Node roda no computador e o Docker fica só para o Supabase local. A aplicação usa pnpm.

### Precisa fazer algo?

Sim, uma vez:

1. Instale o que o `npm run harness -- doctor` apontar (pnpm 10+, `gh` e `gitleaks` são novos).
2. Rode `npm run harness -- setup`. Ele instala as skills novas, remove a skill `harness-local-docker` e reativa os Git hooks.
3. Rode `npm run harness -- clean --apply` para remover sobras de instalações antigas.
4. Crie `.harness/project.yaml` se ele não existir. Copie o formato de `.harness/project.yaml.jinja`, com o nome do produto e os idiomas. Se a aplicação já existe, preencha `commands` com os comandos `pnpm` e remova `execution.commands` do seu `harness.yaml` antigo.
5. Em `.harness/context/project-context.md`, apague as seções "Technology baseline" e "Engineering invariants". Elas agora estão em `harness-baseline.md`, que é do Harness.
6. Apague as páginas antigas `.harness/memory/decisions/*.md` e `.harness/memory/procedures/*.md` (mantenha os `INDEX.md`). Elas repetiam ADRs e descreviam Docker Compose.
7. Se o seu projeto tinha `Dockerfile` ou `compose.yaml` só para rodar a aplicação, eles não são mais usados (ADR 0009).
8. Configure o `HARNESS_UPDATE_TOKEN` (guia 07) e, se o projeto está no GitHub, rode `npm run harness -- github-protect --apply`.
9. Para prévias e deploy, crie as variáveis e os segredos do guia 02.
10. Comandos renomeados: `status` → `doctor`, `update` → `update-skills`. Os nomes antigos continuam funcionando.

## [0.2.0] — 2026-09-13

- Instalação travada das skills externas, verificação de integridade e CLI inicial (`status`, `setup`, `check`, `update`).
