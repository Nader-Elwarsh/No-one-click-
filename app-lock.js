/* حماية محلية بالرقم السري.
   هذه طبقة حماية للجهاز/المتصفح فقط وليست بديلًا عن حسابات وصلاحيات Backend. */
(function () {
  "use strict";
  var LK_HASH = "wf_pin_hash", LK_SALT = "wf_pin_salt", SK_UNLOCK = "wf_unlocked";
  var LK_ENTRY = "wf_pin_lock_entry", LK_DELETE = "wf_pin_lock_delete";
  var LK_IDLE = "wf_pin_idle_minutes", LK_LEAVE = "wf_pin_lock_on_leave";
  var LK_ATTEMPTS = "wf_pin_failed_attempts", LK_AUDIT = "wf_pin_attempt_log";
  var MAX_ATTEMPTS = 5, COOLDOWN_MS = 30000, idleTimer = null;

  function hashOnce(str) {
    var h1 = 0x811c9dc5, h2 = 0x1000193;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      h1 = (h1 ^ c) >>> 0; h1 = Math.imul(h1, 16777619) >>> 0;
      h2 = (h2 + c) >>> 0; h2 = Math.imul(h2, 2246822519) >>> 0;
    }
    return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  }
  function wfHash(pin, salt) {
    var h = salt + ":" + pin;
    for (var i = 0; i < 500; i++) h = hashOnce(h + i);
    return h;
  }
  function randSalt() {
    try { return crypto.getRandomValues(new Uint32Array(3)).join("-"); }
    catch (_) { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
  }
  function now() { return Date.now(); }
  function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; } catch (_) { return fallback; } }
  function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
  function audit(ok, reason) {
    var log = readJSON(LK_AUDIT, []);
    log.push({ at: new Date().toISOString(), ok: !!ok, reason: reason || "entry" });
    if (log.length > 50) log = log.slice(-50);
    writeJSON(LK_AUDIT, log);
  }
  function attempts() { return readJSON(LK_ATTEMPTS, { count: 0, since: 0 }); }
  function resetAttempts() { localStorage.removeItem(LK_ATTEMPTS); }
  function failedAttempt() {
    var a = attempts();
    if (!a.since || now() - a.since > COOLDOWN_MS) a = { count: 0, since: now() };
    a.count++;
    writeJSON(LK_ATTEMPTS, a);
    return a;
  }
  function armIdle() {
    clearTimeout(idleTimer);
    var minutes = Math.max(1, Math.min(240, Number(localStorage.getItem(LK_IDLE) || 15)));
    if (WFLock.isUnlocked() && WFLock.isSet()) idleTimer = setTimeout(function () { WFLock.lock("idle"); }, minutes * 60000);
  }
  function activity() { if (WFLock.isUnlocked()) armIdle(); }
  function denyAccess(message) {
    function show() {
      if (document.getElementById("wf-lock-blocker")) return;
      var box = document.createElement("div");
      box.id = "wf-lock-blocker";
      box.setAttribute("role", "alertdialog");
      box.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#001b4d;color:#fff;display:grid;place-items:center;padding:24px;text-align:center;font:600 18px system-ui";
      var text = document.createElement("div");
      text.textContent = message || "التطبيق مقفول. أعد فتح الصفحة وحاول مرة أخرى.";
      box.appendChild(text);
      (document.body || document.documentElement).appendChild(box);
    }
    if (document.body) show(); else document.addEventListener("DOMContentLoaded", show, { once: true });
  }

  var WFLock = {
    isSet: function () { return !!localStorage.getItem(LK_HASH); },
    setPin: function (pin) {
      var salt = randSalt();
      localStorage.setItem(LK_SALT, salt);
      localStorage.setItem(LK_HASH, wfHash(String(pin), salt));
      if (localStorage.getItem(LK_ENTRY) === null) localStorage.setItem(LK_ENTRY, "1");
      if (localStorage.getItem(LK_DELETE) === null) localStorage.setItem(LK_DELETE, "1");
      if (localStorage.getItem(LK_IDLE) === null) localStorage.setItem(LK_IDLE, "15");
      if (localStorage.getItem(LK_LEAVE) === null) localStorage.setItem(LK_LEAVE, "1");
      resetAttempts();
    },
    verify: function (pin) {
      var salt = localStorage.getItem(LK_SALT) || "";
      return wfHash(String(pin), salt) === localStorage.getItem(LK_HASH);
    },
    removePin: function () {
      [LK_HASH, LK_SALT, LK_ENTRY, LK_DELETE, LK_IDLE, LK_LEAVE, LK_ATTEMPTS, LK_AUDIT].forEach(function (k) { localStorage.removeItem(k); });
      sessionStorage.removeItem(SK_UNLOCK); clearTimeout(idleTimer);
    },
    isUnlocked: function () { return sessionStorage.getItem(SK_UNLOCK) === "1"; },
    unlock: function () { sessionStorage.setItem(SK_UNLOCK, "1"); resetAttempts(); armIdle(); },
    lock: function (reason) { sessionStorage.removeItem(SK_UNLOCK); clearTimeout(idleTimer); audit(false, "locked:" + (reason || "manual")); },
    entryLockEnabled: function () { return localStorage.getItem(LK_ENTRY) !== "0"; },
    setEntryLockEnabled: function (v) { localStorage.setItem(LK_ENTRY, v ? "1" : "0"); },
    deleteLockEnabled: function () { return localStorage.getItem(LK_DELETE) !== "0"; },
    setDeleteLockEnabled: function (v) { localStorage.setItem(LK_DELETE, v ? "1" : "0"); },
    idleMinutes: function () { return Number(localStorage.getItem(LK_IDLE) || 15); },
    setIdleMinutes: function (v) { localStorage.setItem(LK_IDLE, String(Math.max(1, Math.min(240, Number(v) || 15)))); armIdle(); },
    lockOnLeave: function () { return localStorage.getItem(LK_LEAVE) !== "0"; },
    setLockOnLeave: function (v) { localStorage.setItem(LK_LEAVE, v ? "1" : "0"); },
    getAttemptLog: function () { return readJSON(LK_AUDIT, []); },
    requirePin: function (msg) {
      if (!this.isSet()) return true;
      var a = attempts();
      if (a.count >= MAX_ATTEMPTS && now() - a.since < COOLDOWN_MS) { alert("تم إيقاف المحاولات مؤقتًا 30 ثانية."); return false; }
      var pin = prompt(msg || "🔒 اكتب الرقم السري للتأكيد:");
      if (pin === null) { audit(false, "cancel"); return false; }
      if (!this.verify(pin)) { var f = failedAttempt(); audit(false, "wrong-pin"); alert(f.count >= MAX_ATTEMPTS ? "محاولات كثيرة خاطئة. انتظر 30 ثانية." : "رقم سري غير صحيح."); return false; }
      resetAttempts(); audit(true, "verified"); return true;
    },
    requireDeletePin: function (msg) { if (!this.isSet() || !this.deleteLockEnabled()) return true; return this.requirePin(msg); },
    ensureEntryUnlocked: function () {
      if (!this.isSet() || !this.entryLockEnabled() || this.isUnlocked()) { armIdle(); return; }
      while (true) {
        var a = attempts();
        if (a.count >= MAX_ATTEMPTS && now() - a.since < COOLDOWN_MS) { alert("تم إيقاف الدخول مؤقتًا 30 ثانية."); denyAccess("تم إيقاف الدخول مؤقتًا بعد محاولات خاطئة كثيرة."); return; }
        var pin = prompt("🔒 اكتب الرقم السري للدخول للنظام:");
        if (pin !== null && this.verify(pin)) { audit(true, "entry"); this.unlock(); return; }
        if (pin === null) { audit(false, "cancel-entry"); denyAccess("تم إلغاء الدخول. أعد فتح الصفحة وحاول باستخدام الرقم السري."); return; }
        var f = failedAttempt(); audit(false, "wrong-entry");
        if (f.count >= MAX_ATTEMPTS) { alert("محاولات كثيرة خاطئة. انتظر 30 ثانية."); denyAccess("تم إيقاف الدخول مؤقتًا بعد محاولات خاطئة كثيرة."); return; }
        alert("رقم سري غير صحيح، حاول تاني.");
      }
    }
  };
  window.WFLock = WFLock;
  WFLock.ensureEntryUnlocked();
  ["click", "keydown", "pointerdown", "touchstart"].forEach(function (type) { document.addEventListener(type, activity, { passive: true }); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && WFLock.lockOnLeave()) WFLock.lock("hidden"); });
  window.addEventListener("pagehide", function () { if (WFLock.lockOnLeave()) WFLock.lock("pagehide"); });
  var guarded = { deleteAllCustomers: "حذف جميع العملاء وما يرتبط بهم", deleteAllDevices: "حذف جميع الأجهزة وأوامرها", deleteAllRequests: "حذف جميع أوامر الشغل", deleteAllOperationalData: "حذف كل البيانات التشغيلية (إعادة تهيئة النظام)" };
  document.addEventListener("DOMContentLoaded", function () { Object.keys(guarded).forEach(function (name) { var orig = window[name]; if (typeof orig !== "function") return; window[name] = function () { if (!WFLock.requireDeletePin("🔒 اكتب الرقم السري لتأكيد: " + guarded[name])) return; return orig.apply(this, arguments); }; }); });
})();
