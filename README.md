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
- [Node.js 20.12 or newer](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- One AI coding tool: Codex, Claude Code, Cursor, Cline, GitHub Copilot, or Devin

### 2. Clone the Harness

```bash
git clone https://github.com/EltonMC/harness-for-noobs.git
cd harness-for-noobs
```

Open that folder in your AI coding tool. Start by telling the agent what you want to build, for example:

> I want to build a small expense tracker. Use the Harness and help me turn this into the first work item.

### 3. Install managed skills

Run this once after cloning. It installs the official stable BMad package, creates the local Impeccable and Caveman sources, and generates adapters for the portable hosts:

```bash
node .harness/scripts/bootstrap-skills.mjs --bmad-tools codex
```

Replace `codex` with your BMad host identifier, or use a comma-separated list such as `codex,claude-code,cursor`. Run the following command to see BMad's current supported identifiers:

```bash
npx bmad-method install --list-tools
```

Then reload your coding tool and invoke `bmad-help`.

## Daily workflow

1. Describe the desired outcome in plain language.
2. For a meaningful feature, use BMad to create an approved upstream handoff. Do not put a whole PRD into every implementation chat.
3. Create a work item in `.harness/work-items/` from the template.
4. Write a behavior-focused test first, observe it fail, implement the smallest change, then refactor with tests green.
5. For UI, database, Supabase authorization, Docker, or deployment work, let the matching Harness skill add its focused safety checks.
6. Commit the focused change on a feature branch and open a pull request. Do not push directly to `main`.

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

Check them at any time:

```bash
node .harness/scripts/check-skill-sources.mjs
```

After reviewing release notes, prepare an update only on a dedicated branch:

```bash
node .harness/scripts/update-skill-sources.mjs --apply
```

The included GitHub workflow runs a weekly read-only check. A manual run with `prepare_update` enabled creates a draft pull request; you review it before merging.

## Set up GitHub safely

After pushing your own copy to GitHub:

1. In **Settings → Branches**, protect `main`: require a pull request, passing checks, and resolved conversations.
2. In **Settings → Actions**, allow the workflow to create draft pull requests if you want managed skill updates.
3. Add deployment credentials only as GitHub secrets. Never commit `.env` files or Supabase `service_role` keys.
4. Merge only reviewed pull requests. Production deployment belongs to CI after the merge.

The full guide is in [.harness/workflows/git-pr-production.md](.harness/workflows/git-pr-production.md).

## Important boundaries

- This Harness selects React + Vite, Supabase, Docker Compose, and Cloudflare Workers Static Assets as the initial architecture. Change it through an ADR, not an ad-hoc prompt.
- All developer-facing code and technical artifacts are English. Product-facing copy follows your product locale.
- Every feature uses TDD. A missing test setup is work to complete before the feature, not a reason to skip tests.
- Never expose Supabase secrets in browser code.
- The Harness cannot guarantee that an AI-generated change is correct. Tests, review, and human approval are deliberate safety gates.

## Third-party software

This repository installs and integrates with BMad Method, Impeccable, and Caveman. Their licenses and attribution are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Their update process is deliberately reviewed and versioned.

## License

The Harness-authored files are licensed under [MIT](LICENSE). Third-party components remain under their own licenses.
