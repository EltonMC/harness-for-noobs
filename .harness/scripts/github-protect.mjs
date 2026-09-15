import { runCaptured } from './process-utils.mjs';
import { repositoryRoot } from './skill-source-utils.mjs';

// Applies the repository protections from ADR 0003 and ADR 0012 through the
// GitHub CLI. Dry-run by default; `--apply` changes GitHub settings.

const rulesetName = 'harness-main-protection';

// The application workflows are Harness-managed and report success while no
// application exists, so the same checks can be required from day one.
export const requiredChecks = ['Harness checks', 'Quality gate', 'Database gate', 'Security scan'];

// Secrets that must live in a GitHub environment. Repository secrets reach every workflow
// run, including pull request branches an agent can push before any review.
const environmentSecrets = {
  SUPABASE_ACCESS_TOKEN: 'production',
  SUPABASE_DB_PASSWORD: 'production',
  CLOUDFLARE_API_TOKEN: 'production e preview',
  CLOUDFLARE_ACCOUNT_ID: 'production e preview',
};

export function auditRepositorySecrets(names) {
  return names.filter((name) => environmentSecrets[name]).map((name) => (
    `O segredo ${name} está no nível do repositório: qualquer branch consegue lê-lo. Mova para o ambiente ${environmentSecrets[name]} (Settings → Environments) e apague a cópia em Settings → Secrets and variables → Actions. Em repositório privado no plano gratuito, environments não guardam segredos: torne o repositório público, use GitHub Pro ou registre o risco em project-context.md.`
  ));
}

export function firstRulesetId(output) {
  return output.trim().split(/\s+/)[0] ?? '';
}

// "Protected branches" environments admit every branch when only rulesets (no classic
// branch protection) exist, so the environments name main explicitly.
const mainOnly = { protected_branches: false, custom_branch_policies: true };

export function buildProtectionPlan({ repository, reviewerId }) {
  const base = `repos/${repository}`;
  return [
    {
      id: 'merge-settings',
      description: 'Permitir só squash merge e apagar a branch depois do merge',
      method: 'PATCH',
      path: base,
      optional: false,
      body: { allow_squash_merge: true, allow_merge_commit: false, allow_rebase_merge: false, delete_branch_on_merge: true },
    },
    {
      id: 'ruleset',
      description: `Proteger a main: PR obrigatório, conversas resolvidas, checks verdes (${requiredChecks.join(', ')}), sem force push`,
      method: 'RULESET',
      path: `${base}/rulesets`,
      optional: false,
      body: {
        name: rulesetName,
        target: 'branch',
        enforcement: 'active',
        conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
        bypass_actors: [],
        rules: [
          { type: 'deletion' },
          { type: 'non_fast_forward' },
          {
            type: 'pull_request',
            parameters: {
              required_approving_review_count: 0,
              dismiss_stale_reviews_on_push: true,
              require_code_owner_review: false,
              require_last_push_approval: false,
              required_review_thread_resolution: true,
              allowed_merge_methods: ['squash'],
            },
          },
          {
            type: 'required_status_checks',
            parameters: {
              strict_required_status_checks_policy: true,
              required_status_checks: requiredChecks.map((context) => ({ context })),
            },
          },
        ],
      },
    },
    {
      id: 'production-environment',
      description: 'Criar o ambiente "production" liberado só para a branch main',
      method: 'PUT',
      path: `${base}/environments/production`,
      optional: false,
      body: { deployment_branch_policy: mainOnly },
    },
    {
      id: 'production-branch-policy',
      description: 'Permitir que só a main use os segredos de "production"',
      method: 'BRANCH_POLICY',
      path: `${base}/environments/production/deployment-branch-policies`,
      optional: false,
      body: { name: 'main', type: 'branch' },
    },
    {
      id: 'preview-environment',
      description: 'Criar o ambiente "preview" para os segredos da prévia (sem acesso ao banco de produção)',
      method: 'PUT',
      path: `${base}/environments/preview`,
      optional: false,
      body: {},
    },
    ...(reviewerId ? [{
      id: 'destructive-database-environment',
      description: 'Criar o ambiente "production-destructive": migration que apaga ou reescreve dados espera sua aprovação no GitHub',
      method: 'PUT',
      path: `${base}/environments/production-destructive`,
      optional: true,
      body: {
        reviewers: [{ type: 'User', id: reviewerId }],
        prevent_self_review: false,
        deployment_branch_policy: mainOnly,
      },
    }, {
      id: 'destructive-database-branch-policy',
      description: 'Permitir que só a main use o ambiente "production-destructive"',
      method: 'BRANCH_POLICY',
      path: `${base}/environments/production-destructive/deployment-branch-policies`,
      optional: true,
      body: { name: 'main', type: 'branch' },
    }] : []),
    {
      id: 'actions-pull-requests',
      description: 'Permitir que o workflow de atualização do Harness abra pull requests (permissões padrão continuam só leitura)',
      method: 'PUT',
      path: `${base}/actions/permissions/workflow`,
      optional: true,
      body: { default_workflow_permissions: 'read', can_approve_pull_request_reviews: true },
    },
    {
      id: 'vulnerability-alerts',
      description: 'Ativar alertas do Dependabot para dependências vulneráveis',
      method: 'PUT',
      path: `${base}/vulnerability-alerts`,
      optional: true,
    },
    {
      id: 'security-updates',
      description: 'Ativar pull requests automáticos de correção de segurança do Dependabot',
      method: 'PUT',
      path: `${base}/automated-security-fixes`,
      optional: true,
    },
    {
      id: 'secret-scanning',
      description: 'Ativar secret scanning com push protection (bloqueia push com segredo)',
      method: 'PATCH',
      path: base,
      optional: true,
      body: { security_and_analysis: { secret_scanning: { status: 'enabled' }, secret_scanning_push_protection: { status: 'enabled' } } },
    },
    {
      id: 'private-vulnerability-reporting',
      description: 'Ativar o relato privado de falhas de segurança (Security → Report a vulnerability)',
      method: 'PUT',
      path: `${base}/private-vulnerability-reporting`,
      optional: true,
    },
    {
      id: 'code-scanning',
      description: 'Ativar CodeQL (análise de segurança do código) na configuração padrão',
      method: 'PATCH',
      path: `${base}/code-scanning/default-setup`,
      optional: true,
      body: { state: 'configured', query_suite: 'default' },
    },
  ];
}

