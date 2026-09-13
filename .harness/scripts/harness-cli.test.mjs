import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluatePrerequisites, parseHarnessCommand, readyForSkillSetup } from './harness-cli.mjs';

test('parses a setup command with a selected BMad host', () => {
  assert.deepEqual(parseHarnessCommand(['setup', '--bmad-tools', 'codex,cursor']), {
    command: 'setup',
    bmadTools: 'codex,cursor',
  });
});

test('rejects unknown commands before doing work', () => {
  assert.throws(() => parseHarnessCommand(['publish']), /Usage:/);
});

test('reports a direct action for every missing prerequisite', () => {
  const result = evaluatePrerequisites({ node: null, git: '2.46.0', npm: '10.9.0', docker: null, uv: null });
  assert.deepEqual(result, [
    { name: 'Node.js', status: 'action-required', action: 'Install Node.js 22 or newer, then reopen the terminal.' },
    { name: 'Git', status: 'ready', action: null },
    { name: 'npm', status: 'ready', action: null },
    { name: 'Docker Desktop', status: 'not-required-yet', action: 'Install and start Docker Desktop before running an application stack.' },
    { name: 'uv', status: 'action-required', action: 'Install uv before invoking BMad workflows.' },
  ]);
});

test('allows skill setup when Docker is the only unavailable application prerequisite', () => {
  const prerequisites = evaluatePrerequisites({ node: 'v22.14.0', git: '2.46.0', npm: '10.9.0', docker: null, uv: '0.6.0' });
  assert.equal(readyForSkillSetup(prerequisites), true);
});

test('blocks skill setup on an unsupported Node.js major version', () => {
  const prerequisites = evaluatePrerequisites({ node: 'v20.12.0', git: '2.46.0', npm: '10.9.0', docker: null, uv: '0.6.0' });
  assert.equal(prerequisites[0].status, 'action-required');
  assert.match(prerequisites[0].action, /22/);
  assert.equal(readyForSkillSetup(prerequisites), false);
});
