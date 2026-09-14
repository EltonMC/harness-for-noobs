import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyMigration, classifyPending, createdTables, evaluateDatabaseChange, parseProposal, parseReview, pendingMigrationNames, renderReport } from './database-guard.mjs';

const migration = 'supabase/migrations/20260914120000_create_orders.sql';
const createOrders = 'create table public.orders (id bigint primary key);\nalter table public.orders enable row level security;';

const approvedReview = `# DBA Review: orders

## Verdict

\`APPROVE WITH CONDITIONS\`

## Final evidence

- Proposal: .harness/database/changes/2026-09-14-orders.md
- Migration(s): 20260914120000_create_orders.sql
`;

const approvedProposal = `# Database Change Proposal: orders

## Ficha do dado (para o dono)

- Aprovado por (nome e data): Elton, 2026-09-14
- Aprovação de mudança que apaga ou reescreve dados (nome e data):
`;

function baseInput(overrides = {}) {
  return {
    changes: [{ status: 'A', path: migration }],
    files: {
      [migration]: createOrders,
      '.harness/database/reviews/2026-09-14-orders.md': approvedReview,
      '.harness/database/changes/2026-09-14-orders.md': approvedProposal,
    },
    hasSupabaseConfig: true,
    dataDictionary: '| orders | Customer orders |',
    accessMatrix: '| orders | authenticated |',
    ...overrides,
  };
}

test('classifies additive, rewriting, and destructive migrations in plain language', () => {
  assert.equal(classifyMigration(createOrders).level, 'additive');
  assert.equal(classifyMigration('update public.orders set status = \'paid\' where id = 1;').level, 'rewrite');
  assert.equal(classifyMigration('alter table public.orders rename column email to contact_email;').level, 'rewrite');
  const destructive = classifyMigration('alter table public.orders drop column phone;\ndrop table public.legacy;\ntruncate public.logs;\ndelete from public.carts;');
  assert.equal(destructive.level, 'destructive');
  assert.equal(destructive.findings.filter((finding) => finding.level === 'destructive').length, 4);
  assert.match(destructive.findings[0].message, /apaga/);
});

test('ignores SQL comments and filtered deletes when classifying', () => {
  assert.equal(classifyMigration('-- drop table public.orders;\n/* truncate x; */\ncreate table public.a (id int);').level, 'additive');
  assert.equal(classifyMigration('delete from public.carts where created_at < now() - interval \'30 days\';').level, 'rewrite');
});

test('lists public tables created by a migration', () => {
  assert.deepEqual(createdTables('create table if not exists public."Orders" (id int);\ncreate table items (id int);\ncreate table private.jobs (id int);'), ['orders', 'items']);
});

test('parses review verdicts and rejects an unfilled template', () => {
  assert.equal(parseReview(approvedReview).verdict, 'APPROVE WITH CONDITIONS');
  assert.equal(parseReview('## Verdict\n\n`APPROVE`\n').verdict, 'APPROVE');
  assert.equal(parseReview('## Verdict\n\nBLOCK\n').verdict, 'BLOCK');
  assert.equal(parseReview('## Verdict\n\n`APPROVE` | `APPROVE WITH CONDITIONS` | `BLOCK`\n').verdict, null);
  assert.equal(parseReview(approvedReview).proposal, '.harness/database/changes/2026-09-14-orders.md');
});

test('parses owner approvals and ignores placeholders', () => {
  assert.deepEqual(parseProposal(approvedProposal), { ownerApproved: true, destructiveApproved: false });
  assert.deepEqual(parseProposal('- Aprovado por (nome e data): <nome>\n- Aprovação de mudança que apaga ou reescreve dados (nome e data): Elton, 2026-09-14'), { ownerApproved: false, destructiveApproved: true });
});

test('accepts a documented, reviewed, and owner-approved additive migration', () => {
  const result = evaluateDatabaseChange(baseInput());
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
  assert.equal(result.requiresOwnerApproval, false);
});

test('blocks editing or deleting a migration that already exists on the base branch', () => {
  const result = evaluateDatabaseChange(baseInput({ changes: [{ status: 'M', path: 'supabase/migrations/20260101000000_old.sql' }, { status: 'D', path: 'supabase/migrations/20260102000000_older.sql' }] }));
  assert.equal(result.ok, false);
  assert.equal(result.problems.filter((problem) => /já publicada/.test(problem)).length, 2);
});

test('requires a DBA review, a proposal, and owner approval for a new migration', () => {
  const noReview = evaluateDatabaseChange(baseInput({ files: { [migration]: createOrders } }));
  assert.ok(noReview.problems.some((problem) => /revisão do DBA/.test(problem)));

  const blocked = baseInput();
  blocked.files['.harness/database/reviews/2026-09-14-orders.md'] = approvedReview.replace('APPROVE WITH CONDITIONS', 'BLOCK');
  assert.ok(evaluateDatabaseChange(blocked).problems.some((problem) => /BLOCK/.test(problem)));

  const unapproved = baseInput();
  unapproved.files['.harness/database/changes/2026-09-14-orders.md'] = '- Aprovado por (nome e data):\n';
  assert.ok(evaluateDatabaseChange(unapproved).problems.some((problem) => /aprovação do dono/.test(problem)));
});

test('requires a separate owner approval for destructive or rewriting migrations', () => {
  const input = baseInput();
  input.files[migration] = 'alter table public.orders drop column phone;';
  const result = evaluateDatabaseChange(input);
  assert.equal(result.requiresOwnerApproval, true);
  assert.ok(result.problems.some((problem) => /apaga ou reescreve dados/.test(problem)));

  input.files['.harness/database/changes/2026-09-14-orders.md'] = `${approvedProposal.trimEnd()} Elton, 2026-09-14\n`;
  assert.deepEqual(evaluateDatabaseChange(input).problems, []);
});

