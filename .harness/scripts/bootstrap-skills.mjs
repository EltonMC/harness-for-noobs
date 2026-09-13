import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';

const execFile = promisify(execFileCallback);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function parseBmadTools(argumentsList) {
  if (argumentsList.length === 0) return 'codex';
  if (argumentsList.length === 2 && argumentsList[0] === '--bmad-tools' && argumentsList[1]) {
    return argumentsList[1];
  }
  throw new Error('Usage: node .harness/scripts/bootstrap-skills.mjs [--bmad-tools codex,claude-code,cursor]');
}

async function run(command, args) {
  const { stdout, stderr } = await execFile(command, args, { cwd: repositoryRoot });
  process.stdout.write(stdout);
  process.stderr.write(stderr);
}

async function main() {
  const bmadTools = parseBmadTools(process.argv.slice(2));
  await run('npx', [
    '--yes', 'bmad-method', 'install', '--yes', '--directory', '.', '--modules', 'bmm',
    '--tools', bmadTools, '--no-shims',
  ]);
  await run('npx', ['--yes', 'skills', 'add', 'pbakaus/impeccable', '--skill', 'impeccable', '--agent', 'codex', '--copy', '--yes']);
  await run('npx', ['--yes', 'skills', 'add', 'JuliusBrussee/caveman', '--skill', 'caveman', '--agent', 'codex', '--copy', '--yes']);
  await run('node', ['.harness/scripts/install-skill-adapters.mjs', '--tool', 'all']);
  await run('node', ['.harness/scripts/sync-external-skills.mjs']);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
