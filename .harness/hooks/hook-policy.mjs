import { posix } from 'node:path';
import { isForbiddenEnvironmentFile, scanText } from '../scripts/secret-scan.mjs';

// Agent hooks are a safety net, not the security boundary. Protected branches,
// CI-only deployment, and least-privileged credentials remain authoritative.

const allow = { decision: 'allow', reason: null };
const deny = (reason) => ({ decision: 'deny', reason });
const ask = (reason) => ({ decision: 'ask', reason });

const protectedBranches = new Set(['main', 'master']);
const shells = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'fish']);

// ---------------------------------------------------------------------------
// Shell parsing: quote-aware segments, nested command substitutions, redirects.
// ---------------------------------------------------------------------------

function readBalanced(text, openIndex) {
  let depth = 0;
  let quote = null;
  for (let index = openIndex; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    else if (character === '(') depth += 1;
    else if (character === ')') {
      depth -= 1;
      if (depth === 0) return { body: text.slice(openIndex + 1, index), end: index };
    }
  }
  return { body: text.slice(openIndex + 1), end: text.length - 1 };
}

// A heredoc body is data unless the heredoc feeds a shell interpreter.
export function stripHeredocBodies(command) {
  return command.replace(/^([^\n]*?)<<-?\s*(['"]?)(\w+)\2([^\n]*)\n([\s\S]*?)\n[ \t]*\3[ \t]*(?=\n|$)/gm, (_match, before, _quote, _tag, after, body) => (
    /(?:^|[\s|;&(])(?:sudo\s+)?(?:ba|z|da|k)?sh(?:\s|$)/.test(` ${before} ${after} `) ? `${before}${after}\n${body}` : `${before}${after}`
  ));
}

export function parseShell(command) {
  const segments = [];
  const nested = [];
  let words = [];
  let word = '';
  let hasWord = false;
  let quote = null;
  const pushWord = () => {
    if (hasWord) words.push(word);
    word = '';
    hasWord = false;
  };
  const endSegment = (separator) => {
    pushWord();
    if (words.length > 0) segments.push({ words, separator });
    words = [];
  };

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    const next = command[index + 1];
    if (quote === "'") {
      if (character === "'") quote = null;
      else word += character;
      continue;
    }
    if (character === '\\' && next !== undefined) {
      word += next;
      hasWord = true;
      index += 1;
      continue;
    }
    if (character === '$' && next === '(') {
      const { body, end } = readBalanced(command, index + 1);
      nested.push(body);
      word += command.slice(index, end + 1);
      hasWord = true;
      index = end;
      continue;
    }
    if (character === '`') {
      const end = command.indexOf('`', index + 1);
      const body = command.slice(index + 1, end === -1 ? undefined : end);
      nested.push(body);
      word += `\`${body}\``;
      hasWord = true;
      index = end === -1 ? command.length : end;
      continue;
    }
    if (quote === '"') {
      if (character === '"') quote = null;
      else word += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      hasWord = true;
      continue;
    }
    if ((character === '<' || character === '>') && next === '(') {
      const { body, end } = readBalanced(command, index + 1);
      nested.push(body);
      pushWord();
      words.push('<(subst)');
      index = end;
      continue;
    }
    if (character === '>' || character === '<') {
      if (/^\d+$/.test(word)) {
        word = '';
        hasWord = false;
      } else {
        pushWord();
      }
      let operator = character;
      if (command[index + 1] === character) {
        operator += character;
        index += 1;
      }
      if (command[index + 1] === '&') {
        index += 1;
        while (/[\d-]/.test(command[index + 1] ?? '')) index += 1;
        continue;
      }
      words.push(operator);
      continue;
    }
    if (character === '\n') {
      endSegment('\n');
      continue;
    }
    if (/\s/.test(character)) {
      pushWord();
      continue;
    }
    if (character === ';' || character === '(' || character === ')') {
      endSegment(character);
      continue;
    }
    if (character === '&') {
      if (next === '&') {
        endSegment('&&');
        index += 1;
      } else if (next === '>') {
        pushWord();
        index += 1;
        if (command[index + 1] === '>') index += 1;
        words.push('>');
      } else {
        endSegment('&');
      }
      continue;
    }
    if (character === '|') {
      if (next === '|') {
        endSegment('||');
        index += 1;
      } else {
        endSegment('|');
      }
      continue;
    }
    word += character;
    hasWord = true;
  }
  endSegment(null);
  return { segments, nested };
}

const wrappers = new Set(['sudo', 'env', 'command', 'exec', 'time', 'nohup', 'nice', 'builtin', 'xargs', '{', '}', '!', 'then', 'do', 'else', 'if', 'while', 'until']);
const packageRunners = new Set(['npx', 'pnpx', 'bunx']);
const packageManagers = new Set(['pnpm', 'npm', 'yarn', 'bun']);
const runnableBinaries = new Set(['supabase', 'wrangler', 'gh', 'vercel', 'netlify']);

function stripVersion(name) {
  return name.replace(/^(@?[^@]+)@.*$/, '$1').split('/').pop();
}

export function normalizeCommand(inputWords) {
  const words = [...inputWords];
  let changed = true;
  while (changed && words.length > 0) {
    changed = false;
    while (words.length > 0 && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0]) || wrappers.has(words[0]))) {
      words.shift();
      while (words[0]?.startsWith('-')) words.shift();
      changed = true;
    }
    if (packageRunners.has(words[0])) {
      words.shift();
      while (words[0]?.startsWith('-')) words.shift();
      changed = true;
    } else if (packageManagers.has(words[0]) && ['exec', 'dlx', 'x'].includes(words[1])) {
      words.splice(0, 2);
      while (words[0]?.startsWith('-')) words.shift();
      changed = true;
    } else if (['pnpm', 'yarn', 'bun'].includes(words[0]) && runnableBinaries.has(stripVersion(words[1] ?? ''))) {
      words.shift();
      changed = true;
    }
    if (words[0] && /[@/]/.test(words[0]) && !words[0].startsWith('.') && runnableBinaries.has(stripVersion(words[0]))) {
      words[0] = stripVersion(words[0]);
    }
  }
  const command = (words[0] ?? '').split('/').pop();
  let args = words.slice(1);
  const gitConfig = [];
  if (command === 'git') {
    let index = 0;
    while (args[index]?.startsWith('-')) {
      const option = args[index];
      if (['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env'].includes(option)) {
        if (option === '-c' || option === '--config-env') gitConfig.push(args[index + 1] ?? '');
        index += 2;
      } else {
        if (option.startsWith('--config-env=')) gitConfig.push(option.slice(13));
        index += 1;
      }
    }
    args = args.slice(index);
  }
  return { command, args, gitConfig };
}

