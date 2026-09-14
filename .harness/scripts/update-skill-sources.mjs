import { cp, mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { agentsCoveringTargets, bmadToolsFor, skillDirectoriesFor } from './agent-hosts.mjs';
import { checkSkillSources, exitCodeForResults, renderSkillSourceReport } from './check-skill-sources.mjs';
import { commandOutput } from './process-utils.mjs';
import { communicationLanguageFor, readProjectConfig } from './project-config.mjs';
import {
  buildBmadInstallArgs, digestBmadAdapter, installPinnedGitSource, profileSkillNames, pruneBmadSkills, readBmadSkillNames,
  readSkillSourceLock, repositoryRoot, resolvePinnedGitContentDigest, run,
} from './skill-source-utils.mjs';
import { syncExternalSkills } from './sync-external-skills.mjs';

const lockPath = join(repositoryRoot, '.harness', 'skill-sources.lock.json');

async function gitHead(source) {
  return (await commandOutput('git', ['ls-remote', `https://github.com/${source}.git`, 'HEAD']))?.split(/\s+/)[0] ?? null;
}

async function npmVersion(packageName) {
  return commandOutput('npm', ['view', packageName, 'version']);
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

export async function hydrateBmadIntegrity(lock, { root = repositoryRoot, skillDirectory }) {
  const source = lock.sources.find((entry) => entry.manager === 'bmad-method');
  const manifest = await readBmadSkillNames(root);
  if (!manifest) throw new Error('BMad did not produce _bmad/_config/skill-manifest.csv.');
  source.skillManifestDigest = manifest.digest;
  source.adapterDigest = await digestBmadAdapter(root, skillDirectory, profileSkillNames(source, manifest.names));
  if (!source.adapterDigest) throw new Error(`BMad profile skills are missing from ${skillDirectory}.`);
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function snapshotManagedState(lock, skillDirectories) {
  const directory = await mkdtemp(join(tmpdir(), 'harness-skill-update-'));
  const managedPaths = new Set(['_bmad', '.harness/.managed-adapters.json', ...skillDirectories]);
  for (const source of lock.sources.filter((entry) => entry.manager === 'git-source')) {
    managedPaths.add(source.sourceDirectory);
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

async function updatePinnedSources(nextLock, agents) {
  const nextBmad = nextLock.sources.find((source) => source.manager === 'bmad-method');
  if (!nextBmad) throw new Error('The source lock does not define BMad.');
  const skillDirectories = skillDirectoriesFor(agents);
  const communicationLanguage = communicationLanguageFor((await readProjectConfig(repositoryRoot)).owner_locale);
  await run('npx', buildBmadInstallArgs(nextBmad, bmadToolsFor(agents), { communicationLanguage }));
  await pruneBmadSkills({ root: repositoryRoot, source: nextBmad, skillDirectories });
  await hydrateBmadIntegrity(nextLock, { skillDirectory: skillDirectories[0] });
  for (const source of nextLock.sources.filter((entry) => entry.manager === 'git-source')) {
    if (source.targets.some((target) => skillDirectories.includes(target))) await installPinnedGitSource(source);
  }
  await syncExternalSkills({ lock: nextLock, skillDirectories });
}

async function main() {
  if (!process.argv.includes('--apply')) {
    throw new Error('Refusing to update skill sources without --apply. Run the check first and use a reviewed feature branch.');
  }

  const currentLock = await readSkillSourceLock();
  // Updates install and verify every locked target, not only this machine's agents.
  const agents = agentsCoveringTargets(currentLock);
  const skillDirectories = skillDirectoriesFor(agents);
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
  const snapshot = await snapshotManagedState(currentLock, skillDirectories);
  try {
    await mkdir(join(repositoryRoot, '.harness', 'evidence'), { recursive: true });
    await writeFile(join(repositoryRoot, '.harness', 'evidence', 'skill-source-update-before.md'), renderSkillSourceReport(localResults));
    await updatePinnedSources(nextLock, agents);
    const afterResults = await checkSkillSources({ checkUpstream: false, lock: nextLock, skillDirectories });
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
