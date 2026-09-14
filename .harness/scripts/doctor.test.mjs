import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { evaluatePrerequisites, findStrayDirectories, readyForSetup } from './doctor.mjs';

const allTools = { node: 'v24.9.0', git: 'git version 2.50.0', pnpm: '12.4.1', uv: 'uv 0.9.0', docker: '28.0.0', supabase: '2.117.0', gh: 'gh version 2.80.0', gitleaks: '8.28.0', rtk: null };

test('marks every required tool ready and never requires optional tools', () => {
  const results = evaluatePrerequisites(allTools, { platform: 'darwin', hasApplication: true });
  assert.equal(readyForSetup(results), true);
  assert.equal(results.find((item) => item.id === 'rtk').level, 'optional');
});

test('gives a platform-specific install command for a missing required tool', () => {
  const mac = evaluatePrerequisites({ ...allTools, uv: null }, { platform: 'darwin', hasApplication: false });
  const windows = evaluatePrerequisites({ ...allTools, uv: null }, { platform: 'win32', hasApplication: false });
  assert.equal(readyForSetup(mac), false);
  assert.match(mac.find((item) => item.id === 'uv').action, /brew install uv/);
  assert.match(windows.find((item) => item.id === 'uv').action, /winget install/);
});

test('rejects an unsupported Node.js major version', () => {
  const results = evaluatePrerequisites({ ...allTools, node: 'v20.11.0' }, { platform: 'linux', hasApplication: false });
  assert.equal(results.find((item) => item.id === 'node').status, 'missing');
});

test('requires Docker and the Supabase CLI only once an application exists', () => {
  const before = evaluatePrerequisites({ ...allTools, docker: null, supabase: null }, { platform: 'darwin', hasApplication: false });
  const after = evaluatePrerequisites({ ...allTools, docker: null, supabase: null }, { platform: 'darwin', hasApplication: true });
  assert.equal(readyForSetup(before), true);
  assert.equal(after.find((item) => item.id === 'docker').level, 'required');
  assert.equal(readyForSetup(after), false);
});

test('finds only untracked top-level directories that contain no files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-stray-'));
  try {
    await mkdir(join(root, '.roo', 'skills'), { recursive: true });
    await mkdir(join(root, 'data', 'skills'), { recursive: true });
    await mkdir(join(root, '.cursor', 'agents'), { recursive: true });
    await writeFile(join(root, '.cursor', 'agents', 'reviewer.md'), 'keep');
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, '_bmad-output'), { recursive: true });
    const stray = await findStrayDirectories(root, { trackedTopLevel: new Set(['src']) });
    assert.deepEqual(stray, ['.roo', 'data']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('requires a pnpm version that honors the pinned packageManager', () => {
  const results = evaluatePrerequisites({ ...allTools, pnpm: '9.12.1' }, { platform: 'darwin', hasApplication: true });
  assert.equal(results.find((item) => item.id === 'pnpm').status, 'missing');
});

test('review: finds external skill copies left in directories the Harness no longer manages', async () => {
  const { findLegacySkillCopies } = await import('./doctor.mjs');
  const root = await mkdtemp(join(tmpdir(), 'harness-legacy-copies-'));
  try {
    await mkdir(join(root, '.cursor', 'skills', 'impeccable'), { recursive: true });
    await writeFile(join(root, '.cursor', 'skills', 'impeccable', '.harness-source.json'), '{}');
    await mkdir(join(root, '.github', 'skills', 'owner-skill'), { recursive: true });
    await writeFile(join(root, '.github', 'skills', 'owner-skill', 'SKILL.md'), 'keep');
    await mkdir(join(root, '.harness'), { recursive: true });
    await writeFile(join(root, '.harness', '.managed-adapters.json'), JSON.stringify({ targets: { github: ['harness-start'] } }));
    await mkdir(join(root, '.github', 'skills', 'harness-start'), { recursive: true });
    assert.deepEqual(await findLegacySkillCopies(root), ['.cursor/skills/impeccable', '.github/skills/harness-start']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('review: a stopped Docker daemon asks to open Docker instead of reinstalling', () => {
  const results = evaluatePrerequisites({ ...allTools, docker: null, dockerCli: 'Docker version 28.0.0' }, { platform: 'darwin', hasApplication: true });
  const docker = results.find((item) => item.id === 'docker');
  assert.equal(docker.status, 'stopped');
  assert.match(docker.action, /Abra o Docker Desktop/);
  assert.equal(readyForSetup(results), false);
});
