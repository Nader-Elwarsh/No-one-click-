/* Central event delegation for all converted inline handlers.
   It uses a small allowlisted expression parser; it never uses eval or Function. */
(function () {
  "use strict";
  function splitArgs(raw) {
    var out = [], cur = "", quote = "", depth = 0;
    for (var i = 0; i < raw.length; i++) {
      var ch = raw[i];
      if (quote) { cur += ch; if (ch === quote && raw[i - 1] !== "\\") quote = ""; continue; }
      if (ch === "'" || ch === '"' || ch === "`") { quote = ch; cur += ch; continue; }
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      if (ch === ")" || ch === "]" || ch === "}") depth--;
      if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function literal(raw, el, event) {
    var s = raw.trim();
    if ((s[0] === "'" && s[s.length - 1] === "'") || (s[0] === '"' && s[s.length - 1] === '"')) return s.slice(1, -1).replace(/\\(['"])/g, "$1");
    if (s === "this") return el;
    if (s === "event") return event;
    if (s === "this.value") return el.value;
    if (s === "this.checked") return !!el.checked;
    if (s === "this.files[0]") return el.files && el.files[0];
    if (s === "this.selectedOptions[0].value") return el.selectedOptions && el.selectedOptions[0] ? el.selectedOptions[0].value : "";
    if (s === "null") return null;
    if (s === "true") return true;
    if (s === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    return undefined;
  }
  function callCode(code, el, event) {
    var text = (code || "").trim();
    var remove = text.match(/^this\.closest\((['"])(.*?)\1\)\.remove\(\)$/);
    if (remove) { var target = el.closest(remove[2]); if (target) target.remove(); return true; }
    var m = text.match(/^([A-Za-z_$][\w$]*)\s*\((.*)\)$/s);
    if (!m) return false;
    var fn = window[m[1]];
    if (typeof fn !== "function") return false;
    var rawArgs = m[2].trim() ? splitArgs(m[2]) : [];
    var args = rawArgs.map(function (x) { return literal(x, el, event); });
    if (args.some(function (x, i) { return x === undefined && !/^undefined$/.test(rawArgs[i]); })) return false;
    fn.apply(el, args);
    return true;
  }
  document.addEventListener("click", function (event) {
    var el = event.target.closest && event.target.closest("[data-wf-code]");
    if (el && el.getAttribute("data-wf-event") === "click") callCode(el.getAttribute("data-wf-code"), el, event);
  });
  ["input", "focus", "blur", "change", "submit"].forEach(function (type) {
    document.addEventListener(type, function (event) {
      var el = event.target.closest && event.target.closest('[data-wf-event="' + type + '"]');
      if (!el) return;
      if (type === "submit") event.preventDefault();
      callCode(el.getAttribute("data-wf-code"), el, event);
    }, type === "focus" || type === "blur");
  });
})();
