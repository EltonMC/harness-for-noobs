import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Skill directories follow each host's native discovery path. Cursor, Codex, and
// GitHub Copilot share the portable `.agents/skills` directory.
export const agentHosts = {
  'claude-code': { label: 'Claude Code', bmadTool: 'claude-code', skillDirectory: '.claude/skills' },
  codex: { label: 'Codex', bmadTool: 'codex', skillDirectory: '.agents/skills' },
  cursor: { label: 'Cursor', bmadTool: 'cursor', skillDirectory: '.agents/skills' },
  'github-copilot': { label: 'GitHub Copilot', bmadTool: 'github-copilot', skillDirectory: '.agents/skills' },
  cline: { label: 'Cline', bmadTool: 'cline', skillDirectory: '.cline/skills' },
};

export const defaultAgents = ['claude-code'];

const localStateFile = join('.harness', '.local-state.json');

export function parseAgentList(value) {
  const agents = [...new Set(String(value ?? '').split(',').map((agent) => agent.trim()).filter(Boolean))];
  const unknown = agents.filter((agent) => !agentHosts[agent]);
  if (agents.length === 0 || unknown.length > 0) {
    const supported = Object.keys(agentHosts).join(', ');
    throw new Error(`Unsupported agent list "${value ?? ''}". Use one or more of: ${supported}.`);
  }
  return agents.sort();
}

export function skillDirectoriesFor(agents) {
  return [...new Set(agents.map((agent) => agentHosts[agent].skillDirectory))].sort();
}

export function bmadToolsFor(agents) {
  return agents.map((agent) => agentHosts[agent].bmadTool).join(',');
}

// A missing, corrupt, or outdated state file is treated as "not set up yet".
export async function readLocalState(root) {
  try {
    const state = JSON.parse(await readFile(join(root, localStateFile), 'utf8'));
    if (!state || typeof state !== 'object') return null;
    return { ...state, agents: Array.isArray(state.agents) ? state.agents.filter((agent) => agentHosts[agent]) : [] };
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}

// The smallest agent set whose skill directories cover every target in the lock,
// so skill updates install and verify all of them.
export function agentsCoveringTargets(lock) {
  const targets = new Set(lock.sources.flatMap((source) => [...(source.targets ?? []), ...(source.adapterTargets ?? [])]));
  const agents = [];
  for (const [agent, host] of Object.entries(agentHosts)) {
    if (targets.has(host.skillDirectory) && !agents.some((selected) => agentHosts[selected].skillDirectory === host.skillDirectory)) agents.push(agent);
  }
  return agents.sort();
}

export async function writeLocalState(root, state) {
  await writeFile(join(root, localStateFile), `${JSON.stringify(state, null, 2)}\n`);
}

// Agents chosen at setup decide which directories are installed and verified.
// Without a recorded setup, every supported directory is considered.
export async function selectedSkillDirectories(root) {
  const state = await readLocalState(root);
  return state?.agents?.length ? skillDirectoriesFor(state.agents) : skillDirectoriesFor(Object.keys(agentHosts));
}
