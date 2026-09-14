import { relative, isAbsolute } from 'node:path';
import { gitContext, readStdinJson } from './git-context.mjs';
import { runCaptured } from '../scripts/process-utils.mjs';
import { evaluateFileEdit, evaluateFileRead, evaluateMcpTool, evaluateShellCommand } from './hook-policy.mjs';

// Claude Code PreToolUse hook. Prints a permission decision as JSON; any
// unexpected error allows the call so a hook defect never blocks all work.

function editedContent(toolInput) {
  if (Array.isArray(toolInput.edits)) return toolInput.edits.map((edit) => edit.new_string ?? '').join('\n');
  return toolInput.content ?? toolInput.new_string ?? toolInput.new_source ?? '';
}

// A migration that already exists on the default branch may have run in production.
async function isPublishedMigration(projectDirectory, path) {
  if (!/^supabase\/migrations\/.+\.sql$/.test(path.replace(/\\/g, '/'))) return false;
  for (const base of ['origin/main', 'main']) {
    const result = await runCaptured('git', ['cat-file', '-e', `${base}:${path.replace(/\\/g, '/')}`], { cwd: projectDirectory, timeoutMs: 5_000 });
    if (result.code === 0) return true;
  }
  return false;
}

async function main() {
  const event = await readStdinJson();
  const projectDirectory = process.env.CLAUDE_PROJECT_DIR ?? event.cwd ?? process.cwd();
  const context = await gitContext(projectDirectory);
  const toolInput = event.tool_input ?? {};
  let evaluation;
  if (event.tool_name?.startsWith('mcp__')) {
    evaluation = evaluateMcpTool({ name: event.tool_name });
  } else if (event.tool_name === 'Bash') {
    evaluation = evaluateShellCommand(toolInput.command ?? '', context);
  } else if (['Read', 'Grep', 'Glob'].includes(event.tool_name)) {
    const candidates = [toolInput.file_path, toolInput.path, toolInput.pattern, toolInput.glob].filter(Boolean);
    evaluation = candidates.map((path) => evaluateFileRead({ path })).find((result) => result.decision !== 'allow') ?? { decision: 'allow' };
  } else {
    const filePath = toolInput.file_path ?? toolInput.notebook_path;
    if (!filePath) return;
    const path = isAbsolute(filePath) ? relative(projectDirectory, filePath) : filePath;
    if (path.startsWith('..')) return;
    const publishedMigration = await isPublishedMigration(projectDirectory, path);
    evaluation = evaluateFileEdit({ path, content: editedContent(toolInput) }, { ...context, publishedMigration });
  }
  if (evaluation.decision === 'allow') return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: evaluation.decision,
      permissionDecisionReason: `Harness: ${evaluation.reason}`,
    },
  }));
}

main().catch((error) => {
  process.stderr.write(`Harness hook error (allowed): ${error.message}\n`);
});
