import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readApplicationState } from './application-state.mjs';
import { runCaptured } from './process-utils.mjs';
import { renderFindings, scanDirectory } from './secret-scan.mjs';
import { exists, repositoryRoot } from './skill-source-utils.mjs';

// Runs the project gates with full logs on disk and a short failure summary on
// screen, so agents read only what they need to fix.

const quickScripts = ['typecheck', 'test'];
const fullScripts = ['lint', 'typecheck', 'test', 'build'];
const databaseScripts = ['db:lint', 'db:test'];
const failureMarker = /\b(?:error|fail(?:ed|ure)?|exception|cannot|unable|not found|expected|received)\b|✖|×|✗|FAIL|ERR!/i;

export function planVerification(scripts, { quick = false, e2e = false, database = false } = {}) {
  const selected = (quick ? quickScripts : fullScripts).filter((script) => scripts[script]);
  const steps = selected.map((script) => ({ script, kind: 'script' }));
  if (!quick && scripts.build) steps.push({ script: 'bundle-secrets', kind: 'bundle-secrets' });
  if (database) steps.push(...databaseScripts.filter((script) => scripts[script]).map((script) => ({ script, kind: 'database' })));
  if (e2e && scripts['test:e2e']) steps.push({ script: 'test:e2e', kind: 'script' });
  return steps;
}

export function summarizeFailure(output, { maximumLines = 30 } = {}) {
  const lines = output.split(/\r?\n/).map((line) => line.replace(/\x1b\[[0-9;]*m/g, '')).filter((line) => line.trim());
  const relevant = [];
  lines.forEach((line, index) => {
    if (!failureMarker.test(line) || /^\s*[✓✔√]/.test(line)) return;
    for (const candidate of [index, index + 1, index + 2]) {
      if (lines[candidate] !== undefined && !relevant.includes(candidate)) relevant.push(candidate);
    }
  });
  const selected = relevant.length > 0 ? relevant.slice(0, maximumLines) : lines.map((_, index) => index).slice(-maximumLines);
  return selected.map((index) => lines[index]).join('\n');
}

async function localDatabaseRunning(root) {
  const result = await runCaptured('supabase', ['status'], { cwd: root, timeoutMs: 15_000 });
  return result.code === 0;
}

export async function runVerification({
  root = repositoryRoot, quick = false, e2e = false, database = !quick, print = console.log, isDatabaseRunning = localDatabaseRunning,
} = {}) {
  const application = await readApplicationState(root);
  const steps = planVerification(application.scripts, { quick, e2e, database });
  if (steps.length === 0) {
    print('Nenhuma verificação da aplicação configurada ainda. Rode `npm run harness -- init-app` para criar a aplicação.');
    return { ok: true, failures: [], skipped: [] };
  }
  const logDirectory = join(root, '.harness', 'logs');
  await mkdir(logDirectory, { recursive: true });
  const failures = [];
  const skipped = [];
  let databaseAvailability;
  for (const step of steps) {
    if (step.kind === 'bundle-secrets' && failures.includes('build')) {
      skipped.push(step.script);
      print(`• ${step.script} pulado — o build falhou, então não há pacote novo para verificar.`);
      continue;
    }
    if (step.kind === 'database') {
      databaseAvailability ??= !application.hasSupabaseConfig
        ? 'Supabase não inicializado — rode: supabase init'
        : await isDatabaseRunning(root) ? 'running' : 'Supabase local desligado — rode: pnpm db:start';
      if (databaseAvailability !== 'running') {
        skipped.push(step.script);
        print(`• ${step.script} pulado — ${databaseAvailability}`);
        continue;
      }
    }
    const startedAt = Date.now();
    let code;
    let output;
    if (step.kind === 'bundle-secrets') {
      const findings = await exists(join(root, 'dist')) ? await scanDirectory(join(root, 'dist')) : [];
      code = findings.length === 0 ? 0 : 1;
      output = findings.length === 0 ? 'No secrets in dist/.' : `Secrets found in the browser bundle:\n${renderFindings(findings)}`;
    } else {
      ({ code, output } = await runCaptured(application.packageManager, ['run', step.script], {
        cwd: root, env: { ...process.env, CI: process.env.CI ?? '1', FORCE_COLOR: '0' },
      }));
    }
    const logPath = join('.harness', 'logs', `${step.script.replace(/[^\w-]/g, '_')}.log`);
    await writeFile(join(root, logPath), output);
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    if (code === 0) {
      print(`✔ ${step.script} (${seconds}s)`);
    } else {
      print(`✖ ${step.script} (${seconds}s) — log completo: ${logPath}\n${summarizeFailure(output)}`);
      failures.push(step.script);
      if (quick) break;
    }
  }
  if (failures.length > 0) print(`Falhou: ${failures.join(', ')}.`);
  else print(skipped.length > 0 ? `Verde, mas sem verificar: ${skipped.join(', ')}.` : 'Tudo verde.');
  return { ok: failures.length === 0, failures, skipped };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argumentsList = process.argv.slice(2);
  runVerification({ quick: argumentsList.includes('--quick'), e2e: argumentsList.includes('--e2e') })
    .then(({ ok }) => {
      process.exitCode = ok ? 0 : 1;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
