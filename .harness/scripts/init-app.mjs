import { chmod, copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { runCaptured } from './process-utils.mjs';
import { readProjectConfig, writeProjectCommands } from './project-config.mjs';
import { exists, repositoryRoot } from './skill-source-utils.mjs';
import { hardenSupabaseConfig } from './supabase-config-guard.mjs';

// Installs the locked React + Supabase application template. Deterministic:
// no agent tokens are spent scaffolding, and existing files are never overwritten.

const textExtensions = /\.(?:json|jsonc|ya?ml|html|tsx?|jsx?|css|sql|md|toml|example)$|^\.env\.example$|\.gitkeep$/;

// Locales with a copy catalog in .harness/app-template/src/shared/i18n/messages.ts.
export const supportedProductLocales = ['pt-BR', 'en-US', 'es-ES'];

export const applicationCommands ={ lint: 'pnpm lint', typecheck: 'pnpm typecheck', test: 'pnpm test', build: 'pnpm build', e2e: 'pnpm test:e2e' };

export function mergePackageJson(base, fragment) {
  const harnessScripts = { ...base.scripts };
  if (harnessScripts.test?.includes('.harness/scripts')) {
    harnessScripts['harness:test'] = harnessScripts.test;
    delete harnessScripts.test;
  }
  return {
    ...base,
    name: base.name,
    version: base.version ?? '0.1.0',
    private: true,
    ...fragment,
    scripts: { ...harnessScripts, ...fragment.scripts },
    dependencies: { ...base.dependencies, ...fragment.dependencies },
    devDependencies: { ...base.devDependencies, ...fragment.devDependencies },
  };
}

// Prefer single quotes (the template's Biome style) unless the name contains one.
export function javascriptStringLiteral(value) {
  if (value.includes("'") && !value.includes('"')) return JSON.stringify(value);
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderPlaceholders(text, { projectName, productLocale = 'pt-BR' }) {
  return text
    .replaceAll('__PROJECT_NAME_JS__', javascriptStringLiteral(projectName))
    .replaceAll('__PROJECT_NAME_HTML__', escapeHtml(projectName))
    .replaceAll('__PRODUCT_LOCALE__', productLocale)
    .replaceAll('__WORKER_NAME__', toWorkerName(projectName));
}

export function toWorkerName(projectName) {
  const name = projectName.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 54);
  return name || 'app';
}

async function listFiles(directory, base = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path, base));
    else files.push(relative(base, path).replaceAll('\\', '/'));
  }
  return files.sort();
}

export async function initApplication({ root = repositoryRoot, projectName, productLocale, runSupabaseInit = true, print = () => {} } = {}) {
  const packagePath = join(root, 'package.json');
  const basePackage = JSON.parse(await readFile(packagePath, 'utf8'));
  if (basePackage.dependencies?.react) throw new Error('A aplicação já existe (package.json já tem react).');

  const project = await readProjectConfig(root);
  const values = {
    projectName: projectName ?? project.project_name ?? basePackage.name ?? 'app',
    productLocale: productLocale ?? project.product_locale ?? 'pt-BR',
  };
  if (!supportedProductLocales.includes(values.productLocale)) {
    throw new Error(`Nada foi alterado: o idioma do produto "${values.productLocale}" não tem textos no template. Use um destes em .harness/project.yaml (product_locale): ${supportedProductLocales.join(', ')}.`);
  }
  const templateRoot = join(root, '.harness', 'app-template');
  const files = (await listFiles(templateRoot)).filter((file) => file !== 'package.fragment.json');
  const conflicts = [];
  for (const file of files) if (await exists(join(root, file))) conflicts.push(file);
  if (conflicts.length > 0) {
    throw new Error(`Nada foi alterado: estes arquivos já existem e não serão sobrescritos:\n  ${conflicts.join('\n  ')}`);
  }

  for (const file of files) {
    const source = join(templateRoot, file);
    const destination = join(root, file);
    await mkdir(dirname(destination), { recursive: true });
    if (textExtensions.test(file)) {
      await writeFile(destination, renderPlaceholders(await readFile(source, 'utf8'), values));
    } else {
      await copyFile(source, destination);
    }
    await chmod(destination, (await stat(source)).mode);
  }

  const fragment = JSON.parse(await readFile(join(templateRoot, 'package.fragment.json'), 'utf8'));
  // A project created from the Harness still carries the Harness package identity.
  const fromHarness = basePackage.name === 'harness-for-noobs';
  const productPackage = fromHarness ? { ...basePackage, name: toWorkerName(values.projectName), version: '0.1.0' } : basePackage;
  await writeFile(packagePath, `${JSON.stringify(mergePackageJson(productPackage, fragment), null, 2)}\n`);
  await writeProjectCommands(root, applicationCommands);

  let supabaseInitialized = await exists(join(root, 'supabase', 'config.toml'));
  if (runSupabaseInit && !supabaseInitialized) {
    const result = await runCaptured('supabase', ['init'], { cwd: root, timeoutMs: 60_000 });
    supabaseInitialized = result.code === 0;
    if (supabaseInitialized) {
      const configPath = join(root, 'supabase', 'config.toml');
      await writeFile(configPath, hardenSupabaseConfig(await readFile(configPath, 'utf8')));
    }
  }
  print(`Aplicação "${values.projectName}" criada com ${files.length} arquivos.`);
  return { files, supabaseInitialized, values };
}
