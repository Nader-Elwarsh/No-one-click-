/* =========================================================
   الورشة الفنية — البحث الشامل (global-search.js)
   =========================================================
   زر بحث عائم يظهر في كل صفحات النظام (لأنه بيتحمّل زي
   shared-data.js في كل صفحة). بيدور في كل الأقسام مرة واحدة:
   العملاء، الأجهزة، أوامر الشغل، المخزن، المهام، الخزنة، أكواد
   الأعطال، وأكواد الكباسات — وبيودّيك على طول لصفحة النتيجة اللي
   دوست عليها.

   الاعتماد: لازم يتحمّل بعد shared-data.js (عشان يلاقي
   window.arr / K / esc / customerName / deviceName / addressText
   جاهزين) وبعد app-compressor-codes.js (عشان يلاقي
   window.CompressorRef لو الصفحة محمّلاه). مفيش أي تعديل على
   البيانات نفسها — بحث للقراءة بس. قاعدة الكباسات نفسها (~11 ألف
   سجل) بتتحمّل كسول لما المستخدم يفتح صندوق البحث فقط، مش من
   تحميل الصفحة.
   ========================================================= */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  var CAT_LABELS = {
    customer: "👤 العملاء",
    device: "🔧 الأجهزة",
    request: "🛠️ أوامر الشغل",
    part: "📦 المخزن",
    task: "📋 المهام",
    treasury: "💵 الخزنة",
    wallet: "💳 الحسابات والمحافظ",
    route: "🗺️ خط السير",
    faultcode: "🧯 أكواد الأعطال",
    compressor: "🧊 أكواد الكباسات"
  };
  var CAT_ORDER = ["customer", "device", "request", "part", "task", "treasury", "wallet", "route", "faultcode", "compressor"];
  var MAX_PER_GROUP = 25;

  function safeEsc(v) {
    if (typeof window.esc === "function") return window.esc(v);
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c];
    });
  }

  function norm(v) { return String(v == null ? "" : v).toLowerCase(); }

  function buildResults(q) {
    var results = [];
    var arr = window.arr, K = window.K;
    if (typeof arr !== "function" || !K) return results;
    var customerName = window.customerName || function () { return "—"; };
    var deviceName = window.deviceName || function () { return "—"; };
    var addressText = window.addressText || function () { return ""; };

    (arr(K.c) || []).forEach(function (c) {
      var main = c.mainAddress ? addressText(c.mainAddress) : "";
      var extra = c.extraAddress ? addressText(c.extraAddress) : "";
      var hay = norm([c.name, c.phone, main, extra].join(" "));
      if (hay.indexOf(q) === -1) return;
      results.push({
        cat: "customer", icon: "👤",
        title: c.name || "بدون اسم",
        sub: [c.phone, main].filter(Boolean).join(" • "),
        href: "customer.html?id=" + encodeURIComponent(c.id)
      });
    });

    (arr(K.d) || []).forEach(function (d) {
      var cust = customerName(d.customerId);
      var hay = norm([d.type, d.brand, d.model, d.desc, cust].join(" "));
      if (hay.indexOf(q) === -1) return;
      results.push({
        cat: "device", icon: "🔧",
        title: [d.type, d.brand].filter(Boolean).join(" - ") || "جهاز",
        sub: [cust, d.model].filter(Boolean).join(" • "),
        href: "device.html?id=" + encodeURIComponent(d.id)
      });
    });

    (arr(K.r) || []).forEach(function (r) {
      var cust = customerName(r.customerId);
      var dev = deviceName(r.deviceId);
      var hay = norm([r.no, r.fault, r.work, r.status, r.tag, cust, dev].join(" "));
      if (hay.indexOf(q) === -1) return;
      results.push({
        cat: "request", icon: "🛠️",
        title: r.no ? "أمر " + r.no : "أمر شغل",
        sub: [cust, r.fault, r.status].filter(Boolean).join(" • "),
        href: "request.html?id=" + encodeURIComponent(r.id)
      });
    });

    (arr(K.p) || []).forEach(function (p) {
      if (p.archived) return;
      var hay = norm([p.name, p.code, p.category, p.location].join(" "));
      if (hay.indexOf(q) === -1) return;
      results.push({
        cat: "part", icon: "📦",
        title: p.name || "قطعة",
        sub: [p.category, p.location].filter(Boolean).join(" • "),
        href: "part.html?id=" + encodeURIComponent(p.id)
      });
    });

    (arr(K.tasks) || []).forEach(function (t) {
      if (t.deleted) return;
      var hay = norm([t.title, t.note].join(" "));
      if (hay.indexOf(q) === -1) return;
      results.push({
        cat: "task", icon: t.completed ? "✅" : "📋",
        title: t.title || "مهمة",
        sub: t.note || "",
        href: "tasks.html"
      });
    });

    (arr(K.tr) || []).forEach(function (e) {
      if (e.deleted) return;
      var hay = norm([e.reason, e.note, e.category].join(" "));
      if (hay.indexOf(q) === -1) return;
      results.push({
        cat: "treasury", icon: e.type === "in" ? "⬅️💵" : "➡️💵",
        title: e.reason || "حركة خزنة",
        sub: [e.category, e.amount ? (+e.amount).toLocaleString("ar-EG") + " ج" : ""].filter(Boolean).join(" • "),
        href: "treasury.html"
      });
    });

    // الحسابات/المحافظ: حركات K.wtx (وارد/منصرف على أي محفظة أو تصنيف
    // مصروف)، بندوّر في السبب/الملاحظة/التصنيف/اسم المحفظة نفسها.
    (arr(K.wtx) || []).forEach(function (w) {
      if (w.deleted) return;
      var hay = norm([w.reason, w.note, w.category, w.wallet].join(" "));
      if (hay.indexOf(q) === -1) return;
      results.push({
        cat: "wallet", icon: w.type === "in" ? "⬅️💳" : "➡️💳",
        title: w.reason || w.category || "حركة حساب",
        sub: [w.wallet, w.amount ? (+w.amount).toLocaleString("ar-EG") + " ج" : ""].filter(Boolean).join(" • "),
        href: w.wallet ? ("wallet.html?type=wallet&name=" + encodeURIComponent(w.wallet)) : "wallets.html"
      });
    });

    // أكواد أعطال الأجهزة: قسم مرجعي مستقل (مش مربوط بعميل/جهاز/أمر
    // شغل) — بندوّر بالكود والوصف والسبب والحل ونوع الجهاز والماركة.
    (arr(K.fc) || []).forEach(function (f) {
      var hay = norm([f.code, f.title, f.cause, f.fix, f.deviceType, f.brand].join(" "));
      if (hay.indexOf(q) === -1) return;
      results.push({
        cat: "faultcode", icon: "🧯",
        title: (f.code || "") + (f.title ? " — " + f.title : ""),
        sub: [f.deviceType, f.brand].filter(Boolean).join(" • "),
        href: "faultcode.html?id=" + encodeURIComponent(f.id)
      });
    });

    // خط السير: أوامر الشغل اللي ليها موعد زيارة مجدول ولسه نشطة (مش
    // مكتملة/مغلقة/ملغية) — بندوّر باسم العميل/العنوان/المركز/القرية
    // عشان يسهل تلاقي مواعيد يوم أو منطقة معيّنة من نفس البحث الشامل.
    (arr(K.r) || []).forEach(function (r) {
      if (!r.visit || r.closed || r.status === "مكتمل" || r.status === "ملغي") return;
      var cust = customerName(r.customerId);
      var main = "";
      var custRec = (arr(K.c) || []).find(function (c) { return c.id === r.customerId; });
      if (custRec) main = addressText(r.addressKey === "extra" && custRec.extraAddress ? custRec.extraAddress : (custRec.mainAddress || {}));
      var hay = norm([cust, main, r.no].join(" "));
      if (hay.indexOf(q) === -1) return;
      var visitLabel = "";
      try { visitLabel = new Date(r.visit).toLocaleString("ar-EG", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (e) {}
      results.push({
        cat: "route", icon: "🗺️",
        title: cust || "موعد بدون اسم",
        sub: [visitLabel, main].filter(Boolean).join(" • "),
        href: "request.html?id=" + encodeURIComponent(r.id)
      });
    });

    // أكواد الكباسات: قسم مرجعي ثابت (قاعدة موديلات وقدرات)، بيتحمّل
    // بشكل كسول لما المستخدم يفتح البحث الشامل لأول مرة (مش من البداية
    // في كل صفحة) — لو لسه ما اتحمّلش وقت البحث، الدالة دي بترجع نتائج
    // فاضية وهيتم استكمالها لاحقًا في runSearch لما التحميل يخلص.
    if (window.CompressorRef && typeof window.CompressorRef.search === "function" && window.CompressorRef.isReady()) {
      window.CompressorRef.search(q, "").slice(0, 60).forEach(function (item) {
        var rec = item.rec || {};
        var subParts = [];
        if (rec.hp) subParts.push(rec.hp + " HP");
        if (rec.btu != null) subParts.push(rec.btu + " BTU");
        if (rec.refrigerant) subParts.push(rec.refrigerant);
        results.push({
          cat: "compressor", icon: "🧊",
          title: (rec.model || "—") + " — " + item.brand,
          sub: subParts.join(" • "),
          href: "compcodes.html?q=" + encodeURIComponent(rec.model || "") + (item.brand ? "&brand=" + encodeURIComponent(item.brand) : "")
        });
      });
    }

    return results;
  }

  function injectStyles() {
    var style = document.createElement("style");
    style.textContent =
      "#gsBtn{position:fixed;bottom:18px;left:18px;width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#17324d,#245a7a);color:#fff;border:0;font-size:22px;line-height:1;box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:pointer;z-index:9998;display:flex;align-items:center;justify-content:center;padding:0}" +
      "#gsBtn:active{transform:scale(.94)}" +
      "#gsOverlay{position:fixed;inset:0;background:rgba(10,20,32,.78);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:8vh 12px 12px}" +
      "#gsOverlay.hidden{display:none}" +
      "#gsBox{background:var(--bg-elevated,#fff);border-radius:16px;width:100%;max-width:520px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.35)}" +
      "#gsHead{display:flex;gap:8px;align-items:center;padding:12px;border-bottom:1px solid var(--border,#edf0f2);flex:0 0 auto}" +
      "#gsInput{flex:1;border:1px solid var(--border,#d3dae1);border-radius:10px;padding:12px;font:inherit;min-width:0}" +
      "#gsInput:focus{outline:2px solid #245a7a}" +
      "#gsClose{background:var(--bg-sunken,#e9eef3);color:var(--text,#18212b);border:0;border-radius:9px;padding:10px 12px;cursor:pointer;font-weight:bold;font-family:inherit}" +
      "#gsResults{overflow:auto;padding:6px}" +
      ".gs-hint,.gs-empty{padding:26px 14px;text-align:center;color:var(--text-muted,#8a97a3);font-size:13px}" +
      ".gs-group-title{font-size:12px;color:var(--text-muted,#687583);font-weight:bold;padding:10px 10px 4px}" +
      ".gs-item{display:flex;gap:10px;align-items:center;padding:10px;border-radius:10px;text-decoration:none;color:inherit}" +
      ".gs-item:hover{background:var(--bg-sunken,#f2f5f8)}" +
      ".gs-item i{font-style:normal;font-size:19px;width:36px;height:36px;border-radius:10px;background:var(--bg-sunken,#eef3f7);display:flex;align-items:center;justify-content:center;flex:0 0 auto}" +
      ".gs-item div{min-width:0}" +
      ".gs-item b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".gs-item span{display:block;font-size:12px;color:var(--text-muted,#687583);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      "@media(max-width:650px){#gsOverlay{padding:0}#gsBox{max-width:100%;height:100%;max-height:100%;border-radius:0}#gsBtn{left:14px;bottom:14px;width:50px;height:50px;font-size:20px}}";
    document.head.appendChild(style);
  }

  function injectUI() {
    if (document.getElementById("gsBtn")) return;
    injectStyles();

    var btn = document.createElement("button");
    btn.id = "gsBtn";
    btn.type = "button";
    btn.title = "بحث شامل في كل الأقسام";
    btn.setAttribute("aria-label", "بحث شامل");
    btn.innerHTML = "🔍";
    document.body.appendChild(btn);

    var overlay = document.createElement("div");
    overlay.id = "gsOverlay";
    overlay.className = "hidden";
    overlay.innerHTML =
      '<div id="gsBox" role="dialog" aria-modal="true">' +
        '<div id="gsHead">' +
          '<input id="gsInput" placeholder="ابحث عن عميل، جهاز، أمر شغل، قطعة، مهمة، كود كباس..." autocomplete="off">' +
          '<button id="gsClose" type="button">✕</button>' +
        "</div>" +
        '<div id="gsResults"><div class="gs-hint">اكتب أي كلمة تدور عليها في أي قسم بالنظام.</div></div>' +
      "</div>";
    document.body.appendChild(overlay);

    var input = overlay.querySelector("#gsInput");
    var resultsEl = overlay.querySelector("#gsResults");
    var closeBtn = overlay.querySelector("#gsClose");
    var HINT = '<div class="gs-hint">اكتب أي كلمة تدور عليها في أي قسم بالنظام.</div>';

    function openSearch() {
      overlay.classList.remove("hidden");
      setTimeout(function () { input.focus(); }, 30);
      // تحميل قاعدة أكواد الكباسات في الخلفية من أول ما المستخدم يفتح
      // البحث الشامل (مش من تحميل الصفحة) — عشان النتائج تبقى جاهزة
      // غالبًا قبل ما يخلّص الكتابة، من غير ما نحمّل ~11 ألف سجل على كل
      // صفحة من غير داعي لو حد فتح النظام ومستخدمش البحث أصلاً.
      if (window.CompressorRef && typeof window.CompressorRef.ensureAll === "function" && !window.CompressorRef.isReady()) {
        window.CompressorRef.ensureAll().then(function () {
          if (!overlay.classList.contains("hidden") && input.value.trim()) runSearch();
        }).catch(function () {});
      }
    }
    function closeSearch() {
      overlay.classList.add("hidden");
      input.value = "";
      resultsEl.innerHTML = HINT;
    }

    btn.addEventListener("click", openSearch);
    closeBtn.addEventListener("click", closeSearch);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeSearch(); });
    document.addEventListener("keydown", function (e) {
      var isOpen = !overlay.classList.contains("hidden");
      if (e.key === "Escape" && isOpen) { closeSearch(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        isOpen ? closeSearch() : openSearch();
      }
    });

    var debounceTimer = null;
    input.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, 120);
    });

    function runSearch() {
      var raw = input.value.trim();
      var q = raw.toLowerCase();
      if (!q) { resultsEl.innerHTML = HINT; return; }

      var results;
      try { results = buildResults(q); }
      catch (err) { resultsEl.innerHTML = '<div class="gs-empty">تعذّر البحث حاليًا.</div>'; return; }

      if (!results.length) {
        resultsEl.innerHTML = '<div class="gs-empty">مفيش نتائج لـ «' + safeEsc(raw) + '».</div>';
        return;
      }

      var groups = {};
      results.forEach(function (r) { (groups[r.cat] = groups[r.cat] || []).push(r); });

      var html = "";
      CAT_ORDER.forEach(function (cat) {
        var list = groups[cat];
        if (!list || !list.length) return;
        html += '<div class="gs-group-title">' + CAT_LABELS[cat] + " (" + list.length + ")</div>";
        list.slice(0, MAX_PER_GROUP).forEach(function (r) {
          html += '<a class="gs-item" href="' + r.href + '"><i>' + r.icon + "</i><div><b>" +
            safeEsc(r.title) + "</b>" + (r.sub ? "<span>" + safeEsc(r.sub) + "</span>" : "") + "</div></a>";
        });
      });
      resultsEl.innerHTML = html;
    }
  }

  ready(injectUI);
})();
