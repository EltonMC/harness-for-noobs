import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { communicationLanguageFor, parseProjectConfig, readProjectConfig, renderProjectCommands, writeProjectCommands } from './project-config.mjs';

const sample = `# Product-owned configuration.
project_name: "Pão d'Água: Gastos"
owner_locale: pt-BR
product_locale: en-US
commands:
  lint: unset
  test: pnpm test
`;

test('parses the product configuration including quoted names', () => {
  assert.deepEqual(parseProjectConfig(sample), {
    project_name: "Pão d'Água: Gastos",
    owner_locale: 'pt-BR',
    product_locale: 'en-US',
    commands: { lint: 'unset', test: 'pnpm test' },
  });
});

test('maps the owner locale to the BMad communication language', () => {
  assert.equal(communicationLanguageFor('pt-BR'), 'Brazilian Portuguese');
  assert.equal(communicationLanguageFor('es-ES'), 'Spanish');
  assert.equal(communicationLanguageFor('en-US'), 'English');
  assert.equal(communicationLanguageFor(undefined), 'Brazilian Portuguese');
});

test('replaces only the commands block and keeps product values', () => {
  const updated = renderProjectCommands(sample, { lint: 'pnpm lint', test: 'pnpm test', e2e: 'pnpm test:e2e' });
  assert.match(updated, /project_name: "Pão d'Água: Gastos"/);
  assert.match(updated, /commands:\n {2}lint: pnpm lint\n {2}test: pnpm test\n {2}e2e: pnpm test:e2e\n$/);
});

test('reads defaults from Copier answers when no project file exists and creates it on write', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-project-config-'));
  try {
    await mkdir(join(root, '.harness'));
    await writeFile(join(root, '.copier-answers.yml'), '_commit: v0.3.0\nowner_locale: es-ES\nproduct_locale: pt-BR\nproject_name: Tienda\n');
    assert.deepEqual(await readProjectConfig(root), { project_name: 'Tienda', owner_locale: 'es-ES', product_locale: 'pt-BR', commands: {} });
    await writeProjectCommands(root, { test: 'pnpm test' });
    const written = parseProjectConfig(await readFile(join(root, '.harness', 'project.yaml'), 'utf8'));
    assert.equal(written.owner_locale, 'es-ES');
    assert.deepEqual(written.commands, { test: 'pnpm test' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
