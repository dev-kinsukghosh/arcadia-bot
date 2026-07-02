const { execSync } = require('child_process');
const pc = require('picocolors');

console.log(pc.bold(pc.magenta('=========================================')));
console.log(pc.bold(pc.magenta('     RUNNING ALL BOT TEST SUITES         ')));
console.log(pc.bold(pc.magenta('=========================================')));

const suites = [
  { name: 'Environment Connection Suite', cmd: 'node tests/env.test.js' },
  { name: 'ArcadiaMC API Connection Suite', cmd: 'node tests/api.test.js' },
  { name: 'Database Query Suite', cmd: 'node tests/database.test.js' },
  { name: 'Blacklist Functionality Suite', cmd: 'node tests/blacklist.test.js' },
  { name: 'Item Notifications Suite', cmd: 'node tests/notify.test.js' },
];

let failed = 0;

for (const suite of suites) {
  console.log(`\nStarting Suite: ${pc.bold(suite.name)}...`);
  try {
    execSync(suite.cmd, { stdio: 'inherit' });
    console.log(pc.bold(pc.green(`✓ Suite Passed: ${suite.name}`)));
  } catch {
    console.log(pc.bold(pc.red(`✗ Suite Failed: ${suite.name}`)));
    failed++;
  }
}

console.log(pc.bold(pc.magenta('\n=========================================')));
if (failed === 0) {
  console.log(pc.bold(pc.green('   ALL TEST SUITES COMPLETED SUCCESSFULLY ')));
} else {
  console.log(pc.bold(pc.red(`   TESTS COMPLETED: ${failed} SUITE(S) FAILED     `)));
  process.exit(1);
}
console.log(pc.bold(pc.magenta('=========================================')));
