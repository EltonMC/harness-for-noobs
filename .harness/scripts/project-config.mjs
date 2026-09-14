import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// `.harness/project.yaml` is product-owned: Copier creates it once and Harness
// updates never overwrite it. `.harness/harness.yaml` is Harness-owned.
const projectFile = join('.harness', 'project.yaml');

const defaults = { owner_locale: 'pt-BR', product_locale: 'pt-BR' };

const languages = { 'pt-BR': 'Brazilian Portuguese', 'pt-PT': 'Portuguese', 'es-ES': 'Spanish', 'en-US': 'English' };

export function communicationLanguageFor(locale) {
  return languages[locale ?? defaults.owner_locale] ?? 'English';
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value.startsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

// Parses the small, flat YAML shape this file uses: top-level scalars and one
// `commands:` map. It is not a general YAML parser.
export function parseProjectConfig(text) {
  const config = { commands: {} };
  let inCommands = false;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const nested = line.match(/^\s+([\w:-]+):\s*(.*)$/);
    if (nested && inCommands) {
      config.commands[nested[1]] = parseScalar(nested[2]);
      continue;
    }
    const top = line.match(/^([\w-]+):\s*(.*)$/);
    if (!top) continue;
    inCommands = top[1] === 'commands' && top[2].trim() === '';
    if (!inCommands) config[top[1]] = parseScalar(top[2]);
  }
  return config;
}

export function renderProjectCommands(text, commands) {
  const block = `commands:\n${Object.entries(commands).map(([name, command]) => `  ${name}: ${command}`).join('\n')}\n`;
  if (/^commands:\s*$/m.test(text)) return text.replace(/^commands:\s*\n(?:[ \t]+.*\n?)*/m, block);
  return `${text.replace(/\n*$/, '\n')}${block}`;
}

async function readText(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function readProjectConfig(root) {
  const project = await readText(join(root, projectFile));
  if (project !== null) return { ...defaults, ...parseProjectConfig(project) };
  const answers = parseProjectConfig(await readText(join(root, '.copier-answers.yml')) ?? '');
  const config = { ...defaults, commands: {} };
  for (const key of ['project_name', 'owner_locale', 'product_locale']) {
    if (answers[key]) config[key] = answers[key];
  }
  return config;
}

export async function writeProjectCommands(root, commands) {
  const path = join(root, projectFile);
  let text = await readText(path);
  if (text === null) {
    const config = await readProjectConfig(root);
    text = [
      '# Product-owned configuration. Harness updates never overwrite this file.',
      ...(config.project_name ? [`project_name: ${JSON.stringify(config.project_name)}`] : []),
      `owner_locale: ${config.owner_locale}`,
      `product_locale: ${config.product_locale}`,
      '',
    ].join('\n');
  }
  await writeFile(path, renderProjectCommands(text, commands));
}
