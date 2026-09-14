import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentHosts, defaultAgents, parseAgentList, readLocalState } from './agent-hosts.mjs';
import { bootstrapSkills } from './bootstrap-skills.mjs';
import { checkSkillSources, exitCodeForResults } from './check-skill-sources.mjs';
import { collectVersions, evaluatePrerequisites, findLegacySkillCopies, findStrayDirectories, readyForSetup, removeStrayDirectories, runDoctor } from './doctor.mjs';
import { runGithubProtect } from './github-protect.mjs';
import { initApplication } from './init-app.mjs';
import { communicationLanguageFor, readProjectConfig } from './project-config.mjs';
import { runCaptured, runStreaming } from './process-utils.mjs';
import { renderFindings, scanTracked } from './secret-scan.mjs';
import { repositoryRoot } from './skill-source-utils.mjs';
import { runVerification } from './verify.mjs';

const usage = `Uso: npm run harness -- <comando>

Comandos do dia a dia:
  doctor                       Diagnostica o computador e o projeto, com o próximo passo.
  setup [--agents <lista>]     Prepara tudo: skills, Git hooks e proteções.
                               Agentes: ${Object.keys(agentHosts).join(', ')} (padrão: ${defaultAgents.join(',')}).
  init-app [--name "Nome"]     Cria a aplicação React + Supabase a partir do template travado.
  verify [--quick] [--e2e]     Roda lint, tipos, testes e build mostrando só o que falhou.

Manutenção:
  check                        Testa o próprio Harness, a integridade das skills e procura segredos.
  github-protect [--apply]     Mostra (ou aplica) a proteção da main e a segurança do GitHub.
  clean [--apply]              Lista (ou remove) pastas vazias deixadas por instalações antigas.
  update-skills --apply        Prepara atualização das skills externas numa branch dedicada.
  version                      Mostra a versão do Harness.`;

function optionValue(options, name) {
  const index = options.indexOf(name);
  if (index === -1) return undefined;
  const value = options[index + 1];
  if (!value || value.startsWith('--')) throw new Error(usage);
  return value;
}

function assertOnly(options, allowedFlags, allowedValues = []) {
  for (let index = 0; index < options.length; index += 1) {
    if (allowedValues.includes(options[index])) {
      index += 1;
    } else if (!allowedFlags.includes(options[index])) {
      throw new Error(usage);
    }
  }
}

export function parseHarnessCommand(argumentsList) {
  const [rawCommand, ...options] = argumentsList;
  const command = { status: 'doctor', update: 'update-skills', help: 'help', '--help': 'help', '-h': 'help' }[rawCommand] ?? rawCommand;
  switch (command) {
    case 'doctor':
    case 'check':
    case 'version':
    case 'help':
      assertOnly(options, []);
      return { command };
    case 'setup':
      assertOnly(options, [], ['--agents']);
      return { command, agents: options.includes('--agents') ? parseAgentList(optionValue(options, '--agents')) : null };
    case 'init-app':
      assertOnly(options, [], ['--name']);
      return { command, name: optionValue(options, '--name') };
    case 'verify':
      assertOnly(options, ['--quick', '--e2e']);
      return { command, quick: options.includes('--quick'), e2e: options.includes('--e2e') };
    case 'github-protect':
    case 'clean':
      assertOnly(options, ['--apply']);
      return { command, apply: options.includes('--apply') };
    case 'update-skills':
      if (options.length !== 1 || options[0] !== '--apply') throw new Error(usage);
      return { command, apply: true };
    default:
      throw new Error(usage);
  }
}

export function agentsFromAnswers(answers) {
  const block = answers.match(/^agents:\s*\n((?:\s*-\s*\S+\s*\n?)+)/m)?.[1];
  const agents = block?.split('\n').map((line) => line.replace(/^\s*-\s*/, '').trim()).filter((agent) => agentHosts[agent]);
  return agents?.length ? agents.sort() : null;
}

async function readAnswers(root) {
  try {
    return await readFile(join(root, '.copier-answers.yml'), 'utf8');
  } catch {
    return '';
  }
}

async function setup({ agents: requestedAgents }) {
  const prerequisites = evaluatePrerequisites(await collectVersions());
  const missing = prerequisites.filter((item) => item.level === 'required' && item.status !== 'ok');
  if (!readyForSetup(prerequisites)) {
    console.log('Antes do setup, instale:');
    for (const item of missing) console.log(`  ✖ ${item.description}${item.version ? ` (versão atual ${item.version})` : ''}\n    ${item.action}`);
    console.log('\nDepois feche e abra o terminal e rode de novo: npm run harness -- setup');
    return 1;
  }
  const answers = await readAnswers(repositoryRoot);
  const agents = requestedAgents ?? (await readLocalState(repositoryRoot))?.agents ?? agentsFromAnswers(answers) ?? defaultAgents;
  const communicationLanguage = communicationLanguageFor((await readProjectConfig(repositoryRoot)).owner_locale);

  console.log(`1/3 Instalando skills para: ${agents.map((agent) => agentHosts[agent].label).join(', ')}`);
  await bootstrapSkills({ agents, communicationLanguage });

  console.log('2/3 Ativando Git hooks (bloqueiam commit na main e segredos)');
  const hooks = await runCaptured('git', ['config', 'core.hooksPath', '.harness/git-hooks'], { cwd: repositoryRoot });
  if (hooks.code !== 0) throw new Error(`Não foi possível ativar os Git hooks: ${hooks.output.trim()}`);

  console.log('3/3 Conferindo o resultado\n');
  const { ready } = await runDoctor();
  if (ready) {
    console.log('\nPróximos passos:');
    console.log('  1. Abra seu agente nesta pasta (ex.: claude) e peça: "use harness-start"');
    console.log('  2. Quando o projeto estiver no GitHub: npm run harness -- github-protect');
  }
  return ready ? 0 : 1;
}

