import { execSync } from 'node:child_process';

function run(command) {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

run('VERSION_ASSUME_CLEAN=true npm run generate:version');

try {
  execSync('git diff --quiet -- version.json', { stdio: 'ignore' });
  console.log('version.json is up to date for this commit.');
} catch {
  fail('version.json is out of date. Run "npm run generate:version" and commit the updated file.');
}
