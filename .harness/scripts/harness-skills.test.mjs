import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { checkSkillLoadable, repositoryRoot } from './skill-source-utils.mjs';

test('every Harness-owned skill is loadable by agent hosts', async () => {
  const skillsRoot = join(repositoryRoot, '.harness', 'skills');
  const skills = (await readdir(skillsRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  assert.ok(skills.length > 0);
  for (const skill of skills) {
    assert.deepEqual(await checkSkillLoadable(join(skillsRoot, skill.name), skill.name), { loadable: true, reason: null }, skill.name);
  }
});
