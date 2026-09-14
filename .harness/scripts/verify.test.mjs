import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { planVerification, runVerification, summarizeFailure } from './verify.mjs';

const scripts = { lint: 'biome check .', typecheck: 'tsc -b', test: 'vitest run', build: 'vite build', 'test:e2e': 'playwright test' };

test('plans the fast feedback loop for a quick verification', () => {
  assert.deepEqual(planVerification(scripts, { quick: true }).map((step) => step.script), ['typecheck', 'test']);
});

test('plans every configured gate for a full verification, skipping missing scripts', () => {
  assert.deepEqual(planVerification(scripts, {}).map((step) => step.script), ['lint', 'typecheck', 'test', 'build', 'bundle-secrets']);
  assert.deepEqual(planVerification({ test: 'vitest run' }, {}).map((step) => step.script), ['test']);
});

test('adds end-to-end tests only when requested', () => {
  assert.ok(planVerification(scripts, { e2e: true }).some((step) => step.script === 'test:e2e'));
});

test('summarizes a failure with the relevant error lines instead of the whole log', () => {
  const noise = Array.from({ length: 500 }, (_, index) => `✓ passing test ${index}`);
  const output = [...noise, ' FAIL  src/App.test.tsx > shows the export button', 'AssertionError: expected "Exportar" to be in the document', ...noise].join('\n');
  const summary = summarizeFailure(output);
  assert.match(summary, /FAIL {2}src\/App\.test\.tsx/);
  assert.match(summary, /AssertionError/);
  assert.ok(summary.split('\n').length <= 30);
});

test('falls back to the last lines when no error marker exists', () => {
  const output = Array.from({ length: 100 }, (_, index) => `line ${index}`).join('\n');
  const summary = summarizeFailure(output);
  assert.match(summary, /line 99/);
  assert.doesNotMatch(summary, /line 10\n/);
});

test('review: full verification plans database gates when requested', () => {
  const withDatabase = { ...scripts, 'db:lint': 'supabase db lint', 'db:test': 'supabase test db' };
  assert.deepEqual(planVerification(withDatabase, { database: true }).map((step) => step.script), ['lint', 'typecheck', 'test', 'build', 'bundle-secrets', 'db:lint', 'db:test']);
  assert.deepEqual(planVerification(withDatabase, { quick: true }).map((step) => step.script), ['typecheck', 'test']);
});

async function projectWith(scriptsMap) {
  const root = await mkdtemp(join(tmpdir(), 'harness-verify-'));
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'verify-fixture', private: true, scripts: scriptsMap }));
  return root;
}

const pass = 'node -e "process.exit(0)"';
const fail = 'node -e "console.error(\'Error: broken\'); process.exit(1)"';

test('review: runVerification reports failures, writes logs, and stops early in quick mode', async () => {
  const root = await projectWith({ typecheck: fail, test: pass });
  try {
    const lines = [];
    const result = await runVerification({ root, quick: true, print: (line) => lines.push(line) });
    assert.equal(result.ok, false);
    assert.deepEqual(result.failures, ['typecheck']);
    assert.ok(!lines.some((line) => line.startsWith('✔ test')), 'quick mode stops at the first failure');
    assert.match(await readFile(join(root, '.harness', 'logs', 'typecheck.log'), 'utf8'), /Error: broken/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('review: a failed build skips the bundle scan and stopped database gates are reported, not passed silently', async () => {
  const root = await projectWith({ lint: pass, typecheck: pass, test: pass, build: fail, 'db:lint': pass, 'db:test': pass });
  try {
    await mkdir(join(root, 'supabase'));
    await writeFile(join(root, 'supabase', 'config.toml'), '');
    const lines = [];
    const result = await runVerification({ root, print: (line) => lines.push(line), isDatabaseRunning: async () => false });
    assert.deepEqual(result.failures, ['build']);
    assert.deepEqual(result.skipped, ['bundle-secrets', 'db:lint', 'db:test']);
    assert.ok(lines.some((line) => /pnpm db:start/.test(line)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
