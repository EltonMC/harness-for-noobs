import { cp, mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectedSkillDirectories } from './agent-hosts.mjs';
import { readSkillSourceLock, repositoryRoot } from './skill-source-utils.mjs';

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

export async function syncExternalSkills({ root = repositoryRoot, lock: providedLock, skillDirectories } = {}) {
  const lock = providedLock ?? await readSkillSourceLock(root);
  const directories = skillDirectories ?? await selectedSkillDirectories(root);
  const synchronized = [];
  for (const source of lock.sources.filter((entry) => entry.manager === 'git-source')) {
    const targets = source.targets.filter((target) => directories.includes(target));
    for (const target of targets) {
      await replaceDirectory(join(root, source.sourceDirectory), join(root, target, source.skill));
    }
    if (targets.length > 0) synchronized.push(source.id);
  }
  return synchronized;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncExternalSkills()
    .then((skills) => console.log(`Synchronized ${skills.join(', ')} to the selected agent directories`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
