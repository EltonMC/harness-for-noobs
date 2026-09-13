import { cp, readFile, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const lockPath = join(repositoryRoot, '.harness', 'skill-sources.lock.json');

export async function syncExternalSkills() {
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  const managedSources = lock.sources.filter((source) => source.manager === 'skills-cli');
  for (const source of managedSources) {
    const sourcePath = join(repositoryRoot, source.sourceDirectory);
    for (const target of source.targets) {
      const targetPath = join(repositoryRoot, target, source.skill);
      if (targetPath === sourcePath) continue;
      await rm(targetPath, { recursive: true, force: true });
      await cp(sourcePath, targetPath, {
        recursive: true,
        force: true,
      });
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
