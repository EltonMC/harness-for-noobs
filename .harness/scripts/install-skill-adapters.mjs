import { cp, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const destinations = {
  agents: '.agents/skills',
  claude: '.claude/skills',
  cline: '.cline/skills',
  cursor: '.cursor/skills',
  github: '.github/skills',
};
const args = process.argv.slice(2);
const requested = args[args.indexOf('--tool') + 1];
const rootIndex = args.indexOf('--root');
const root = rootIndex === -1 ? '.' : args[rootIndex + 1];

if (!requested || !['agents', 'claude', 'cline', 'cursor', 'github', 'all'].includes(requested) || !root) {
  throw new Error('Usage: node .harness/scripts/install-skill-adapters.mjs --tool agents|claude|cline|cursor|github|all [--root path]');
}

const skillsRoot = join(root, '.harness/skills');
const skills = await readdir(skillsRoot, { withFileTypes: true });
const targets = requested === 'all' ? Object.keys(destinations) : [requested];

for (const target of targets) {
  const targetRoot = join(root, destinations[target]);
  await mkdir(targetRoot, { recursive: true });
  for (const skill of skills.filter((entry) => entry.isDirectory())) {
    await cp(join(skillsRoot, skill.name), join(targetRoot, skill.name), {
      recursive: true,
      force: true,
    });
  }
  console.log(`Installed ${skills.length} harness skill(s) in ${targetRoot}`);
}
