import { readApplicationState } from '../scripts/application-state.mjs';
import { runVerification } from '../scripts/verify.mjs';
import { repositoryRoot } from '../scripts/skill-source-utils.mjs';

// Git pre-push hook: blocks pushes to protected branches and runs the quick gate.

const emptySha = /^0+$/;

// Git sends "<local ref> <local sha> <remote ref> <remote sha>" per ref. Creating
// main on an empty remote (remote sha all zeros) is the one-time first publish;
// updating or deleting an existing main is blocked.
export function protectedPushTargets(stdin) {
  return stdin.split('\n').map((line) => line.trim().split(/\s+/)).filter(([, localSha, remoteRef, remoteSha]) => (
    /^refs\/heads\/(?:main|master)$/.test(remoteRef ?? '') && !(emptySha.test(remoteSha ?? '') && !emptySha.test(localSha ?? ''))
  )).map(([, , remoteRef]) => remoteRef);
}

async function main() {
  let stdin = '';
  for await (const chunk of process.stdin) stdin += chunk;
  const targets = protectedPushTargets(stdin);
  if (targets.length > 0) {
    console.error('✖ Push para a main já publicada é bloqueado. Crie uma branch e abra um pull request:\n  git switch -c feature/<nome>\n  git push -u origin feature/<nome>');
    return 1;
  }
  if (!(await readApplicationState(repositoryRoot)).hasApplication) return 0;
  const { ok } = await runVerification({ root: repositoryRoot, quick: true });
  if (!ok) console.error('✖ Verificação rápida falhou; o push foi cancelado. Corrija e tente de novo.');
  return ok ? 0 : 1;
}

if (process.argv[1]?.endsWith('git-pre-push.mjs')) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(`Harness pre-push hook error: ${error.message}`);
    process.exitCode = 1;
  });
}