test('requires new tables in the data dictionary and access matrix', () => {
  const result = evaluateDatabaseChange(baseInput({ dataDictionary: '| _No product entities yet_ |', accessMatrix: '' }));
  assert.ok(result.problems.some((problem) => /DATA_DICTIONARY/.test(problem)));
  assert.ok(result.problems.some((problem) => /access-matrix/.test(problem)));
});

test('rejects migration files the Supabase CLI would silently ignore and missing local Supabase config', () => {
  const badName = 'supabase/migrations/create_orders.sql';
  const result = evaluateDatabaseChange(baseInput({ changes: [{ status: 'A', path: badName }], files: { [badName]: createOrders }, hasSupabaseConfig: false }));
  assert.ok(result.problems.some((problem) => /nome/.test(problem)));
  assert.ok(result.problems.some((problem) => /config\.toml/.test(problem)));
});

test('classify-only mode reports the risk without requiring documents', () => {
  const input = baseInput({ files: { [migration]: 'drop table public.orders;' }, classifyOnly: true });
  const result = evaluateDatabaseChange(input);
  assert.equal(result.ok, true);
  assert.equal(result.requiresOwnerApproval, true);
});

test('ignores changes outside supabase migrations', () => {
  const result = evaluateDatabaseChange(baseInput({ changes: [{ status: 'M', path: 'src/App.tsx' }] }));
  assert.equal(result.ok, true);
  assert.equal(result.migrations.length, 0);
});

test('renders a plain-language pull request report', () => {
  const input = baseInput();
  input.files[migration] = 'alter table public.orders drop column phone;';
  const report = renderReport(evaluateDatabaseChange(input));
  assert.match(report, /<!-- harness-database-guard -->/);
  assert.match(report, /🔴/);
  assert.match(report, /20260914120000_create_orders\.sql/);
});

test('review: common destructive and rewriting SQL shapes are not classified as additive', () => {
  for (const sql of [
    'alter table public.orders drop status;',
    'alter table public.orders drop if exists status;',
    'drop extension x cascade;',
    'drop owned by app_user;',
    "insert into public.logs values ('--'); drop table public.orders;",
  ]) {
    assert.equal(classifyMigration(sql).level, 'destructive', sql);
  }
  for (const sql of [
    'alter table orders alter status type int using status::int;',
    'update public.orders o set total = 0 where o.id = 1;',
    'merge into public.orders o using staging s on o.id = s.id when matched then delete;',
    "do $$ begin update public.orders set total = 0; end $$;",
  ]) {
    assert.equal(classifyMigration(sql).level, 'rewrite', sql);
  }
  assert.equal(classifyMigration('alter table public.orders drop constraint orders_total_check;').level, 'additive');
});

test('review: recreated objects and function bodies do not demand a destructive approval', () => {
  const recreated = 'drop policy if exists "orders_own" on public.orders;\ncreate policy "orders_own" on public.orders for select using (true);\ndrop function if exists public.total();\ncreate or replace function public.total() returns int language sql set search_path = \'\' as $$ select 1 $$;';
  assert.equal(classifyMigration(recreated).level, 'additive');
  const trigger = "create function private.touch() returns trigger language plpgsql set search_path = '' as $$ begin update public.orders set updated_at = now() where id = new.id; delete from public.carts where id = new.id; return new; end $$;";
  assert.equal(classifyMigration(trigger).level, 'additive');
});

test('review: approvals need a date and reject pending placeholders', () => {
  for (const value of ['pendente', 'TODO', '—', '[ ]', '(aguardando)', 'Elton']) {
    assert.equal(parseProposal(`- Aprovado por (nome e data): ${value}`).ownerApproved, false, value);
  }
  assert.equal(parseProposal('- Aprovado por (nome e data): Elton, 14/09/2026').ownerApproved, true);
});

test('review: a table counts as documented only as a table cell, not as a common word', () => {
  const input = baseInput({ dataDictionary: '| Entity | Notes |\n| _none_ | |', accessMatrix: '| Resource | Tests |' });
  input.files[migration] = 'create table public.notes (id int);';
  const problems = evaluateDatabaseChange(input).problems;
  assert.ok(problems.some((problem) => /DATA_DICTIONARY/.test(problem)));
  assert.ok(problems.some((problem) => /access-matrix/.test(problem)));
  assert.deepEqual(evaluateDatabaseChange(baseInput({ dataDictionary: '| `orders` | x |', accessMatrix: '| orders | authenticated |' })).problems, []);
});

test('review: the deploy classifies the migrations actually pending in production', () => {
  const output = 'DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n • 20260914120000_create_orders.sql\n • 20260915000000_drop_phone.sql\n';
  assert.deepEqual(pendingMigrationNames(output), ['20260914120000_create_orders.sql', '20260915000000_drop_phone.sql']);
  const files = { 'supabase/migrations/20260914120000_create_orders.sql': createOrders, 'supabase/migrations/20260915000000_drop_phone.sql': 'alter table public.orders drop column phone;' };
  assert.equal(classifyPending(output, files).requiresOwnerApproval, true);
  assert.equal(classifyPending('Remote database is up to date.\n', files).requiresOwnerApproval, false);
  assert.equal(classifyPending('Would push these migrations:\n (unexpected format)\n', files).requiresOwnerApproval, true, 'unknown output fails safe');
});
