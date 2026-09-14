# 5. Antes de lançar em produção

Use como checklist antes de convidar pessoas reais. Peça ao agente para tratar cada item não marcado como um work item.

## Segurança e dados

- [ ] `npm run harness -- github-protect --apply` rodou sem ✖ (main protegida, Dependabot). Em repositório privado no plano gratuito, secret scanning e proteção da main não existem: torne o repositório público, assine o GitHub Pro ou registre essa decisão em `project-context.md` sabendo que o scanner local e o CI continuam ativos.
- [ ] Supabase de **produção** separado do de prévia.
- [ ] Todas as tabelas com RLS e testes de permitir/negar (o CI já barra tabela sem RLS).
- [ ] Autenticação: confirmação de e-mail ligada, URLs de redirecionamento só do seu domínio, proteção contra senhas vazadas ativa.
- [ ] Limites contra abuso: rate limit do Auth revisado e CAPTCHA no cadastro/login se o formulário for público.
- [ ] Nenhuma chave `service_role`/`sb_secret_` fora das Edge Functions.

## Pessoas e LGPD

- [ ] Você sabe quais dados pessoais coleta e por quê (anote em `.harness/design/PRODUCT.md`).
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
