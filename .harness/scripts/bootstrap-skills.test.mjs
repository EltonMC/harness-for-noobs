import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBootstrapPlan, parseBootstrapArguments } from './bootstrap-skills.mjs';

const lock = { sources: [
  { id: 'bmad', manager: 'bmad-method', package: 'bmad-method', installerVersion: '6.12.0', modules: ['bmm'] },
  { id: 'impeccable', manager: 'git-source', sourceRevision: 'a'.repeat(40), targets: ['.agents/skills', '.cline/skills'] },
  { id: 'impeccable-claude', manager: 'git-source', sourceRevision: 'a'.repeat(40), targets: ['.claude/skills'] },
] };

test('accepts no arguments or an explicit agent list', () => {
  assert.deepEqual(parseBootstrapArguments([]), { agents: null });
  assert.deepEqual(parseBootstrapArguments(['--agents', 'codex']), { agents: ['codex'] });
  assert.throws(() => parseBootstrapArguments(['--agents']), /Usage:/);
});

test('uses the locked BMad installer version and the selected agents', () => {
  const plan = buildBootstrapPlan(lock, ['claude-code', 'cursor']);
  assert.deepEqual(plan.bmad.slice(0, 3), ['--yes', 'bmad-method@6.12.0', 'install']);
  assert.equal(plan.bmad[plan.bmad.indexOf('--tools') + 1], 'claude-code,cursor');
  assert.deepEqual(plan.skillDirectories, ['.agents/skills', '.claude/skills']);
});

test('installs only Git sources that have a selected target directory', () => {
  assert.deepEqual(buildBootstrapPlan(lock, ['codex']).gitSources.map((source) => source.id), ['impeccable']);
  assert.deepEqual(buildBootstrapPlan(lock, ['claude-code']).gitSources.map((source) => source.id), ['impeccable-claude']);
});

test('passes the communication language to BMad when provided', () => {
  const plan = buildBootstrapPlan(lock, ['codex'], { communicationLanguage: 'Brazilian Portuguese' });
  assert.equal(plan.bmad[plan.bmad.indexOf('--communication-language') + 1], 'Brazilian Portuguese');
});
