import { fileURLToPath } from 'node:url';
import { buildBmadInstallArgs, installPinnedGitSource, readSkillSourceLock, repositoryRoot, run } from './skill-source-utils.mjs';
import { installSkillAdapters } from './install-skill-adapters.mjs';
import { syncExternalSkills } from './sync-external-skills.mjs';

export function parseBmadTools(argumentsList) {
  if (argumentsList.length === 0) return 'codex';
  if (argumentsList.length === 2 && argumentsList[0] === '--bmad-tools' && argumentsList[1]) {
    return argumentsList[1];
  }
  throw new Error('Usage: node .harness/scripts/bootstrap-skills.mjs [--bmad-tools codex,claude-code,cursor]');
}

export function buildBootstrapPlan(lock, bmadTools) {
  const bmad = lock.sources.find((source) => source.manager === 'bmad-method');
  if (!bmad) throw new Error('The source lock does not define BMad.');
  return {
    bmad: buildBmadInstallArgs(bmad, bmadTools),
    gitSources: lock.sources.filter((source) => source.manager === 'git-source'),
  };
}

export async function bootstrapSkills({ root = repositoryRoot, bmadTools = 'codex' } = {}) {
  const lock = await readSkillSourceLock(root);
  const plan = buildBootstrapPlan(lock, bmadTools);
  await run('npx', plan.bmad, { cwd: root });
  for (const source of plan.gitSources) await installPinnedGitSource(source, { root });
  await installSkillAdapters({ root, tool: 'all' });
  await syncExternalSkills({ root });
}

async function main() {
  await bootstrapSkills({ bmadTools: parseBmadTools(process.argv.slice(2)) });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
