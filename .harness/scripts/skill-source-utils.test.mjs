import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildGitInstallPlan, checkSkillLoadable, parseSkillFrontmatter, profileSkillNames, pruneBmadSkills } from './skill-source-utils.mjs';

test('rejects mutable and malformed Git revisions before an installation runs', () => {
  for (const sourceRevision of ['main', 'v1.2.3', 'abc123']) {
    assert.throws(() => buildGitInstallPlan({
      id: 'example', source: 'owner/repository', sourceRevision, sourceDirectory: '.harness/.skill-cache/example', sourceSubdirectory: '.',
    }), /immutable 40-character Git revision/);
  }
});

test('parses inline and folded skill frontmatter', () => {
  assert.deepEqual(parseSkillFrontmatter('---\nname: caveman\ndescription: >\n  Ultra compressed\n  mode.\n---\nBody'), { name: 'caveman', description: 'Ultra compressed mode.' });
  assert.equal(parseSkillFrontmatter('# No frontmatter'), null);
});

test('reports a skill directory that a host cannot load', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-loadable-'));
  try {
    assert.deepEqual(await checkSkillLoadable(root, 'impeccable'), { loadable: false, reason: 'SKILL.md is missing' });
    await writeFile(join(root, 'SKILL.md'), '---\nname: other\ndescription: x\n---\n');
    assert.equal((await checkSkillLoadable(root, 'impeccable')).loadable, false);
    await writeFile(join(root, 'SKILL.md'), '---\nname: impeccable\ndescription: Improve interfaces.\n---\n');
    assert.equal((await checkSkillLoadable(root, 'impeccable')).loadable, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('keeps every skill without a profile and only profile skills with one', () => {
  const names = ['bmad-help', 'bmad-party-mode', 'bmad-build'];
  assert.deepEqual(profileSkillNames({}, names), names);
  assert.deepEqual(profileSkillNames({ skillProfile: { skills: ['bmad-build', 'bmad-help'] } }, names), ['bmad-help', 'bmad-build']);
});

test('prunes only BMad skills outside the profile', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-prune-'));
  try {
    await mkdir(join(root, '_bmad', '_config'), { recursive: true });
    await writeFile(join(root, '_bmad', '_config', 'skill-manifest.csv'), 'canonicalId,name\n"bmad-help","bmad-help"\n"bmad-party-mode","bmad-party-mode"\n');
    for (const skill of ['bmad-help', 'bmad-party-mode', 'harness-start', 'owner-skill']) {
      await mkdir(join(root, '.claude', 'skills', skill), { recursive: true });
    }
    const removed = await pruneBmadSkills({ root, source: { skillProfile: { skills: ['bmad-help'] } }, skillDirectories: ['.claude/skills'] });
    assert.deepEqual(removed, ['bmad-party-mode']);
    assert.deepEqual((await readdir(join(root, '.claude', 'skills'))).sort(), ['bmad-help', 'harness-start', 'owner-skill']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
