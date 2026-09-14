import { readdir, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { agentHosts, readLocalState } from './agent-hosts.mjs';
import { readApplicationState } from './application-state.mjs';
import { checkSkillSources, exitCodeForResults } from './check-skill-sources.mjs';
import { commandOutput, runCaptured } from './process-utils.mjs';
import { repositoryRoot } from './skill-source-utils.mjs';

const installCommands = {
  node: { darwin: 'brew install mise && mise install  (usa a versão do .nvmrc)', win32: 'winget install --id OpenJS.NodeJS.LTS', linux: 'curl https://mise.run | sh && mise install' },
  git: { darwin: 'xcode-select --install', win32: 'winget install --id Git.Git', linux: 'sudo apt install git' },
  pnpm: { darwin: 'brew install pnpm', win32: 'winget install --id pnpm.pnpm', linux: 'npm install --global pnpm@latest' },
  uv: { darwin: 'brew install uv', win32: 'winget install --id astral-sh.uv', linux: 'curl -LsSf https://astral.sh/uv/install.sh | sh' },
  docker: { darwin: 'brew install --cask docker-desktop  (depois abra o Docker Desktop)', win32: 'winget install --id Docker.DockerDesktop  (requer WSL2)', linux: 'https://docs.docker.com/engine/install/' },
  supabase: { darwin: 'brew install supabase/tap/supabase', win32: 'scoop install supabase  (ou use: pnpm dlx supabase)', linux: 'brew install supabase/tap/supabase' },
  gh: { darwin: 'brew install gh && gh auth login', win32: 'winget install --id GitHub.cli; gh auth login', linux: 'https://github.com/cli/cli#installation' },
  gitleaks: { darwin: 'brew install gitleaks', win32: 'winget install --id Gitleaks.Gitleaks', linux: 'https://github.com/gitleaks/gitleaks#installing' },
  rtk: { darwin: 'brew install rtk  (veja docs/guia/06-custos-e-tokens.md antes de ativar)', win32: 'veja docs/guia/06-custos-e-tokens.md', linux: 'veja docs/guia/06-custos-e-tokens.md' },
};

const descriptions = {
  node: 'Node.js 22+ (roda o Harness e a aplicação)',
  git: 'Git (histórico e branches)',
  pnpm: 'pnpm 10+ (instala as dependências da aplicação)',
  uv: 'uv (roda o BMad e o Copier)',
  docker: 'Docker (roda o Supabase local)',
  supabase: 'Supabase CLI (banco local, migrations e testes)',
  gh: 'GitHub CLI (pull requests e proteção da main)',
  gitleaks: 'Gitleaks (detector extra de segredos)',
  rtk: 'RTK (reduz tokens da saída de terminal)',
};

function majorAtLeast(version, minimum) {
  const major = Number.parseInt(version?.match(/(\d+)\./)?.[1] ?? '', 10);
  return Number.isInteger(major) && major >= minimum;
}

// pnpm 10+ switches to the exact version pinned in package.json#packageManager.
const minimumMajors = { node: 22, pnpm: 10 };

export function evaluatePrerequisites(versions, { platform = process.platform, hasApplication = false } = {}) {
  const levels = {
    node: 'required', git: 'required', uv: 'required', pnpm: hasApplication ? 'required' : 'later',
    docker: hasApplication ? 'required' : 'later', supabase: hasApplication ? 'required' : 'later',
    gh: 'recommended', gitleaks: 'recommended', rtk: 'optional',
  };
  return Object.entries(levels).map(([id, level]) => {
    const present = minimumMajors[id] ? majorAtLeast(versions[id], minimumMajors[id]) : Boolean(versions[id]);
    const commands = installCommands[id];
    // Docker installed but its daemon is not running: start it, do not reinstall.
    if (id === 'docker' && !present && versions.dockerCli) {
      return { id, level, description: descriptions[id], status: 'stopped', version: versions.dockerCli, action: 'Abra o Docker Desktop e espere ele ficar pronto.' };
    }
    return {
      id,
      level,
      description: descriptions[id],
      status: present ? 'ok' : 'missing',
      version: versions[id] ?? null,
      action: present ? null : commands[platform] ?? commands.linux,
    };
  });
}

export function readyForSetup(results) {
  return results.every((item) => item.level !== 'required' || item.status === 'ok');
}

export async function collectVersions(root = repositoryRoot) {
  const probes = {
    node: ['node', ['--version']],
    git: ['git', ['--version']],
    pnpm: ['pnpm', ['--version']],
    uv: ['uv', ['--version']],
    docker: ['docker', ['info', '--format', '{{.ServerVersion}}']],
    dockerCli: ['docker', ['--version']],
    supabase: ['supabase', ['--version']],
    gh: ['gh', ['--version']],
    gitleaks: ['gitleaks', ['version']],
    rtk: ['rtk', ['--version']],
  };
  const entries = await Promise.all(Object.entries(probes).map(async ([id, [command, argumentsList]]) => [
    id,
    (await commandOutput(command, argumentsList, { cwd: root }))?.split('\n')[0] ?? null,
  ]));
  return Object.fromEntries(entries);
}

// Directories owned by Git, dependencies, or BMad may legitimately be empty.
const managedDirectories = new Set(['.git', 'node_modules', '_bmad', '_bmad-output']);

// Earlier skill installers created empty directories for dozens of agent hosts.
// Only untracked directories with no files at any depth are reported.
async function containsFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) return true;
    if (await containsFiles(join(directory, entry.name))) return true;
  }
  return false;
}

