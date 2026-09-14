import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCaptured } from './process-utils.mjs';
import { repositoryRoot } from './skill-source-utils.mjs';

// Zero-dependency safety net. Gitleaks and GitHub push protection remain the
// stronger controls; this scanner runs everywhere, including before any install.
const allowMarker = 'harness-allow-secret';
// Source files above 1 MB are skipped; build output is scanned up to 50 MB per file.
const maximumSourceBytes = 1024 * 1024;
const maximumBundleBytes = 50 * 1024 * 1024;

const patterns = [
  { id: 'supabase-secret-key', expression: /\bsb_secret_[A-Za-z0-9_-]{20,}/g },
  { id: 'supabase-access-token', expression: /\bsbp_[A-Za-z0-9]{32,}/g },
  { id: 'private-key', expression: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----/g },
  { id: 'aws-access-key', expression: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { id: 'github-token', expression: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/g },
  { id: 'anthropic-key', expression: /\bsk-ant-[A-Za-z0-9_-]{32,}/g },
  { id: 'openai-key', expression: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{40,}/g },
  { id: 'stripe-live-key', expression: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}/g },
  { id: 'slack-token', expression: /\bxox[abprs]-[A-Za-z0-9-]{20,}/g },
];

const databaseUrlExpression = /\bpostgres(?:ql)?:\/\/[^:\s/@'"]+:([^@\s'"]+)@([^/\s:'"?]+)/g;
const localDatabaseHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', 'db', 'postgres', 'host.docker.internal', 'supabase_db']);

function isRealDatabasePassword(password, host) {
  return !/^[$<{]|\$\{/.test(password) && !localDatabaseHosts.has(host.toLowerCase());
}

const jwtExpression = /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;

function decodeJwtRole(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8')).role ?? null;
  } catch {
    return null;
  }
}

export function isForbiddenEnvironmentFile(path) {
  const name = basename(path).toLowerCase();
  if (/^\.env(?:\..+)?\.(?:example|sample|template)$/.test(name)) return false;
  return /^\.env(?:\..+)?$/.test(name) || name === '.envrc' || name === '.dev.vars';
}

export function scanText(text, { path = '' } = {}) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes(allowMarker)) return;
    for (const pattern of patterns) {
      pattern.expression.lastIndex = 0;
      if (pattern.expression.test(line)) findings.push({ path, line: index + 1, rule: pattern.id });
    }
    for (const match of line.matchAll(databaseUrlExpression)) {
      if (isRealDatabasePassword(match[1], match[2])) findings.push({ path, line: index + 1, rule: 'database-url-password' });
    }
    for (const token of line.match(jwtExpression) ?? []) {
      if (decodeJwtRole(token) === 'service_role') findings.push({ path, line: index + 1, rule: 'supabase-service-role-jwt' });
    }
  });
  return findings;
}

function looksBinary(buffer) {
  return buffer.subarray(0, 8000).includes(0);
}

async function gitFileList(root, argumentsList) {
  const result = await runCaptured('git', argumentsList, { cwd: root });
  if (result.code !== 0) throw new Error(`git ${argumentsList.join(' ')} failed: ${result.output.trim()}`);
  return result.stdout.split('\0').filter(Boolean);
}

async function stagedContent(root, path) {
  const result = await runCaptured('git', ['show', `:${path}`], { cwd: root });
  return result.code === 0 ? result.stdoutBuffer : null;
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function scanBuffer(buffer, path, maximumBytes = maximumSourceBytes) {
  if (!buffer || buffer.length > maximumBytes || looksBinary(buffer)) return [];
  return scanText(buffer.toString('utf8'), { path });
}

export async function scanStaged(root = repositoryRoot) {
  const paths = await gitFileList(root, ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']);
  const findings = paths.filter(isForbiddenEnvironmentFile).map((path) => ({ path, line: 0, rule: 'environment-file' }));
  for (const path of paths) findings.push(...scanBuffer(await stagedContent(root, path), path));
  return findings;
}

export async function scanTracked(root = repositoryRoot) {
  const paths = await gitFileList(root, ['ls-files', '-z']);
  const findings = paths.filter(isForbiddenEnvironmentFile).map((path) => ({ path, line: 0, rule: 'environment-file' }));
  for (const path of paths) {
    try {
      const file = join(root, path);
      const entry = await stat(file);
      // Submodule gitlinks and other non-files are listed by git but cannot be read.
      if (entry.isFile() && entry.size <= maximumSourceBytes) findings.push(...scanBuffer(await readFile(file), path));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return findings;
}

export async function scanDirectory(directory) {
  const findings = [];
  for (const file of await walk(directory)) {
    const entry = await stat(file);
    if (entry.size > maximumBundleBytes) {
      findings.push({ path: relative(directory, file), line: 0, rule: 'file-too-large-to-scan' });
      continue;
    }
    findings.push(...scanBuffer(await readFile(file), relative(directory, file), maximumBundleBytes));
  }
  return findings;
}

export function renderFindings(findings) {
  return findings.map((finding) => `  - ${finding.path}${finding.line ? `:${finding.line}` : ''} (${finding.rule})`).join('\n');
}

async function main() {
  const [mode, target] = process.argv.slice(2);
  let findings;
  if (mode === '--staged') findings = await scanStaged();
  else if (mode === '--tracked') findings = await scanTracked();
  else if (mode === '--dir' && target) findings = await scanDirectory(target);
  else throw new Error('Usage: node .harness/scripts/secret-scan.mjs --staged | --tracked | --dir <path>');
  if (findings.length === 0) {
    console.log('Nenhum segredo encontrado.');
    return;
  }
  console.error(`Possíveis segredos encontrados (${findings.length}):\n${renderFindings(findings)}`);
  console.error('Remova o valor e use variáveis de ambiente/segredos do CI. Se for um falso positivo, adicione o comentário "harness-allow-secret" na linha.');
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
