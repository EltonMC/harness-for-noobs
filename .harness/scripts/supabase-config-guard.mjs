import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exists, repositoryRoot } from './skill-source-utils.mjs';

// Security baseline for supabase/config.toml and Edge Functions (ADR 0015).
// Auth, API, Storage, and function settings that weaken the application fail
// unless the line (or the line above) carries `# harness:allow <reason>`.

function parseValue(raw) {
  const text = raw.trim();
  if (/^".*"$/.test(text)) return text.slice(1, -1);
  if (/^'.*'$/.test(text)) return text.slice(1, -1);
  if (text === 'true' || text === 'false') return text === 'true';
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  if (/^\[.*\]$/s.test(text)) return [...text.slice(1, -1).matchAll(/"([^"]*)"|'([^']*)'/g)].map((match) => match[1] ?? match[2]);
  return text;
}

function stripComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '#') {
      return { code: line.slice(0, index), comment: line.slice(index) };
    }
  }
  return { code: line, comment: '' };
}

// Minimal TOML reader for the flat keys Supabase uses: sections, scalars, and one-line arrays.
export function parseToml(text) {
  const entries = new Map();
  let section = '';
  let previousComment = '';
  const lines = text.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    let { code, comment } = stripComment(line);
    // Multi-line arrays continue until the closing bracket.
    if (/=\s*\[/.test(code) && !/\]\s*$/.test(code.trim())) {
      while (lineIndex + 1 < lines.length && !/\]\s*$/.test(code.trim())) {
        lineIndex += 1;
        const next = stripComment(lines[lineIndex]);
        code = `${code} ${next.code.trim()}`;
        comment = `${comment} ${next.comment}`;
      }
    }
    const trimmed = code.trim();
    if (!trimmed) {
      previousComment = comment ? `${previousComment} ${comment}` : line.trim() ? previousComment : '';
      continue;
    }
    const header = trimmed.match(/^\[([^\]]+)\]$/);
    if (header) {
      section = header[1].trim();
      previousComment = '';
      continue;
    }
    const pair = trimmed.match(/^([\w.-]+)\s*=\s*(.+)$/);
    if (pair) {
      const key = section ? `${section}.${pair[1]}` : pair[1];
      entries.set(key, { value: parseValue(pair[2]), allowed: /harness:allow\b/.test(`${previousComment} ${comment}`) });
    }
    previousComment = '';
  }
  return entries;
}

const units = { b: 1, kb: 1e3, mb: 1e6, gb: 1e9, kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3 };

function bytes(value) {
  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*([a-z]*)$/i);
  return match ? Number(match[1]) * (units[match[2].toLowerCase() || 'b'] ?? Number.NaN) : Number.NaN;
}

const localUrl = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i;
const strongPasswordRequirements = new Set(['letters_digits', 'lower_upper_letters_digits', 'lower_upper_letters_digits_symbols']);
const rateLimits = { email_sent: 10, sms_sent: 60, anonymous_users: 60, sign_in_sign_ups: 60, token_verifications: 60, token_refresh: 300, web3: 60 };

