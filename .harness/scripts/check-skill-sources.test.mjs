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
