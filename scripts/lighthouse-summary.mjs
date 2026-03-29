import { readFileSync, readdirSync } from 'fs';

const dir = '.lighthouseci';
const files = readdirSync(dir).filter(f => f.startsWith('lhr-') && f.endsWith('.json'));

if (!files.length) {
  console.log('No Lighthouse reports found.');
  process.exit(0);
}

const rows = files.map(f => {
  const r = JSON.parse(readFileSync(`${dir}/${f}`, 'utf-8'));
  const url = new URL(r.requestedUrl);
  return {
    page: url.pathname || '/',
    perf: Math.round(r.categories.performance.score * 100),
    a11y: Math.round(r.categories.accessibility.score * 100),
    bp: Math.round(r.categories['best-practices'].score * 100),
    seo: Math.round(r.categories.seo.score * 100),
  };
});

const score = (n) => (n >= 90 ? `\x1b[32m${n}\x1b[0m` : n >= 50 ? `\x1b[33m${n}\x1b[0m` : `\x1b[31m${n}\x1b[0m`);

console.log('\n  Lighthouse Results\n');
console.log('  Page            Perf   A11y   BP     SEO');
console.log('  ' + '─'.repeat(46));
for (const r of rows) {
  console.log(`  ${r.page.padEnd(16)}${score(r.perf).padEnd(15)}${score(r.a11y).padEnd(15)}${score(r.bp).padEnd(15)}${score(r.seo)}`);
}
console.log();
