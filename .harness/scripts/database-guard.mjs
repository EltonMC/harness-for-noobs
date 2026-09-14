import { appendFile, readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCaptured } from './process-utils.mjs';
import { exists, repositoryRoot } from './skill-source-utils.mjs';

// Deterministic database change gate (ADR 0014). It turns the DBA stewardship
// process into checks: published migrations are immutable, every new migration
// has an approved DBA review and an owner-approved proposal, new tables are
// documented, and data-destroying SQL needs a separate owner approval.

const migrationsDirectory = 'supabase/migrations/';
const reviewsDirectory = '.harness/database/reviews';
const validMigrationName = /^\d{14}_[a-z0-9_]+\.sql$/;
const levels = ['additive', 'rewrite', 'destructive'];

const identifier = String.raw`(?:"[^"]+"|[\w$]+)`;
const qualifiedName = String.raw`(?:${identifier}\.)?(${identifier})`;
const recreatableKinds = String.raw`view|materialized\s+view|function|procedure|policy|trigger|type|extension|domain|sequence`;

const rules = [
  { level: 'destructive', pattern: new RegExp(String.raw`\bdrop\s+(?:table|schema)\s+(?:if\s+exists\s+)?${qualifiedName}`, 'gi'), message: (name) => `apaga \`${name}\` e todos os dados guardados nela` },
  { level: 'destructive', pattern: new RegExp(String.raw`\balter\s+table\s+[^;]*?\bdrop\s+(?:column\s+)?(?:if\s+exists\s+)?(?!(?:constraint|default|not|identity|expression|column|if)\b)(${identifier})`, 'gi'), message: (name) => `apaga a coluna \`${name}\` e os valores dela` },
  { level: 'destructive', pattern: new RegExp(String.raw`\btruncate\s+(?:table\s+)?(?:only\s+)?${qualifiedName}`, 'gi'), message: (name) => `apaga todas as linhas de \`${name}\`` },
  { level: 'destructive', pattern: new RegExp(String.raw`\bdelete\s+from\s+(?:only\s+)?${qualifiedName}(?![^;]*\bwhere\b)`, 'gi'), message: (name) => `apaga todas as linhas de \`${name}\`` },
  { level: 'destructive', pattern: /\bdrop\s+owned\b/gi, message: () => 'apaga todos os objetos de um papel (role) do banco' },
  { level: 'destructive', pattern: /\bdrop\b[^;]*\bcascade\b/gi, message: () => 'remove objetos em cascata (pode apagar colunas ou tabelas que dependem deles)' },
  { level: 'rewrite', pattern: new RegExp(String.raw`\bdelete\s+from\s+(?:only\s+)?${qualifiedName}(?=[^;]*\bwhere\b)`, 'gi'), message: (name) => `apaga parte das linhas de \`${name}\`` },
  { level: 'rewrite', pattern: new RegExp(String.raw`\bupdate\s+(?:only\s+)?${qualifiedName}(?:\s+(?:as\s+)?(?!set\b)${identifier})?\s+set\b`, 'gi'), message: (name) => `reescreve dados existentes em \`${name}\`` },
  { level: 'rewrite', pattern: new RegExp(String.raw`\bmerge\s+into\s+${qualifiedName}`, 'gi'), message: (name) => `reescreve ou apaga dados existentes em \`${name}\`` },
  { level: 'rewrite', pattern: new RegExp(String.raw`\balter\s+(?:column\s+)?(?!(?:table|type|column)\b)(${identifier})\s+(?:set\s+data\s+)?type\b`, 'gi'), message: (name) => `muda o tipo da coluna \`${name}\` (pode perder ou travar dados)` },
  { level: 'rewrite', pattern: new RegExp(String.raw`\brename\s+(?:column\s+)?(${identifier})\s+to\b`, 'gi'), message: (name) => `renomeia \`${name}\` (a versão anterior do app pode quebrar)` },
  { level: 'rewrite', pattern: /\brename\s+to\s+("[^"]+"|[\w$]+)/gi, message: (name) => `renomeia uma tabela para \`${name}\` (a versão anterior do app pode quebrar)` },
  {
    level: 'rewrite',
    pattern: new RegExp(String.raw`\bdrop\s+(${recreatableKinds})\s+(?:if\s+exists\s+)?${qualifiedName}`, 'gi'),
    message: (kind) => `remove um objeto do tipo \`${kind.toLowerCase().replace(/\s+/g, ' ')}\` (a versão anterior do app pode quebrar)`,
    recreated: (text, match) => new RegExp(String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:constraint\s+)?${match[1].replace(/\s+/g, String.raw`\s+`)}\s+(?:if\s+not\s+exists\s+)?(?:${identifier}\.)?"?${match[2].replace(/^"|"$/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"?(?![\w$])`, 'i').test(text),
  },
  { level: 'rewrite', pattern: /\bdisable\s+row\s+level\s+security\b/gi, message: () => 'desliga a proteção por linha (RLS) de uma tabela' },
];

const unquote = (name) => name.replace(/^"|"$/g, '').toLowerCase();

// Removes comments and string literals, and blanks function bodies (their statements
// run later, when called), while keeping `do` block bodies, which run in the migration.
export function sanitizeSql(sql) {
  let output = '';
  for (let index = 0; index < sql.length; index += 1) {
    const rest = sql.slice(index);
    if (rest.startsWith('--')) {
      const end = sql.indexOf('\n', index);
      index = end === -1 ? sql.length : end - 1;
      output += ' ';
    } else if (rest.startsWith('/*')) {
      const end = sql.indexOf('*/', index + 2);
      index = end === -1 ? sql.length : end + 1;
      output += ' ';
    } else if (sql[index] === "'") {
      let end = index + 1;
      while (end < sql.length && !(sql[end] === "'" && sql[end + 1] !== "'")) end += sql[end] === "'" ? 2 : 1;
      index = end;
      output += "''";
    } else if (/^\$(?:[A-Za-z_]\w*)?\$/.test(rest)) {
      const tag = rest.match(/^\$(?:[A-Za-z_]\w*)?\$/)[0];
      const close = sql.indexOf(tag, index + tag.length);
      const body = sql.slice(index + tag.length, close === -1 ? sql.length : close);
      const statement = output.slice(output.lastIndexOf(';') + 1);
      output += /\bcreate\s+(?:or\s+replace\s+)?(?:function|procedure)\b/i.test(statement) ? ' $$ ' : ` ${sanitizeSql(body)} `;
      index = close === -1 ? sql.length : close + tag.length - 1;
    } else {
      output += sql[index];
    }
  }
  return output;
}

export function stripSqlComments(sql) {
  return sanitizeSql(sql);
}

export function classifyMigration(sql) {
  const text = sanitizeSql(sql);
  const findings = [];
  for (const rule of rules) {
    for (const match of text.matchAll(rule.pattern)) {
      if (rule.recreated?.(text, match)) continue;
      findings.push({ level: rule.level, index: match.index, message: rule.message(unquote(match[1] ?? '')) });
    }
  }
  findings.sort((left, right) => left.index - right.index);
  const level = findings.reduce((highest, finding) => (levels.indexOf(finding.level) > levels.indexOf(highest) ? finding.level : highest), 'additive');
  return { level, findings: findings.map(({ level: findingLevel, message }) => ({ level: findingLevel, message })) };
}

export function pendingMigrationNames(output) {
  return [...new Set(output.match(/\b\d{14}_[\w-]+\.sql\b/g) ?? [])];
}

// Classifies what `supabase db push --dry-run` would apply, so an unapproved destructive
// migration left pending by an earlier release cannot slip into a later one.
export function classifyPending(output, files) {
  const names = pendingMigrationNames(output);
  const problems = [];
  if (names.length === 0 && !/up to date/i.test(output)) {
    problems.push('Não foi possível ler a lista de migrations pendentes; por segurança, esta liberação exige aprovação.');
  }
  const migrations = names.map((name) => {
    const sql = files[`${migrationsDirectory}${name}`];
    if (sql === undefined) {
      problems.push(`A migration pendente \`${name}\` não foi encontrada no repositório; por segurança, esta liberação exige aprovação.`);
      return { name, level: 'destructive', findings: [{ level: 'destructive', message: 'arquivo não encontrado' }] };
    }
    return { name, ...classifyMigration(sql) };
  });
  return {
    ok: true,
    pending: true,
    problems,
    migrations,
    touchesDatabase: migrations.length > 0,
    requiresOwnerApproval: problems.length > 0 || migrations.some((item) => item.level !== 'additive'),
  };
}

