const fs = require("fs");
const glob = require("path");

function listFiles(ext) {
  return fs.readdirSync(__dirname).filter(f => f.endsWith(ext));
}

// أي اسم دالة معلن على مستوى الملف (من غير مسافة بادئة، أو بعد "}" على طول
// نفس السطر في الملفات المُصغّرة) بيبقى global فعليًا (الملف مش ملفوف في
// IIFE، زي wallets.js أو app-delete-tools.js أو app-trash.js في المشروع
// ده). الدوال جوه IIFE في المشروع ده دايمًا متبدئة بمسافتين على الأقل. أي
// `window.NAME = ...` صريح كمان بيبقى متاح عالميًا برضو.
const jsFiles = listFiles(".js").filter(f => !f.endsWith("-tests.js") && f !== "core-tests.js" && f !== "wf-action-wiring-check.js");
let globallyReachable = new Set();
const declRe = /(?:^|\}|;)([ \t]*)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
for (const f of jsFiles) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(declRe)) if (m[1].length < 2) globallyReachable.add(m[2]);
  for (const m of src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) globallyReachable.add(m[1]);
}
// دوال معرّفة جوه <script> مضمّن في ملف HTML نفسه (مش ملف JS خارجي) — دي
// دايمًا global أصلًا (زي dismissPendingCall في pending-calls.html).
for (const f of listFiles(".html")) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) globallyReachable.add(m[1]);
}

// كل الأماكن اللي بتنادي دالة global بالاسم بالطريقة دي، عبر كل ملفات
// JS/HTML (بما فيها الماركب جوه template strings في ملفات JS، زي الأزرار
// المتولدة ديناميكيًا).
const refs = []; // {name, file, kind}
const allFiles = jsFiles.concat(listFiles(".html"));
for (const f of allFiles) {
  const src = fs.readFileSync(f, "utf8");
  for (const attr of ["data-wf-code", "data-wf-refocus-code", "data-wf-change-code"]) {
    const re = new RegExp(attr + '="([A-Za-z_$][\\w$]*)\\s*\\(', "g");
    for (const m of src.matchAll(re)) refs.push({ name: m[1], file: f, kind: attr });
  }
  for (const attr of ["data-wf-click", "data-wf-blur", "data-wf-input"]) {
    const re = new RegExp(attr + '="([A-Za-z_$][\\w$]*)"', "g");
    for (const m of src.matchAll(re)) refs.push({ name: m[1], file: f, kind: attr });
  }
}

const missing = refs.filter(r => !globallyReachable.has(r.name));
if (missing.length) {
  const uniq = [...new Map(missing.map(m => [m.name + "|" + m.file, m])).values()];
  console.error("wf-action-wiring-check: FAIL");
  uniq.forEach(m => console.error(`  ${m.file}: "${m.name}" (via ${m.kind}) is not reachable as window.${m.name} — the button/handler will silently do nothing when triggered.`));
  process.exit(1);
}
console.log(`wf-action-wiring-check: PASS (${refs.length} action references checked across ${allFiles.length} files)`);
