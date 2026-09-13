import { cp, mkdir, readFile, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repositoryRoot } from './skill-source-utils.mjs';

async function replaceDirectory(source, destination) {
  const candidate = `${destination}.harness-next`;
  const previous = `${destination}.harness-previous`;
  await mkdir(dirname(destination), { recursive: true });
  await rm(candidate, { recursive: true, force: true });
  await rm(previous, { recursive: true, force: true });
  await cp(source, candidate, { recursive: true, force: true });
  let hadPrevious = true;
  try {
    await rename(destination, previous);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    hadPrevious = false;
  }
  try {
    await rename(candidate, destination);
  } catch (error) {
    if (hadPrevious) await rename(previous, destination);
    throw error;
  }
  await rm(previous, { recursive: true, force: true });
}

export async function syncExternalSkills({ root = repositoryRoot } = {}) {
  const lock = JSON.parse(await readFile(join(root, '.harness', 'skill-sources.lock.json'), 'utf8'));
  const managedSources = lock.sources.filter((source) => source.manager === 'git-source');
  for (const source of managedSources) {
    const sourcePath = join(root, source.sourceDirectory);
    for (const target of source.targets) {
      const targetPath = join(root, target, source.skill);
      if (targetPath === sourcePath) continue;
      await replaceDirectory(sourcePath, targetPath);
    }
  }
  return managedSources.map((source) => source.id);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncExternalSkills()
    .then((skills) => console.log(`Synchronized ${skills.join(', ')} to portable adapters`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
