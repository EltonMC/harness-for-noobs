import assert from 'node:assert/strict';
import test from 'node:test';

import { protectedPushTargets } from './git-pre-push.mjs';

const zeros = '0'.repeat(40);
const sha = (character) => character.repeat(40);

test('blocks an update of the remote main branch', () => {
  assert.deepEqual(protectedPushTargets(`refs/heads/feature/x ${sha('a')} refs/heads/main ${sha('b')}\n`), ['refs/heads/main']);
});

test('ignores the local ref and allows pushing a feature branch', () => {
  assert.deepEqual(protectedPushTargets(`refs/heads/main ${sha('a')} refs/heads/feature/x ${sha('b')}\n`), []);
});

test('allows the first publish that creates main on an empty remote', () => {
  assert.deepEqual(protectedPushTargets(`refs/heads/main ${sha('a')} refs/heads/main ${zeros}\n`), []);
});

test('blocks deleting the remote main branch', () => {
  assert.deepEqual(protectedPushTargets(`(delete) ${zeros} refs/heads/main ${sha('b')}\n`), ['refs/heads/main']);
});

test('checks every ref in a multi-ref push', () => {
  const stdin = `refs/heads/a ${sha('a')} refs/heads/a ${sha('b')}\nrefs/heads/a ${sha('a')} refs/heads/master ${sha('c')}\n`;
  assert.deepEqual(protectedPushTargets(stdin), ['refs/heads/master']);
});
