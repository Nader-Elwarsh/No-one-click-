/* سجل تدقيق محلي للعمليات الحساسة. لا يسجل كلمات المرور أو نصوص العملاء الحساسة. */
(function () {
  "use strict";
  const KEY = "wf_audit_log", LIMIT = 300;
  function read() { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (_) { return []; } }
  function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v.slice(-LIMIT))); return true; } catch (_) { return false; } }
  window.auditLog = function (action, entity, entityId, details) {
    const row = { id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random(), at: new Date().toISOString(), action: String(action || ""), entity: String(entity || ""), entityId: String(entityId || "") };
    if (details) row.details = String(details).slice(0, 240);
    const list = read(); list.push(row); write(list); return row;
  };
  window.getAuditLog = function () { return read().slice().reverse(); };
  window.clearAuditLog = function () { return write([]); };
})();
