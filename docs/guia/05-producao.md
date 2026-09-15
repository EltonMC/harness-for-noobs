# 5. Antes de lançar em produção

Use como checklist antes de convidar pessoas reais. Peça ao agente para tratar cada item não marcado como um work item.

## Segurança e dados

- [ ] `npm run harness -- github-protect --apply` rodou sem ✖ (main protegida, Dependabot). Em repositório privado no plano gratuito, secret scanning e proteção da main não existem: torne o repositório público, assine o GitHub Pro ou registre essa decisão em `project-context.md` sabendo que o scanner local e o CI continuam ativos.
- [ ] Supabase de **produção** separado do de prévia.
- [ ] Todas as tabelas com RLS e testes de permitir/negar (o CI já barra tabela sem RLS, view insegura e coluna sem classificação de dado pessoal).
- [ ] `npm run harness -- github-protect --apply` criou o ambiente `production-destructive` (migrations que apagam dados esperam sua aprovação).
- [ ] Autenticação no painel do Supabase igual ao `supabase/config.toml`: senha de 10+ caracteres com letras e números, confirmação de e-mail, troca de senha segura, 2FA (TOTP) disponível, sessão de até 1 hora, URLs de redirecionamento exatas do seu domínio e proteção contra senhas vazadas (se o plano permitir).
- [ ] Segredos do deploy nos ambientes `production`/`preview`, com expiração; 2FA ligado no GitHub, Supabase, Cloudflare e provedor de IA ([guia 10](10-seguranca.md)).
- [ ] Cabeçalhos de segurança presentes em produção (o deploy confere) e cada serviço de terceiros no `public/_headers` foi aprovado por você.
- [ ] Relatório do OWASP ZAP da última prévia lido (Actions → Preview deployment → Artifacts), sem alertas altos.
- [ ] Você leu o [guia de incidente](09-incidente-de-seguranca.md) e sabe onde revogar cada chave.
- [ ] Limites contra abuso: rate limit do Auth revisado e CAPTCHA (Cloudflare Turnstile) no cadastro, login e recuperação de senha se o formulário for público.
- [ ] Ações de administrador registradas em log de auditoria e exigindo 2FA.
- [ ] Nenhuma chave `service_role`/`sb_secret_` fora das Edge Functions.

## Pessoas e LGPD

- [ ] Você sabe quais dados pessoais coleta e por quê: confira as colunas `pii:personal` e `pii:sensitive` no dicionário de dados (`.harness/database/DATA_DICTIONARY.md`) e resuma em `.harness/design/PRODUCT.md`.
- [ ] Política de privacidade e termos de uso publicados.
- [ ] Existe um jeito de a pessoa pedir exclusão dos próprios dados.
- [ ] Região do Supabase escolhida conscientemente (dados de brasileiros podem ficar fora do país, mas isso precisa estar na política).

## Continuidade

- [ ] Backups: confira o plano do Supabase (o gratuito tem retenção curta). Para dados importantes, considere o plano com *Point-in-Time Recovery*.
- [ ] E-mails transacionais com provedor próprio (SMTP customizado). O SMTP padrão do Supabase tem limite baixo.
- [ ] Monitoramento de erros no navegador (ex.: Sentry) e alerta de site fora do ar (ex.: um monitor de uptime gratuito apontando para `PRODUCTION_URL`).
- [ ] Você testou o rollback uma vez: Cloudflare → Deployments → versão anterior.

## Custos

- [ ] Alertas de gasto configurados na Cloudflare, no Supabase e no provedor do seu agente de IA.
- [ ] Você sabe o limite do plano gratuito de cada serviço e o que acontece ao ultrapassar.

## Qualidade

- [ ] Fluxos principais cobertos por teste E2E (`npm run harness -- verify --e2e`).
- [ ] Acessibilidade básica revisada (peça ao agente: "use impeccable audit").
- [ ] Textos revisados no idioma do produto.
