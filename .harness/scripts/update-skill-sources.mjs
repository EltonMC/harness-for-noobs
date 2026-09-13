import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
import { syncExternalSkills } from './sync-external-skills.mjs';

const execFile = promisify(execFileCallback);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const lockPath = join(repositoryRoot, '.harness', 'skill-sources.lock.json');

async function run(command, args) {
  const { stdout, stderr } = await execFile(command, args, { cwd: repositoryRoot });
  process.stdout.write(stdout);
  process.stderr.write(stderr);
}

async function gitHead(source) {
  const { stdout } = await execFile('git', ['ls-remote', `https://github.com/${source}.git`, 'HEAD']);
  return stdout.trim().split(/\s+/)[0];
}

async function npmVersion(packageName) {
  const { stdout } = await execFile('npm', ['view', packageName, 'version']);
  return stdout.trim();
}

async function main() {
  if (!process.argv.includes('--apply')) {
    throw new Error('Refusing to update skill sources without --apply. Run the check first and use a reviewed draft pull request.');
  }

  await run('npx', ['--yes', 'skills', 'update', 'caveman', 'impeccable', '--project', '--yes']);
  await run('npx', ['--yes', 'bmad-method', 'install', '--yes', '--directory', '.', '--action', 'quick-update', '--no-shims']);
  await syncExternalSkills();

  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  for (const source of lock.sources) {
    if (source.manager === 'skills-cli') source.sourceRevision = await gitHead(source.source);
    if (source.manager === 'bmad-method') source.installedVersion = await npmVersion(source.package);
  }
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