async function runChecks() {
  const tests = [];
  for (const directory of ['.harness/scripts', '.harness/hooks']) {
    for (const entry of await readdir(join(repositoryRoot, directory))) {
      if (entry.endsWith('.test.mjs')) tests.push(`${directory}/${entry}`);
    }
  }
  const testCode = await runStreaming('node', ['--test', ...tests], { cwd: repositoryRoot });

  const sources = await checkSkillSources({ checkUpstream: false });
  const installed = sources.filter((source) => source.installed !== 'not-selected');
  const skillsOk = exitCodeForResults(sources) === 0;
  console.log(`\n${skillsOk ? '✔' : '✖'} Integridade das skills (${installed.map((source) => source.id).join(', ') || 'nenhuma instalada'})`);
  if (!skillsOk) console.log('  → rode: npm run harness -- setup  (detalhes: npm run harness -- doctor)');

  const findings = await scanTracked();
  console.log(`${findings.length === 0 ? '✔' : '✖'} Segredos em arquivos versionados${findings.length ? `:\n${renderFindings(findings)}` : ''}`);
  return testCode === 0 && skillsOk && findings.length === 0 ? 0 : 1;
}

async function initApp({ name }) {
  const { supabaseInitialized } = await initApplication({ projectName: name, print: console.log });
  console.log('Instalando dependências travadas (pnpm install --frozen-lockfile)…');
  const install = await runStreaming('pnpm', ['install', '--frozen-lockfile'], { cwd: repositoryRoot });
  if (install !== 0) {
    console.log(`\n✖ A instalação falhou (código ${install}). Os arquivos da aplicação foram criados, mas as dependências não.
  Causas comuns:
  • pnpm ausente ou antigo → npm run harness -- doctor
  • sem internet ou registro bloqueado → tente de novo mais tarde
  • pacote novo recusado pela proteção de supply chain (minimumReleaseAge/allowBuilds) → peça ajuda: "use harness-recovery"
  Depois de resolver: pnpm install --frozen-lockfile`);
    return install;
  }
  await runCaptured('pnpm', ['exec', 'biome', 'check', '--write', '.'], { cwd: repositoryRoot, timeoutMs: 120_000 });
  console.log(`\nPróximos passos (você mesmo roda, pois o agente não mexe em arquivos .env):
  1. cp .env.example .env.local
  2. Abra o Docker Desktop e rode: pnpm db:start   (cole a "Publishable key" mostrada no .env.local)
  3. pnpm exec playwright install chromium
  4. npm run harness -- verify
  5. git switch -c chore/app-scaffold && git add -A && git commit -m "chore: scaffold application"
  6. Se ainda não protegeu o GitHub: npm run harness -- github-protect --apply`);
  if (!supabaseInitialized) console.log('  • Supabase CLI não encontrado: depois de instalar, rode "supabase init" (doctor mostra o comando).');
  return 0;
}

async function clean({ apply }) {
  const stray = await findStrayDirectories(repositoryRoot);
  const legacyCopies = await findLegacySkillCopies(repositoryRoot);
  const leftovers = [...stray, ...legacyCopies];
  if (leftovers.length === 0) {
    console.log('Nenhuma sobra de instalações antigas.');
    return 0;
  }
  console.log(`${apply ? 'Removendo' : 'Encontradas'} ${leftovers.length} sobra(s) de instalações antigas:\n  ${leftovers.join('\n  ')}`);
  if (!apply) {
    console.log('\nSão pastas vazias ou cópias de skills geradas pelo Harness em pastas que ele não usa mais. Para remover: npm run harness -- clean --apply');
    return 0;
  }
  await removeStrayDirectories(repositoryRoot, leftovers);
  console.log('Pronto.');
  return 0;
}

async function version() {
  console.log(`Harness ${(await readFile(join(repositoryRoot, '.harness', 'VERSION'), 'utf8')).trim()}`);
  return 0;
}

async function main() {
  const parsed = parseHarnessCommand(process.argv.slice(2));
  switch (parsed.command) {
    case 'help':
      console.log(usage);
      return 0;
    case 'doctor':
      return (await runDoctor()).ready ? 0 : 1;
    case 'setup':
      return setup(parsed);
    case 'check':
      return runChecks();
    case 'verify':
      return (await runVerification(parsed)).ok ? 0 : 1;
    case 'init-app':
      return initApp(parsed);
    case 'github-protect':
      return (await runGithubProtect(parsed)).ok ? 0 : 1;
    case 'clean':
      return clean(parsed);
    case 'update-skills':
      return runStreaming('node', ['.harness/scripts/update-skill-sources.mjs', '--apply'], { cwd: repositoryRoot });
    case 'version':
      return version();
    default:
      throw new Error(usage);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
