import { commandOutput, runCaptured } from '../scripts/process-utils.mjs';

export async function gitContext(cwd) {
  const [branch, head] = await Promise.all([
    commandOutput('git', ['symbolic-ref', '--short', 'HEAD'], { cwd }),
    runCaptured('git', ['rev-parse', '--verify', '--quiet', 'HEAD'], { cwd }),
  ]);
  return { branch, hasCommits: head.code === 0 };
}

export async function readStdinJson() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  return input.trim() ? JSON.parse(input) : {};
}
