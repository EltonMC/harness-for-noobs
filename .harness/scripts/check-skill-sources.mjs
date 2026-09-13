import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';

const execFile = promisify(execFileCallback);
import { digestDirectory, digestPath, parseBmadManifestVersion, repositoryRoot } from './skill-source-utils.mjs';
const lockPath = join(repositoryRoot, '.harness', 'skill-sources.lock.json');

export function classifyRevision(lockedRevision, remoteRevision) {
  if (!remoteRevision) return 'unavailable';
  return lockedRevision === remoteRevision ? 'current' : 'update-available';
}

async function readLock() {
  return JSON.parse(await readFile(lockPath, 'utf8'));
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function gitHead(source) {
  try {
    const { stdout } = await execFile('git', ['ls-remote', `https://github.com/${source}.git`, 'HEAD']);
    return stdout.trim().split(/\s+/)[0] || null;
  } catch {
    return null;
  }
}

async function npmVersion(packageName) {
  try {
    const { stdout } = await execFile('npm', ['view', packageName, 'version']);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function checkGitSource(source, { root = repositoryRoot, checkUpstream = true } = {}) {
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
  const targetStates = await Promise.all(source.targets.map(async (target) => {
    const targetPath = join(root, target, source.skill);
    if (!installed || !await exists(targetPath)) return { target, status: 'missing' };
    const targetDigest = await digestDirectory(targetPath);
    return { target, status: targetDigest === localDigest ? 'current' : 'drifted' };
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

async function checkBmad(source, { root = repositoryRoot, checkUpstream = true } = {}) {
  const manifestPath = join(root, '_bmad', '_config', 'manifest.yaml');
  const manifest = await exists(manifestPath) ? await readFile(manifestPath, 'utf8') : null;
  const installedVersion = manifest ? parseBmadManifestVersion(manifest) : null;
  const remoteVersion = checkUpstream ? await npmVersion(source.package) : null;
  const skillManifestPath = join(root, '_bmad', '_config', 'skill-manifest.csv');
  const skillManifest = await exists(skillManifestPath) ? await readFile(skillManifestPath, 'utf8') : null;
  const skillManifestDigest = skillManifest ? createHash('sha256').update(skillManifest).digest('hex') : null;
  const skillNames = skillManifest?.split('\n').slice(1).filter(Boolean).map((line) => line.match(/^"([^"]+)"/)?.[1]) ?? [];
  const adapterDigests = Object.entries(source.adapterDigests ?? {});
  const adapterIntegrity = skillManifestDigest === source.skillManifestDigest && skillNames.length > 0 && adapterDigests.length > 0
    ? await Promise.all(adapterDigests.map(async ([target, expectedDigest]) => {
      const hash = createHash('sha256');
      for (const skillName of skillNames) {
        const path = join(root, target, skillName);
        if (!await exists(path)) return false;
        hash.update(skillName);
        hash.update(await digestDirectory(path));
      }
      return hash.digest('hex') === expectedDigest;
    })).then((results) => results.every(Boolean))
    : false;
  const targetStates = await Promise.all(source.targets.map(async (target) => {
    const targetPath = join(root, target);
    if (!await exists(targetPath)) return { target, status: 'missing' };
    const expectedDigest = source.targetDigests?.[target];
    return { target, status: expectedDigest && await digestPath(targetPath) === expectedDigest ? 'current' : 'drifted' };
  }));
  return {
    id: source.id,
    installed: installedVersion === source.installedVersion && adapterIntegrity
      ? 'current'
      : installedVersion ? `integrity-mismatch (${installedVersion})` : 'missing',
    upstream: checkUpstream ? classifyRevision(source.installedVersion, remoteVersion) : 'not-checked',
    remoteRevision: remoteVersion,
    targets: targetStates,
  };
}

function hasLocalDrift(result) {
  return result.installed !== 'current' && result.installed !== 'present'
    || result.targets.some((target) => target.status !== 'current');
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
    const targets = result.targets.map((target) => `${target.target}: ${target.status}`).join('<br>');
    lines.push(`| ${result.id} | ${result.upstream} | ${result.installed} | ${targets} |`);
  }
  lines.push('');
  lines.push('An upstream update requires `npm run harness -- update --apply` on a dedicated branch, validation, and human approval before merge.');
  return `${lines.join('\n')}\n`;
}

export async function checkSkillSources({ root = repositoryRoot, checkUpstream = true, lock: providedLock } = {}) {
  const lock = providedLock ?? (root === repositoryRoot ? await readLock() : JSON.parse(await readFile(join(root, '.harness', 'skill-sources.lock.json'), 'utf8')));
  return Promise.all(lock.sources.map((source) => source.manager === 'bmad-method'
    ? checkBmad(source, { root, checkUpstream })
    : checkGitSource(source, { root, checkUpstream })));
}

async function main() {
  const reportIndex = process.argv.indexOf('--report');
  const checkUpstream = !process.argv.includes('--offline');
  const reportPath = reportIndex === -1 ? null : resolve(repositoryRoot, process.argv[reportIndex + 1]);
  if (reportIndex !== -1 && !process.argv[reportIndex + 1]) {
    throw new Error('Usage: node .harness/scripts/check-skill-sources.mjs [--report path]');
  }
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
