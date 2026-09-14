import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectedSkillDirectories } from './agent-hosts.mjs';
import { commandOutput } from './process-utils.mjs';
import {
  checkSkillLoadable, digestBmadAdapter, digestDirectory, exists, parseBmadManifestVersion, profileSkillNames,
  readBmadSkillNames, readSkillSourceLock, repositoryRoot,
} from './skill-source-utils.mjs';

export function classifyRevision(lockedRevision, remoteRevision) {
  if (!remoteRevision) return 'unavailable';
  return lockedRevision === remoteRevision ? 'current' : 'update-available';
}

async function gitHead(source) {
  return (await commandOutput('git', ['ls-remote', `https://github.com/${source}.git`, 'HEAD']))?.split(/\s+/)[0] ?? null;
}

async function npmVersion(packageName) {
  return commandOutput('npm', ['view', packageName, 'version']);
}

export function selectedTargets(targets, skillDirectories) {
  return skillDirectories ? targets.filter((target) => skillDirectories.includes(target)) : targets;
}

async function checkGitSource(source, { root, checkUpstream, skillDirectories }) {
  const targets = selectedTargets(source.targets, skillDirectories);
  if (targets.length === 0) {
    return { id: source.id, installed: 'not-selected', upstream: 'not-checked', remoteRevision: null, targets: [] };
  }
  const sourcePath = join(root, source.sourceDirectory);
  const installed = await exists(sourcePath);
  const provenancePath = join(sourcePath, '.harness-source.json');
  const provenance = installed && await exists(provenancePath)
    ? JSON.parse(await readFile(provenancePath, 'utf8'))
    : null;
  const localDigest = installed ? await digestDirectory(sourcePath) : null;
  const matchesLock = provenance?.source === source.source
    && provenance?.revision === source.sourceRevision
    && provenance?.contentDigest === source.contentDigest
    && localDigest === source.contentDigest;
  const targetStates = await Promise.all(targets.map(async (target) => {
    const targetPath = join(root, target, source.skill);
    if (!installed || !await exists(targetPath)) return { target, status: 'missing' };
    if (await digestDirectory(targetPath) !== localDigest) return { target, status: 'drifted' };
    const loadable = await checkSkillLoadable(targetPath, source.skill);
    return loadable.loadable ? { target, status: 'current' } : { target, status: `not-loadable (${loadable.reason})` };
  }));
  const remoteRevision = checkUpstream ? await gitHead(source.source) : null;
  return {
    id: source.id,
    installed: matchesLock ? 'current' : installed ? 'provenance-mismatch' : 'missing',
    upstream: checkUpstream ? classifyRevision(source.sourceRevision, remoteRevision) : 'not-checked',
    remoteRevision,
    targets: targetStates,
  };
}

async function checkBmad(source, { root, checkUpstream, skillDirectories }) {
  const manifestPath = join(root, '_bmad', '_config', 'manifest.yaml');
  const installedVersion = await exists(manifestPath) ? parseBmadManifestVersion(await readFile(manifestPath, 'utf8')) : null;
  const skillManifest = await readBmadSkillNames(root);
  const skillNames = skillManifest ? profileSkillNames(source, skillManifest.names) : [];
  const manifestMatches = skillManifest?.digest === source.skillManifestDigest && skillNames.length > 0;
  const targets = selectedTargets(source.adapterTargets, skillDirectories);
  const targetStates = await Promise.all(targets.map(async (target) => {
    if (!await exists(join(root, target))) return { target, status: 'missing' };
    if (!manifestMatches || await digestBmadAdapter(root, target, skillNames) !== source.adapterDigest) {
      return { target, status: 'drifted' };
    }
    for (const skillName of skillNames) {
      const loadable = await checkSkillLoadable(join(root, target, skillName), skillName);
      if (!loadable.loadable) return { target, status: `not-loadable (${skillName}: ${loadable.reason})` };
    }
    return { target, status: 'current' };
  }));
  const remoteVersion = checkUpstream ? await npmVersion(source.package) : null;
  return {
    id: source.id,
    installed: installedVersion === source.installedVersion && manifestMatches
      ? 'current'
      : installedVersion ? `integrity-mismatch (${installedVersion})` : 'missing',
    upstream: checkUpstream ? classifyRevision(source.installedVersion, remoteVersion) : 'not-checked',
    remoteRevision: remoteVersion,
    targets: targetStates,
  };
}

function hasLocalDrift(result) {
  if (result.installed === 'not-selected') return false;
  return result.installed !== 'current' || result.targets.some((target) => target.status !== 'current');
}

export function exitCodeForResults(results) {
  if (results.some(hasLocalDrift)) return 1;
  if (results.some((result) => result.upstream === 'update-available')) return 2;
  return 0;
}

export function renderSkillSourceReport(results) {
  const lines = [
    '# Skill Source Check',
    '',
    '| Source | Upstream | Local installation | Target adapters |',
    '| --- | --- | --- | --- |',
  ];
  for (const result of results) {
    const targets = result.targets.map((target) => `${target.target}: ${target.status}`).join('<br>') || '—';
    lines.push(`| ${result.id} | ${result.upstream} | ${result.installed} | ${targets} |`);
  }
  lines.push('');
  lines.push('An upstream update requires `npm run harness -- update-skills --apply` on a dedicated branch, validation, and human approval before merge.');
  return `${lines.join('\n')}\n`;
}

export async function checkSkillSources({ root = repositoryRoot, checkUpstream = true, lock: providedLock, skillDirectories } = {}) {
  const lock = providedLock ?? await readSkillSourceLock(root);
  const directories = skillDirectories === undefined ? await selectedSkillDirectories(root) : skillDirectories;
  const options = { root, checkUpstream, skillDirectories: directories };
  return Promise.all(lock.sources.map((source) => source.manager === 'bmad-method'
    ? checkBmad(source, options)
    : checkGitSource(source, options)));
}

async function main() {
  const reportIndex = process.argv.indexOf('--report');
  const checkUpstream = !process.argv.includes('--offline');
  if (reportIndex !== -1 && !process.argv[reportIndex + 1]) {
    throw new Error('Usage: node .harness/scripts/check-skill-sources.mjs [--offline] [--report path]');
  }
  const reportPath = reportIndex === -1 ? null : resolve(repositoryRoot, process.argv[reportIndex + 1]);
  const results = await checkSkillSources({ checkUpstream });
  const report = renderSkillSourceReport(results);
  if (reportPath) {
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, report);
  }
  process.stdout.write(report);
  process.exitCode = exitCodeForResults(results);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