export async function trackedTopLevelEntries(root) {
  const result = await runCaptured('git', ['ls-files', '-z'], { cwd: root });
  return new Set(result.stdout.split('\0').filter(Boolean).map((path) => path.split('/')[0]));
}

export async function findStrayDirectories(root = repositoryRoot, { trackedTopLevel } = {}) {
  const tracked = trackedTopLevel ?? await trackedTopLevelEntries(root);
  const stray = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || managedDirectories.has(entry.name) || tracked.has(entry.name)) continue;
    if (!await containsFiles(join(root, entry.name))) stray.push(entry.name);
  }
  return stray.sort();
}

export async function removeStrayDirectories(root, directories) {
  for (const directory of directories) await rm(join(root, directory), { recursive: true, force: true });
}

// v0.2 copied external and Harness skills into directories the Harness no
// longer manages. A copy is identified by its provenance file or by the old
// managed-adapter state; the owner's own skills are never listed.
const legacySkillDirectories = ['.cursor/skills', '.github/skills', '.devin/skills'];
const legacyStateKeys = { cursor: '.cursor/skills', github: '.github/skills' };

export async function findLegacySkillCopies(root = repositoryRoot) {
  let managed = {};
  try {
    const state = JSON.parse(await readFile(join(root, '.harness', '.managed-adapters.json'), 'utf8'));
    for (const [key, names] of Object.entries(state.targets ?? {})) managed[legacyStateKeys[key] ?? key] = names;
  } catch {
    managed = {};
  }
  const copies = [];
  for (const directory of legacySkillDirectories) {
    let entries = [];
    try {
      entries = await readdir(join(root, directory), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
      const hasProvenance = await stat(join(root, directory, entry.name, '.harness-source.json')).then(() => true, () => false);
      if (hasProvenance || managed[directory]?.includes(entry.name)) copies.push(`${directory}/${entry.name}`);
    }
  }
  return copies.sort();
}

async function harnessVersion(root) {
  try {
    return (await readFile(join(root, '.harness', 'VERSION'), 'utf8')).trim();
  } catch {
    return 'desconhecida';
  }
}

const levelLabels = { required: 'obrigatório', later: 'necessário ao criar a aplicação', recommended: 'recomendado', optional: 'opcional' };

export async function runDoctor({ root = repositoryRoot, print = console.log } = {}) {
  const applicationState = await readApplicationState(root);
  const application = applicationState.hasApplication;
  const prerequisites = evaluatePrerequisites(await collectVersions(root), { hasApplication: application });
  const state = await readLocalState(root);
  print(`Harness ${await harnessVersion(root)} — diagnóstico\n`);
  print('Ferramentas:');
  for (const item of prerequisites) {
    const symbol = item.status === 'ok' ? '✔' : item.level === 'required' ? '✖' : '•';
    const verb = item.status === 'stopped' ? 'Está instalado, mas parado' : item.version ? `Atualize (versão atual ${item.version})` : 'Instale';
    print(`  ${symbol} ${item.description}${item.status === 'ok' ? '' : ` — ${levelLabels[item.level]}. ${verb}: ${item.action}`}`);
  }

  print('\nConfiguração do projeto:');
  const hooksPath = await commandOutput('git', ['config', '--get', 'core.hooksPath'], { cwd: root });
  const gitHooksReady = hooksPath === '.harness/git-hooks';
  print(`  ${gitHooksReady ? '✔' : '✖'} Git hooks do Harness${gitHooksReady ? '' : ' — rode: npm run harness -- setup'}`);
  const agents = state?.agents ?? [];
  print(`  ${agents.length ? '✔' : '✖'} Agentes configurados: ${agents.length ? agents.map((agent) => agentHosts[agent].label).join(', ') : 'nenhum — rode: npm run harness -- setup'}`);
  print(`  ${application ? '✔' : '•'} Aplicação ${application ? 'criada' : 'ainda não criada — quando estiver pronto: npm run harness -- init-app'}`);
  const supabaseReady = !application || applicationState.hasSupabaseConfig;
  if (application) print(`  ${supabaseReady ? '✔' : '✖'} Supabase local configurado${supabaseReady ? '' : ' — rode: supabase init  (sem isso o check "Database gate" não testa o banco)'}`);

  const sources = await checkSkillSources({ checkUpstream: false, root });
  const skillsReady = exitCodeForResults(sources) === 0;
  print('\nSkills externas:');
  for (const source of sources) {
    if (source.installed === 'not-selected') continue;
    const problems = source.targets.filter((target) => target.status !== 'current');
    const ok = source.installed === 'current' && problems.length === 0;
    print(`  ${ok ? '✔' : '✖'} ${source.id}${ok ? '' : ` — ${source.installed}; ${problems.map((target) => `${target.target}: ${target.status}`).join(', ')}`}`);
  }
  if (!skillsReady) print('  → rode: npm run harness -- setup');

  const stray = await findStrayDirectories(root);
  const legacyCopies = await findLegacySkillCopies(root);
  if (stray.length > 0 || legacyCopies.length > 0) {
    const leftovers = [...stray, ...legacyCopies];
    print(`\n• ${leftovers.length} sobra(s) de instalações antigas (${leftovers.slice(0, 6).join(', ')}${leftovers.length > 6 ? ', …' : ''}).`);
    print('  → para remover com segurança: npm run harness -- clean --apply');
  }

  const ready = readyForSetup(prerequisites) && gitHooksReady && agents.length > 0 && skillsReady && supabaseReady;
  print(ready ? '\nTudo pronto. Abra seu agente e peça: "use harness-start".' : '\nAinda há itens marcados com ✖. Resolva de cima para baixo e rode o diagnóstico de novo.');
  return { ready, prerequisites, stray };
}