// ---------------------------------------------------------------------------
// Path classification shared by shell, edit, and read policies.
// ---------------------------------------------------------------------------

function normalizePath(path) {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
}

function globToRegExp(glob) {
  return new RegExp(`^${glob.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
}

export function isSecretFileReference(path) {
  const name = normalizePath(path).split('/').pop() ?? '';
  if (!name) return false;
  if (/[*?[]/.test(name)) {
    const pattern = globToRegExp(name);
    return ['.env', '.env.local', '.env.production', '.envrc', '.dev.vars'].some((candidate) => pattern.test(candidate));
  }
  return isForbiddenEnvironmentFile(name);
}

const managedPathPatterns = [
  /^\.git\//,
  /^_bmad\//,
  /^\.harness\/\.skill-cache\//,
  /^\.harness\/skill-sources\.lock\.json$/,
  /^skills-lock\.json$/,
  /^\.(?:agents|claude|cline)\/skills\//,
];

const guardrailPathPatterns = [
  /^\.claude\/settings\.json$/,
  /^\.codex\/config\.toml$/,
  /^\.harness\/hooks\//,
  /^\.harness\/git-hooks\//,
  /^\.github\/workflows\//,
  /^\.github\/dependabot\.yml$/,
];

const secretFileMessage = 'Arquivos .env guardam segredos locais e não devem ser lidos nem alterados pelo agente. Use .env.example e peça para a pessoa preencher o .env.local.';
const managedFileMessage = 'Este arquivo é gerado pelo Harness. Edite .harness/skills/ ou use npm run harness -- update-skills.';
const guardrailFileMessage = 'Este arquivo controla as proteções do projeto (hooks, permissões ou CI). Confirme com a pessoa antes de alterar.';

function classifyWriteTarget(path) {
  const normalized = normalizePath(path);
  if (isSecretFileReference(normalized)) return deny(secretFileMessage);
  if (managedPathPatterns.some((pattern) => pattern.test(normalized))) return deny(managedFileMessage);
  if (guardrailPathPatterns.some((pattern) => pattern.test(normalized))) return ask(guardrailFileMessage);
  return allow;
}

// ---------------------------------------------------------------------------
// Command rules.
// ---------------------------------------------------------------------------

const hasShortFlag = (args, letter) => args.some((arg) => /^-[A-Za-z]+$/.test(arg) && arg.includes(letter));
const skipHooksMessage = 'Não pule os Git hooks do Harness. Corrija o problema que o hook apontou.';

function evaluateGit(args, gitConfig, context) {
  const [subcommand, ...rest] = args;
  const onProtectedBranch = protectedBranches.has(context.branch);
  if (gitConfig.some((value) => /core\.hookspath/i.test(value))) return deny(skipHooksMessage);
  if (rest.includes('--no-verify') || (subcommand === 'commit' && hasShortFlag(rest, 'n'))) return deny(skipHooksMessage);
  if (subcommand === 'config') {
    const keyIndex = rest.findIndex((arg) => /^core\.hookspath$/i.test(arg));
    if (keyIndex !== -1) {
      const reads = rest.some((arg) => ['--get', '--get-all', '--list', '-l', '--show-origin'].includes(arg));
      const writes = rest.some((arg) => /^--(?:unset|unset-all|replace-all|add|edit)$/.test(arg))
        || rest.slice(keyIndex + 1).some((arg) => !arg.startsWith('-'));
      if (writes && !reads) return deny('Não altere os Git hooks do Harness. Eles bloqueiam commits na main e segredos.');
    }
  }
  if (subcommand === 'commit' && onProtectedBranch && context.hasCommits) {
    return deny(`Commits na branch ${context.branch} são proibidos. Crie uma branch: git switch -c feature/<nome>.`);
  }
  if (subcommand === 'push') {
    if (rest.some((arg) => /^--force(?:-with-lease|-if-includes)?(?:=.*)?$/.test(arg)) || hasShortFlag(rest, 'f')) {
      return deny('Force push reescreve histórico e está bloqueado. Crie um novo commit.');
    }
    if (rest.includes('--all') || rest.includes('--mirror')) {
      return deny('Push de todas as branches inclui a main e está bloqueado. Envie só a sua branch.');
    }
    const positional = [];
    for (let index = 0; index < rest.length; index += 1) {
      if (['-o', '--push-option', '--repo', '--receive-pack', '--exec'].includes(rest[index])) index += 1;
      else if (!rest[index].startsWith('-')) positional.push(rest[index]);
    }
    const refspecs = positional.slice(1);
    if (refspecs.some((refspec) => refspec.startsWith('+'))) {
      return deny('Force push reescreve histórico e está bloqueado. Crie um novo commit.');
    }
    const destination = (refspec) => {
      const target = (refspec.includes(':') ? refspec.split(':').pop() : refspec).replace(/^refs\/heads\//, '');
      return target === 'HEAD' || target === '@' ? context.branch : target;
    };
    if (refspecs.some((refspec) => protectedBranches.has(destination(refspec)))) {
      return deny('Push direto para main é proibido. Abra um pull request a partir de uma branch.');
    }
    if (refspecs.length === 0 && onProtectedBranch) {
      return deny(`Você está na branch ${context.branch}. Crie uma branch: git switch -c feature/<nome>.`);
    }
  }
  if ((subcommand === 'reset' && rest.includes('--hard'))
    || (subcommand === 'clean' && (hasShortFlag(rest, 'f') || rest.includes('--force')))
    || (['checkout', 'restore'].includes(subcommand) && rest.some((arg) => arg === '.' || arg === ':/'))
    || (subcommand === 'stash' && ['drop', 'clear'].includes(rest[0]))
    || (subcommand === 'branch' && (rest.includes('-D') || (rest.includes('--delete') && rest.includes('--force'))))) {
    return ask('Este comando descarta trabalho local sem volta. Confirme com a pessoa antes.');
  }
  return allow;
}

function isCriticalDeletionTarget(target) {
  if (/^(?:~|\$HOME|\$\{HOME\})(?:\/\*?)?$/.test(target) || /^\/?\*$/.test(target)) return true;
  const normalized = posix.normalize(target);
  return normalized === '/' || normalized === '.' || normalized === './' || normalized === '..' || normalized.startsWith('../')
    || /^\.git\/?$/.test(normalized);
}

function evaluateSegmentWords(words, context) {
  const { command, args, gitConfig } = normalizeCommand(words);
  const joined = args.join(' ');

  if (command === 'git') {
    const result = evaluateGit(args, gitConfig, context);
    if (result.decision !== 'allow') return result;
  }

  if (command === 'supabase') {
    const remoteDatabaseUrl = args.some((arg, index) => {
      const value = arg === '--db-url' ? args[index + 1] : arg.startsWith('--db-url=') ? arg.slice(9) : null;
      return value && /@(?!(?:localhost|127\.0\.0\.1|host\.docker\.internal)[:/])/.test(value);
    });
    if (/^(?:db push|link|functions deploy|secrets (?:set|unset)|projects delete|branches (?:delete|create)|migration repair|storage rm)\b/.test(joined)
      || (/^db reset\b/.test(joined) && args.includes('--linked')) || remoteDatabaseUrl) {
      return deny('Mudanças no Supabase remoto acontecem só pelo CI após o merge. Use o Supabase local.');
    }
  }

  if (command === 'wrangler' && /^(?:deploy|publish|versions (?:deploy|upload)|rollback|secret (?:put|delete|bulk)|delete|pages deploy|d1 execute\b.*--remote)\b/.test(joined)) {
    return deny('Deploy e segredos da Cloudflare são responsabilidade do CI. Abra um pull request.');
  }

  if (command === 'gh') {
    if (/^pr merge\b/.test(joined)) return deny('O merge é uma decisão humana. Peça para a pessoa revisar e fazer o merge no GitHub.');
    if (/^(?:repo (?:delete|archive|rename|edit)|release (?:create|delete)|secret (?:set|delete)|variable (?:set|delete)|ruleset delete)\b/.test(joined)
      || (/^api\b/.test(joined) && args.some((arg, index) => /^(?:-X|--method)$/.test(arg) && /^(?:DELETE|PUT|PATCH|POST)$/i.test(args[index + 1] ?? '')))) {
      return ask('Este comando altera configurações do GitHub. Confirme com a pessoa antes.');
    }
  }

  if (packageManagers.has(command) && args[0] === 'publish') return deny('Publicar pacotes não faz parte deste projeto.');

  if (command === 'rm' && (hasShortFlag(args, 'r') || hasShortFlag(args, 'R') || args.includes('--recursive'))) {
    if (args.filter((arg) => !arg.startsWith('-')).some(isCriticalDeletionTarget)) {
      return deny('Remoção recursiva de um diretório crítico está bloqueada.');
    }
  }

  // Secret files: any argument or redirect target that references a local secret file.
  const operands = args.filter((arg) => !arg.startsWith('-') && !['>', '>>', '<'].includes(arg));
  const isCopy = ['cp', 'mv', 'install', 'ln'].includes(command) && operands.length >= 2;
  const copyFromExamples = isCopy && operands.slice(0, -1).every((operand) => /\.(?:example|sample|template)$/i.test(operand));
  for (let index = 1; index < words.length; index += 1) {
    if (copyFromExamples && index === words.length - 1) continue;
    if (!['>', '>>', '<'].includes(words[index]) && isSecretFileReference(words[index])) return deny(secretFileMessage);
  }

  // Writes through the shell follow the file-edit policy.
  const writeTargets = [];
  words.forEach((candidate, index) => {
    if ((candidate === '>' || candidate === '>>') && words[index + 1]) writeTargets.push(words[index + 1]);
  });
  if (command === 'tee') writeTargets.push(...operands);
  if (['sed', 'perl'].includes(command) && args.some((arg) => /^-i/.test(arg) || arg === '--in-place')) writeTargets.push(...operands);
  if (isCopy && !copyFromExamples) writeTargets.push(operands.at(-1));
  let result = allow;
  for (const target of writeTargets) {
    const classification = classifyWriteTarget(target);
    if (classification.decision === 'deny') return classification;
    if (classification.decision === 'ask') result = classification;
  }
  return result;
}

function downloadsIntoShell(segments, nested) {
  for (let index = 1; index < segments.length; index += 1) {
    if (segments[index - 1].separator !== '|') continue;
    const previous = normalizeCommand(segments[index - 1].words).command;
    const current = normalizeCommand(segments[index].words).command;
    if (shells.has(current) && ['curl', 'wget'].includes(previous)) return true;
  }
  const shellReadsSubstitution = segments.some((segment) => shells.has(normalizeCommand(segment.words).command) && segment.words.includes('<(subst)'));
  return shellReadsSubstitution && nested.some((body) => /^\s*(?:curl|wget)\b/.test(body));
}

export function evaluateShellCommand(rawCommand, context = {}, depth = 0) {
  const { segments, nested } = parseShell(stripHeredocBodies(rawCommand));
  if (downloadsIntoShell(segments, nested)) {
    return deny('Baixar e executar scripts direto no shell está bloqueado. Baixe, revise e rode separadamente.');
  }
  let result = allow;
  const consider = (evaluation) => {
    if (evaluation.decision === 'ask') result = evaluation;
    return evaluation.decision === 'deny';
  };
  for (const segment of segments) {
    const evaluation = evaluateSegmentWords(segment.words, context);
    if (consider(evaluation)) return evaluation;
    // `bash -c "..."`, `sh -lc '...'`, and `eval "..."` run their argument as a command.
    const { command, args } = normalizeCommand(segment.words);
    const inlineFlagIndex = args.findIndex((arg) => /^-[A-Za-z]*c[A-Za-z]*$/.test(arg));
    const inline = shells.has(command) && inlineFlagIndex !== -1 ? args[inlineFlagIndex + 1] : command === 'eval' ? args.join(' ') : undefined;
    if (inline && depth < 5) {
      const inner = evaluateShellCommand(inline, context, depth + 1);
      if (consider(inner)) return inner;
    }
  }
  if (depth < 5) {
    for (const body of nested) {
      const inner = evaluateShellCommand(body, context, depth + 1);
      if (consider(inner)) return inner;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// File tools.
// ---------------------------------------------------------------------------

export function evaluateFileRead({ path }) {
  return path && isSecretFileReference(path) ? deny('Arquivos .env guardam segredos locais e não devem ser lidos pelo agente. Use .env.example.') : allow;
}

const privilegedBrowserKey = /(?:import\.meta\.env|process\.env)\.\w*(?:SERVICE_ROLE|SECRET)\w*|\bVITE_\w*(?:SERVICE_ROLE|SECRET)\w*/i;

export function evaluateFileEdit({ path, content = '' }, context = {}) {
  const normalizedPath = normalizePath(path);
  if (isSecretFileReference(normalizedPath)) return deny(secretFileMessage);
  if (managedPathPatterns.some((pattern) => pattern.test(normalizedPath))) return deny(managedFileMessage);
  if (protectedBranches.has(context.branch) && context.hasCommits) {
    return deny(`Você está na branch ${context.branch}. Antes de editar, crie uma branch: git switch -c feature/<nome>.`);
  }
  if (/^(?:src|app|public)\//.test(normalizedPath) && privilegedBrowserKey.test(content)) {
    return deny('Credenciais privilegiadas do Supabase nunca podem ir para o código do navegador. Use uma Edge Function.');
  }
  const findings = scanText(content, { path: normalizedPath });
  if (findings.length > 0) {
    return deny(`O conteúdo parece conter um segredo (${findings[0].rule}). Use variáveis de ambiente ou segredos do CI.`);
  }
  if (guardrailPathPatterns.some((pattern) => pattern.test(normalizedPath))) return ask(guardrailFileMessage);
  return allow;
}
