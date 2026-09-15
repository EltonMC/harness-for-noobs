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
// not re-verified. A green run still flags, once, source changes without tests,
// removed assertions, and skipped or focused tests.

const applicationSource = /^(?:src|e2e)\/.+\.(?:[cm]?[jt]sx?)$|^supabase\/.+\.sql$/;
const fingerprintFile = join('.harness', 'logs', 'stop-verify.fingerprint');
const attemptsFile = join('.harness', 'logs', 'stop-verify.attempts');
const warningsFile = join('.harness', 'logs', 'stop-verify.warnings');
const maximumBlockedStops = 3;

const testFile = /\.(?:test|spec)\.[cm]?[jt]sx?$|^supabase\/tests\//;
// Copy catalogs, type declarations, generated types, and test helpers change without a behavior test.
const exemptSource = /\.d\.ts$|^src\/lib\/database\.types\.ts$|^src\/test\/|\/i18n\//;
const behaviorSource = /^src\/.+\.[cm]?[jt]sx?$/;
const assertionLine = /\bexpect\s*\(|\bassert\b|\.rejects\b|\.throws\b/;
const disabledTest = /\b(?:it|test|describe)\.(?:skip|only|todo)\s*\(|\bx(?:it|describe)\s*\(/;

export function qualityWarnings({ files, deleted = [], testDiff }) {
  const warnings = [];
  const changedBehavior = files.filter(
    (path) => behaviorSource.test(path) && !testFile.test(path) && !exemptSource.test(path) && !deleted.includes(path),
  );
  if (changedBehavior.length > 0 && !files.some((path) => testFile.test(path))) {
    warnings.push(`Código mudou sem nenhum teste novo ou alterado (${changedBehavior.slice(0, 3).join(', ')}). Mudança de comportamento precisa de teste (TDD).`);
  }
  const lines = testDiff.split('\n');
  const removed = lines.filter((line) => line.startsWith('-') && !line.startsWith('---') && assertionLine.test(line)).length;
  const added = lines.filter((line) => line.startsWith('+') && !line.startsWith('+++') && assertionLine.test(line)).length;
  if (removed > added) warnings.push(`Os testes perderam ${removed - added} assertiva(s). Não enfraqueça testes para passar; corrija o código.`);
  if (lines.some((line) => line.startsWith('+') && disabledTest.test(line))) {
    warnings.push('Um teste foi desligado ou isolado (.skip, .only, .todo). Reative-o antes de encerrar.');
  }
  return warnings;
}

// The signature ignores file names and counts, so editing more files cannot re-raise the same warnings.
export function warningDecision({ warnings, previousSignature }) {
  if (warnings.length === 0) return { raise: false, signature: previousSignature };
  const normalized = warnings.map((warning) => warning.replace(/\([^)]*\)|\d+/g, '')).sort().join('\n');
  const signature = createHash('sha256').update(normalized).digest('hex');
  return { raise: signature !== previousSignature, signature };
}

// A new test file has no HEAD version; treat every line as added.
export function untrackedAsDiff(path, content) {
  return [`+++ b/${path}`, ...content.split('\n').map((line) => `+${line}`)].join('\n');
}

// Claude Code sets stop_hook_active after a blocked stop; keep verifying a few times so a
// second stop cannot skip a still-failing gate, but never trap the agent in a loop.
export function shouldVerifyAgain({ stopHookActive, attempts }) {
  return !stopHookActive || attempts < maximumBlockedStops;
}

async function readAttempts(root, sessionId) {
  const [storedSession, count] = (await readFile(join(root, attemptsFile), 'utf8').catch(() => '')).trim().split(':');
  return storedSession === String(sessionId) ? Number(count) || 0 : 0;
}

async function writeAttempts(root, sessionId, count) {
  await mkdir(join(root, '.harness', 'logs'), { recursive: true });
  await writeFile(join(root, attemptsFile), `${sessionId}:${count}\n`);
}

async function testChanges(root, files, deleted) {
  const tests = files.filter((path) => testFile.test(path) && !deleted.includes(path));
  if (tests.length === 0) return '';
  const tracked = await runCaptured('git', ['ls-files', '--', ...tests], { cwd: root, timeoutMs: 15_000 });
  const trackedTests = new Set(tracked.stdout.split('\n').filter(Boolean));
  const diff = trackedTests.size > 0
    ? await runCaptured('git', ['diff', 'HEAD', '--unified=0', '--', ...trackedTests], { cwd: root, timeoutMs: 15_000 })
    : { code: 0, stdout: '' };
  // Without a HEAD commit there is nothing to compare with, so every test counts as new.
  const newTests = diff.code === 0 ? tests.filter((path) => !trackedTests.has(path)) : tests;
  const untracked = await Promise.all(newTests.map(async (path) => untrackedAsDiff(path, await readFile(join(root, path), 'utf8'))));
  return [diff.code === 0 ? diff.stdout : '', ...untracked].join('\n');
}

async function projectRoot(event) {
  if (process.env.CLAUDE_PROJECT_DIR) return process.env.CLAUDE_PROJECT_DIR;
  // Codex passes only cwd, which may be a subdirectory of the repository.
  const cwd = event.cwd ?? process.cwd();
  const topLevel = await runCaptured('git', ['rev-parse', '--show-toplevel'], { cwd, timeoutMs: 5_000 });
  return topLevel.code === 0 ? topLevel.stdout.trim() : cwd;
}

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
  const root = await projectRoot(event);
  if (!(await readApplicationState(root)).hasApplication) return;
  const attempts = event.stop_hook_active ? await readAttempts(root, event.session_id) : 0;
  if (!shouldVerifyAgain({ stopHookActive: Boolean(event.stop_hook_active), attempts })) return;
  const status = await runCaptured('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root, timeoutMs: 15_000 });
  const { files, touchesDatabase } = applicationChanges(parsePorcelainZ(status.stdout));
  if (files.length === 0) return;
  const current = await fingerprint(root, files);
  const previous = await readFile(join(root, fingerprintFile), 'utf8').catch(() => '');
  if (previous.trim() === current) return;

  const lines = [];
  const { ok } = await runVerification({ root, quick: true, database: touchesDatabase, print: (line) => lines.push(line) });
  if (!ok) {
    await writeAttempts(root, event.session_id, attempts + 1);
    process.stderr.write(`Verificação rápida falhou. Corrija antes de encerrar:\n${lines.join('\n')}\n`);
    process.exitCode = 2;
    return;
  }
  await mkdir(join(root, '.harness', 'logs'), { recursive: true });
  await writeFile(join(root, fingerprintFile), `${current}\n`);
  await writeAttempts(root, event.session_id, 0);
  // Warnings are raised once per change set (the saved fingerprint lets the next stop through)
  // and once per kind of warning, so answering them can never loop.
  const deleted = [];
  for (const file of files) if (!(await stat(join(root, file)).catch(() => null))) deleted.push(file);
  const warnings = qualityWarnings({ files, deleted, testDiff: await testChanges(root, files, deleted) });
  const previousSignature = (await readFile(join(root, warningsFile), 'utf8').catch(() => '')).trim();
  const { raise, signature } = warningDecision({ warnings, previousSignature });
  if (!raise) return;
  await writeFile(join(root, warningsFile), `${signature}\n`);
  process.stderr.write(`Verificação rápida passou, mas revise antes de encerrar:\n${warnings.map((warning) => `• ${warning}`).join('\n')}\nSe for intencional (por exemplo, só texto ou estilo), registre o motivo no work item e encerre.\n`);
  process.exitCode = 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Harness stop hook error (ignored): ${error.message}\n`);
  });
}
