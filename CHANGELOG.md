# Changelog

Mudanças do Harness, da mais nova para a mais antiga. Cada versão diz se você precisa fazer algo depois do merge do PR de atualização.

## [0.4.0] — 2026-09-15

### O que mudou

- **Banco de dados com proteções que funcionam de verdade** (ADR 0014, guia `docs/guia/08-banco-de-dados.md`).
  - **Ficha do dado:** a proposta de banco começa com perguntas em português para você aprovar: o que guardamos, quem vê, dados pessoais, retenção e exclusão. O agente não aprova por você.
  - **Regras automáticas do banco** (`.harness/database/guards/`): RLS em toda tabela, views que respeitam a RLS, nenhuma regra "libera tudo" sem justificativa, funções seguras, contas não expostas, toda tabela documentada, **toda coluna classificada como dado pessoal ou não** e exclusão de conta sempre possível.
  - **Verificador oficial de segurança do Supabase** (`supabase db advisors`) no `verify`, no CI e no deploy.
  - **Guard de mudanças no banco** (`database-guard`): bloqueia editar migration já publicada e exige proposta aprovada, revisão do DBA, dicionário de dados e matriz de acesso. SQL que apaga ou reescreve dados exige uma segunda aprovação sua.
  - **Comentário no PR** com o risco da mudança: 🟢 só adiciona, 🟠 reescreve, 🔴 apaga.
  - **Deploy:** confere tudo o que ainda não rodou em produção; migration que apaga ou reescreve dados espera sua aprovação no GitHub. Em repositório privado, guarda a estrutura do banco por 30 dias antes de aplicar.
  - **Agente longe da produção:** bloqueados psql/pg_dump para bancos remotos, `supabase db query --linked`, `supabase db dump` e ferramentas MCP de banco.
  - O `verify` falha, em vez de pular, quando o trabalho muda o banco e o Supabase local está desligado.
- **Segurança da aplicação** (ADR 0015, guias `09-incidente-de-seguranca.md` e `10-seguranca.md`).
  - **Segredos de deploy nos ambientes do GitHub** (`production` e `preview`), não mais no repositório; o `github-protect` avisa quando encontra segredos no lugar errado.
  - **Cabeçalhos de segurança no site** (CSP, HSTS e outros), com teste e conferência no deploy.
  - **Login mais forte por padrão:** senha de 10+ caracteres, confirmação de e-mail, 2FA disponível, sessão de 1 hora. Nova checagem do `supabase/config.toml` e das Edge Functions.
  - **Arquivos (Storage):** buckets com limite de tamanho e tipo; bucket público só com exceção justificada.
  - **Novo check obrigatório "Security scan"** (Semgrep e checagem do Supabase), **auditoria de dependências** no Quality gate e **OWASP ZAP** na prévia.
  - **Workflows mais seguros** (credenciais não ficam no disco; actionlint e zizmor no Harness CI). O PR de atualização do Harness destaca em vermelho mudanças em proteções.
  - **Agente:** pede confirmação antes de enviar arquivos para fora; servidores MCP não são ligados automaticamente; Codex sem rede.
  - **Processo:** seção de segurança no work item, padrões de segurança para agentes, guia de incidente com LGPD e `SECURITY.md`.
- **Correção:** o hook não bloqueia mais comandos com `*` (ex.: `ls pasta/*`) achando que poderiam ler o `.env`.
- Os comentários de prévia e de banco no PR não se sobrescrevem mais.
- **Código com padrão de qualidade** (ADR 0016).
  - **Convenções de código** (`.harness/context/code-conventions.md`) que o agente lê sempre antes de programar: organização por funcionalidade, onde o banco é chamado, textos da tela, mensagens de erro e testes.
  - **Template da aplicação mais completo:** rotas com página de erro e de "não encontrado", cache de dados do servidor (TanStack Query), validação (zod), textos traduzíveis com checagem de chave e cliente do Supabase com os tipos do banco.
  - **Regras mais rígidas:** o lint barra `any`, testes desligados (`.skip`/`.only`), acesso ao Supabase fora do lugar certo e funções complexas demais.
  - **Testes que provam de verdade:** cobertura mínima, checagem de acessibilidade (axe) nos testes e no navegador, e o Knip aponta código e dependências sem uso. O `verify` avisa quando os tipos do banco ficaram desatualizados.
  - **Agente mais cuidadoso ao encerrar:** avisa quando o código mudou sem teste ou quando um teste perdeu verificações, e não desiste da verificação na segunda tentativa.
  - **Novo revisor** `harness-code-reviewer` para revisar a mudança antes do PR; o `harness-scout` agora aponta o que já existe para reaproveitar.
  - **Correção:** os hooks do Codex não iniciavam (usavam uma variável que só o Claude Code define).

### Precisa fazer algo?

Sim:

1. Rode `npm run harness -- setup` (skills atualizadas) e `npm run harness -- github-protect --apply` (cria o ambiente `production-destructive`).
2. **Mova os segredos de deploy para os ambientes** `production` e `preview` (guia 02) e ligue 2FA nas contas (guia 10).
3. Rode `node .harness/scripts/supabase-config-guard.mjs --fix` e copie `public/_headers` e `src/security-headers.test.ts` de `.harness/app-template/` para o projeto (peça ao agente). Adicione `Security scan` aos checks obrigatórios com `github-protect --apply`.
4. Projetos que já têm tabelas: rode `npm run harness -- verify` com `pnpm db:start`. Se as novas regras apontarem problemas, peça ao agente "use harness-database-steward para adequar o banco às novas regras" e aprove a migration de correção.
5. Projetos que já têm aplicação: os novos padrões valem para projetos novos. Para adotar no seu, peça ao agente "adote as convenções da ADR 0016 do Harness": ele adiciona os scripts `knip`, `test:coverage` e `db:types`, as regras do `biome.json` e corrige o que as regras apontarem, em um PR separado.

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
