import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyRevision } from './check-skill-sources.mjs';

test('classifies an unchanged source revision as current', () => {
  assert.equal(classifyRevision('abc123', 'abc123'), 'current');
});

test('classifies a different source revision as an available update', () => {
  assert.equal(classifyRevision('abc123', 'def456'), 'update-available');
});

test('classifies a missing remote revision as unavailable', () => {
  assert.equal(classifyRevision('abc123', null), 'unavailable');
});
