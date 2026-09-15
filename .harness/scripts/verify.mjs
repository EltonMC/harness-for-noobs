import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readApplicationState } from './application-state.mjs';
import { renderReport, runDatabaseGuard } from './database-guard.mjs';
import { runCaptured } from './process-utils.mjs';
import { runSupabaseConfigGuard } from './supabase-config-guard.mjs';
import { renderFindings, scanDirectory } from './secret-scan.mjs';
import { exists, repositoryRoot } from './skill-source-utils.mjs';

// Runs the project gates with full logs on disk and a short failure summary on
// screen, so agents read only what they need to fix.

const quickScripts = ['typecheck', 'test'];
const fullScripts = ['lint', 'typecheck', 'knip', 'test', 'build'];
const databaseTypesPath = join('src', 'lib', 'database.types.ts');
const databaseScripts = ['db:lint', 'db:test'];
// Harness-owned database gates run directly, so they reach projects whose package.json predates them.
const harnessDatabaseCommands = [
  { script: 'db:guards', command: ['supabase', ['test', 'db', '.harness/database/guards']] },
  { script: 'db:advisors', command: ['supabase', ['db', 'advisors', '--local', '--type', 'security', '--level', 'warn', '--fail-on', 'warn']] },
];
const failureMarker = /\b(?:error|fail(?:ed|ure)?|exception|cannot|unable|not found|expected|received)\b|✖|×|✗|FAIL|ERR!/i;

export function planVerification(scripts, { quick = false, e2e = false, database = false } = {}) {
  // Full verification measures coverage when the project defines it; quick feedback stays fast.
  const withCoverage = (script) => (!quick && script === 'test' && scripts['test:coverage'] ? 'test:coverage' : script);
  const selected = (quick ? quickScripts : fullScripts).filter((script) => scripts[script]).map(withCoverage);
  const steps = selected.map((script) => ({ script, kind: 'script' }));
  if (!quick && scripts.build) steps.push({ script: 'bundle-secrets', kind: 'bundle-secrets' });
  if (database && scripts['db:test']) {
    if (!quick) steps.push({ script: 'db:guard', kind: 'database-guard' }, { script: 'supabase:config', kind: 'config-guard' });
    steps.push(...databaseScripts.filter((script) => scripts[script]).map((script) => ({ script, kind: 'database' })));
    steps.push(...harnessDatabaseCommands.map((step) => ({ ...step, kind: 'database' })));
    if (!quick && scripts['db:types']) steps.push({ script: 'db:types-check', kind: 'database-types' });
  }
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

function localDatabaseTypes(root) {
  return runCaptured('supabase', ['gen', 'types', 'typescript', '--local'], { cwd: root, timeoutMs: 120_000 });
}

function runDatabaseCommand(command, args, options) {
  return runCaptured(command, args, { ...options, timeoutMs: 600_000 });
}

// The committed types must match the local schema, or the typed client lies about the database.
// Compared byte for byte, like the Database gate in CI.
async function checkDatabaseTypes(committed, root, generateDatabaseTypes) {
  const generated = await generateDatabaseTypes(root);
  if (generated.code !== 0) return { code: generated.code, output: generated.output };
  if (generated.stdout === committed) return { code: 0, output: 'Database types match the local schema.' };
  return { code: 1, output: `Error: ${databaseTypesPath} is out of date with the local schema. Run: pnpm db:types` };
}

export async function runVerification({
  root = repositoryRoot, quick = false, e2e = false, database = !quick, print = console.log, isDatabaseRunning = localDatabaseRunning,
  guardDatabase = runDatabaseGuard, guardConfig = runSupabaseConfigGuard, generateDatabaseTypes = localDatabaseTypes,
  runDatabaseCommand: runHarnessDatabaseCommand = runDatabaseCommand,
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
  let guard;
  let configGuard;
  for (const step of steps) {
    if (step.kind === 'bundle-secrets' && failures.includes('build')) {
      skipped.push(step.script);
      print(`• ${step.script} pulado — o build falhou, então não há pacote novo para verificar.`);
      continue;
    }
    let committedTypes;
    if (step.kind === 'database-types') {
      committedTypes = await readFile(join(root, databaseTypesPath), 'utf8').catch(() => null);
      if (committedTypes === null) {
        skipped.push(step.script);
        print(`• ${step.script} pulado — ${databaseTypesPath} ainda não existe (gere com: pnpm db:types)`);
        continue;
      }
    }
    if (step.kind === 'database' || step.kind === 'database-types') {
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
    if (step.kind === 'config-guard') {
      configGuard = await guardConfig({ root });
      code = configGuard.ok ? 0 : 1;
      output = configGuard.problems.join('\n') || 'Supabase configuration follows the security baseline.';
    } else if (step.kind === 'database-guard') {
      guard = await guardDatabase({ root });
      code = guard.ok ? 0 : 1;
      output = renderReport(guard);
    } else if (step.kind === 'bundle-secrets') {
      const findings = await exists(join(root, 'dist')) ? await scanDirectory(join(root, 'dist')) : [];
      code = findings.length === 0 ? 0 : 1;
      output = findings.length === 0 ? 'No secrets in dist/.' : `Secrets found in the browser bundle:\n${renderFindings(findings)}`;
    } else if (step.kind === 'database-types') {
      ({ code, output } = await checkDatabaseTypes(committedTypes, root, generateDatabaseTypes));
    } else if (step.command) {
      ({ code, output } = await runHarnessDatabaseCommand(step.command[0], step.command[1], { cwd: root }));
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
      const problems = { 'database-guard': guard?.problems, 'config-guard': configGuard?.problems }[step.kind];
      const summary = problems ? problems.map((problem) => `  • ${problem}`).join('\n') : summarizeFailure(output);
      print(`✖ ${step.script} (${seconds}s) — log completo: ${logPath}\n${summary}`);
      failures.push(step.script);
      if (quick) break;
    }
  }
  if (guard?.touchesDatabase && skipped.some((script) => script.startsWith('db:'))) {
    failures.push('database-offline');
    print(`✖ Este trabalho muda o banco (supabase/), mas os testes do banco não rodaram: ${databaseAvailability}.`);
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
