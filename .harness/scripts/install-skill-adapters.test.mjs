import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { installSkillAdapters, parseAdapterArguments } from './install-skill-adapters.mjs';

test('only removes a retired adapter that this Harness previously managed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-adapters-test-'));
  const skillDirectories = ['.agents/skills'];
  try {
    const source = join(root, '.harness', 'skills', 'harness-current');
    const destinationRoot = join(root, '.agents', 'skills');
    await mkdir(source, { recursive: true });
    await mkdir(join(destinationRoot, 'harness-retired'), { recursive: true });
    await mkdir(join(destinationRoot, 'owner-skill'), { recursive: true });
    await writeFile(join(source, 'SKILL.md'), 'current');
    await writeFile(join(destinationRoot, 'harness-retired', 'SKILL.md'), 'retired');
    await writeFile(join(destinationRoot, 'owner-skill', 'SKILL.md'), 'keep');

    await installSkillAdapters({ root, skillDirectories });

    assert.equal(await readFile(join(destinationRoot, 'harness-retired', 'SKILL.md'), 'utf8'), 'retired');
    assert.equal(await readFile(join(destinationRoot, 'harness-current', 'SKILL.md'), 'utf8'), 'current');
    assert.equal(await readFile(join(destinationRoot, 'owner-skill', 'SKILL.md'), 'utf8'), 'keep');

    await mkdir(join(root, '.harness', 'skills', 'harness-retired'), { recursive: true });
    await writeFile(join(root, '.harness', 'skills', 'harness-retired', 'SKILL.md'), 'retired managed');
    await installSkillAdapters({ root, skillDirectories });
    await rm(join(root, '.harness', 'skills', 'harness-retired'), { recursive: true, force: true });
    await installSkillAdapters({ root, skillDirectories });

    await assert.rejects(readFile(join(destinationRoot, 'harness-retired', 'SKILL.md')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('maps agents to their skill directories and rejects flags without values', () => {
  assert.deepEqual(parseAdapterArguments(['--agents', 'codex,cursor,claude-code']).skillDirectories, ['.agents/skills', '.claude/skills']);
  assert.throws(() => parseAdapterArguments(['--agents']), /Usage:/);
  assert.throws(() => parseAdapterArguments(['--root']), /Usage:/);
});

test('review: removes a retired skill recorded by the v0.2 installer under tool-name keys', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-adapters-legacy-'));
  try {
    await mkdir(join(root, '.harness', 'skills', 'harness-start'), { recursive: true });
    await writeFile(join(root, '.harness', 'skills', 'harness-start', 'SKILL.md'), 'start');
    await mkdir(join(root, '.claude', 'skills', 'harness-local-docker'), { recursive: true });
    await writeFile(join(root, '.claude', 'skills', 'harness-local-docker', 'SKILL.md'), 'retired');
    await writeFile(join(root, '.harness', '.managed-adapters.json'), JSON.stringify({ targets: { claude: ['harness-local-docker'] } }));

    await installSkillAdapters({ root, skillDirectories: ['.claude/skills'] });

    await assert.rejects(readFile(join(root, '.claude', 'skills', 'harness-local-docker', 'SKILL.md')));
    const state = JSON.parse(await readFile(join(root, '.harness', '.managed-adapters.json'), 'utf8'));
    assert.deepEqual(Object.keys(state.targets), ['.claude/skills']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
