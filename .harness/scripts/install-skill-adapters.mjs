import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repositoryRoot } from './skill-source-utils.mjs';

const destinations = {
  agents: '.agents/skills',
  claude: '.claude/skills',
  cline: '.cline/skills',
  cursor: '.cursor/skills',
  github: '.github/skills',
};
export function parseAdapterArguments(argumentsList) {
  const requestedIndex = argumentsList.indexOf('--tool');
  const rootIndex = argumentsList.indexOf('--root');
  const tool = requestedIndex === -1 ? null : argumentsList[requestedIndex + 1];
  if (rootIndex !== -1 && !argumentsList[rootIndex + 1]) {
    throw new Error('Usage: node .harness/scripts/install-skill-adapters.mjs --tool agents|claude|cline|cursor|github|all [--root path]');
  }
  const root = rootIndex === -1 ? repositoryRoot : resolve(argumentsList[rootIndex + 1]);
  if (!tool || !['agents', 'claude', 'cline', 'cursor', 'github', 'all'].includes(tool)) {
    throw new Error('Usage: node .harness/scripts/install-skill-adapters.mjs --tool agents|claude|cline|cursor|github|all [--root path]');
  }
  return { root, tool };
}

export async function installSkillAdapters({ root = repositoryRoot, tool = 'all' } = {}) {
  const skillsRoot = join(root, '.harness/skills');
  const skills = (await readdir(skillsRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  const names = new Set(skills.map((skill) => skill.name));
  const targets = tool === 'all' ? Object.keys(destinations) : [tool];
  const statePath = join(root, '.harness', '.managed-adapters.json');
  let state = { targets: {} };
  try {
    state = JSON.parse(await readFile(statePath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  for (const target of targets) {
    const targetRoot = join(root, destinations[target]);
    await mkdir(targetRoot, { recursive: true });
    for (const managedName of state.targets[target] ?? []) {
      if (!names.has(managedName)) {
        await rm(join(targetRoot, managedName), { recursive: true, force: true });
      }
    }
    for (const skill of skills) {
      const destination = join(targetRoot, skill.name);
      await rm(destination, { recursive: true, force: true });
      await cp(join(skillsRoot, skill.name), destination, { recursive: true, force: true });
    }
    state.targets[target] = [...names].sort();
    console.log(`Installed ${skills.length} Harness skill(s) in ${targetRoot}`);
  }
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  installSkillAdapters(parseAdapterArguments(process.argv.slice(2))).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
