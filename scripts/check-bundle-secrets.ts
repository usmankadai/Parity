// Fails the build if anything that looks like an Anthropic API key, or the
// name of the server-only key variable, ends up in the browser bundle.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const FORBIDDEN = [/sk-ant-[a-z0-9]/i, /ANTHROPIC_API_KEY/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const problems = files(DIST)
  .filter((path) => /\.(js|html|css|map|json|txt)$/.test(path))
  .flatMap((path) => {
    const text = readFileSync(path, 'utf8');
    return FORBIDDEN.filter((pattern) => pattern.test(text)).map(
      (pattern) => `${path}: ${pattern}`,
    );
  });

if (problems.length > 0) {
  console.error('Secrets check failed. The browser bundle must never contain these:');
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`Secrets check passed (${files(DIST).length} files in ${DIST}/).`);
