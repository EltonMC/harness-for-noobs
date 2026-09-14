import assert from 'node:assert/strict';
import test from 'node:test';

import { quoteWindowsArgument, runCaptured } from './process-utils.mjs';

test('keeps multi-byte characters intact when output arrives in many chunks', async () => {
  const script = "for (let i = 0; i < 2000; i++) process.stdout.write('ação ✔ ');";
  const { code, stdout } = await runCaptured(process.execPath, ['-e', script]);
  assert.equal(code, 0);
  assert.doesNotMatch(stdout, /�/);
  assert.equal(stdout, 'ação ✔ '.repeat(2000));
});

test('returns 124 when a command exceeds its timeout', async () => {
  const { code } = await runCaptured(process.execPath, ['-e', 'setTimeout(() => {}, 10000)'], { timeoutMs: 200 });
  assert.equal(code, 124);
});

test('does not crash when the child exits before reading stdin', async () => {
  const { code } = await runCaptured(process.execPath, ['-e', 'process.exit(0)'], { input: 'x'.repeat(1024 * 1024) });
  assert.equal(code, 0);
});

test('quotes Windows arguments that contain spaces or quotes', () => {
  assert.equal(quoteWindowsArgument('Brazilian Portuguese'), '"Brazilian Portuguese"');
  assert.equal(quoteWindowsArgument('.[] | select(.name == "x")'), '".[] | select(.name == \\"x\\")"');
  assert.equal(quoteWindowsArgument('--tools'), '--tools');
  assert.equal(quoteWindowsArgument(''), '""');
});
