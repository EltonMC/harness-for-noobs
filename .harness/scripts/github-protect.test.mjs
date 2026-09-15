import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { auditRepositorySecrets, buildProtectionPlan, firstRulesetId, requiredChecks } from './github-protect.mjs';
import { repositoryRoot } from './skill-source-utils.mjs';

test('requires the Harness and application checks, which report success before an application exists', () => {
  assert.deepEqual(requiredChecks, ['Harness checks', 'Quality gate', 'Database gate', 'Security scan']);
});

test('review: every required check matches a job name in a Harness-managed workflow', async () => {
  const workflows = await Promise.all(['harness-ci.yml', 'app-ci.yml'].map((file) => readFile(join(repositoryRoot, '.github', 'workflows', file), 'utf8')));
  const jobNames = workflows.flatMap((workflow) => [...workflow.matchAll(/^ {4}name: (.+)$/gm)].map((match) => match[1].trim()));
  for (const check of requiredChecks) assert.ok(jobNames.includes(check), `${check} is not a workflow job name`);
});

test('protects the default branch with pull requests, required checks, and no force pushes', () => {
  const plan = buildProtectionPlan({ repository: 'owner/app' });
  const ruleset = plan.find((step) => step.id === 'ruleset');
  const ruleTypes = ruleset.body.rules.map((rule) => rule.type);
  assert.deepEqual(ruleTypes, ['deletion', 'non_fast_forward', 'pull_request', 'required_status_checks']);
  assert.deepEqual(ruleset.body.conditions.ref_name.include, ['~DEFAULT_BRANCH']);
  const pullRequest = ruleset.body.rules.find((rule) => rule.type === 'pull_request');
  assert.equal(pullRequest.parameters.required_approving_review_count, 0, 'a solo owner must still be able to merge');
  assert.equal(pullRequest.parameters.required_review_thread_resolution, true);
  assert.deepEqual(pullRequest.parameters.allowed_merge_methods, ['squash']);
  assert.equal(ruleset.body.bypass_actors.length, 0);
});

test('review: enables automatic security updates and lets the update workflow open pull requests', () => {
  const plan = buildProtectionPlan({ repository: 'owner/app' });
  assert.equal(plan.find((step) => step.id === 'security-updates').path, 'repos/owner/app/automated-security-fixes');
  const actions = plan.find((step) => step.id === 'actions-pull-requests');
  assert.equal(actions.path, 'repos/owner/app/actions/permissions/workflow');
  assert.deepEqual(actions.body, { default_workflow_permissions: 'read', can_approve_pull_request_reviews: true });
});

test('marks paid-plan security features as optional so their failure does not stop protection', () => {
  const plan = buildProtectionPlan({ repository: 'owner/app' });
  assert.equal(plan.find((step) => step.id === 'ruleset').optional, false);
  assert.equal(plan.find((step) => step.id === 'secret-scanning').optional, true);
  assert.equal(plan.find((step) => step.id === 'code-scanning').optional, true);
  assert.ok(plan.every((step) => step.path.startsWith('repos/owner/app')));
});

test('review: uses the first ruleset id when duplicates exist', () => {
  assert.equal(firstRulesetId('123\n456\n'), '123');
  assert.equal(firstRulesetId(''), '');
});

test('database: creates a production-destructive environment that waits for the owner before destructive migrations', () => {
  const plan = buildProtectionPlan({ repository: 'owner/app', reviewerId: 42 });
  const step = plan.find((candidate) => candidate.id === 'destructive-database-environment');
  assert.equal(step.path, 'repos/owner/app/environments/production-destructive');
  assert.deepEqual(step.body.reviewers, [{ type: 'User', id: 42 }]);
  assert.equal(step.body.prevent_self_review, false, 'a solo owner approves their own destructive change');
  assert.equal(step.optional, true);
  assert.ok(!buildProtectionPlan({ repository: 'owner/app' }).some((candidate) => candidate.id === 'destructive-database-environment'));
});

test('security: production secrets stored at repository level are reported with the fix', () => {
  const warnings = auditRepositorySecrets(['SUPABASE_ACCESS_TOKEN', 'CLOUDFLARE_API_TOKEN', 'HARNESS_UPDATE_TOKEN', 'SUPABASE_DB_PASSWORD']);
  assert.equal(warnings.length, 3);
  assert.ok(warnings.every((warning) => /production|preview/.test(warning)));
  assert.deepEqual(auditRepositorySecrets(['HARNESS_UPDATE_TOKEN']), []);
});

test('security: creates a preview environment so pull request jobs never receive production database secrets', () => {
  const plan = buildProtectionPlan({ repository: 'owner/app' });
  const preview = plan.find((step) => step.id === 'preview-environment');
  assert.equal(preview.path, 'repos/owner/app/environments/preview');
  assert.equal(preview.optional, false);
});

test('review: production environments allow only the main branch explicitly, not "protected branches"', () => {
  const plan = buildProtectionPlan({ repository: 'owner/app', reviewerId: 7 });
  for (const environment of ['production', 'production-destructive']) {
    const create = plan.find((step) => step.path === `repos/owner/app/environments/${environment}`);
    assert.deepEqual(create.body.deployment_branch_policy, { protected_branches: false, custom_branch_policies: true });
    const policy = plan.find((step) => step.method === 'BRANCH_POLICY' && step.path === `repos/owner/app/environments/${environment}/deployment-branch-policies`);
    assert.deepEqual(policy.body, { name: 'main', type: 'branch' });
  }
});
