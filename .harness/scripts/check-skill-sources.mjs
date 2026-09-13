import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';

const execFile = promisify(execFileCallback);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const lockPath = join(repositoryRoot, '.harness', 'skill-sources.lock.json');

export function classifyRevision(lockedRevision, remoteRevision) {
  if (!remoteRevision) return 'unavailable';
  return lockedRevision === remoteRevision ? 'current' : 'update-available';
}

async function readLock() {
  return JSON.parse(await readFile(lockPath, 'utf8'));
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(entryPath);
    if (entry.isFile()) return [entryPath];
    return [];
  }));
  return files.flat().sort();
}

async function digestDirectory(directory) {
  const files = await listFiles(directory);
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(relative(directory, file));
    hash.update(await readFile(file));
  }
  return hash.digest('hex');
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

async function checkSkillCliSource(source) {
  const sourcePath = join(repositoryRoot, source.sourceDirectory);
  const installed = await exists(sourcePath);
  const localDigest = installed ? await digestDirectory(sourcePath) : null;
  const targetStates = await Promise.all(source.targets.map(async (target) => {
    const targetPath = join(repositoryRoot, target, source.skill);
    if (!installed || !await exists(targetPath)) return { target, status: 'missing' };
    const targetDigest = await digestDirectory(targetPath);
    return { target, status: targetDigest === localDigest ? 'current' : 'drifted' };
  }));
  const remoteRevision = await gitHead(source.source);
  return {
    id: source.id,
    installed: installed ? 'present' : 'missing',
    upstream: classifyRevision(source.sourceRevision, remoteRevision),
    remoteRevision,
    targets: targetStates,
  };
}

async function checkBmad(source) {
  const remoteVersion = await npmVersion(source.package);
  const targetStates = await Promise.all(source.targets.map(async (target) => ({
    target,
    status: await exists(join(repositoryRoot, target)) ? 'current' : 'missing',
  })));
  return {
    id: source.id,
    installed: 'present',
    upstream: classifyRevision(source.installedVersion, remoteVersion),
    remoteRevision: remoteVersion,
    targets: targetStates,
  };
}

function hasLocalDrift(result) {
  return result.installed === 'missing' || result.targets.some((target) => target.status !== 'current');
}

function renderReport(results) {
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
  lines.push('An upstream update requires `update-skill-sources.mjs --apply`, a generated draft pull request, validation, and human approval before merge.');
  return `${lines.join('\n')}\n`;
}

export async function checkSkillSources() {
  const lock = await readLock();
  return Promise.all(lock.sources.map((source) => source.manager === 'bmad-method'
    ? checkBmad(source)
    : checkSkillCliSource(source)));
}

async function main() {
  const reportIndex = process.argv.indexOf('--report');
  const reportPath = reportIndex === -1 ? null : resolve(repositoryRoot, process.argv[reportIndex + 1]);
  if (reportIndex !== -1 && !process.argv[reportIndex + 1]) {
    throw new Error('Usage: node .harness/scripts/check-skill-sources.mjs [--report path]');
  }
  const results = await checkSkillSources();
  const report = renderReport(results);
  if (reportPath) {
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, report);
  }
  process.stdout.write(report);
  if (results.some(hasLocalDrift)) process.exitCode = 1;
  else if (results.some((result) => result.upstream !== 'current')) process.exitCode = 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
