import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { initApplication, javascriptStringLiteral, mergePackageJson, renderPlaceholders, toWorkerName } from './init-app.mjs';
import { parseProjectConfig } from './project-config.mjs';
import { repositoryRoot } from './skill-source-utils.mjs';

test('keeps Harness scripts and moves the Harness self-test out of the application test name', () => {
  const merged = mergePackageJson(
    { name: 'meu-app', version: '0.1.0', private: true, scripts: { harness: 'node h.mjs', check: 'node h.mjs check', test: 'node --test .harness/scripts/*.test.mjs' } },
    { type: 'module', scripts: { test: 'vitest run', lint: 'biome check .' }, dependencies: { react: '19.3.0' } },
  );
  assert.equal(merged.name, 'meu-app');
  assert.equal(merged.scripts.harness, 'node h.mjs');
  assert.equal(merged.scripts['harness:test'], 'node --test .harness/scripts/*.test.mjs');
  assert.equal(merged.scripts.test, 'vitest run');
  assert.equal(merged.dependencies.react, '19.3.0');
  assert.equal(merged.type, 'module');
});

test('review: keeps dependencies and metadata that already exist in package.json', () => {
  const merged = mergePackageJson(
    { name: 'x', description: 'mine', dependencies: { zod: '4.0.0' }, devDependencies: { tsx: '5.0.0' }, scripts: {} },
    { dependencies: { react: '19.3.0' }, devDependencies: { vite: '8.3.0' } },
  );
  assert.equal(merged.description, 'mine');
  assert.deepEqual(merged.dependencies, { zod: '4.0.0', react: '19.3.0' });
  assert.deepEqual(merged.devDependencies, { tsx: '5.0.0', vite: '8.3.0' });
});

test('review: renders project names safely for JavaScript and HTML', () => {
  assert.equal(javascriptStringLiteral('Gastos'), "'Gastos'");
  assert.equal(javascriptStringLiteral("Pão d'Água"), '"Pão d\'Água"');
  assert.equal(javascriptStringLiteral('Say "hi" & it\'s'), '\'Say "hi" & it\\\'s\'');
  const rendered = renderPlaceholders('<title>__PROJECT_NAME_HTML__</title><html lang="__PRODUCT_LOCALE__"> const n = __PROJECT_NAME_JS__;', { projectName: "Pão <d'Água> & Cia", productLocale: 'pt-BR' });
  assert.equal(rendered, '<title>Pão &lt;d&#39;Água&gt; &amp; Cia</title><html lang="pt-BR"> const n = "Pão <d\'Água> & Cia";');
});

test('derives a valid Cloudflare Worker name', () => {
  assert.equal(toWorkerName('Controle de Gastos 2!'), 'controle-de-gastos-2');
  assert.equal(toWorkerName('***'), 'app');
});

test('refuses to overwrite existing files and writes nothing when a conflict exists', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-init-app-'));
  try {
    const template = join(root, '.harness', 'app-template');
    await mkdir(join(template, 'src'), { recursive: true });
    await writeFile(join(template, 'package.fragment.json'), JSON.stringify({ dependencies: { react: '19.3.0' } }));
    await writeFile(join(template, 'index.html'), '<title>__PROJECT_NAME_HTML__</title>');
    await writeFile(join(template, 'src', 'App.tsx'), 'app');
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'demo', scripts: {} }));
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src', 'App.tsx'), 'mine');

    await assert.rejects(initApplication({ root, projectName: 'Demo', runSupabaseInit: false }), /src\/App\.tsx/);
    assert.equal(await readFile(join(root, 'src', 'App.tsx'), 'utf8'), 'mine');
    await assert.rejects(readFile(join(root, 'index.html')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function listFiles(directory, base = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path, base));
    else files.push(path.slice(base.length + 1));
  }
  return files;
}

test('review: scaffolds the real template with no placeholders, a lockfile, and product commands', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-init-app-real-'));
  try {
    await cp(join(repositoryRoot, '.harness', 'app-template'), join(root, '.harness', 'app-template'), { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'harness-for-noobs', version: '0.3.0', private: true, scripts: { harness: 'node h.mjs', test: 'node --test .harness/scripts/*.test.mjs' } }));
    await writeFile(join(root, '.harness', 'project.yaml'), '# Product-owned\nproject_name: "Pão d\'Água"\nowner_locale: pt-BR\nproduct_locale: en-US\ncommands:\n  lint: unset\n');

    const { files } = await initApplication({ root, runSupabaseInit: false });

    assert.ok(files.includes('pnpm-lock.yaml'));
    assert.ok(!files.some((file) => file.startsWith('.github/')), 'application workflows are Harness-managed, not copied');
    for (const file of await listFiles(root)) {
      if (file.startsWith('.harness/app-template/')) continue;
      assert.doesNotMatch(await readFile(join(root, file), 'utf8'), /__[A-Z_]+__/, file);
    }
    const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    assert.equal(packageJson.name, 'pao-d-agua');
    assert.equal(packageJson.version, '0.1.0');
    assert.match(await readFile(join(root, 'index.html'), 'utf8'), /<html lang="en-US">[\s\S]*<title>Pão d&#39;Água<\/title>/);
    assert.match(await readFile(join(root, 'src', 'App.tsx'), 'utf8'), /"Pão d'Água"/);
    const project = parseProjectConfig(await readFile(join(root, '.harness', 'project.yaml'), 'utf8'));
    assert.equal(project.commands.lint, 'pnpm lint');
    assert.equal(project.commands.e2e, 'pnpm test:e2e');
    assert.equal(project.product_locale, 'en-US');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
