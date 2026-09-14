import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readApplicationState } from '../scripts/application-state.mjs';
import { runCaptured } from '../scripts/process-utils.mjs';
import { runVerification } from '../scripts/verify.mjs';
import { readStdinJson } from './git-context.mjs';

// Claude Code Stop hook: before the agent finishes a turn that changed
// application code, run the quick gate (type-check + unit tests, plus database
// tests when SQL changed). A failure returns a short summary so the agent fixes
// it instead of declaring success. Unchanged work since the last green run is
// not re-verified.

const applicationSource = /^(?:src|e2e)\/.+\.(?:[cm]?[jt]sx?)$|^supabase\/.+\.sql$/;
const fingerprintFile = join('.harness', 'logs', 'stop-verify.fingerprint');

export function parsePorcelainZ(stdout) {
  const entries = stdout.split('\0');
  const paths = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.length < 4) continue;
    paths.push(entry.slice(3));
    // Renames and copies are followed by the original path, which no longer exists.
    if (/^[RC]/.test(entry)) index += 1;
  }
  return paths;
}

export function applicationChanges(paths) {
  const files = paths.filter((path) => applicationSource.test(path));
  return { files, touchesDatabase: files.some((path) => path.endsWith('.sql')) };
}

async function fingerprint(root, files) {
  const hash = createHash('sha256');
  for (const file of [...files].sort()) {
    hash.update(file);
    try {
      const entry = await stat(join(root, file));
      hash.update(`${entry.size}:${entry.mtimeMs}`);
    } catch {
      hash.update('deleted');
    }
  }
  return hash.digest('hex');
}

async function main() {
  const event = await readStdinJson();
  if (event.stop_hook_active) return;
  const root = process.env.CLAUDE_PROJECT_DIR ?? event.cwd ?? process.cwd();
  if (!(await readApplicationState(root)).hasApplication) return;
  const status = await runCaptured('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root, timeoutMs: 15_000 });
  const { files, touchesDatabase } = applicationChanges(parsePorcelainZ(status.stdout));
  if (files.length === 0) return;
  const current = await fingerprint(root, files);
  const previous = await readFile(join(root, fingerprintFile), 'utf8').catch(() => '');
  if (previous.trim() === current) return;

  const lines = [];
  const { ok } = await runVerification({ root, quick: true, database: touchesDatabase, print: (line) => lines.push(line) });
  if (ok) {
    await mkdir(join(root, '.harness', 'logs'), { recursive: true });
    await writeFile(join(root, fingerprintFile), `${current}\n`);
    return;
  }
  process.stderr.write(`Verificação rápida falhou. Corrija antes de encerrar:\n${lines.join('\n')}\n`);
  process.exitCode = 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Harness stop hook error (ignored): ${error.message}\n`);
  });
}
