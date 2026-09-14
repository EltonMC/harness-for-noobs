import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAgentList, selectedSkillDirectories, skillDirectoriesFor } from './agent-hosts.mjs';
import { repositoryRoot } from './skill-source-utils.mjs';

// v0.2 recorded managed skills under tool names instead of directories.
const legacyStateKeys = { agents: '.agents/skills', claude: '.claude/skills', cline: '.cline/skills', cursor: '.cursor/skills', github: '.github/skills' };

export function normalizeManagedState(state) {
  const targets = {};
  for (const [key, names] of Object.entries(state?.targets ?? {})) {
    const directory = legacyStateKeys[key] ?? key;
    targets[directory] = [...new Set([...(targets[directory] ?? []), ...names])];
  }
  return { targets };
}

const usage = 'Usage: node .harness/scripts/install-skill-adapters.mjs [--agents claude-code,codex] [--root path]';

export function parseAdapterArguments(argumentsList) {
  const agentsIndex = argumentsList.indexOf('--agents');
  const rootIndex = argumentsList.indexOf('--root');
  if (agentsIndex !== -1 && !argumentsList[agentsIndex + 1]) throw new Error(usage);
  if (rootIndex !== -1 && !argumentsList[rootIndex + 1]) throw new Error(usage);
  return {
    root: rootIndex === -1 ? repositoryRoot : resolve(argumentsList[rootIndex + 1]),
    skillDirectories: agentsIndex === -1 ? undefined : skillDirectoriesFor(parseAgentList(argumentsList[agentsIndex + 1])),
  };
}

export async function installSkillAdapters({ root = repositoryRoot, skillDirectories } = {}) {
  const directories = skillDirectories ?? await selectedSkillDirectories(root);
  const skillsRoot = join(root, '.harness/skills');
  const skills = (await readdir(skillsRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  const names = new Set(skills.map((skill) => skill.name));
  const statePath = join(root, '.harness', '.managed-adapters.json');
  let state = { targets: {} };
  try {
    state = normalizeManagedState(JSON.parse(await readFile(statePath, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
  }

  for (const directory of directories) {
    const targetRoot = join(root, directory);
    await mkdir(targetRoot, { recursive: true });
    // Only remove a retired skill this Harness previously installed here.
    for (const managedName of state.targets[directory] ?? []) {
      if (!names.has(managedName)) await rm(join(targetRoot, managedName), { recursive: true, force: true });
    }
    for (const skill of skills) {
      const destination = join(targetRoot, skill.name);
      await rm(destination, { recursive: true, force: true });
      await cp(join(skillsRoot, skill.name), destination, { recursive: true, force: true });
    }
    state.targets[directory] = [...names].sort();
  }
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  return { skills: skills.length, directories };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  installSkillAdapters(parseAdapterArguments(process.argv.slice(2)))
    .then(({ skills, directories }) => console.log(`Installed ${skills} Harness skill(s) in ${directories.join(', ')}`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
