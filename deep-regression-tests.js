const fs = require('fs');
const vm = require('vm');
const store = new Map();
const localStorage = {
  getItem(k) { return store.has(k) ? store.get(k) : null; },
  setItem(k, v) { store.set(k, String(v)); },
  removeItem(k) { store.delete(k); },
};
const document = { addEventListener() {}, getElementById() { return null; }, querySelector() { return null; } };
const window = { addEventListener() {}, auditLog() {} };
const context = vm.createContext({ window, localStorage, sessionStorage: localStorage, document, console, crypto: { randomUUID: () => 'test-' + Math.random() }, alert() {}, confirm() { return true; }, prompt() { return 'test'; }, location: { href: '' }, setTimeout, clearTimeout, Date, Math, Number, String, Object, Array, JSON, Promise, URLSearchParams });
for (const file of ['shared-data.js', 'app-shared.js', 'app-requests.js', 'app-dashboard-reports.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
for (const name of ['K', 'arr', 'put', 'saveJSONSafe', 'withRollback', 'settings', 'id']) if (context.window[name]) context[name] = context.window[name];
context.id = context.id || (() => 'test-' + Math.random());
context.renderRequests = () => {};
context.renderDash = () => {};
context.requestProfile = () => {};
const K = context.window.K;
function set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
function get(k) { return JSON.parse(localStorage.getItem(k) || 'null'); }
function check(condition, message) { if (!condition) throw new Error(message); }

// Cancelling an order must persist the returned stock and movement.
set(K.p, [{ id: 'p1', name: 'Part', qty: 0, buy: 5, use: 10 }]);
set(K.m, []);
set(K.r, [{ id: 'r1', no: 'R1', status: 'جاري التنفيذ', parts: [{ partId: 'p1', qty: 2, buy: 5, cost: 5, sell: 10 }], closed: false, paid: false }]);
context.changeRequestStatus('r1', 'ملغي');
check(get(K.p)[0].qty === 2, 'cancel did not persist returned stock');
check(get(K.m).some(x => x.requestId === 'r1' && x.qty === 2), 'cancel did not persist stock movement');

// Re-opening must consume the same quantity again and persist it.
context.changeRequestStatus('r1', 'جديد');
check(get(K.p)[0].qty === 0, 'reopen did not persist stock deduction');
check(get(K.m).filter(x => x.requestId === 'r1').length === 2, 'reopen did not persist second stock movement');

// Date-only values must remain local dates in report range checks.
const start = new Date(2026, 8, 20, 0, 0, 0, 0), end = new Date(2026, 8, 20, 23, 59, 59, 999);
check(context.inRange('2026-09-20', start, end), 'date-only report value shifted outside local day');

console.log('deep-regression-tests: PASS');
