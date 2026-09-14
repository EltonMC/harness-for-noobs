import { createHash } from 'node:crypto';
import { cp, mkdtemp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runOrThrow } from './process-utils.mjs';

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

export function buildBmadInstallArgs(source, tools, { communicationLanguage } = {}) {
  const argumentsList = [
    '--yes', `${source.package}@${source.installerVersion}`, 'install', '--yes', '--directory', '.',
    '--modules', source.modules.join(','), '--tools', tools, '--no-shims',
  ];
  if (communicationLanguage) argumentsList.push('--communication-language', communicationLanguage);
  return argumentsList;
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

export const run = runOrThrow;

// A host only discovers a skill whose SKILL.md starts with frontmatter naming it
// and describing when to use it. Content digests alone cannot prove that.
export function parseSkillFrontmatter(markdown) {
  const match = markdown.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const lines = match[1].split(/\r?\n/);
  const fields = {};
  for (let index = 0; index < lines.length; index += 1) {
    const field = lines[index].match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!field) continue;
    let value = field[2].trim();
    if (/^[>|][-+]?$/.test(value)) {
      const block = [];
      while (index + 1 < lines.length && /^(\s+|$)/.test(lines[index + 1]) && !/^[A-Za-z][\w-]*:/.test(lines[index + 1])) {
        block.push(lines[index + 1].trim());
        index += 1;
      }
      value = block.join(' ').trim();
    }
    fields[field[1]] = value.replace(/^["']|["']$/g, '');
  }
  return fields;
}

export async function checkSkillLoadable(directory, expectedName) {
  const skillFile = join(directory, 'SKILL.md');
  if (!await exists(skillFile)) return { loadable: false, reason: 'SKILL.md is missing' };
  const fields = parseSkillFrontmatter(await readFile(skillFile, 'utf8'));
  if (!fields) return { loadable: false, reason: 'SKILL.md has no frontmatter' };
  if (fields.name !== expectedName) return { loadable: false, reason: `frontmatter name is "${fields.name ?? ''}", expected "${expectedName}"` };
  if (!fields.description) return { loadable: false, reason: 'frontmatter description is empty' };
  return { loadable: true, reason: null };
}

export async function readBmadSkillNames(root) {
  const manifestPath = join(root, '_bmad', '_config', 'skill-manifest.csv');
  if (!await exists(manifestPath)) return null;
  const manifest = await readFile(manifestPath, 'utf8');
  return {
    digest: createHash('sha256').update(manifest).digest('hex'),
    names: manifest.split('\n').slice(1).filter(Boolean).map((line) => line.match(/^"([^"]+)"/)?.[1]).filter(Boolean),
  };
}

export function profileSkillNames(source, manifestNames) {
  const profile = source.skillProfile?.skills;
  return profile ? manifestNames.filter((name) => profile.includes(name)) : manifestNames;
}

// Every selected directory receives identical BMad skill content, so one digest
// verifies all of them.
export async function digestBmadAdapter(root, target, skillNames) {
  const hash = createHash('sha256');
  for (const skillName of skillNames) {
    const path = join(root, target, skillName);
    if (!await exists(path)) return null;
    hash.update(skillName);
    hash.update(await digestDirectory(path));
  }
  return hash.digest('hex');
}

// Removes installed BMad skills outside the locked profile. Harness-owned and
// other skills in the same directory are never touched.
export async function pruneBmadSkills({ root, source, skillDirectories }) {
  const manifest = await readBmadSkillNames(root);
  if (!manifest || !source.skillProfile) return [];
  const kept = new Set(profileSkillNames(source, manifest.names));
  const removed = manifest.names.filter((name) => !kept.has(name));
  for (const directory of skillDirectories) {
    for (const name of removed) await rm(join(root, directory, name), { recursive: true, force: true });
  }
  return removed;
}

async function fetchPinnedCheckout(source, root) {
  const plan = buildGitInstallPlan(source);
  const stagingDirectory = await mkdtemp(join(tmpdir(), `harness-${source.id}-`));
  const checkoutDirectory = join(stagingDirectory, 'source');
  try {
    await run('git', ['init', '--quiet', checkoutDirectory], { cwd: root });
    await run('git', ['-C', checkoutDirectory, 'remote', 'add', 'origin', plan.source], { cwd: root });
    await run('git', ['-C', checkoutDirectory, 'fetch', '--quiet', '--depth', '1', 'origin', plan.revision], { cwd: root });
    await run('git', ['-C', checkoutDirectory, 'checkout', '--quiet', '--detach', 'FETCH_HEAD'], { cwd: root });
    const sourceDirectory = join(checkoutDirectory, plan.sourceSubdirectory);
    if (!await exists(sourceDirectory)) {
      throw new Error(`Pinned source ${source.id} does not contain ${plan.sourceSubdirectory}.`);
    }
    return { plan, stagingDirectory, sourceDirectory };
  } catch (error) {
    await rm(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
}

export async function installPinnedGitSource(source, { root = repositoryRoot } = {}) {
  const { plan, stagingDirectory, sourceDirectory } = await fetchPinnedCheckout(source, root);
  const destination = join(root, plan.destination);
  const candidate = `${destination}.harness-next`;
  const previous = `${destination}.harness-previous`;

  try {
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
  const { stagingDirectory, sourceDirectory } = await fetchPinnedCheckout(source, root);
  try {
    return await digestDirectory(sourceDirectory);
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}
