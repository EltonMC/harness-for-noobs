# Applying a Harness update

Use when a "Atualização do Harness" pull request or a "Nova versão do Harness disponível" issue exists, or the owner asks to update the Harness.

## With an update pull request

1. Check out its branch. Read the PR body: tests result, conflict list, and each version's "Precisa fazer algo?" section.
2. Resolve every `<<<<<<<` block: keep product decisions (names, rules, commands, content the owner wrote); take Harness improvements (scripts, hooks, skills, workflows, guides). When unsure which side a line belongs to, ask the owner one question.
3. Apply the manual steps listed in the changelog that touch product-owned files (`.harness/project.yaml`, `project-context.md`, `README.md`, `package.json`, memory pages).
4. `npm run check`, commit on the same branch, push, and ask the owner to review and merge. Never merge.

## Without a token (issue only)

1. `git switch main && git pull`, then `git switch -c chore/harness-update-<version>`.
2. `uvx copier@9.18.2 update --defaults --conflict inline`
3. Continue from step 2 above, then open the pull request with `harness-git-pr-delivery`.

## Ownership

Harness-owned files are updated with a 3-way merge. Product-owned files are listed in `copier.yml` under `_skip_if_exists` and never change automatically; see `.harness/harness.yaml` → `ownership`.