export function createdTables(sql) {
  const pattern = new RegExp(String.raw`\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?(?:(${identifier})\.)?(${identifier})`, 'gi');
  return [...sanitizeSql(sql).matchAll(pattern)]
    .filter((match) => !match[1] || unquote(match[1]) === 'public')
    .map((match) => unquote(match[2]));
}

function section(markdown, heading) {
  const match = markdown.match(new RegExp(`^##\\s+${heading}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'm'));
  return match ? match[1] : '';
}

export function parseReview(markdown) {
  const verdictText = section(markdown, 'Verdict');
  const found = ['APPROVE WITH CONDITIONS', 'BLOCK', 'APPROVE']
    .filter((verdict) => new RegExp(verdict === 'APPROVE' ? String.raw`\bAPPROVE\b(?!\s+WITH)` : `\\b${verdict}\\b`).test(verdictText));
  return {
    verdict: found.length === 1 ? found[0] : null,
    proposal: markdown.match(/\.harness\/database\/changes\/[\w.-]+\.md/)?.[0] ?? null,
  };
}

// An approval is a name plus a date; placeholders and "pending" never count.
function filledLine(markdown, label) {
  const line = markdown.split('\n').find((candidate) => candidate.replace(/^\s*[-*]\s*/, '').startsWith(label));
  const value = line?.slice(line.indexOf(':') + 1).trim() ?? '';
  const hasDate = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(value);
  const hasName = /\p{L}{2,}/u.test(value.replace(/\b(?:pendente|aguardando|todo|tbd|n\/a)\b/gi, ''));
  return hasDate && hasName && !/\b(?:pendente|aguardando|todo|tbd)\b|<[^>]*>/i.test(value);
}

export function parseProposal(markdown) {
  return {
    ownerApproved: filledLine(markdown, 'Aprovado por'),
    destructiveApproved: filledLine(markdown, 'Aprovação de mudança que apaga ou reescreve dados'),
  };
}

// Documented means the table name is the first cell of a markdown table row.
function mentionsTable(document, table) {
  const name = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(String.raw`^\|\s*[\x60"]?(?:public\.)?${name}[\x60"]?\s*\|`, 'im').test(document);
}

export function evaluateDatabaseChange({ changes, files, hasSupabaseConfig, dataDictionary = '', accessMatrix = '', classifyOnly = false }) {
  const problems = [];
  const migrationChanges = changes.filter((change) => change.path.startsWith(migrationsDirectory) && change.path.endsWith('.sql'));
  for (const change of migrationChanges.filter((candidate) => candidate.status !== 'A')) {
    problems.push(`A migration já publicada \`${basename(change.path)}\` foi ${change.status === 'D' ? 'apagada' : 'alterada'}. Migrations antigas nunca mudam: desfaça a alteração e crie uma migration nova com a correção.`);
  }

  const reviews = Object.entries(files).filter(([path]) => path.startsWith(`${reviewsDirectory}/`) && !path.endsWith('README.md'));
  const migrations = [];
  for (const change of migrationChanges.filter((candidate) => candidate.status === 'A')) {
    const name = basename(change.path);
    const sql = files[change.path] ?? '';
    const classification = classifyMigration(sql);
    migrations.push({ name, ...classification });
    if (!validMigrationName.test(name)) {
      problems.push(`O nome \`${name}\` não segue o padrão \`AAAAMMDDHHMMSS_descricao.sql\`; o Supabase ignoraria esta migration sem avisar. Crie com: supabase migration new <descricao>.`);
    }
    if (classifyOnly) continue;

    for (const table of createdTables(sql)) {
      if (!mentionsTable(dataDictionary, table)) problems.push(`A tabela nova \`${table}\` não está no dicionário de dados (.harness/database/DATA_DICTIONARY.md).`);
      if (!mentionsTable(accessMatrix, table)) problems.push(`A tabela nova \`${table}\` não está na matriz de acesso (.harness/context/access-matrix.md).`);
    }

    const review = reviews.find(([, content]) => content.includes(name));
    if (!review) {
      problems.push(`A migration \`${name}\` não tem revisão do DBA. Crie uma em ${reviewsDirectory}/ a partir de .harness/templates/database-review.md e cite o nome do arquivo em "Migration(s)".`);
      continue;
    }
    const { verdict, proposal } = parseReview(review[1]);
    if (verdict === 'BLOCK') problems.push(`A revisão do DBA de \`${name}\` está como BLOCK. Corrija os problemas apontados antes de seguir.`);
    else if (!verdict) problems.push(`A revisão do DBA de \`${name}\` (${review[0]}) não tem um veredito único: escolha APPROVE, APPROVE WITH CONDITIONS ou BLOCK.`);
    const proposalContent = proposal ? files[proposal] : undefined;
    if (!proposalContent) {
      problems.push(`A revisão de \`${name}\` não aponta para uma proposta existente em .harness/database/changes/ (linha "Proposal:").`);
      continue;
    }
    const approvals = parseProposal(proposalContent);
    if (!approvals.ownerApproved) problems.push(`A proposta ${proposal} ainda não tem a aprovação do dono ("Aprovado por (nome e data)").`);
    if (classification.level !== 'additive' && !approvals.destructiveApproved) {
      problems.push(`A migration \`${name}\` apaga ou reescreve dados. O dono precisa aprovar isso por escrito na proposta ${proposal} ("Aprovação de mudança que apaga ou reescreve dados").`);
    }
  }

  if (migrationChanges.length > 0 && !hasSupabaseConfig) {
    problems.push('Há migrations, mas falta supabase/config.toml, então o banco não seria testado. Rode: supabase init');
  }
  return {
    ok: problems.length === 0,
    problems,
    migrations,
    touchesDatabase: changes.some((change) => change.path.startsWith('supabase/')),
    requiresOwnerApproval: migrations.some((item) => item.level !== 'additive'),
  };
}

