import { join } from 'node:path';
import { runCaptured } from '../scripts/process-utils.mjs';
import { renderFindings, scanStaged } from '../scripts/secret-scan.mjs';
import { exists, repositoryRoot } from '../scripts/skill-source-utils.mjs';
import { gitContext } from './git-context.mjs';

// Git pre-commit hook, installed through core.hooksPath by `harness setup`.

async function main() {
  const root = repositoryRoot;
  const { branch, hasCommits } = await gitContext(root);
  if (hasCommits && ['main', 'master'].includes(branch)) {
    console.error(`✖ Commits direto na branch ${branch} são bloqueados.\n  Crie uma branch e tente de novo: git switch -c feature/<nome>`);
    return 1;
  }

  const findings = await scanStaged(root);
  const gitleaks = await runCaptured('gitleaks', ['git', '--pre-commit', '--staged', '--redact', '--no-banner', '--exit-code', '1'], { cwd: root });
  if (gitleaks.code === 1) findings.push({ path: 'gitleaks', line: 0, rule: gitleaks.output.split('\n').find((line) => /Finding|RuleID/.test(line))?.trim() ?? 'finding' });
  if (findings.length > 0) {
    console.error(`✖ Possíveis segredos no commit:\n${renderFindings(findings)}\n  Remova o valor do arquivo (use .env local ou segredos do CI) e rode git add de novo.`);
    return 1;
  }

  const biome = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'biome.cmd' : 'biome');
  if (await exists(biome)) {
    const lint = await runCaptured(biome, ['check', '--staged', '--no-errors-on-unmatched', '--colors=off'], { cwd: root });
    if (lint.code !== 0) {
      console.error(`✖ Lint/format falhou nos arquivos do commit:\n${lint.output.split('\n').slice(0, 30).join('\n')}\n  Rode: pnpm lint:fix`);
      return 1;
    }
  }
  return 0;
}

main().then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error(`Harness pre-commit hook error: ${error.message}`);
  process.exitCode = 1;
});
