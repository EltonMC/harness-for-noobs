# Harness for Noobs

A portable, opinionated starting kit for building a small React and Supabase application with AI coding agents — without needing to invent a software process first.

It helps you turn an idea into a reviewed change by combining product planning, test-driven development, Docker, database safety, UI quality, token discipline, and GitHub pull requests.

## Who this is for

Use this repository if you can describe what you want to build but do not yet feel comfortable deciding every engineering practice alone. It is designed for solo makers and small teams using Codex, Claude Code, Cursor, Cline, VS Code with GitHub Copilot, or Devin.

This is a development Harness, not an application starter. It does not create your product for you. It gives your agents a shared operating system for creating it safely.

## What you get

| Need | Harness support |
| --- | --- |
| Decide what to build | BMad upstream planning and a concise approved handoff |
| Build safely | Mandatory behavior-first TDD and small work items |
| Avoid database mistakes | DBA-style proposal, review, migration, and access controls |
| Improve the interface | Design system, UX TDD, and Impeccable integration |
| Spend fewer tokens | On-demand memory, upstream context by reference, and Caveman |
| Avoid breaking production | Docker-first local work, PR review, protected `main`, and CI-only deployment |
| Keep agent tools aligned | Portable adapters and versioned BMad, Impeccable, and Caveman sources |

## Quick start

### 1. Install the basics

Install these once:

- [Git](https://git-scm.com/downloads)
- [Node.js 22 LTS](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [uv](https://docs.astral.sh/uv/) for BMad workflows
- One AI coding tool: Codex, Claude Code, Cursor, Cline, GitHub Copilot, or Devin

### 2. Clone the Harness

```bash
git clone https://github.com/EltonMC/harness-for-noobs.git
cd harness-for-noobs
```

Open that folder in your AI coding tool. Start by telling the agent what you want to build, for example:

> I want to build a small expense tracker. Use the Harness and help me turn this into the first work item.

### 3. Check the computer before installing anything

Run this after cloning. It reports each missing requirement with the next action; it does not download or change anything.

```bash
npm run harness -- status
```

### 4. Install the approved skills

When the status command is ready, install the exact BMad version and Git revisions committed in the source lock. This is the only command that downloads the external skills.

```bash
npm run harness -- setup --bmad-tools codex
```

Replace `codex` with a comma-separated host list such as `codex,claude-code,cursor`. Reload the coding tool, then invoke `bmad-help`.

The installer never resolves “latest” skill content. If it cannot obtain a locked revision, it stops without substituting a newer release.

## Daily workflow

1. Run `npm run harness -- status` when changing computers or recovering from a failed setup.
2. Describe the desired outcome in plain language.
3. For a meaningful feature, use BMad to create an approved upstream handoff. Do not put a whole PRD into every implementation chat.
4. Create a work item in `.harness/work-items/` from the template.
5. Write a behavior-focused test first, observe it fail, implement the smallest change, then refactor with tests green.
6. Run `npm run check` before a pull request. It validates the Harness controls themselves.
7. For UI, database, Supabase authorization, Docker, or deployment work, let the matching Harness skill add its focused safety checks.
8. Commit the focused change on a feature branch and open a pull request. Do not push directly to `main`.

The agent instructions in [AGENTS.md](AGENTS.md) and the configuration in [.harness/harness.yaml](.harness/harness.yaml) are the source of truth.

## Token-saving defaults

- Use an approved upstream handoff and current work item by default; retrieve BMad artifacts only for a precise missing or high-risk decision.
- Search project memory by task terms; do not load the full memory tree or replay old conversations.
- Use Caveman when concise agent communication helps. Start with `/caveman lite`; use normal language whenever safety, ambiguity, or a multi-step instruction needs clarity.
- Give reviewers a diff, acceptance criteria, changed tests, and risks — not the full implementation transcript.

Read [.harness/workflows/token-efficient-execution.md](.harness/workflows/token-efficient-execution.md) for the complete policy.

## Skill maintenance

BMad, Impeccable, and Caveman are external dependencies, not magic files that should silently change. Their versions are recorded in:

- `.harness/skill-sources.lock.json`
- `skills-lock.json`

Check local integrity without calling the network:

```bash
npm run harness -- status
```

Prepare an intentional external-skill update only on a dedicated branch:

```bash
npm run harness -- update --apply
```

This command first rejects local drift, then discovers newer candidates, installs each candidate by its resolved immutable identity, records before/after integrity evidence, and changes only the locks. Run `npm run check`, inspect the lock diff and release notes, then open a draft pull request. The GitHub workflow performs a read-only check weekly.

### Updating the Harness itself

Keep product files separate from Harness-owned controls. Updates may change `AGENTS.md`, `.harness/`, and dedicated Harness workflows; they must never overwrite product code, product configuration, database migrations, secrets, design decisions, or approved handoffs.

For each Harness release, create a `chore/harness-update-<version>` branch, compare the release with the current Harness-owned paths, and create one work item for the proposed update. Resolve a conflict in a Harness-owned file before applying it; a conflict touching a product-owned file stops the update and requires a scoped follow-up. Review the resulting pull request like any other change. This preserves project decisions even when the underlying starter evolves.

## Set up GitHub safely

After pushing your own copy to GitHub:

1. In **Settings → Branches**, protect `main`: require a pull request, passing checks, and resolved conversations.
2. Add deployment credentials only as GitHub secrets. Never commit `.env` files or Supabase `service_role` keys.
3. Merge only reviewed pull requests. Production deployment belongs to CI after the merge.

The full guide is in [.harness/workflows/git-pr-production.md](.harness/workflows/git-pr-production.md).

## Important boundaries

- This Harness selects React + Vite, Supabase, Docker Compose, and Cloudflare Workers Static Assets as the initial architecture. The application scaffold is intentionally created only after its first user journey and authorization model are defined. Change the architecture through an ADR, not an ad-hoc prompt.
- All developer-facing code and technical artifacts are English. Product-facing copy follows your product locale.
- Every feature uses TDD. A missing test setup is work to complete before the feature, not a reason to skip tests.
- Never expose Supabase secrets in browser code.
- The Harness cannot guarantee that an AI-generated change is correct. Tests, review, and human approval are deliberate safety gates.

## Third-party software

This repository installs and integrates with BMad Method, Impeccable, and Caveman. Their licenses and attribution are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Their update process is deliberately reviewed and versioned.

## License

The Harness-authored files are licensed under [MIT](LICENSE). Third-party components remain under their own licenses.