const levelLabels = {
  additive: '🟢 só adiciona',
  rewrite: '🟠 reescreve dados ou quebra compatibilidade',
  destructive: '🔴 apaga dados',
};

export function renderReport(result) {
  const lines = ['<!-- harness-database-guard -->', result.pending ? '## 🗄️ Migrations pendentes em produção' : '## 🗄️ Mudança no banco de dados', ''];
  if (result.migrations.length === 0) lines.push(result.pending ? 'Nenhuma migration pendente.' : 'Nenhuma migration nova neste PR.');
  for (const item of result.migrations) {
    lines.push(`- \`${item.name}\`: **${levelLabels[item.level]}**`);
    for (const finding of item.findings) lines.push(`  - ${finding.message}`);
  }
  if (result.requiresOwnerApproval) {
    lines.push('', '> ⚠️ Esta mudança pode apagar ou alterar dados que já existem em produção. Só faça o merge se você aprovou isso por escrito na proposta e se existe um backup recente.');
  }
  if (result.problems.length > 0) lines.push('', result.ok ? '### ⚠️ Atenção' : '### ❌ O que falta', ...result.problems.map((problem) => `- ${problem}`));
  else if (!result.pending) lines.push('', '✅ Documentação e aprovações do banco completas.');
  return `${lines.join('\n')}\n`;
}

