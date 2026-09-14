import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { checkSkillSources, classifyRevision, exitCodeForResults } from './check-skill-sources.mjs';
import { digestDirectory } from './skill-source-utils.mjs';

test('classifies an unchanged source revision as current', () => {
  assert.equal(classifyRevision('abc123', 'abc123'), 'current');
});

test('classifies a different source revision as an available update', () => {
  assert.equal(classifyRevision('abc123', 'def456'), 'update-available');
});

test('classifies a missing remote revision as unavailable', () => {
  assert.equal(classifyRevision('abc123', null), 'unavailable');
});

test('returns a failing exit code for local integrity drift even when an update exists', () => {
  assert.equal(exitCodeForResults([{ installed: 'provenance-mismatch', upstream: 'update-available', targets: [] }]), 1);
});

test('returns a distinct exit code when only a remote update is available', () => {
  assert.equal(exitCodeForResults([{ installed: 'current', upstream: 'update-available', targets: [] }]), 2);
});

test('fails offline integrity when a pinned source and every adapter are changed together', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-source-check-'));
  try {
    const sourceDirectory = join(root, '.agents', 'skills', 'example');
    const adapterDirectory = join(root, '.claude', 'skills', 'example');
    await mkdir(sourceDirectory, { recursive: true });
    await mkdir(adapterDirectory, { recursive: true });
    await writeFile(join(sourceDirectory, 'SKILL.md'), 'approved');
    await writeFile(join(adapterDirectory, 'SKILL.md'), 'approved');
    const contentDigest = await digestDirectory(sourceDirectory);
    const provenance = { source: 'owner/example', revision: 'a'.repeat(40), contentDigest };
    await writeFile(join(sourceDirectory, '.harness-source.json'), JSON.stringify(provenance));
    await writeFile(join(sourceDirectory, 'SKILL.md'), 'tampered');
    await writeFile(join(adapterDirectory, 'SKILL.md'), 'tampered');

    const [result] = await checkSkillSources({
      root,
      checkUpstream: false,
      lock: { sources: [{
        id: 'example', manager: 'git-source', source: provenance.source, sourceRevision: provenance.revision,
        contentDigest, sourceDirectory: '.agents/skills/example', skill: 'example', targets: ['.agents/skills', '.claude/skills'],
      }] },
    });
    assert.notEqual(result.installed, 'current');
    assert.equal(exitCodeForResults([result]), 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function installFakeSource(root, files) {
  const sourceDirectory = join(root, '.harness', '.skill-cache', 'example');
  const adapterDirectory = join(root, '.claude', 'skills', 'example');
  for (const directory of [sourceDirectory, adapterDirectory]) {
    await mkdir(directory, { recursive: true });
    for (const [name, content] of Object.entries(files)) await writeFile(join(directory, name), content);
  }
  const contentDigest = await digestDirectory(sourceDirectory);
  const provenance = { source: 'owner/example', revision: 'a'.repeat(40), contentDigest };
  await writeFile(join(sourceDirectory, '.harness-source.json'), JSON.stringify(provenance));
  return {
    id: 'example', manager: 'git-source', source: provenance.source, sourceRevision: provenance.revision, contentDigest,
    sourceDirectory: '.harness/.skill-cache/example', skill: 'example', targets: ['.claude/skills'],
  };
}

test('fails when a source matches its digest but the installed skill cannot be loaded', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-source-loadable-'));
  try {
    const source = await installFakeSource(root, { 'README.md': 'a whole repository without SKILL.md at its root' });
    const [result] = await checkSkillSources({ root, checkUpstream: false, lock: { sources: [source] }, skillDirectories: ['.claude/skills'] });
    assert.equal(result.installed, 'current');
    assert.match(result.targets[0].status, /not-loadable/);
    assert.equal(exitCodeForResults([result]), 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('ignores sources whose targets belong to agents that were not selected', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-source-selection-'));
  try {
    const source = await installFakeSource(root, { 'SKILL.md': '---\nname: example\ndescription: Example.\n---\n' });
    const [selected] = await checkSkillSources({ root, checkUpstream: false, lock: { sources: [source] }, skillDirectories: ['.claude/skills'] });
    const [notSelected] = await checkSkillSources({ root, checkUpstream: false, lock: { sources: [source] }, skillDirectories: ['.agents/skills'] });
    assert.equal(exitCodeForResults([selected]), 0);
    assert.equal(notSelected.installed, 'not-selected');
    assert.equal(exitCodeForResults([notSelected]), 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('review: BMad integrity round trip detects drift and unloadable skills', async () => {
  const { hydrateBmadIntegrity } = await import('./update-skill-sources.mjs');
  const root = await mkdtemp(join(tmpdir(), 'harness-bmad-check-'));
  try {
    await mkdir(join(root, '_bmad', '_config'), { recursive: true });
    await writeFile(join(root, '_bmad', '_config', 'manifest.yaml'), 'installation:\n  version: 6.12.0\n');
    await writeFile(join(root, '_bmad', '_config', 'skill-manifest.csv'), 'canonicalId,name\n"bmad-help","bmad-help"\n"bmad-party-mode","bmad-party-mode"\n');
    await mkdir(join(root, '.claude', 'skills', 'bmad-help'), { recursive: true });
    await writeFile(join(root, '.claude', 'skills', 'bmad-help', 'SKILL.md'), '---\nname: bmad-help\ndescription: Help.\n---\n');
    const lock = { sources: [{ id: 'bmad', manager: 'bmad-method', installedVersion: '6.12.0', skillProfile: { skills: ['bmad-help'] }, adapterTargets: ['.claude/skills', '.agents/skills'] }] };
    await hydrateBmadIntegrity(lock, { root, skillDirectory: '.claude/skills' });

    const check = async () => (await checkSkillSources({ root, checkUpstream: false, lock, skillDirectories: ['.claude/skills'] }))[0];
    let result = await check();
    assert.equal(result.installed, 'current');
    assert.deepEqual(result.targets, [{ target: '.claude/skills', status: 'current' }]);

    await writeFile(join(root, '.claude', 'skills', 'bmad-help', 'SKILL.md'), '---\nname: bmad-help\ndescription: Tampered.\n---\n');
    result = await check();
    assert.equal(result.targets[0].status, 'drifted');

    await writeFile(join(root, '.claude', 'skills', 'bmad-help', 'SKILL.md'), '# no frontmatter\n');
    await hydrateBmadIntegrity(lock, { root, skillDirectory: '.claude/skills' });
    result = await check();
    assert.match(result.targets[0].status, /not-loadable/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
