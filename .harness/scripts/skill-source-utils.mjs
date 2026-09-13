import { createHash } from 'node:crypto';
import { cp, mkdtemp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';

const execFile = promisify(execFileCallback);

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function readSkillSourceLock(root = repositoryRoot) {
  return JSON.parse(await readFile(join(root, '.harness', 'skill-sources.lock.json'), 'utf8'));
}

export async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export function buildBmadInstallArgs(source, tools) {
  return [
    '--yes', `${source.package}@${source.installerVersion}`, 'install', '--yes', '--directory', '.',
    '--modules', source.modules.join(','), '--tools', tools, '--no-shims',
  ];
}

export function buildGitInstallPlan(source) {
  if (!/^[0-9a-f]{40}$/i.test(source.sourceRevision ?? '')) {
    throw new Error(`Source ${source.id} must use an immutable 40-character Git revision.`);
  }
  return {
    source: `https://github.com/${source.source}.git`,
    revision: source.sourceRevision,
    sourceSubdirectory: source.sourceSubdirectory,
    destination: source.sourceDirectory,
  };
}

export async function digestDirectory(directory, { ignoredNames = new Set(['.git', '.harness-source.json']) } = {}) {
  const hash = createHash('sha256');
  async function visit(path) {
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (ignoredNames.has(entry.name)) continue;
      const entryPath = join(path, entry.name);
      if (entry.isDirectory()) {
        hash.update(`directory:${relative(directory, entryPath)}\0`);
        await visit(entryPath);
      } else if (entry.isFile()) {
        hash.update(`file:${relative(directory, entryPath)}\0`);
        hash.update(await readFile(entryPath));
      }
    }
  }
  await visit(directory);
  return hash.digest('hex');
}

export async function digestPath(path) {
  const file = await stat(path);
  if (file.isDirectory()) return digestDirectory(path);
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

export function parseBmadManifestVersion(manifest) {
  return manifest.match(/^\s*version:\s*([^\s#]+)\s*$/m)?.[1] ?? null;
}

export async function run(command, argumentsList, { cwd = repositoryRoot } = {}) {
  const { stdout, stderr } = await execFile(command, argumentsList, { cwd });
  process.stdout.write(stdout);
  process.stderr.write(stderr);
}

export async function installPinnedGitSource(source, { root = repositoryRoot } = {}) {
  const plan = buildGitInstallPlan(source);
  const stagingDirectory = await mkdtemp(join(tmpdir(), `harness-${source.id}-`));
  const checkoutDirectory = join(stagingDirectory, 'source');
  const destination = join(root, plan.destination);
  const candidate = `${destination}.harness-next`;
  const previous = `${destination}.harness-previous`;

  try {
    await run('git', ['init', '--quiet', checkoutDirectory], { cwd: root });
    await run('git', ['-C', checkoutDirectory, 'remote', 'add', 'origin', plan.source], { cwd: root });
    await run('git', ['-C', checkoutDirectory, 'fetch', '--depth', '1', 'origin', plan.revision], { cwd: root });
    await run('git', ['-C', checkoutDirectory, 'checkout', '--quiet', '--detach', 'FETCH_HEAD'], { cwd: root });
    const sourceDirectory = join(checkoutDirectory, plan.sourceSubdirectory);
    if (!await exists(sourceDirectory)) {
      throw new Error(`Pinned source ${source.id} does not contain ${plan.sourceSubdirectory}.`);
    }
    await mkdir(dirname(destination), { recursive: true });
    await rm(candidate, { recursive: true, force: true });
    await rm(previous, { recursive: true, force: true });
    await cp(sourceDirectory, candidate, {
      recursive: true,
      force: true,
      filter: (path) => basename(path) !== '.git',
    });
    const contentDigest = await digestDirectory(candidate);
    if (contentDigest !== source.contentDigest) {
      throw new Error(`Pinned source ${source.id} content digest does not match the committed lock.`);
    }
    await writeFile(join(candidate, '.harness-source.json'), `${JSON.stringify({
      source: source.source,
      revision: source.sourceRevision,
      contentDigest,
    }, null, 2)}\n`);
    const hadDestination = await exists(destination);
    if (hadDestination) await rename(destination, previous);
    try {
      await rename(candidate, destination);
    } catch (error) {
      if (hadDestination) await rename(previous, destination);
      throw error;
    }
    await rm(previous, { recursive: true, force: true });
  } finally {
    await rm(candidate, { recursive: true, force: true });
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}

export async function resolvePinnedGitContentDigest(source, { root = repositoryRoot } = {}) {
  const plan = buildGitInstallPlan(source);
  const stagingDirectory = await mkdtemp(join(tmpdir(), `harness-digest-${source.id}-`));
  const checkoutDirectory = join(stagingDirectory, 'source');
  try {
    await run('git', ['init', '--quiet', checkoutDirectory], { cwd: root });
    await run('git', ['-C', checkoutDirectory, 'remote', 'add', 'origin', plan.source], { cwd: root });
    await run('git', ['-C', checkoutDirectory, 'fetch', '--depth', '1', 'origin', plan.revision], { cwd: root });
    await run('git', ['-C', checkoutDirectory, 'checkout', '--quiet', '--detach', 'FETCH_HEAD'], { cwd: root });
    const sourceDirectory = join(checkoutDirectory, plan.sourceSubdirectory);
    if (!await exists(sourceDirectory)) {
      throw new Error(`Pinned source ${source.id} does not contain ${plan.sourceSubdirectory}.`);
    }
    return digestDirectory(sourceDirectory);
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}
