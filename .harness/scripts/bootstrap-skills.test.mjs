import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBootstrapPlan, parseBmadTools } from './bootstrap-skills.mjs';

test('uses Codex when no BMad target is specified', () => {
  assert.equal(parseBmadTools([]), 'codex');
});

test('accepts an explicit comma-separated BMad target list', () => {
  assert.equal(parseBmadTools(['--bmad-tools', 'codex,cursor']), 'codex,cursor');
});

test('rejects an empty BMad target list', () => {
  assert.throws(() => parseBmadTools(['--bmad-tools']), /Usage:/);
});

test('uses the locked BMad installer version and only pinned Git sources', () => {
  const plan = buildBootstrapPlan({ sources: [
    { manager: 'bmad-method', package: 'bmad-method', installerVersion: '6.12.0', modules: ['bmm'] },
    { id: 'example', manager: 'git-source', sourceRevision: 'a'.repeat(40) },
  ] }, 'codex');
  assert.deepEqual(plan.bmad.slice(0, 3), ['--yes', 'bmad-method@6.12.0', 'install']);
  assert.equal(plan.gitSources[0].sourceRevision, 'a'.repeat(40));
});