export function evaluateSupabaseConfig(text) {
  const config = parseToml(text);
  const problems = [];
  const get = (key) => config.get(key);
  const fail = (key, message) => {
    if (!get(key)?.allowed) problems.push(`\`${key}\`: ${message}`);
  };
  const hasAuth = [...config.keys()].some((key) => key.startsWith('auth.'));

  if (hasAuth && get('auth.enabled')?.value !== false) {
    if (!(Number(get('auth.minimum_password_length')?.value) >= 8)) fail('auth.minimum_password_length', 'use pelo menos 8 caracteres (recomendado 10).');
    if (!strongPasswordRequirements.has(get('auth.password_requirements')?.value)) fail('auth.password_requirements', 'exija letras e números (ex.: "lower_upper_letters_digits").');
    if (get('auth.email.enable_confirmations')?.value !== true) fail('auth.email.enable_confirmations', 'confirme o e-mail antes do primeiro login.');
    if (get('auth.email.secure_password_change')?.value !== true) fail('auth.email.secure_password_change', 'peça login recente para trocar a senha.');
    if (get('auth.email.double_confirm_changes')?.value === false) fail('auth.email.double_confirm_changes', 'confirme a troca de e-mail nos dois endereços.');
    if (get('auth.enable_anonymous_sign_ins')?.value === true) fail('auth.enable_anonymous_sign_ins', 'login anônimo cria contas sem identidade; só com exceção justificada.');
    if (Number(get('auth.jwt_expiry')?.value ?? 3600) > 3600) fail('auth.jwt_expiry', 'sessões devem expirar em até 1 hora (3600).');
    if (get('auth.enable_refresh_token_rotation')?.value === false) fail('auth.enable_refresh_token_rotation', 'mantenha a rotação de refresh token ligada.');
    if (get('auth.mfa.totp.enroll_enabled')?.value !== true || get('auth.mfa.totp.verify_enabled')?.value !== true) {
      fail('auth.mfa.totp.enroll_enabled', 'permita autenticação em dois fatores (auth.mfa.totp enroll_enabled e verify_enabled = true).');
    }
    const urls = [get('auth.site_url')?.value, ...(get('auth.additional_redirect_urls')?.value ?? [])].filter((url) => typeof url === 'string');
    for (const url of urls) {
      if (url.includes('*')) fail('auth.additional_redirect_urls', `a URL de retorno "${url}" usa curinga; liste endereços exatos para evitar roubo de sessão.`);
      else if (/^http:\/\//i.test(url) && !localUrl.test(url)) fail('auth.additional_redirect_urls', `a URL de retorno "${url}" não usa HTTPS.`);
    }
    for (const [name, maximum] of Object.entries(rateLimits)) {
      const key = `auth.rate_limit.${name}`;
      if (Number(get(key)?.value) > maximum) fail(key, `limite acima de ${maximum} facilita ataques de força bruta e spam.`);
    }
  }

  if (Number(get('api.max_rows')?.value ?? 1000) > 1000) fail('api.max_rows', 'mais de 1000 linhas por resposta facilita copiar a base inteira.');
  const storageLimit = get('storage.file_size_limit')?.value;
  if (storageLimit !== undefined && !(bytes(storageLimit) <= 50 * 1024 ** 2)) fail('storage.file_size_limit', 'limite de arquivo acima de 50MiB.');

  const buckets = new Set([...config.keys()].map((key) => key.match(/^storage\.buckets\.([^.]+)\./)?.[1]).filter(Boolean));
  for (const bucket of buckets) {
    const prefix = `storage.buckets.${bucket}`;
    if (get(`${prefix}.public`)?.value === true) fail(`${prefix}.public`, 'bucket público: qualquer pessoa com o link baixa os arquivos.');
    if (get(`${prefix}.file_size_limit`) === undefined) problems.push(`\`${prefix}\`: defina file_size_limit.`);
    if (get(`${prefix}.allowed_mime_types`) === undefined) problems.push(`\`${prefix}\`: defina allowed_mime_types (tipos de arquivo aceitos).`);
  }

  for (const [key, entry] of config) {
    if (typeof entry.value === 'string' && /^\{/.test(entry.value)) {
      problems.push(`\`${key}\`: tabela inline não verificada; escreva como seção ([${key}]).`);
      continue;
    }
    if (/^functions\.[^.]+\.verify_jwt$/.test(key) && entry.value === false) fail(key, 'a função aceita chamadas sem login; só com exceção justificada (ex.: webhook com assinatura).');
    const secretLike = /(?:^|[._])(?:secret|secrets|pass|password|token|api_key|secret_key)$/i.test(key) || /(?:^|\.)secrets\./.test(key);
    if (secretLike && typeof entry.value === 'string' && entry.value !== '' && !/^env\(/.test(entry.value)) {
      problems.push(`\`${key}\`: valor secreto escrito no arquivo; use env(NOME_DA_VARIAVEL).`);
    }
  }
  return problems;
}

const hardenedDefaults = [
  ['auth', 'minimum_password_length', '10'],
  ['auth', 'password_requirements', '"lower_upper_letters_digits"'],
  ['auth.email', 'enable_confirmations', 'true'],
  ['auth.email', 'secure_password_change', 'true'],
  ['auth.mfa.totp', 'enroll_enabled', 'true'],
  ['auth.mfa.totp', 'verify_enabled', 'true'],
];

// Applied by init-app right after `supabase init`, so a new project starts compliant.
export function hardenSupabaseConfig(text) {
  const lines = text.split('\n');
  for (const [section, key, value] of hardenedDefaults) {
    let start = lines.findIndex((line) => line.trim() === `[${section}]`);
    if (start === -1) {
      if (lines.at(-1) === '') lines.pop();
      lines.push('', `[${section}]`, '');
      start = lines.length - 2;
    }
    let replaced = false;
    for (let index = start + 1; index < lines.length && !/^\s*\[/.test(lines[index]); index += 1) {
      if (new RegExp(`^\\s*${key}\\s*=`).test(lines[index])) {
        lines[index] = `${key} = ${value}`;
        replaced = true;
        break;
      }
    }
    if (!replaced) lines.splice(start + 1, 0, `${key} = ${value}`);
  }
  return lines.join('\n');
}

const privilegedKey = /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|sb_secret_/;

// Removes block and line comments (not URLs) so a commented-out check never counts.
function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:"'])\/\/.*$/gm, '$1');
}

export function evaluateEdgeFunctions(files) {
  const problems = [];
  const sharedPrivileged = new Set(Object.entries(files)
    .filter(([path, content]) => path.split('/')[2]?.startsWith('_') && privilegedKey.test(withoutComments(content)))
    .map(([path]) => path.split('/').slice(2).join('/')));
  for (const [path, content] of Object.entries(files)) {
    const name = path.split('/')[2] ?? path;
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const allowed = /harness:allow-cors/.test(`${lines[index - 1] ?? ''} ${line}`);
      if (/Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*['"]/.test(line) && !allowed) {
        problems.push(`Edge Function \`${name}\` (${path}:${index + 1}): CORS "*" deixa qualquer site chamar a função; liste os domínios do app.`);
      }
    });
    if (name.startsWith('_')) continue;
    const code = withoutComments(content);
    const importsPrivileged = [...code.matchAll(/from\s+['"]\.\.\/(_[^'"]+)['"]/g)].some((match) => sharedPrivileged.has(match[1]));
    const checksCaller = /auth\.getUser\(|auth\.getClaims\(|verifyWebhookSignature/.test(code) || /harness:allow-no-auth/.test(content);
    if ((privilegedKey.test(code) || importsPrivileged) && !checksCaller) {
      problems.push(`Edge Function \`${name}\`: usa a chave privilegiada sem checar quem chama (auth.getUser ou auth.getClaims).`);
    }
  }
  return problems;
}

async function listFunctionSources(root) {
  const base = join(root, 'supabase', 'functions');
  const files = {};
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) files[relative(root, path).replaceAll('\\', '/')] = await readFile(path, 'utf8');
    }
  }
  await walk(base);
  return files;
}

export async function runSupabaseConfigGuard({ root = repositoryRoot } = {}) {
  const configPath = join(root, 'supabase', 'config.toml');
  if (!(await exists(configPath))) return { ok: true, problems: [], skipped: true };
  const problems = [...evaluateSupabaseConfig(await readFile(configPath, 'utf8')), ...evaluateEdgeFunctions(await listFunctionSources(root))];
  return { ok: problems.length === 0, problems, skipped: false };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const configPath = join(repositoryRoot, 'supabase', 'config.toml');
  const fix = process.argv.includes('--fix') && await exists(configPath)
    ? writeFile(configPath, hardenSupabaseConfig(await readFile(configPath, 'utf8')))
    : Promise.resolve();
  fix.then(() => runSupabaseConfigGuard())
    .then(({ ok, problems, skipped }) => {
      if (skipped) console.log('supabase/config.toml não existe; nada a verificar.');
      else if (ok) console.log('✔ Configuração do Supabase e Edge Functions seguem a base de segurança.');
      else console.log(`✖ Configuração do Supabase:\n${problems.map((problem) => `  • ${problem}`).join('\n')}\n  Padrões fracos do supabase init: node .harness/scripts/supabase-config-guard.mjs --fix\n  Exceção justificada: comentário "# harness:allow <motivo>" na linha de cima.`);
      process.exitCode = ok ? 0 : 1;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
