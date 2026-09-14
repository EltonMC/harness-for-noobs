import assert from 'node:assert/strict';
import test from 'node:test';

import { markedBody, planCommentUpsert } from './upsert-pr-comment.mjs';

test('adds the hidden marker once so each report keeps its own comment', () => {
  assert.equal(markedBody('Olá', 'harness-preview'), '<!-- harness-preview -->\nOlá');
  assert.equal(markedBody('<!-- harness-preview -->\nOlá', 'harness-preview'), '<!-- harness-preview -->\nOlá');
});

test('updates the latest comment with the same marker and never another report', () => {
  const comments = [
    { id: 1, body: '<!-- harness-preview -->\nold' },
    { id: 2, body: '<!-- harness-database-guard -->\nbanco' },
    { id: 3, body: '<!-- harness-preview -->\nnewer' },
  ];
  assert.deepEqual(planCommentUpsert(comments, 'harness-preview'), { action: 'update', id: 3 });
  assert.deepEqual(planCommentUpsert(comments.slice(0, 1), 'harness-database-guard'), { action: 'create' });
});