async function git(root, argumentsList) {
  const result = await runCaptured('git', argumentsList, { cwd: root, timeoutMs: 20_000 });
  return result.code === 0 ? result.stdout : null;
}

async function resolveBase(root, requested) {
  for (const candidate of requested ? [requested] : ['origin/main', 'main']) {
    if (await git(root, ['rev-parse', '--verify', '--quiet', `${candidate}^{commit}`]) !== null) return candidate;
  }
  return null;
}

export async function collectChanges(root, base) {
  const resolved = await resolveBase(root, base);
  if (!resolved) {
    const tracked = (await git(root, ['ls-files', '--cached', '--others', '--exclude-standard'])) ?? '';
    return tracked.split('\n').filter(Boolean).map((path) => ({ status: 'A', path }));
  }
  const mergeBase = (await git(root, ['merge-base', resolved, 'HEAD']))?.trim() || resolved;
  const diff = (await git(root, ['diff', '--name-status', '--no-renames', mergeBase])) ?? '';
  const changes = diff.split('\n').filter(Boolean).map((line) => {
    const [status, path] = line.split('\t');
    return { status: status[0], path };
  });
  const untracked = (await git(root, ['ls-files', '--others', '--exclude-standard'])) ?? '';
  for (const path of untracked.split('\n').filter(Boolean)) changes.push({ status: 'A', path });
  return changes;
}

