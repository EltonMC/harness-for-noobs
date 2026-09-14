import assert from 'node:assert/strict';
import test from 'node:test';

import { agentsFromAnswers, parseHarnessCommand } from './harness-cli.mjs';

test('parses setup with an explicit agent list', () => {
  assert.deepEqual(parseHarnessCommand(['setup', '--agents', 'cursor,claude-code']), { command: 'setup', agents: ['claude-code', 'cursor'] });
});

test('uses the recorded or default agents when setup has no agent list', () => {
  assert.deepEqual(parseHarnessCommand(['setup']), { command: 'setup', agents: null });
});

test('rejects an unknown agent before doing work', () => {
  assert.throws(() => parseHarnessCommand(['setup', '--agents', 'notepad']), /Unsupported agent/);
});

test('keeps status and update as aliases of the renamed commands', () => {
  assert.deepEqual(parseHarnessCommand(['status']), { command: 'doctor' });
  assert.deepEqual(parseHarnessCommand(['update', '--apply']), { command: 'update-skills', apply: true });
});

test('defaults protective commands to a dry run', () => {
  assert.deepEqual(parseHarnessCommand(['github-protect']), { command: 'github-protect', apply: false });
  assert.deepEqual(parseHarnessCommand(['clean', '--apply']), { command: 'clean', apply: true });
});

test('parses verification modes', () => {
  assert.deepEqual(parseHarnessCommand(['verify', '--quick']), { command: 'verify', quick: true, e2e: false });
});

test('rejects unknown commands, unknown flags, and a skill update without --apply', () => {
  assert.throws(() => parseHarnessCommand(['publish']), /Uso:/);
  assert.throws(() => parseHarnessCommand(['doctor', '--fix']), /Uso:/);
  assert.throws(() => parseHarnessCommand(['update-skills']), /Uso:/);
  assert.throws(() => parseHarnessCommand(['init-app', '--name']), /Uso:/);
});

test('reads the agents chosen when the project was created with Copier', () => {
  assert.deepEqual(agentsFromAnswers('_commit: v0.3.0\nagents:\n- codex\n- claude-code\nproduct_locale: pt-BR\n'), ['claude-code', 'codex']);
  assert.equal(agentsFromAnswers('project_name: x\n'), null);
});
