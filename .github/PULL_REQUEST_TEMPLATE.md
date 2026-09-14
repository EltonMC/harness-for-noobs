## O que muda

<!-- Em linguagem simples: o que a pessoa usuária passa a conseguir fazer. -->

## Como testar

<!-- Passos numerados usando o link de prévia comentado pelo CI.
Sem prévia (Cloudflare não configurado) ou quando o PR muda o banco: use o computador
(pnpm db:reset, pnpm dev e abra http://localhost:5173). Ex.:
1. Abra a prévia e entre com um usuário de teste.
2. Clique em "Exportar".
3. Resultado esperado: um arquivo CSV com os gastos do mês é baixado. -->

1.

## Riscos e como desfazer

- Risco:
- Como desfazer: reverter este PR / rollback no Cloudflare / migration de correção

---

### Evidence (agent-maintained, English)

- Work item: `.harness/work-items/…` (or `direct` change)
- Readiness: PASS / accepted CONCERNS
- TDD red → green recorded in the work item
- `npm run harness -- verify` → green (skipped gates explained)
- UI changed: accessibility and visual evidence attached / not applicable
- Independent review: done / not required because …

### Supabase impact

- [ ] No Supabase change
- [ ] DBA proposal and review included
- [ ] Migration is backward compatible (expand/contract)
- [ ] RLS allow/deny tests included
- [ ] Storage, Auth, RPC, or Edge Function impact described

### Reviewer checklist

- [ ] Scope matches the work item
- [ ] Preview or local test done following "Como testar"
- [ ] Code and developer-facing text are in English
- [ ] CI green and conversations resolved
- [ ] No secrets, `.env` files, or generated files committed