async function readOptional(path) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return '';
  }
}

export async function runDatabaseGuard({ root = repositoryRoot, base, classifyOnly = false } = {}) {
  const changes = await collectChanges(root, base);
  const files = {};
  for (const change of changes.filter((item) => item.status === 'A' && item.path.startsWith(migrationsDirectory))) {
    files[change.path] = await readOptional(join(root, change.path));
  }
  for (const directory of [reviewsDirectory, '.harness/database/changes']) {
    const entries = await readdir(join(root, directory)).catch(() => []);
    for (const entry of entries.filter((name) => name.endsWith('.md'))) files[`${directory}/${entry}`] = await readOptional(join(root, directory, entry));
  }
  return evaluateDatabaseChange({
    changes,
    files,
    classifyOnly,
    hasSupabaseConfig: await exists(join(root, 'supabase', 'config.toml')),
    dataDictionary: await readOptional(join(root, '.harness', 'database', 'DATA_DICTIONARY.md')),
    accessMatrix: await readOptional(join(root, '.harness', 'context', 'access-matrix.md')),
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argumentsList = process.argv.slice(2);
  const valueOf = (name) => {
    const index = argumentsList.indexOf(name);
    return index === -1 ? undefined : argumentsList[index + 1];
  };
  const pendingFrom = valueOf('--pending-from');
  const run = pendingFrom
    ? (async () => {
      const output = await readFile(pendingFrom, 'utf8');
      const files = {};
      for (const name of pendingMigrationNames(output)) {
        const path = join(repositoryRoot, migrationsDirectory, name);
        if (await exists(path)) files[`${migrationsDirectory}${name}`] = await readFile(path, 'utf8');
      }
      return classifyPending(output, files);
    })()
    : runDatabaseGuard({ base: valueOf('--base'), classifyOnly: argumentsList.includes('--classify-only') });
  run
    .then(async (result) => {
      process.stdout.write(renderReport(result));
      if (process.env.GITHUB_OUTPUT) {
        await appendFile(process.env.GITHUB_OUTPUT, `requires_owner_approval=${result.requiresOwnerApproval}\nhas_migrations=${result.migrations.length > 0}\n`);
      }
      process.exitCode = result.ok ? 0 : 1;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
