import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { isForbiddenEnvironmentFile, scanDirectory, scanText } from './secret-scan.mjs';

// Fixtures are assembled at runtime so this file never contains a literal secret.
const jwt = (payload) => ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'c2lnbmF0dXJlLXNpZ25hdHVyZQ'].join('.');
const rules = (text) => scanText(text).map((finding) => finding.rule);

test('flags a Supabase service_role JWT but not an anon JWT', () => {
  assert.deepEqual(rules(`const key = "${jwt({ role: 'service_role', iss: 'supabase' })}"`), ['supabase-service-role-jwt']);
  assert.deepEqual(rules(`const key = "${jwt({ role: 'anon', iss: 'supabase' })}"`), []);
});

test('flags each supported credential format', () => {
  const samples = {
    'supabase-secret-key': ['sb', 'secret', 'x'.repeat(30)].join('_'),
    'supabase-access-token': `sbp_${'a1'.repeat(20)}`,
    'private-key': ['-----BEGIN', 'PRIVATE KEY-----'].join(' '),
    'aws-access-key': `AKIA${'A'.repeat(16)}`,
    'github-token': `ghp_${'a'.repeat(36)}`,
    'anthropic-key': `sk-ant-${'a'.repeat(40)}`,
    'stripe-live-key': ['sk', 'live', 'a'.repeat(24)].join('_'),
    'database-url-password': `postgresql://postgres.abc:${'S3cret'.repeat(3)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
  };
  for (const [rule, value] of Object.entries(samples)) {
    assert.ok(rules(`value = "${value}"`).includes(rule), rule);
  }
});

test('does not flag local development database URLs or placeholders', () => {
  assert.deepEqual(rules('DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres'), []);
  assert.deepEqual(rules('DATABASE_URL=postgresql://user:${DB_PASSWORD}@db.example.com/app'), []);
});

test('skips a line marked as an accepted false positive', () => {
  const value = `AKIA${'B'.repeat(16)}`;
  assert.deepEqual(rules(`const example = "${value}"; // harness-allow-secret`), []);
});

test('classifies local secret files and allows example files', () => {
  for (const name of ['.env', '.env.local', 'app/.env.production', '.envrc', '.dev.vars', '.ENV']) assert.equal(isForbiddenEnvironmentFile(name), true, name);
  for (const name of ['.env.example', '.env.local.example', '.env.sample', 'environment.ts']) assert.equal(isForbiddenEnvironmentFile(name), false, name);
});

test('scans large browser bundles in a directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-secret-scan-'));
  try {
    await mkdir(join(root, 'assets'));
    const padding = 'x'.repeat(2 * 1024 * 1024);
    await writeFile(join(root, 'assets', 'index.js'), `${padding}\nconst k="${jwt({ role: 'service_role' })}";\n`);
    await writeFile(join(root, 'assets', 'logo.png'), Buffer.from([0, 1, 2, 3]));
    const findings = await scanDirectory(root);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].path, join('assets', 'index.js'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
