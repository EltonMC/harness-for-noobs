import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { installSkillAdapters, parseAdapterArguments } from './install-skill-adapters.mjs';

test('only removes a retired adapter that this Harness previously managed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-adapters-test-'));
  try {
    const source = join(root, '.harness', 'skills', 'harness-current');
    const destinationRoot = join(root, '.agents', 'skills');
    await mkdir(source, { recursive: true });
    await mkdir(join(destinationRoot, 'harness-retired'), { recursive: true });
    await mkdir(join(destinationRoot, 'owner-skill'), { recursive: true });
    await writeFile(join(source, 'SKILL.md'), 'current');
    await writeFile(join(destinationRoot, 'harness-retired', 'SKILL.md'), 'retired');
    await writeFile(join(destinationRoot, 'owner-skill', 'SKILL.md'), 'keep');

    await installSkillAdapters({ root, tool: 'agents' });

    assert.equal(await readFile(join(destinationRoot, 'harness-retired', 'SKILL.md'), 'utf8'), 'retired');
    assert.equal(await readFile(join(destinationRoot, 'harness-current', 'SKILL.md'), 'utf8'), 'current');
    assert.equal(await readFile(join(destinationRoot, 'owner-skill', 'SKILL.md'), 'utf8'), 'keep');

    await mkdir(join(root, '.harness', 'skills', 'harness-retired'), { recursive: true });
    await writeFile(join(root, '.harness', 'skills', 'harness-retired', 'SKILL.md'), 'retired managed');
    await installSkillAdapters({ root, tool: 'agents' });
    await rm(join(root, '.harness', 'skills', 'harness-retired'), { recursive: true, force: true });
    await installSkillAdapters({ root, tool: 'agents' });

    await assert.rejects(readFile(join(destinationRoot, 'harness-retired', 'SKILL.md')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects an adapter root flag without its path', () => {
  assert.throws(() => parseAdapterArguments(['--tool', 'agents', '--root']), /Usage:/);
});
