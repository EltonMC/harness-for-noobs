import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGitInstallPlan } from './skill-source-utils.mjs';

test('rejects mutable and malformed Git revisions before an installation runs', () => {
  for (const sourceRevision of ['main', 'v1.2.3', 'abc123']) {
    assert.throws(() => buildGitInstallPlan({
      id: 'example', source: 'owner/repository', sourceRevision, sourceDirectory: '.agents/skills/example', sourceSubdirectory: '.',
    }), /immutable 40-character Git revision/);
  }
});
