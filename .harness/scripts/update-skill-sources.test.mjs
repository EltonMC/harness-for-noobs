import assert from 'node:assert/strict';
import test from 'node:test';

import { buildUpdatedLock } from './update-skill-sources.mjs';

test('updates only the source identities supplied by a discovered candidate set', () => {
  const lock = {
    sources: [
      { id: 'bmad', manager: 'bmad-method', installerVersion: '6.12.0', installedVersion: '6.12.0' },
      { id: 'impeccable', manager: 'git-source', sourceRevision: 'a'.repeat(40) },
    ],
  };
  const updated = buildUpdatedLock(lock, { bmad: '6.13.0', impeccable: 'b'.repeat(40) });
  assert.equal(updated.sources[0].installerVersion, '6.13.0');
  assert.equal(updated.sources[0].installedVersion, '6.13.0');
  assert.equal(updated.sources[1].sourceRevision, 'b'.repeat(40));
});

test('rejects a Git candidate that is not an immutable revision', () => {
  assert.throws(() => buildUpdatedLock({ sources: [{ id: 'impeccable', manager: 'git-source', sourceRevision: 'a'.repeat(40) }] }, { impeccable: 'main' }), /immutable/);
});
