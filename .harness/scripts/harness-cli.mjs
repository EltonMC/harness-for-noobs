import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
import { bootstrapSkills } from './bootstrap-skills.mjs';
import { checkSkillSources, exitCodeForResults } from './check-skill-sources.mjs';
import { repositoryRoot } from './skill-source-utils.mjs';

const execFile = promisify(execFileCallback);

const usage = `Usage: node .harness/scripts/harness-cli.mjs <command>

Commands:
  status                         Show prerequisite and local skill-source status.
  setup [--bmad-tools <tools>]   Install pinned skill sources after prerequisites pass.
  check                          Run the Harness script test suite.
  update --apply                 Prepare a pinned skill-source update for review.
  start                          Explain the next action when no application scaffold exists.`;

export function parseHarnessCommand(argumentsList) {
  const [command, ...options] = argumentsList;
  if (command === 'status' || command === 'check' || command === 'start') {
    if (options.length === 0) return { command };
  }
  if (command === 'setup' && (options.length === 0 || options.length === 2 && options[0] === '--bmad-tools' && options[1])) {
    return { command, bmadTools: options[1] ?? 'codex' };
  }
  if (command === 'update' && options.length === 1 && options[0] === '--apply') return { command, apply: true };
  throw new Error(usage);
}

export function evaluatePrerequisites(versions) {
  const nodeMajor = Number.parseInt(versions.node?.match(/^v?(\d+)/)?.[1] ?? '', 10);
  const nodeSupported = Number.isInteger(nodeMajor) && nodeMajor >= 22;
  return [
    { name: 'Node.js', status: nodeSupported ? 'ready' : 'action-required', action: nodeSupported ? null : 'Install Node.js 22 or newer, then reopen the terminal.' },
    { name: 'Git', status: versions.git ? 'ready' : 'action-required', action: versions.git ? null : 'Install Git and reopen the terminal.' },
    { name: 'npm', status: versions.npm ? 'ready' : 'action-required', action: versions.npm ? null : 'Install npm with the supported Node.js LTS release.' },
    { name: 'Docker Desktop', status: versions.docker ? 'ready' : 'not-required-yet', action: versions.docker ? null : 'Install and start Docker Desktop before running an application stack.' },
    { name: 'uv', status: versions.uv ? 'ready' : 'action-required', action: versions.uv ? null : 'Install uv before invoking BMad workflows.' },
  ];
}

export function readyForSkillSetup(prerequisites) {
  return prerequisites
    .filter((prerequisite) => prerequisite.name !== 'Docker Desktop')
    .every((prerequisite) => prerequisite.status === 'ready');
}

async function commandVersion(command, argumentsList) {
  try {
    const { stdout } = await execFile(command, argumentsList, { cwd: repositoryRoot });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function collectPrerequisites() {
  const [node, git, npm, docker, uv] = await Promise.all([
    commandVersion('node', ['--version']),
    commandVersion('git', ['--version']),
    commandVersion('npm', ['--version']),
    commandVersion('docker', ['info', '--format', '{{.ServerVersion}}']),
    commandVersion('uv', ['--version']),
  ]);
  return { node, git, npm, docker, uv };
}

function printPrerequisites(results) {
  for (const result of results) {
    const suffix = result.action ? ` — ${result.action}` : '';
    console.log(`${result.status}: ${result.name}${suffix}`);
  }
}

async function status() {
  const prerequisiteResults = evaluatePrerequisites(await collectPrerequisites());
  printPrerequisites(prerequisiteResults);
  const sources = await checkSkillSources({ checkUpstream: false });
  for (const source of sources) {
    const adaptersCurrent = source.targets.every((target) => target.status === 'current');
    console.log(`${adaptersCurrent && source.installed === 'current' ? 'ready' : 'action-required'}: skill source ${source.id} (${source.installed}; adapters ${adaptersCurrent ? 'current' : 'need synchronization'})`);
  }
  const sourceExitCode = exitCodeForResults(sources);
  return readyForSkillSetup(prerequisiteResults) && sourceExitCode === 0 ? 0 : 1;
}

async function runChecks() {
  const scripts = (await readdir(join(repositoryRoot, '.harness', 'scripts')))
    .filter((entry) => entry.endsWith('.test.mjs'))
    .map((entry) => join('.harness', 'scripts', entry));
  const { stdout, stderr } = await execFile('node', ['--test', ...scripts], { cwd: repositoryRoot });
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  const sources = await checkSkillSources({ checkUpstream: false });
  for (const source of sources) {
    const adaptersCurrent = source.targets.every((target) => target.status === 'current');
    console.log(`${adaptersCurrent && source.installed === 'current' ? 'ready' : 'action-required'}: skill source ${source.id}`);
  }
  if (exitCodeForResults(sources) !== 0) throw new Error('Skill-source integrity check failed. Run `npm run harness -- setup` to restore the committed sources.');
}

async function start() {
  console.log('No application scaffold exists yet. Define the first user journey and authorization model, then create a scoped application work item before starting Docker Compose.');
}

async function main() {
  const parsed = parseHarnessCommand(process.argv.slice(2));
  if (parsed.command === 'status') process.exitCode = await status();
  if (parsed.command === 'setup') {
    const prerequisiteResults = evaluatePrerequisites(await collectPrerequisites());
    printPrerequisites(prerequisiteResults);
    if (!readyForSkillSetup(prerequisiteResults)) {
      process.exitCode = 1;
      return;
    }
    await bootstrapSkills({ bmadTools: parsed.bmadTools });
  }
  if (parsed.command === 'check') await runChecks();
  if (parsed.command === 'update') {
    const { stdout, stderr } = await execFile('node', ['.harness/scripts/update-skill-sources.mjs', '--apply'], { cwd: repositoryRoot });
    process.stdout.write(stdout);
    process.stderr.write(stderr);
  }
  if (parsed.command === 'start') await start();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
