import assert from 'node:assert/strict';
import test from 'node:test';

import { parseBmadTools } from './bootstrap-skills.mjs';

test('uses Codex when no BMad target is specified', () => {
  assert.equal(parseBmadTools([]), 'codex');
});

test('accepts an explicit comma-separated BMad target list', () => {
  assert.equal(parseBmadTools(['--bmad-tools', 'codex,cursor']), 'codex,cursor');
});

test('rejects an empty BMad target list', () => {
  assert.throws(() => parseBmadTools(['--bmad-tools']), /Usage:/);
});
