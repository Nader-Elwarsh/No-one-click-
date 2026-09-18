const fs = require('fs');
const path = require('path');
const root = __dirname;
const html = fs.readdirSync(root).filter(n => n.endsWith('.html'));
let inline = 0, suspicious = [];
for (const name of html) {
  const text = fs.readFileSync(path.join(root, name), 'utf8');
  const matches = text.match(/\son(?:click|input|focus|blur|change|submit)\s*=/gi) || [];
  inline += matches.length;
  if (matches.length) suspicious.push(`${name}: ${matches.length} inline event attributes`);
}
for (const name of fs.readdirSync(root).filter(n => n.endsWith('.js'))) {
  const text = fs.readFileSync(path.join(root, name), 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (/\.innerHTML\s*=/.test(line) && /\$\{/.test(line) && !/(esc|escAttr|textContent|createElement)/.test(line)) {
      suspicious.push(`${name}:${i + 1}: template value assigned to innerHTML without visible escaping`);
    }
  });
}
if (inline > 90) {
  console.error(`security-quality-check: FAIL (${inline} inline handlers; budget 90)`);
  process.exit(1);
}
console.log(`security-quality-check: PASS (${inline} legacy inline handlers remain; ${suspicious.filter(x => x.includes('innerHTML')).length} suspicious HTML lines)`);
if (suspicious.length && process.env.SECURITY_STRICT === '1') { console.error(suspicious.join('\n')); process.exit(1); }
