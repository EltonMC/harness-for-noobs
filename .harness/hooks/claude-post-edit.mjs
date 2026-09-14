import { isAbsolute, join, relative } from 'node:path';
import { runCaptured } from '../scripts/process-utils.mjs';
import { exists } from '../scripts/skill-source-utils.mjs';
import { summarizeFailure } from '../scripts/verify.mjs';
import { readStdinJson } from './git-context.mjs';

// Claude Code PostToolUse hook: formats and lints only the edited file. Exit 2
// returns a short diagnostic to the agent; success prints nothing.

const lintableExtensions = /\.(?:[cm]?[jt]sx?|jsonc?|css)$/;

async function main() {
  const event = await readStdinJson();
  const projectDirectory = process.env.CLAUDE_PROJECT_DIR ?? event.cwd ?? process.cwd();
  const filePath = event.tool_input?.file_path;
  if (!filePath || !lintableExtensions.test(filePath)) return;
  const biome = join(projectDirectory, 'node_modules', '.bin', process.platform === 'win32' ? 'biome.cmd' : 'biome');
  if (!await exists(biome)) return;
  const path = isAbsolute(filePath) ? relative(projectDirectory, filePath) : filePath;
  const result = await runCaptured(biome, ['check', '--write', '--no-errors-on-unmatched', '--colors=off', path], { cwd: projectDirectory });
  if (result.code === 0) return;
  process.stderr.write(`Biome encontrou problemas em ${path}:\n${summarizeFailure(result.output, { maximumLines: 20 })}\n`);
  process.exitCode = 2;
}

main().catch((error) => {
  process.stderr.write(`Harness post-edit hook error (ignored): ${error.message}\n`);
});
