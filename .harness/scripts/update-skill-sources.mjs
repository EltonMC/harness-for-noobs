import { cp, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
import { checkSkillSources, exitCodeForResults, renderSkillSourceReport } from './check-skill-sources.mjs';
import { buildBmadInstallArgs, digestDirectory, digestPath, exists, installPinnedGitSource, readSkillSourceLock, repositoryRoot, resolvePinnedGitContentDigest, run } from './skill-source-utils.mjs';
import { syncExternalSkills } from './sync-external-skills.mjs';

const execFile = promisify(execFileCallback);
const lockPath = join(repositoryRoot, '.harness', 'skill-sources.lock.json');

async function gitHead(source) {
  const { stdout } = await execFile('git', ['ls-remote', `https://github.com/${source}.git`, 'HEAD']);
  return stdout.trim().split(/\s+/)[0];
}

async function npmVersion(packageName) {
  const { stdout } = await execFile('npm', ['view', packageName, 'version']);
  return stdout.trim();
}

export function buildUpdatedLock(lock, candidates) {
  const updated = structuredClone(lock);
  for (const source of updated.sources) {
    const candidate = candidates[source.id];
    if (!candidate) continue;
    if (source.manager === 'bmad-method') {
      source.installerVersion = candidate;
      source.installedVersion = candidate;
      continue;
    }
    if (!/^[0-9a-f]{40}$/i.test(candidate)) {
      throw new Error(`Candidate for ${source.id} must be an immutable 40-character Git revision.`);
    }
    source.sourceRevision = candidate;
  }
  return updated;
}

async function hydrateGitContentDigests(lock) {
  for (const source of lock.sources.filter((entry) => entry.manager === 'git-source')) {
    source.contentDigest = await resolvePinnedGitContentDigest(source);
  }
}

async function hydrateBmadIntegrity(lock) {
  const source = lock.sources.find((entry) => entry.manager === 'bmad-method');
  const manifestPath = join(repositoryRoot, '_bmad', '_config', 'skill-manifest.csv');
  source.skillManifestDigest = await digestPath(manifestPath);
  const skillNames = (await readFile(manifestPath, 'utf8')).split('\n').slice(1).filter(Boolean).map((line) => line.match(/^"([^"]+)"/)?.[1]);
  const adapterDirectories = Object.keys(source.adapterDigests ?? {});
  source.adapterDigests = {};
  for (const target of adapterDirectories) {
    const hash = createHash('sha256');
    for (const skillName of skillNames) {
      hash.update(skillName);
      hash.update(await digestDirectory(join(repositoryRoot, target, skillName)));
    }
    source.adapterDigests[target] = hash.digest('hex');
  }
  source.targetDigests = Object.fromEntries(await Promise.all(source.targets.map(async (target) => [
    target,
    await digestPath(join(repositoryRoot, target)),
  ])));
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function snapshotManagedState(lock) {
  const directory = await mkdtemp(join(tmpdir(), 'harness-skill-update-'));
  const managedPaths = new Set(['_bmad', '.harness/.managed-adapters.json']);
  const bmad = lock.sources.find((entry) => entry.manager === 'bmad-method');
  for (const target of Object.keys(bmad?.adapterDigests ?? {})) managedPaths.add(target);
  for (const source of lock.sources.filter((entry) => entry.manager === 'git-source')) {
    managedPaths.add(source.sourceDirectory);
    for (const target of source.targets) managedPaths.add(join(target, source.skill));
  }
  const paths = [];
  for (const path of managedPaths) {
    const source = join(repositoryRoot, path);
    const present = await pathExists(source);
    paths.push({ path, present });
    if (present) await cp(source, join(directory, path), { recursive: true });
  }
  return { directory, paths };
}

async function restoreManagedState(snapshot) {
  for (const entry of snapshot.paths) {
    const destination = join(repositoryRoot, entry.path);
    await rm(destination, { recursive: true, force: true });
    if (entry.present) await cp(join(snapshot.directory, entry.path), destination, { recursive: true });
  }
}

async function discoverCandidates(lock) {
  const candidates = {};
  for (const source of lock.sources) {
    candidates[source.id] = source.manager === 'bmad-method'
      ? await npmVersion(source.package)
      : await gitHead(source.source);
    if (!candidates[source.id]) throw new Error(`Could not resolve an update candidate for ${source.id}.`);
  }
  return candidates;
}

function hasUpdate(lock, candidates) {
  return lock.sources.some((source) => source.manager === 'bmad-method'
    ? candidates[source.id] !== source.installedVersion
    : candidates[source.id] !== source.sourceRevision);
}

async function updatePinnedSources(nextLock) {
  const nextBmad = nextLock.sources.find((source) => source.manager === 'bmad-method');
  if (!nextBmad) throw new Error('The source lock does not define BMad.');
  await run('npx', buildBmadInstallArgs(nextBmad, 'codex,claude-code,cline'));
  await hydrateBmadIntegrity(nextLock);
  for (const source of nextLock.sources.filter((entry) => entry.manager === 'git-source')) {
    await installPinnedGitSource(source);
  }
  await syncExternalSkills();
}

async function main() {
  if (!process.argv.includes('--apply')) {
    throw new Error('Refusing to update skill sources without --apply. Run the check first and use a reviewed feature branch.');
  }

  const currentLock = await readSkillSourceLock();
  const localResults = await checkSkillSources({ checkUpstream: false });
  if (exitCodeForResults(localResults) === 1) {
    throw new Error('Local skill-source integrity is not current. Run `npm run harness -- setup` before preparing an update.');
  }
  const candidates = await discoverCandidates(currentLock);
  if (!hasUpdate(currentLock, candidates)) {
    console.log('All managed skill sources already match the newest discovered candidates.');
    return;
  }
  const nextLock = buildUpdatedLock(currentLock, candidates);
  await hydrateGitContentDigests(nextLock);
  const snapshot = await snapshotManagedState(currentLock);
  try {
    await writeFile(join(repositoryRoot, '.harness', 'evidence', 'skill-source-update-before.md'), renderSkillSourceReport(localResults));
    await updatePinnedSources(nextLock);
    const afterResults = await checkSkillSources({ checkUpstream: false, lock: nextLock });
    if (exitCodeForResults(afterResults) !== 0) {
      throw new Error('Post-update integrity verification failed; restoring the previously locked installation.');
    }
    await writeFile(join(repositoryRoot, '.harness', 'evidence', 'skill-source-update-after.md'), renderSkillSourceReport(afterResults));
    await writeFile(lockPath, `${JSON.stringify(nextLock, null, 2)}\n`);
  } catch (error) {
    await restoreManagedState(snapshot);
    throw error;
  } finally {
    await rm(snapshot.directory, { recursive: true, force: true });
  }
  console.log('Prepared pinned source updates with before/after integrity evidence. Review the lockfile diff and run `npm run check` before opening a pull request.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
