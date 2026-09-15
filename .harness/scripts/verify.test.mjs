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
  assert.deepEqual(planVerification(withDatabase, { database: true }).map((step) => step.script), ['lint', 'typecheck', 'test', 'build', 'bundle-secrets', 'db:guard', 'supabase:config', 'db:lint', 'db:test', 'db:guards', 'db:advisors']);
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
    const result = await runVerification({ root, print: (line) => lines.push(line), isDatabaseRunning: async () => false, guardDatabase: async () => ({ ok: true, touchesDatabase: false, migrations: [], problems: [] }) });
    assert.deepEqual(result.failures, ['build']);
    assert.deepEqual(result.skipped, ['bundle-secrets', 'db:lint', 'db:test', 'db:guards', 'db:advisors']);
    assert.ok(lines.some((line) => /pnpm db:start/.test(line)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('database: the guard runs in full verification and a stopped database fails work that changes supabase/', async () => {
  const root = await projectWith({ 'db:lint': pass, 'db:test': pass });
  try {
    await mkdir(join(root, 'supabase'));
    await writeFile(join(root, 'supabase', 'config.toml'), '');
    const lines = [];
    const guardDatabase = async () => ({ ok: false, touchesDatabase: true, migrations: [], problems: ['A migration `x.sql` não tem revisão do DBA.'] });
    const result = await runVerification({ root, print: (line) => lines.push(line), isDatabaseRunning: async () => false, guardDatabase });
    assert.deepEqual(result.failures, ['db:guard', 'database-offline']);
    assert.ok(lines.some((line) => /revisão do DBA/.test(line)));
    assert.ok(lines.some((line) => /muda o banco/.test(line)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('quality: full verification prefers coverage and adds dead-code detection when the project defines them', () => {
  const withQuality = { ...scripts, knip: 'knip', 'test:coverage': 'vitest run --coverage' };
  assert.deepEqual(planVerification(withQuality, {}).map((step) => step.script), ['lint', 'typecheck', 'knip', 'test:coverage', 'build', 'bundle-secrets']);
  assert.deepEqual(planVerification(withQuality, { quick: true }).map((step) => step.script), ['typecheck', 'test']);
});

test('quality: full verification checks generated database types only when the project generates them', () => {
  const withDatabase = { ...scripts, 'db:lint': 'supabase db lint', 'db:test': 'supabase test db', 'db:types': 'supabase gen types' };
  assert.equal(planVerification(withDatabase, { database: true }).at(-1).script, 'db:types-check');
  assert.ok(!planVerification({ ...withDatabase, 'db:types': undefined }, { database: true }).some((step) => step.script === 'db:types-check'));
  assert.ok(!planVerification(withDatabase, { quick: true, database: true }).some((step) => step.script === 'db:types-check'));
});

test('quality: stale database types fail verification with the command that regenerates them', async () => {
  const root = await projectWith({ 'db:lint': pass, 'db:test': pass, 'db:types': pass });
  try {
    await mkdir(join(root, 'supabase'));
    await writeFile(join(root, 'supabase', 'config.toml'), '');
    await mkdir(join(root, 'src', 'lib'), { recursive: true });
    await writeFile(join(root, 'src', 'lib', 'database.types.ts'), 'export type Database = { old: true };\n');
    const lines = [];
    const options = {
      root,
      print: (line) => lines.push(line),
      isDatabaseRunning: async () => true,
      guardDatabase: async () => ({ ok: true, touchesDatabase: false, migrations: [], problems: [] }),
      guardConfig: async () => ({ ok: true, problems: [] }),
      runDatabaseCommand: async () => ({ code: 0, output: '' }),
    };
    const stale = await runVerification({ ...options, generateDatabaseTypes: async () => ({ code: 0, stdout: 'export type Database = { fresh: true };\n', output: '' }) });
    assert.deepEqual(stale.failures, ['db:types-check']);
    assert.ok(lines.some((line) => /pnpm db:types/.test(line)));

    const current = await runVerification({ ...options, generateDatabaseTypes: async () => ({ code: 0, stdout: 'export type Database = { old: true };\n', output: '' }) });
    assert.deepEqual(current.failures, []);

    // CI compares bytes, so verify must too: a stripped trailing newline fails in both places.
    const strippedNewline = await runVerification({ ...options, generateDatabaseTypes: async () => ({ code: 0, stdout: 'export type Database = { old: true };', output: '' }) });
    assert.deepEqual(strippedNewline.failures, ['db:types-check']);

    // Projects created before ADR 0016 have a db:types script but never generated the file.
    await rm(join(root, 'src', 'lib', 'database.types.ts'));
    const neverGenerated = await runVerification({ ...options, generateDatabaseTypes: async () => assert.fail('must not generate types') });
    assert.deepEqual(neverGenerated.failures, []);
    assert.ok(neverGenerated.skipped.includes('db:types-check'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('database: quick verification never runs the documentation guard', () => {
  const withDatabase = { typecheck: 'tsc', test: 'vitest', 'db:test': 'supabase test db' };
  assert.ok(!planVerification(withDatabase, { quick: true, database: true }).some((step) => step.script === 'db:guard'));
});

test('security: full verification reports insecure Supabase configuration without needing Docker', async () => {
  const root = await projectWith({ 'db:lint': pass, 'db:test': pass });
  try {
    await mkdir(join(root, 'supabase'));
    await writeFile(join(root, 'supabase', 'config.toml'), '[auth]\nminimum_password_length = 6\n');
    const lines = [];
    const guardDatabase = async () => ({ ok: true, touchesDatabase: false, migrations: [], problems: [] });
    const result = await runVerification({ root, print: (line) => lines.push(line), isDatabaseRunning: async () => false, guardDatabase });
    assert.ok(result.failures.includes('supabase:config'));
    assert.ok(lines.some((line) => /minimum_password_length/.test(line)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
