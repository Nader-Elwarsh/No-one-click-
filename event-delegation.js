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
  function callSimple(name, argsAttr, el, event) {
    var fn = window[name];
    if (typeof fn !== "function") return false;
    var args = [];
    if (argsAttr) {
      try { var parsed = JSON.parse(argsAttr); if (Array.isArray(parsed)) args = parsed; } catch (e) { return false; }
    }
    fn.apply(el, args);
    return true;
  }
  document.addEventListener("click", function (event) {
    var codeEl = event.target.closest && event.target.closest("[data-wf-code]");
    if (codeEl && codeEl.getAttribute("data-wf-event") === "click") { callCode(codeEl.getAttribute("data-wf-code"), codeEl, event); return; }
    // اتفاقية أبسط لأزرار بلا وسيطات ديناميكية من الـDOM/الحدث نفسه: اسم دالة
    // + مصفوفة JSON ثابتة من القيم (زي "toggle('customerForm')" أو
    // "quickAddWalletTx('in')") — مستخدمة في عشرات الأزرار عبر النظام (تبديل
    // المظهر، فتح/غلق فورم الإضافة، الإضافة السريعة...) وكانت من غير أي
    // معالج فعلي قبل كده، فكانت كل هذه الأزرار بلا أي تأثير عند الضغط عليها.
    var clickEl = event.target.closest && event.target.closest("[data-wf-click]");
    if (clickEl) callSimple(clickEl.getAttribute("data-wf-click"), clickEl.getAttribute("data-wf-args"), clickEl, event);
  });
  ["input", "focus", "blur", "change", "submit"].forEach(function (type) {
    document.addEventListener(type, function (event) {
      var el = event.target.closest && event.target.closest('[data-wf-event="' + type + '"]');
      if (el) {
        if (type === "submit") event.preventDefault();
        callCode(el.getAttribute("data-wf-code"), el, event);
        return;
      }
      // نفس اتفاقية data-wf-click (اسم دالة + data-wf-args JSON) لكن لحدث الـ
      // input/blur هنا. كانت data-wf-blur وdata-wf-input برضو من غير أي معالج
      // فعلي (نفس مشكلة data-wf-click بالظبط) — يعني قوايم نتائج البحث
      // بالاسم/المركز/القرية... (autocomplete) ما كانتش بتتقفل تلقائيًا لما
      // تسيب الحقل، وفلترة صنف الفاتورة/خط السير أثناء الكتابة ما كانتش بتحصل.
      if (type === "blur" || type === "input") {
        var attr = "data-wf-" + type;
        var simpleEl = event.target.closest && event.target.closest("[" + attr + "]");
        if (simpleEl) { callSimple(simpleEl.getAttribute(attr), simpleEl.getAttribute("data-wf-args"), simpleEl, event); return; }
      }
      // بعض حقول البحث كتبت data-wf-event="input" وdata-wf-event="focus" مرتين
      // على نفس العنصر بنفس الكود (عشان الفلترة تظهر تاني لو رجعت تدوس على
      // الحقل من غير ما تكتب) — لكن HTML بترفض تكرار نفس اسم الخاصية على نفس
      // العنصر وبتاخد أول قيمة بس، فكانت data-wf-event="focus" الثانية دايمًا
      // بتضيع بصمت. data-wf-refocus-code اسم بديل فريد بيحمل نفس الكود عشان
      // حدث focus يلاقيه ويشتغل صح.
      if (type === "focus") {
        var refocusEl = event.target.closest && event.target.closest("[data-wf-refocus-code]");
        if (refocusEl) callCode(refocusEl.getAttribute("data-wf-refocus-code"), refocusEl, event);
      }
      // نفس الفكرة لكن لحدث change: عنصر واحد كان محتاج يستجيب لكل من click
      // (لوقف انتشار الحدث لعنصر أب بيفتح صفحة تانية عند أي ضغط جواه) وchange
      // (لتنفيذ التغيير الفعلي) بنفس اسمي الخاصيتين data-wf-event/data-wf-code
      // — فكانت أول قيمة (click) هي اللي بتفضل بعد إزالة HTML للتكرار،
      // وchange كان بيضيع تمامًا (زي قايمة تغيير حالة أمر الشغل من غير ما
      // تحفظ التغيير فعليًا). data-wf-change-code اسم بديل فريد للحالة دي.
      if (type === "change") {
        var changeEl = event.target.closest && event.target.closest("[data-wf-change-code]");
        if (changeEl) callCode(changeEl.getAttribute("data-wf-change-code"), changeEl, event);
      }
    }, type === "focus" || type === "blur");
  });
})();