async function gh(argumentsList, input) {
  return runCaptured('gh', argumentsList, { cwd: repositoryRoot, input, timeoutMs: 60_000 });
}

async function applyStep(step) {
  if (step.method === 'BRANCH_POLICY') {
    const existing = await gh(['api', step.path, '--jq', '.branch_policies[].name']);
    if (existing.code === 0 && existing.stdout.split('\n').includes(step.body.name)) return existing;
    return gh(['api', '--method', 'POST', step.path, '--input', '-'], JSON.stringify(step.body));
  }
  if (step.method !== 'RULESET') {
    const argumentsList = ['api', '--method', step.method, step.path];
    if (step.body) argumentsList.push('--input', '-');
    return gh(argumentsList, step.body ? JSON.stringify(step.body) : undefined);
  }
  const existing = await gh(['api', step.path, '--jq', `.[] | select(.name == "${rulesetName}") | .id`]);
  const id = existing.code === 0 ? firstRulesetId(existing.stdout) : '';
  return id
    ? gh(['api', '--method', 'PUT', `${step.path}/${id}`, '--input', '-'], JSON.stringify(step.body))
    : gh(['api', '--method', 'POST', step.path, '--input', '-'], JSON.stringify(step.body));
}

function explainFailure(output) {
  if (/Upgrade to GitHub Pro|not available|403/.test(output)) return 'recurso indisponível no plano/visibilidade atual do repositório';
  if (/404/.test(output)) return 'repositório não encontrado ou sem permissão de administrador';
  return output.trim().split('\n').slice(-2).join(' ');
}

export async function runGithubProtect({ apply = false, print = console.log } = {}) {
  const auth = await gh(['auth', 'status']);
  if (auth.code !== 0) throw new Error('GitHub CLI não autenticado. Rode: gh auth login');
  const view = await gh(['repo', 'view', '--json', 'nameWithOwner,visibility']);
  if (view.code !== 0) throw new Error('Este projeto ainda não está no GitHub. Crie com: gh repo create --private --source . --push');
  const { nameWithOwner, visibility } = JSON.parse(view.stdout);
  const user = await gh(['api', 'user', '--jq', '.id']);
  const reviewerId = user.code === 0 ? Number(user.stdout.trim()) || undefined : undefined;
  const plan = buildProtectionPlan({ repository: nameWithOwner, reviewerId });

  print(`${apply ? 'Aplicando' : 'Plano (nada será alterado)'} — ${nameWithOwner} (${visibility.toLowerCase()})`);
  const secrets = await gh(['api', `repos/${nameWithOwner}/actions/secrets`, '--jq', '.secrets[].name']);
  const secretWarnings = secrets.code === 0 ? auditRepositorySecrets(secrets.stdout.split('\n').filter(Boolean)) : [];
  for (const warning of secretWarnings) print(`  ⚠ ${warning}`);
  if (!apply) {
    for (const step of plan) print(`  • ${step.description}${step.optional ? ' (se o plano do GitHub permitir)' : ''}`);
    print('\nPara aplicar: npm run harness -- github-protect --apply');
    return { ok: true, applied: false };
  }
  let ok = true;
  for (const step of plan) {
    const result = await applyStep(step);
    if (result.code === 0) {
      print(`  ✔ ${step.description}`);
    } else if (step.optional) {
      print(`  • ${step.description} — pulado: ${explainFailure(result.output)}`);
    } else {
      ok = false;
      print(`  ✖ ${step.description} — ${explainFailure(result.output)}`);
    }
  }
  if (!ok && visibility === 'PRIVATE') {
    print('\nRepositórios privados no plano gratuito não suportam proteção de branch nem secret scanning. Opções: tornar o repositório público ou usar GitHub Pro.');
  }
  return { ok, applied: true };
}
