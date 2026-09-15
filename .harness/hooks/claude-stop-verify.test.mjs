import assert from 'node:assert/strict';
import test from 'node:test';

import { applicationChanges, parsePorcelainZ, qualityWarnings, shouldVerifyAgain, untrackedAsDiff, warningDecision } from './claude-stop-verify.mjs';

test('quality: warns when application source changes without any test change', () => {
  assert.equal(qualityWarnings({ files: ['src/features/expenses/api/list-expenses.ts'], testDiff: '' }).length, 1);
  assert.deepEqual(qualityWarnings({ files: ['src/features/expenses/api/list-expenses.ts', 'src/features/expenses/api/list-expenses.test.ts'], testDiff: '' }), []);
  assert.deepEqual(qualityWarnings({ files: ['src/shared/i18n/messages.ts', 'src/vite-env.d.ts', 'src/lib/database.types.ts'], testDiff: '' }), [], 'copy and generated files need no test');
});

test('quality: warns when a test diff removes more assertions than it adds or skips tests', () => {
  const files = ['src/App.tsx', 'src/App.test.tsx'];
  const removed = ['--- a/src/App.test.tsx', '+++ b/src/App.test.tsx', "-    expect(screen.getByRole('button')).toBeEnabled();", "-    expect(onSave).toHaveBeenCalled();", "+    expect(screen.getByRole('button')).toBeVisible();"].join('\n');
  assert.match(qualityWarnings({ files, testDiff: removed }).join('\n'), /assert/i);
  const skipped = ['+++ b/src/App.test.tsx', "+  it.skip('saves the expense', async () => {"].join('\n');
  assert.match(qualityWarnings({ files, testDiff: skipped }).join('\n'), /skip|only/);
  const healthy = ['+++ b/src/App.test.tsx', "+    expect(screen.getByRole('alert')).toHaveTextContent('Erro');"].join('\n');
  assert.deepEqual(qualityWarnings({ files, testDiff: healthy }), []);
});

test('quality: deleting source without touching tests is not a missing-test warning', () => {
  assert.deepEqual(qualityWarnings({ files: ['src/features/old/OldPage.tsx'], deleted: ['src/features/old/OldPage.tsx'], testDiff: '' }), []);
});

test('quality: raises the same set of warnings only once, even when later edits change the files', () => {
  const warnings = ['Os testes perderam 1 assertiva(s).'];
  const first = warningDecision({ warnings, previousSignature: '' });
  assert.equal(first.raise, true);
  assert.deepEqual(warningDecision({ warnings, previousSignature: first.signature }), { raise: false, signature: first.signature });
  assert.equal(warningDecision({ warnings: ['Outro aviso.'], previousSignature: first.signature }).raise, true);
  assert.equal(warningDecision({ warnings: [], previousSignature: first.signature }).raise, false);
});

test('quality: checks new untracked test files as fully added content', () => {
  assert.equal(untrackedAsDiff('src/new.test.ts', "it.only('x', () => {});\n"), "+++ b/src/new.test.ts\n+it.only('x', () => {});\n+");
});

test('quality: keeps verifying after a blocked stop, but never loops forever', () => {
  assert.equal(shouldVerifyAgain({ stopHookActive: false, attempts: 5 }), true);
  assert.equal(shouldVerifyAgain({ stopHookActive: true, attempts: 1 }), true);
  assert.equal(shouldVerifyAgain({ stopHookActive: true, attempts: 3 }), false);
});

test('parses porcelain -z output including spaces and renames', () => {
  const stdout = ' M src/My Component.tsx\0R  src/new.ts\0src/old.ts\0?? supabase/migrations/001_init.sql\0';
  assert.deepEqual(parsePorcelainZ(stdout), ['src/My Component.tsx', 'src/new.ts', 'supabase/migrations/001_init.sql']);
});

test('selects application source changes and flags database changes', () => {
  assert.deepEqual(applicationChanges(['README.md', 'src/App.tsx', 'supabase/migrations/1.sql']), {
    files: ['src/App.tsx', 'supabase/migrations/1.sql'],
    touchesDatabase: true,
  });
  assert.deepEqual(applicationChanges(['docs/guia/01.md']), { files: [], touchesDatabase: false });
});
