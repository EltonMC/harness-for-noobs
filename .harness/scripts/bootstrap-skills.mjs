import { fileURLToPath } from 'node:url';
import { bmadToolsFor, defaultAgents, parseAgentList, readLocalState, skillDirectoriesFor, writeLocalState } from './agent-hosts.mjs';
import { installSkillAdapters } from './install-skill-adapters.mjs';
import { buildBmadInstallArgs, installPinnedGitSource, pruneBmadSkills, readSkillSourceLock, repositoryRoot, run } from './skill-source-utils.mjs';
import { syncExternalSkills } from './sync-external-skills.mjs';

const usage = 'Usage: node .harness/scripts/bootstrap-skills.mjs [--agents claude-code,codex,cursor,github-copilot,cline]';

export function parseBootstrapArguments(argumentsList) {
  if (argumentsList.length === 0) return { agents: null };
  if (argumentsList.length === 2 && argumentsList[0] === '--agents' && argumentsList[1]) {
    return { agents: parseAgentList(argumentsList[1]) };
  }
  throw new Error(usage);
}

export function buildBootstrapPlan(lock, agents, options = {}) {
  const bmad = lock.sources.find((source) => source.manager === 'bmad-method');
  if (!bmad) throw new Error('The source lock does not define BMad.');
  const skillDirectories = skillDirectoriesFor(agents);
  return {
    bmadSource: bmad,
    bmad: buildBmadInstallArgs(bmad, bmadToolsFor(agents), options),
    skillDirectories,
    gitSources: lock.sources.filter((source) => source.manager === 'git-source'
      && source.targets.some((target) => skillDirectories.includes(target))),
  };
}

export async function resolveAgents(root, requestedAgents) {
  if (requestedAgents) return requestedAgents;
  return (await readLocalState(root))?.agents ?? defaultAgents;
}

export async function bootstrapSkills({ root = repositoryRoot, agents: requestedAgents, communicationLanguage } = {}) {
  const agents = await resolveAgents(root, requestedAgents);
  const lock = await readSkillSourceLock(root);
  const plan = buildBootstrapPlan(lock, agents, { communicationLanguage });
  await run('npx', plan.bmad, { cwd: root });
  await pruneBmadSkills({ root, source: plan.bmadSource, skillDirectories: plan.skillDirectories });
  for (const source of plan.gitSources) await installPinnedGitSource(source, { root });
  await installSkillAdapters({ root, skillDirectories: plan.skillDirectories });
  await syncExternalSkills({ root, lock, skillDirectories: plan.skillDirectories });
  const previous = await readLocalState(root);
  await writeLocalState(root, { ...previous, agents, skillsInstalledAt: new Date().toISOString() });
  return { agents, skillDirectories: plan.skillDirectories };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  bootstrapSkills(parseBootstrapArguments(process.argv.slice(2))).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
