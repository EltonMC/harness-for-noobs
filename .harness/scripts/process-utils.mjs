import { spawn } from 'node:child_process';

// Windows resolves npm, npx, pnpm, and similar tools through .cmd shims that need
// a shell; arguments are then quoted for cmd.exe so spaces survive.
const useShell = process.platform === 'win32';

export function quoteWindowsArgument(argument) {
  if (argument === '') return '""';
  if (!/[\s"&|<>^%()!]/.test(argument)) return argument;
  return `"${argument.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1')}"`;
}

function spawnOptions(options, stdio) {
  return { cwd: options.cwd, env: options.env ?? process.env, stdio, shell: useShell, windowsHide: true };
}

function spawnArguments(argumentsList) {
  return useShell ? argumentsList.map(quoteWindowsArgument) : argumentsList;
}

export function runStreaming(command, argumentsList, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, spawnArguments(argumentsList), spawnOptions(options, 'inherit'));
    child.on('error', () => resolve(127));
    child.on('close', (code) => resolve(code ?? 1));
  });
}

// Collects output as Buffers and decodes once, so multi-byte characters split
// across chunks are never corrupted. `timeoutMs` kills the child and returns 124.
export function runCaptured(command, argumentsList, { cwd, env, input, timeoutMs } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, spawnArguments(argumentsList), spawnOptions({ cwd, env }, ['pipe', 'pipe', 'pipe']));
    const stdoutChunks = [];
    const outputChunks = [];
    let timedOut = false;
    const timer = timeoutMs ? setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs) : null;
    child.stdout.on('data', (chunk) => {
      stdoutChunks.push(chunk);
      outputChunks.push(chunk);
    });
    child.stderr.on('data', (chunk) => outputChunks.push(chunk));
    child.stdin.on('error', () => {});
    child.on('error', (error) => {
      if (timer) clearTimeout(timer);
      resolve({ code: 127, output: error.message, stdout: '', stdoutBuffer: Buffer.alloc(0) });
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      const stdoutBuffer = Buffer.concat(stdoutChunks);
      const output = Buffer.concat(outputChunks).toString('utf8');
      resolve({
        code: timedOut ? 124 : code ?? 1,
        output: timedOut ? `${output}\nTimed out after ${timeoutMs} ms.` : output,
        stdout: stdoutBuffer.toString('utf8'),
        stdoutBuffer,
      });
    });
    child.stdin.end(input);
  });
}

export async function commandOutput(command, argumentsList, options = {}) {
  const result = await runCaptured(command, argumentsList, { timeoutMs: 20_000, ...options });
  return result.code === 0 ? result.stdout.trim() || null : null;
}

export async function runOrThrow(command, argumentsList, options) {
  const code = await runStreaming(command, argumentsList, options);
  if (code !== 0) throw new Error(`Command failed (exit ${code}): ${command} ${argumentsList.join(' ')}`);
}
