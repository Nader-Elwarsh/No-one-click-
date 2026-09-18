const fs = require('fs');
const path = require('path');
const root = __dirname;
const files = fs.readdirSync(root).filter(n => n.endsWith('.js') && !n.startsWith('brand-'));
const bad = [];
for (const name of files) {
  const text = fs.readFileSync(path.join(root, name), 'utf8');
  if (name !== 'service-worker.js' && /toISOString\(\)\.slice\(\s*0\s*,\s*10\s*\)/.test(text)) bad.push(`${name}: UTC day key must use dayKeyLocal()`);
}
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
if (/toISOString\(\)\.slice\(\s*0\s*,\s*10\s*\)/.test(sw)) bad.push('service-worker.js: notification day must use localDayKey()');
if (!/function localDayKey\(/.test(sw)) bad.push('service-worker.js: localDayKey() is missing');
if (!/function parseLocalDateValue\(/.test(fs.readFileSync(path.join(root, 'app-shared.js'), 'utf8'))) bad.push('app-shared.js: parseLocalDateValue() is missing');
if (bad.length) { console.error('date-local-quality-check: FAIL\n' + bad.join('\n')); process.exit(1); }
console.log('date-local-quality-check: PASS');
