import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runCaptured } from './process-utils.mjs';

// Creates or updates one pull request comment per report, identified by a
// hidden HTML marker, so the preview and database reports never overwrite each other.

export function markedBody(body, marker) {
  const tag = `<!-- ${marker} -->`;
  return body.includes(tag) ? body : `${tag}\n${body}`;
}

export function planCommentUpsert(comments, marker) {
  const match = comments.filter((comment) => comment.body?.includes(`<!-- ${marker} -->`)).at(-1);
  return match ? { action: 'update', id: match.id } : { action: 'create' };
}

async function gh(argumentsList) {
  const result = await runCaptured('gh', argumentsList, { timeoutMs: 60_000 });
  if (result.code !== 0) throw new Error(`gh ${argumentsList.slice(0, 2).join(' ')} failed: ${result.output.trim()}`);
  return result.stdout;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argumentsList = process.argv.slice(2);
  const valueOf = (name) => argumentsList[argumentsList.indexOf(name) + 1];
  const [pr, marker, bodyFile, repository] = [valueOf('--pr'), valueOf('--marker'), valueOf('--body-file'), process.env.GITHUB_REPOSITORY];
  (async () => {
    const body = markedBody(await readFile(bodyFile, 'utf8'), marker);
    await writeFile(bodyFile, body);
    const comments = JSON.parse(await gh(['api', '--paginate', '--slurp', `repos/${repository}/issues/${pr}/comments`])).flat();
    const plan = planCommentUpsert(comments, marker);
    if (plan.action === 'update') await gh(['api', '--method', 'PATCH', `repos/${repository}/issues/comments/${plan.id}`, '-F', `body=@${bodyFile}`]);
    else await gh(['api', '--method', 'POST', `repos/${repository}/issues/${pr}/comments`, '-F', `body=@${bodyFile}`]);
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
