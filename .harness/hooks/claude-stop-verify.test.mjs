import assert from 'node:assert/strict';
import test from 'node:test';

import { applicationChanges, parsePorcelainZ } from './claude-stop-verify.mjs';

test('parses porcelain -z output including spaces and renames', () => {
  const stdout = ' M src/My Component.tsx\0R  src/new.ts\0src/old.ts\0?? supabase/migrations/001_init.sql\0';
  assert.deepEqual(parsePorcelainZ(stdout), ['src/My Component.tsx', 'src/new.ts', 'supabase/migrations/001_init.sql']);
});

test('selects application source changes and flags database changes', () => {
  assert.deepEqual(applicationChanges(['README.md', 'src/App.tsx', 'supabase/migrations/1.sql']), {
    files: ['src/App.tsx', 'supabase/migrations/1.sql'],
    touchesDatabase: true,
  });
  assert.deepEqual(applicationChanges(['docs/guia/01.md']), { files: [], touchesDatabase: false });
});
