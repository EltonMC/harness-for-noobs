import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { agentsCoveringTargets, defaultAgents, parseAgentList, readLocalState, skillDirectoriesFor } from './agent-hosts.mjs';

test('maps agents to de-duplicated skill directories', () => {
  assert.deepEqual(skillDirectoriesFor(['cursor', 'codex', 'claude-code']), ['.agents/skills', '.claude/skills']);
  assert.deepEqual(parseAgentList(' codex , claude-code,codex'), ['claude-code', 'codex']);
});

test('defaults to the same agent as the Copier question', () => {
  assert.deepEqual(defaultAgents, ['claude-code']);
});

test('ignores a corrupt or outdated local state instead of crashing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-local-state-'));
  try {
    await mkdir(join(root, '.harness'));
    await writeFile(join(root, '.harness', '.local-state.json'), '{not json');
    assert.equal(await readLocalState(root), null);
    await writeFile(join(root, '.harness', '.local-state.json'), JSON.stringify({ agents: ['notepad', 'codex'] }));
    assert.deepEqual((await readLocalState(root)).agents, ['codex']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('selects agents that cover every target directory in the lock', () => {
  const lock = { sources: [{ targets: ['.agents/skills', '.cline/skills'] }, { targets: ['.claude/skills'] }, { adapterTargets: ['.agents/skills'] }] };
  assert.deepEqual(skillDirectoriesFor(agentsCoveringTargets(lock)), ['.agents/skills', '.claude/skills', '.cline/skills']);
});
