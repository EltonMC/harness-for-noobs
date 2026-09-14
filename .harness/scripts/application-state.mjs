import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

// Single source of truth for "does this project have an application yet?",
// shared by doctor, init-app, verify, and the Git and agent hooks.
export async function readApplicationState(root) {
  let packageJson = {};
  try {
    packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  } catch {
    packageJson = {};
  }
  const usesPnpm = await exists(join(root, 'pnpm-lock.yaml')) || await exists(join(root, 'pnpm-workspace.yaml')) || /^pnpm@/.test(packageJson.packageManager ?? '');
  return {
    hasApplication: Boolean(packageJson.dependencies?.react),
    packageJson,
    scripts: packageJson.scripts ?? {},
    packageManager: usesPnpm ? 'pnpm' : 'npm',
    hasSupabaseConfig: await exists(join(root, 'supabase', 'config.toml')),
  };
}
