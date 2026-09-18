/* =========================================================
   الورشة الفنية — واجهة بسيطة وغير مزدحمة
   V11.2.6 — Simple UI layer
   لا تغيّر نموذج البيانات؛ فقط تنظّم العرض والتصفح.
   ========================================================= */
(function () {
  "use strict";

  const state = {
    customers: false,
    devices: false,
    parts: false,
    requests: false,
    requestBucket: "",
    partBucket: "",
    partCategory: "",
    partsStatsPeriod: "30",
    partsViewMode: "cards",
    customerBucket: "",
    deviceBucket: ""
  };

  const $ = (id) => document.getElementById(id);
  const CATEGORY_ICONS = {
    washer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="18" height="20" rx="2"/><circle cx="7" cy="5.3" r="0.6" fill="currentColor" stroke="none"/><circle cx="10" cy="5.3" r="0.6" fill="currentColor" stroke="none"/><circle cx="12" cy="14" r="5.4"/><circle cx="12" cy="14" r="2.5"/></svg>`,
    fridge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="5" y1="8" x2="19" y2="8"/><line x1="16" y1="4" x2="16" y2="6.3"/><line x1="16" y1="10.5" x2="16" y2="13.8"/></svg>`,
    heater: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="5"/><line x1="9.3" y1="7.5" x2="14.7" y2="7.5"/><line x1="9.3" y1="11.5" x2="14.7" y2="11.5"/></svg>`,
    compressor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.6"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/></svg>`,
    ac: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="6" rx="2"/><path d="M8 9h8"/><line x1="5.5" y1="15" x2="5.5" y2="19"/><line x1="12" y1="15" x2="12" y2="20"/><line x1="18.5" y1="15" x2="18.5" y2="19"/></svg>`,
    oven: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><circle cx="8" cy="9" r="1.6"/><circle cx="16" cy="9" r="1.6"/><rect x="6" y="14" width="12" height="4" rx="1"/></svg>`,
    fan: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16l-3 6H7L4 4z"/><line x1="12" y1="10" x2="12" y2="14"/><rect x="9" y="14" width="6" height="7" rx="1"/></svg>`,
    microwave: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><rect x="4" y="7.5" width="12" height="9" rx="1"/><line x1="19" y1="8" x2="19" y2="10"/><circle cx="19" cy="13" r="0.9" fill="currentColor" stroke="none"/></svg>`,
    box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>`
  };
  const categoryIcon = (cat) => {
    const c = String(cat || "");
    if (/غسال/.test(c)) return CATEGORY_ICONS.washer;
    if (/ثلاج|فريزر/.test(c)) return CATEGORY_ICONS.fridge;
    if (/سخان|غلاي/.test(c)) return CATEGORY_ICONS.heater;
    if (/كمبروسر|كمبريسور/.test(c)) return CATEGORY_ICONS.compressor;
    if (/تكييف|مكيف/.test(c)) return CATEGORY_ICONS.ac;
    if (/بوتاجاز|فرن/.test(c)) return CATEGORY_ICONS.oven;
    if (/شفاط/.test(c)) return CATEGORY_ICONS.fan;
    if (/مايكروويف/.test(c)) return CATEGORY_ICONS.microwave;
    return CATEGORY_ICONS.box;
  };
  // rows/save/esc2: كانت بتعيد تعريف نفس منطق القراءة/الكتابة والـ escaping
  // اللي في app.js بالظبط (JSON.parse/localStorage مباشرة). دلوقتي بتنادي
  // على النسخة الموحّدة في shared-data.js (لازم يتحمّل قبل الملف ده).
  const rows = (key) => arr(key);
  const save = (key, value) => put(key, value);
  const esc2 = (v) => esc(v);
  const customerRows = () => rows("wf_c");
  const deviceRows = () => rows("wf_d");
  const requestRows = () => rows("wf_r");
  const partRows = () => rows("wf_p");
  const moveRows = () => rows("wf_m");

  /* حركات "الخروج" بس (استهلاك فعلي من المخزن) — بتُستخدم لحساب "عدد مرات
     استخدام الصنف" في كروت/جدول المخزن. حركات الإرجاع أو التعديل ما بتتحسبش
     كاستخدام. */
  function partOutMoves(pid) {
    return moveRows().filter(m => m.partId === pid && /خروج/.test(m.type || ""));
  }
  function partUsageCount(pid) { return partOutMoves(pid).length; }

  const INVENTORY_PERIOD_LABELS = { "7": "آخر 7 أيام", "30": "آخر 30 يوم", "90": "آخر 90 يوم", all: "كل الوقت" };

  function inventoryStatsRangeStart(period) {
    if (period === "all") return null;
    const days = +period || 30;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1));
    return d;
  }

  function movesInPeriod(period) {
    const start = inventoryStatsRangeStart(period);
    return moveRows().filter(m => {
      if (!start) return true;
      const t = new Date(m.at).getTime();
      return !Number.isNaN(t) && t >= start.getTime();
    });
  }

  /* ترتيب الأصناف الأكثر حركة في فترة معيّنة — بتتحسب هنا عشان تُستخدم في
     كارت الملخص وفي شاشة "الأكثر حركة" الكاملة بنفس المنطق بالظبط. */
  function computeTopMoved(period) {
    const all = partRows().filter(p => !p.archived);
    const usage = {};
    movesInPeriod(period).forEach(m => {
      const e = (usage[m.partId] ||= { qty: 0, count: 0 });
      e.qty += (+m.qty || 0);
      e.count += 1;
    });
    return Object.entries(usage)
      .sort((a, b) => b[1].qty - a[1].qty)
      .map(([pid, u]) => ({ p: all.find(x => x.id === pid) || partRows().find(x => x.id === pid), ...u }));
  }

  window.setInventoryStatsPeriod = function (period) {
    state.partsStatsPeriod = period;
    renderParts();
  };

  window.setInventoryViewMode = function (mode) {
    state.partsViewMode = mode === "table" ? "table" : "cards";
    renderParts();
  };

  function dateKey(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function locationForOrder(r) {
    const c = customerRows().find(x => x.id === r.customerId) || {};
    let a = c.mainAddress || {};
    if (r.addressKey === "extra" && c.extraAddress) a = c.extraAddress;
    return {
      center: a.center || "بدون مركز",
      village: a.village || "بدون قرية",
      street: a.street || ""
    };
  }

  function orderIsCompleted(r) {
    return !!r.closed || r.status === "مكتمل";
  }

  function orderIsToday(r) {
    return !!r.visit && dateKey(r.visit) === todayKey() && !r.closed && r.status !== "ملغي";
  }

  function orderIsWorkshop(r) {
    // ملحوظة: كل مكان بيغيّر workshopStatus (requestWorkshopPull،
    // setWorkshopStatus) بيحدّث executionPlace لـ"الورشة" في نفس اللحظة،
    // فمفيش حالة عملية فيها workshopStatus من غير executionPlace==="الورشة"
    // — الشرط الإضافي القديم كان دايمًا بيرجع نفس نتيجة الشرط الأول.
    return r.executionPlace === "الورشة";
  }

  function orderIsParts(r) {
    return r.partsWaiting === true || r.partsWaiting === "yes";
  }

  function orderIsOverdue(r) {
    return !!r.visit &&
      dateKey(r.visit) < todayKey() &&
      !orderIsCompleted(r) &&
      r.status !== "ملغي" &&
      r.status !== "مجمد";
  }

  function simpleButton(label, icon, action, cls="") {
    return `<button type="button" class="simple-tile ${cls}" data-wf-event="click" data-wf-code="${action}"><span>${icon}</span><b>${label}</b></button>`;
  }

  /* بطاقة موحّدة: الرقم الإحصائي والزرار القابل للضغط في عنصر واحد
     (بدل تكرار نفس البيانات في صندوق أرقام منفصل + زرار فلترة منفصل) */
  function countTile(label, icon, count, action, cls="", note="") {
    return `<button type="button" class="simple-tile count-tile ${cls}" data-wf-event="click" data-wf-code="${action}">
      <span class="tile-icon">${icon}</span>
      <b class="tile-count">${count}</b>
      <small class="tile-label">${label}</small>
      ${note ? `<small class="tile-note">${note}</small>` : ""}
    </button>`;
  }

  function activeOrdersForCustomer(cid) {
    return requestRows().filter(r => r.customerId === cid && !orderIsCompleted(r) && r.status !== "ملغي");
  }

  function activeOrdersForDevice(did) {
    return requestRows().filter(r => r.deviceId === did && !orderIsCompleted(r) && r.status !== "ملغي");
  }

  function hasWorkshopDeviceForCustomer(cid) {
    return deviceRows().some(d => d.customerId === cid && requestRows().some(r =>
      r.deviceId === d.id && orderIsWorkshop(r) && !orderIsCompleted(r)
    ));
  }

  function hasWorkshopDevice(did) {
    return requestRows().some(r => r.deviceId === did && orderIsWorkshop(r) && !orderIsCompleted(r));
  }

  function customerCityGroup(c) {
    const a = c.mainAddress || {};
    return (typeof villageGroupOf === "function" ? villageGroupOf(a.center || "", a.village || "") : "village") === "city" ? "city" : "village";
  }

  function customerHasUnpaid(cid) {
    return requestRows().some(r => r.customerId === cid && !r.closed && Math.max(0, (+r.total || 0) - (+r.deposit || 0)) > 0);
  }

  function lastOrderTime(list) {
    const dates = list.map(r => new Date(r.closedAt || r.visit || r.createdAt || 0).getTime()).filter(t => !Number.isNaN(t) && t > 0);
    return dates.length ? Math.max(...dates) : null;
  }

  const STALE_DAYS = 60;

  function customerIsStale(c) {
    const orders = requestRows().filter(r => r.customerId === c.id);
    if (!orders.length) return false;
    const active = orders.some(r => !orderIsCompleted(r) && r.status !== "ملغي");
    if (active) return false;
    const last = lastOrderTime(orders);
    if (last === null) return false;
    return (Date.now() - last) / 86400000 >= STALE_DAYS;
  }

  function deviceIsRecurring(d) {
    return requestRows().filter(r => r.deviceId === d.id).length >= 2;
  }

  function deviceIsStale(d) {
    const orders = requestRows().filter(r => r.deviceId === d.id);
    if (!orders.length) return false;
    const active = orders.some(r => !orderIsCompleted(r) && r.status !== "ملغي");
    if (active) return false;
    const last = lastOrderTime(orders);
    if (last === null) return false;
    return (Date.now() - last) / 86400000 >= STALE_DAYS;
  }

  function customerRemainingTotal(cid) {
    return requestRows().filter(r => r.customerId === cid && !r.closed)
      .reduce((a, r) => a + Math.max(0, (+r.total || 0) - (+r.deposit || 0)), 0);
  }

  function customerLastContactDate(cid) {
    const orders = requestRows().filter(r => r.customerId === cid);
    const t = lastOrderTime(orders);
    return t === null ? null : new Date(t);
  }

  /* ---------- العملاء ---------- */
  window.showAllCustomers = function () {
    state.customers = true;
    $("customerSearch")?.classList.remove("hidden");
    renderCustomers();
  };

  window.hideAllCustomers = function () {
    state.customers = false;
    if ($("customerSearch")) $("customerSearch").classList.add("hidden");
    renderCustomers();
  };

  window.showCustomerBucket = function (bucket) {
    state.customers = true;
    $("customerSearch")?.classList.remove("hidden");
    state.customerBucket = bucket;
    renderCustomers();
  };

  function customerBucketMatch(c, bucket) {
    const orders = requestRows().filter(r => r.customerId === c.id);
    const active = orders.some(r => !orderIsCompleted(r) && r.status !== "ملغي");
    const workshop = hasWorkshopDeviceForCustomer(c.id);
    if (bucket === "active") return active;
    if (bucket === "workshop") return workshop;
    if (bucket === "completed") return orders.length > 0 && !active && orders.some(r => orderIsCompleted(r));
    if (bucket === "none") return orders.length === 0;
    if (bucket === "city") return customerCityGroup(c) === "city";
    if (bucket === "village") return customerCityGroup(c) === "village";
    if (bucket === "stale") return customerIsStale(c);
    if (bucket === "unpaid") return customerHasUnpaid(c.id);
    return true;
  }

  defineOverride("renderCustomers", "workshop-mini-simple-ui.js", function () {
    const el = $("customerList");
    if (!el) return;
    const all = customerRows();

    if (!state.customers) {
      const cnt = (b) => all.filter(c => customerBucketMatch(c, b)).length;
      const unpaidCount = cnt("unpaid");
      el.innerHTML = `
        <section class="simple-home ps-context-target" data-ps-title="ملخص العملاء">
          <div class="simple-summary-title"><b>👤 العملاء</b><span>${all.length} إجمالي ${psActions("ملخص العملاء")}</span></div>
          ${unpaidCount > 0
            ? `<div class="simple-line-bar simple-line-warn" data-wf-event="click" data-wf-code="showCustomerBucket('unpaid')" role="button" tabindex="0"><span>💰 ${unpaidCount} عميل عليه متبقي غير محصل</span><b>عرض ›</b></div>`
            : `<div class="simple-line-bar simple-line-ok"><span>✅ لا يوجد عملاء عليهم متبقي غير محصل حاليًا</span></div>`}
          <div class="bucket-group-label">حسب الحالة</div>
          <div class="simple-stat-grid">
            ${simpleButton(`عليه أمر مفتوح (${cnt("active")})`, "🛠️", "showCustomerBucket('active')", "")}
            ${simpleButton(`جهاز في الورشة (${cnt("workshop")})`, "🏭", "showCustomerBucket('workshop')", "")}
            ${simpleButton(`كل أوامره مكتملة (${cnt("completed")})`, "✅", "showCustomerBucket('completed')", "")}
            ${simpleButton(`بدون أي أمر (${cnt("none")})`, "🆕", "showCustomerBucket('none')", "")}
          </div>
          <div class="bucket-group-label">حسب المنطقة</div>
          <div class="simple-stat-grid">
            ${simpleButton(`عملاء المدن (${cnt("city")})`, "🏙️", "showCustomerBucket('city')", "")}
            ${simpleButton(`عملاء القرى (${cnt("village")})`, "🌾", "showCustomerBucket('village')", "")}
          </div>
          <div class="bucket-group-label">متابعة</div>
          <div class="simple-stat-grid">
            ${simpleButton(`لم يتردد من فترة (${cnt("stale")})`, "⏳", "showCustomerBucket('stale')", "")}
            ${simpleButton(`متبقي غير محصل (${cnt("unpaid")})`, "💰", "showCustomerBucket('unpaid')", "")}
          </div>
          <div class="bucket-group-label">عرض الكل</div>
          <div class="simple-stat-grid">
            ${simpleButton("كل العملاء", "👥", "showAllCustomers()", "primary-tile")}
          </div>
        </section>`;
      return;
    }

    const q = ($("customerSearch")?.value || "").toLowerCase().trim();
    const bucket = state.customerBucket || "";
    const filtered = all.filter(c => {
      if (bucket && !customerBucketMatch(c, bucket)) return false;
      const text = [c.name, c.phone, c.phone2, c.nickname,
        addressText(c.mainAddress || {}), addressText(c.extraAddress || {})]
        .filter(Boolean).join(" ").toLowerCase();
      return !q || text.includes(q);
    });
    const sortKey = $("customerSortSelect")?.value || "newest";
    const byCreated = c => new Date(c.createdAt || 0).getTime() || 0;
    if (sortKey === "newest") filtered.sort((a, b) => byCreated(b) - byCreated(a));
    else if (sortKey === "oldest") filtered.sort((a, b) => byCreated(a) - byCreated(b));
    else if (sortKey === "name") filtered.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar"));
    const title = {
      active: "عليه أمر مفتوح حاليًا", workshop: "لديه جهاز في الورشة", completed: "كل أوامره مكتملة",
      none: "بدون أي أمر شغل", city: "🏙️ عملاء المدن", village: "🌾 عملاء القرى",
      stale: "⏳ لم يتردد من فترة", unpaid: "💰 عليه متبقي غير محصل"
    }[bucket] || "كل العملاء";
    const deviceCountByCustomer = new Map();
    for (const d of deviceRows()) deviceCountByCustomer.set(d.customerId, (deviceCountByCustomer.get(d.customerId) || 0) + 1);
    const requestCountByCustomer = new Map();
    for (const r of requestRows()) requestCountByCustomer.set(r.customerId, (requestCountByCustomer.get(r.customerId) || 0) + 1);
    const sortSelectHtml = `<select id="customerSortSelect" data-wf-event="change" data-wf-code="renderCustomers()">
      <option value="newest" ${sortKey === "newest" ? "selected" : ""}>الأحدث أولًا</option>
      <option value="oldest" ${sortKey === "oldest" ? "selected" : ""}>الأقدم أولًا</option>
      <option value="name" ${sortKey === "name" ? "selected" : ""}>الاسم أبجديًا</option>
    </select>`;
    el.innerHTML = `
      <div class="simple-list-head"><b>${title}</b><div class="simple-list-head-actions">${sortSelectHtml}<button type="button" class="secondary small-btn" data-wf-event="click" data-wf-code="hideAllCustomers()">رجوع للملخص</button></div></div>
      ${filtered.length ? filtered.map(c => {
        const ds = deviceCountByCustomer.get(c.id) || 0;
        const rs = requestCountByCustomer.get(c.id) || 0;
        const ao = activeOrdersForCustomer(c.id);
        const hw = hasWorkshopDeviceForCustomer(c.id);
        const lastDate = customerLastContactDate(c.id);
        const remain = customerRemainingTotal(c.id);
        const age = worstRequestAgeInfo(ao);
        return `<div class="simple-record${age ? " " + age.cls : ""}"><div class="simple-record-icon">👤</div><div class="simple-record-main">
          <a href="customer.html?id=${c.id}"><b>${esc2(c.name)}</b></a><span>${c.phone?`<a class="tel-link" href="tel:${esc2(c.phone)}" target="_blank" rel="noopener" data-wf-event="click" data-wf-code="event.stopPropagation()">📞 ${esc2(c.phone)}</a>`:"📞 —"}</span>
          <small>📍 ${esc2(addressText(c.mainAddress || {}) || "بدون عنوان")}</small>
          <small>🔧 ${ds} أجهزة • 🛠️ ${rs} أوامر${ao.length ? ` • 🔴 ${ao.length} فعال` : ""}${hw ? " • 🏭 جهاز في الورشة" : ""}</small>
          <small>${lastDate ? `📅 آخر تعامل: ${lastDate.toLocaleDateString("ar-EG",{day:"2-digit",month:"2-digit",year:"2-digit"})}` : "📅 بدون تعامل سابق"}${remain > 0 ? ` • 💰 متبقي ${remain.toFixed(2)} ج` : ""}${age ? ` • <span class="age-badge ${age.cls}" title="⏱️ أقدم أمر مفتوح: ${esc2(age.range)}">${age.dot} ${esc2(age.label)}</span>` : ""}</small>
        </div><div class="simple-record-actions"><a class="secondary small-btn" href="customer.html?id=${c.id}">فتح</a><button class="danger-btn small-btn" data-wf-event="click" data-wf-code="deleteCustomerRecord('${c.id}')">حذف</button></div></div>`;
      }).join("") : `<div class="item">لا توجد نتائج.</div>`}`;
  });

  /* ---------- الأجهزة ---------- */
  window.showAllDevices = function () {
    state.devices = true; state.deviceBucket = "";
    $("deviceSearch")?.classList.remove("hidden"); renderDevices();
  };

  window.hideAllDevices = function () {
    state.devices = false; state.deviceBucket = "";
    if ($("deviceSearch")) $("deviceSearch").classList.add("hidden"); renderDevices();
  };

  window.showDeviceBucket = function (bucket) {
    state.devices = true; state.deviceBucket = bucket;
    $("deviceSearch")?.classList.remove("hidden"); renderDevices();
  };

  function deviceBucketMatch(d, bucket) {
    const orders = requestRows().filter(r => r.deviceId === d.id);
    const active = orders.some(r => !orderIsCompleted(r) && r.status !== "ملغي");
    const workshop = hasWorkshopDevice(d.id);
    if (bucket === "active") return active;
    if (bucket === "workshop") return workshop;
    if (bucket === "completed") return orders.length > 0 && !active && orders.some(r => orderIsCompleted(r));
    if (bucket === "none") return orders.length === 0;
    if (bucket === "recurring") return deviceIsRecurring(d);
    if (bucket === "stale") return deviceIsStale(d);
    if (bucket.indexOf("type:") === 0) return (d.type || "") === bucket.slice(5);
    return true;
  }

  defineOverride("renderDevices", "workshop-mini-simple-ui.js", function () {
    const el = $("deviceList");
    if (!el) return;
    const all = deviceRows();
    if (!state.devices) {
      const cnt = (b) => all.filter(d => deviceBucketMatch(d, b)).length;
      const types = [...new Set(all.map(d => d.type).filter(Boolean))];
      const recurringCount = cnt("recurring");
      el.innerHTML = `<section class="simple-home ps-context-target" data-ps-title="ملخص الأجهزة"><div class="simple-summary-title"><b>🔧 الأجهزة</b><span>${all.length} إجمالي ${psActions("ملخص الأجهزة")}</span></div>
        ${recurringCount > 0
          ? `<div class="simple-line-bar simple-line-warn" data-wf-event="click" data-wf-code="showDeviceBucket('recurring')" role="button" tabindex="0"><span>🔁 ${recurringCount} جهاز يتكرر عطله</span><b>عرض ›</b></div>`
          : `<div class="simple-line-bar simple-line-ok"><span>✅ لا توجد أجهزة متكررة العطل حاليًا</span></div>`}
        <div class="bucket-group-label">حسب الحالة</div>
        <div class="simple-stat-grid">
          ${simpleButton(`عليه أمر مفتوح (${cnt("active")})`, "🛠️", "showDeviceBucket('active')", "")}
          ${simpleButton(`موجود في الورشة (${cnt("workshop")})`, "🏭", "showDeviceBucket('workshop')", "")}
          ${simpleButton(`كل أوامره مكتملة (${cnt("completed")})`, "✅", "showDeviceBucket('completed')", "")}
          ${simpleButton(`بدون أي أمر (${cnt("none")})`, "🆕", "showDeviceBucket('none')", "")}
        </div>
        <div class="bucket-group-label">متابعة</div>
        <div class="simple-stat-grid">
          ${simpleButton(`متكرر الأعطال (${cnt("recurring")})`, "🔁", "showDeviceBucket('recurring')", "")}
          ${simpleButton(`لم يتردد جهازه من فترة (${cnt("stale")})`, "⏳", "showDeviceBucket('stale')", "")}
        </div>
        ${types.length ? `<div class="bucket-group-label">حسب النوع</div>
        <div class="simple-stat-grid">
          ${types.map(t => simpleButton(`${esc2(t)} (${cnt("type:"+t)})`, categoryIcon(t), `showDeviceBucket('type:${esc2(t)}')`, "")).join("")}
        </div>` : ""}
        <div class="bucket-group-label">عرض الكل</div>
        <div class="simple-stat-grid">${simpleButton("كل الأجهزة", "🔧", "showAllDevices()", "primary-tile")}</div></section>`;
      return;
    }
    const q = ($("deviceSearch")?.value || "").toLowerCase().trim();
    const bucket = state.deviceBucket || "";
    const customerById = new Map(customerRows().map(c => [c.id, c]));
    const filtered = all.filter(d => {
      if (bucket && !deviceBucketMatch(d, bucket)) return false;
      const c = customerById.get(d.customerId) || {};
      const text = [c.name,c.phone,d.type,d.category,d.brand,d.model,d.desc,addressText(c.mainAddress||{}),addressText(c.extraAddress||{})].filter(Boolean).join(" ").toLowerCase();
      return !q || text.includes(q);
    });
    const sortKey = $("deviceSortSelect")?.value || "newest";
    const byCreated = d => new Date(d.createdAt || 0).getTime() || 0;
    if (sortKey === "newest") filtered.sort((a, b) => byCreated(b) - byCreated(a));
    else if (sortKey === "oldest") filtered.sort((a, b) => byCreated(a) - byCreated(b));
    else if (sortKey === "type") filtered.sort((a, b) => String(a.type || "").localeCompare(String(b.type || ""), "ar"));
    const title = bucket.indexOf("type:") === 0 ? `📦 ${bucket.slice(5)}` :
      ({active:"عليه أمر مفتوح حاليًا", workshop:"موجود في الورشة", completed:"كل أوامره مكتملة", none:"بدون أي أمر شغل", recurring:"🔁 متكرر الأعطال", stale:"⏳ لم يتردد جهازه من فترة"}[bucket] || "كل الأجهزة");
    const sortSelectHtml = `<select id="deviceSortSelect" data-wf-event="change" data-wf-code="renderDevices()">
      <option value="newest" ${sortKey === "newest" ? "selected" : ""}>الأحدث أولًا</option>
      <option value="oldest" ${sortKey === "oldest" ? "selected" : ""}>الأقدم أولًا</option>
      <option value="type" ${sortKey === "type" ? "selected" : ""}>النوع أبجديًا</option>
    </select>`;
    el.innerHTML = `<div class="simple-list-head"><b>${title}</b><div class="simple-list-head-actions">${sortSelectHtml}<button type="button" class="secondary small-btn" data-wf-event="click" data-wf-code="hideAllDevices()">رجوع للملخص</button></div></div>
      ${filtered.length ? filtered.map(d => {
        const ao = activeOrdersForDevice(d.id); const age = worstRequestAgeInfo(ao);
        const cust = customerById.get(d.customerId) || {};
        const latest = ao.length ? ao.slice().sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0))[0] : null;
        return `<div class="simple-record${age ? " " + age.cls : ""}"><div class="simple-record-icon">🔧</div><div class="simple-record-main"><a href="device.html?id=${d.id}"><b>${esc2(d.type)} — ${esc2(d.brand)}</b></a><span>${esc2(d.category||"—")} • ${esc2(d.model||"بدون موديل")}</span><small>👤 ${esc2(customerName(d.customerId))}</small>${cust.phone ? `<small>${`<a class="tel-link" href="tel:${esc2(cust.phone)}" target="_blank" rel="noopener">📞 ${esc2(cust.phone)}</a>`}</small>` : ""}<small>${ao.length ? `🔴 ${ao.length} أمر فعال${latest ? ` (${esc2(latest.status)}${latest.fault ? ` — ${esc2(latest.fault)}` : ""})` : ""}` : "لا يوجد أمر فعال"}${hasWorkshopDevice(d.id) ? " • 🏭 في الورشة" : ""}${age ? ` • <span class="age-badge ${age.cls}" title="⏱️ أقدم أمر مفتوح: ${esc2(age.range)}">${age.dot} ${esc2(age.label)}</span>` : ""}</small></div><div class="simple-record-actions"><a class="secondary small-btn" href="device.html?id=${d.id}">فتح</a><button class="danger-btn small-btn" data-wf-event="click" data-wf-code="deleteDeviceRecord('${d.id}')">حذف</button></div></div>`;
      }).join("") : `<div class="item">لا توجد نتائج.</div>`}`;
  });

  /* ---------- المخزن ---------- */
  window.showAllParts = function () {
    state.parts = true;
    state.partBucket = "";
    state.partCategory = "";
    $("partSearch")?.classList.remove("hidden");
    renderParts();
  };

  window.showLowStockParts = function () {
    state.parts = true;
    state.partBucket = "low";
    state.partCategory = "";
    $("partSearch")?.classList.add("hidden");
    renderParts();
  };

  window.showTopMovedParts = function () {
    state.parts = true;
    state.partBucket = "topmoved";
    state.partCategory = "";
    $("partSearch")?.classList.add("hidden");
    renderParts();
  };

  window.scrollToInventorySection = function (id) {
    $(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.showPartsCategory = function (cat) {
    state.parts = true;
    state.partBucket = "";
    state.partCategory = cat;
    $("partSearch")?.classList.add("hidden");
    renderParts();
  };

  window.showPartsValueBreakdown = function (mode) {
    state.parts = true;
    state.partBucket = "value";
    state.partValueMode = mode === "use" ? "use" : "buy";
    state.partCategory = "";
    $("partSearch")?.classList.remove("hidden");
    renderParts();
  };

  window.hideAllParts = function () {
    state.parts = false;
    state.partBucket = "";
    state.partCategory = "";
    if ($("partSearch")) $("partSearch").classList.add("hidden");
    renderParts();
  };

  /* النسخة دي بتستبدل نسخة app-parts.js الأساسية على نفس الصفحات. أي تعديل
     في بيانات القطعة المعروضة لازم يترجم للنسختين. */
  window.renderParts = function () {
    const el = $("partList");
    if (!el) return;
    const all = partRows().filter(p => !p.archived);

    if (!state.parts) {
      const period = state.partsStatsPeriod || "30";
      const cats = {};
      all.forEach(p => {
        const key = p.category || "أخرى";
        cats[key] = (cats[key] || 0) + 1;
      });
      const lowParts = all.filter(p => (+p.qty || 0) <= (+p.min || 0))
        .slice().sort((a, b) => ((+a.qty || 0) - (+a.min || 0)) - ((+b.qty || 0) - (+b.min || 0)));
      const low = lowParts.length;
      const stockValueBuy = all.reduce((a, p) => a + (+p.qty || 0) * (+p.buy || 0), 0);
      const stockValueUse = all.reduce((a, p) => a + (+p.qty || 0) * (+p.use || 0), 0);

      const periodMoves = movesInPeriod(period);
      const topMoved = computeTopMoved(period);

      const periodLabel = INVENTORY_PERIOD_LABELS[period] || INVENTORY_PERIOD_LABELS["30"];
      const periodButtons = ["7", "30", "90", "all"].map(p =>
        `<button type="button" class="secondary small-btn ${period === p ? "active-track" : ""}" data-wf-event="click" data-wf-code="setInventoryStatsPeriod('${p}')">${INVENTORY_PERIOD_LABELS[p]}</button>`
      ).join("");

      const cards = Object.entries(cats).slice(0, 6).map(([k,n]) =>
        `<div class="simple-stat ${categoryColorClass(k)}" data-wf-event="click" data-wf-code="showPartsCategory('${k.replace(/'/g,"\\'")}')" role="button" tabindex="0"><span>${categoryIcon(k)}</span><b>${esc2(k)}</b><strong>${n}</strong><small>قطعة</small></div>`
      ).join("");

      el.innerHTML = `
        <section class="simple-home ps-context-target" data-ps-title="ملخص المخزن">
          <div class="simple-summary-title"><b>📦 المخزن</b><span>${all.length} صنف ${psActions("ملخص المخزن")}</span></div>
          <div class="report-cards report-cards-summary">
            <div class="report-card report-card-btn report-card-value" data-wf-event="click" data-wf-code="showPartsValueBreakdown('buy')" role="button" tabindex="0"><span>💰 قيمة المخزون بالتكلفة</span><b>${stockValueBuy.toFixed(2)} ج</b></div>
            <div class="report-card report-card-btn report-card-value" data-wf-event="click" data-wf-code="showPartsValueBreakdown('use')" role="button" tabindex="0"><span>💵 قيمة المخزون ببيع الاستخدام</span><b>${stockValueUse.toFixed(2)} ج</b></div>
            <div class="report-card report-card-btn" data-wf-event="click" data-wf-code="showAllParts()" role="button" tabindex="0"><span>📦 إجمالي الأصناف</span><b>${all.length}</b></div>
            <div class="report-card report-card-btn ${low > 0 ? "report-card-warn" : ""}" data-wf-event="click" data-wf-code="showLowStockParts()" role="button" tabindex="0"><span>⚠️ أصناف منخفضة</span><b>${low}</b></div>
            <div class="report-card report-card-btn" data-wf-event="click" data-wf-code="scrollToInventorySection('categoryGrid')" role="button" tabindex="0"><span>🗂️ التصنيفات</span><b>${Object.keys(cats).length}</b></div>
            <div class="report-card report-card-btn" data-wf-event="click" data-wf-code="showTopMovedParts()" role="button" tabindex="0"><span>🔄 حركات ${esc2(periodLabel)}</span><b>${periodMoves.length}</b></div>
          </div>
          <div class="bucket-group-label">فترة إحصائية الحركة</div>
          <div class="report-mode-toggle">${periodButtons}</div>
          <div class="simple-line-bar" data-wf-event="click" data-wf-code="showTopMovedParts()" role="button" tabindex="0"><span>🔥 الأكثر حركة ${esc2(periodLabel)}</span><b>${topMoved.length} صنف ›</b></div>
          ${low > 0
            ? `<div class="simple-line-bar simple-line-warn" data-wf-event="click" data-wf-code="showLowStockParts()" role="button" tabindex="0"><span>⚠️ ${low} أصناف عند الحد الأدنى أو أقل</span><b>عرض ›</b></div>`
            : `<div class="simple-line-bar simple-line-ok"><span>✅ لا توجد أصناف منخفضة حاليًا</span></div>`}
          ${cards ? `<div class="bucket-group-label">حسب التصنيف</div><div id="categoryGrid" class="simple-stat-grid">${cards}</div>` : `<div class="simple-empty">لا توجد قطع مسجلة.</div>`}
          <div class="bucket-group-label">عرض الكل</div>
          <div class="simple-stat-grid">
            ${simpleButton("كل القطع","📦","showAllParts()","primary-tile")}
          </div>
        </section>`;
      return;
    }

    const q = ($("partSearch")?.value || "").toLowerCase().trim();
    const bucket = state.partBucket;
    const cat = state.partCategory;
    const valueMode = state.partValueMode === "use" ? "use" : "buy";
    const period = state.partsStatsPeriod || "30";
    const topMovedData = bucket === "topmoved" ? computeTopMoved(period) : null;
    const topMovedIds = topMovedData ? new Set(topMovedData.filter(u => u.p?.id).map(u => u.p.id)) : null;
    let filtered = all.filter(p => {
      const ok = [p.name,p.code,p.location,p.category].filter(Boolean).join(" ").toLowerCase().includes(q);
      if (bucket === "low" && (+p.qty || 0) > (+p.min || 0)) return false;
      if (bucket === "topmoved" && !topMovedIds.has(p.id)) return false;
      if (cat && (p.category || "أخرى") !== cat) return false;
      return ok;
    });
    if (bucket === "value") {
      filtered = filtered.slice().sort((a, b) => ((+b.qty||0)*(+b[valueMode]||0)) - ((+a.qty||0)*(+a[valueMode]||0)));
    }
    if (bucket === "topmoved") {
      const orderIndex = {};
      topMovedData.forEach((u, i) => { if (u.p?.id) orderIndex[u.p.id] = i; });
      filtered = filtered.slice().sort((a, b) => (orderIndex[a.id] ?? 999) - (orderIndex[b.id] ?? 999));
    }

    const listTitle = bucket === "low" ? "أصناف عند الحد الأدنى أو أقل" : bucket === "value" ? `قيمة المخزون ${valueMode === "use" ? "ببيع الاستخدام" : "بالتكلفة"} — ${filtered.reduce((a,p)=>a+(+p.qty||0)*(+p[valueMode]||0),0).toFixed(2)} ج` : bucket === "topmoved" ? `🔥 الأكثر حركة ${esc2(INVENTORY_PERIOD_LABELS[period] || INVENTORY_PERIOD_LABELS["30"])}` : cat ? esc2(cat) : "كل القطع";

    const viewMode = state.partsViewMode === "table" ? "table" : "cards";
    const toggleBtn = `<button type="button" class="secondary small-btn" data-wf-event="click" data-wf-code="setInventoryViewMode('${viewMode === "table" ? "cards" : "table"}')">${viewMode === "table" ? "🗂️ عرض كبطاقات" : "📊 عرض كجدول"}</button>`;

    let bodyHtml;
    if (!filtered.length) {
      bodyHtml = `<div class="item">لا توجد نتائج.</div>`;
    } else if (viewMode === "table") {
      bodyHtml = `<div class="report-table-wrap"><table class="report-table-full">
        <tr><th>الصنف</th><th>الكمية</th><th>سعر الاستخدام</th><th>الإجمالي</th><th>مرات الاستخدام</th><th>الحالة</th></tr>
        ${filtered.map(p => {
          const qty = +p.qty || 0, use = +p.use || 0, total = qty * use;
          const isLow = qty <= (+p.min || 0);
          return `<tr class="report-row-clickable" data-wf-event="click" data-wf-code="location.href='part.html?id=${p.id}'">
            <td><a href="part.html?id=${p.id}">${esc2(p.name)}</a><br><small style="color:var(--text-muted)"><span class="cat-dot ${categoryColorClass(p.category)}"></span>${esc2(p.category || "—")} • ${esc2(p.code || "بدون كود")}</small></td>
            <td>${qty}</td>
            <td>${use.toFixed(2)} ج</td>
            <td>${total.toFixed(2)} ج</td>
            <td>${partUsageCount(p.id)}</td>
            <td>${isLow ? '<span class="badge">⚠️ منخفض</span>' : "✅"}</td>
          </tr>`;
        }).join("")}
      </table></div>`;
    } else {
      bodyHtml = filtered.map(p => {
        const qty = +p.qty || 0, use = +p.use || 0, buy = +p.buy || 0;
        const itemTotal = qty * use;
        const pct = use > 0 ? ((use - buy) / use * 100) : 0;
        return `
        <div class="simple-record ${categoryColorClass(p.category)}">
          <div class="simple-record-icon ${categoryColorClass(p.category)}">${categoryIcon(p.category)}</div>
          <div class="simple-record-main">
            <a href="part.html?id=${p.id}"><b>${esc2(p.name)}</b></a>
            <span><span class="badge cat-badge ${categoryColorClass(p.category)}">${esc2(p.category || "—")}</span> • ${esc2(p.code || "بدون كود")}</span>
            <small>📍 ${esc2(p.location || "—")} • شراء ${buy.toFixed(2)} ج • استخدام ${use.toFixed(2)} ج • 📈 ${pct.toFixed(1)}%${bucket === "value" ? ` • قيمة (${valueMode === "use" ? "استخدام" : "تكلفة"}): ${((+p.qty||0)*(+p[valueMode]||0)).toFixed(2)} ج` : ""}</small>
            <small>💰 إجمالي الصنف: ${itemTotal.toFixed(2)} ج • 🔁 استُخدم ${partUsageCount(p.id)} مرة</small>
          </div>
          <span class="simple-qty ${qty <= (+p.min||0) ? "low" : ""}">${qty}</span>
          <div class="simple-record-actions"><a class="secondary small-btn" href="part.html?id=${p.id}">فتح</a><button type="button" class="danger-btn small-btn" data-wf-event="click" data-wf-code="deletePartRecord('${p.id}')">🗑️ حذف</button></div>
        </div>`;
      }).join("");
    }

    el.innerHTML = `
      <div class="simple-list-head">
        <b>${listTitle}</b>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${toggleBtn}
          <button type="button" class="secondary small-btn" data-wf-event="click" data-wf-code="hideAllParts()">رجوع للملخص</button>
        </div>
      </div>
      ${bodyHtml}`;
  };

  /* ---------- أوامر الشغل ---------- */
  window.showAllRequests = function () {
    state.requests = true;
    state.requestBucket = "";
    state.requestStatus = "";
    state.requestLocation = "";
    $("requestSearch")?.classList.remove("hidden");
    renderRequests();
  };

  window.showRequestBucket = function (bucket) {
    state.requests = true;
    state.requestBucket = bucket;
    state.requestStatus = "";
    state.requestLocation = "";
    $("requestSearch")?.classList.remove("hidden");
    renderRequests();
  };

  window.showRequestByStatus = function (status) {
    state.requests = true;
    state.requestBucket = "";
    state.requestStatus = status;
    state.requestLocation = "";
    $("requestSearch")?.classList.remove("hidden");
    renderRequests();
  };

  window.showRequestByLocation = function (loc) {
    state.requests = true;
    state.requestBucket = "";
    state.requestStatus = "";
    state.requestLocation = loc;
    $("requestSearch")?.classList.remove("hidden");
    renderRequests();
  };

  window.hideAllRequests = function () {
    state.requests = false;
    state.requestBucket = "";
    state.requestStatus = "";
    state.requestLocation = "";
    $("requestSearch")?.classList.add("hidden");
    renderRequests();
  };

  function bucketFilter(r, b) {
    if (!b) return true;
    if (b.indexOf("tag:") === 0) { const t = b.slice(4); return t ? r.tag === t : !r.tag; }
    if (b === "today") return orderIsToday(r);
    if (b === "workshop") return orderIsWorkshop(r);
    if (b === "completed") return orderIsCompleted(r);
    if (b === "parts") return orderIsParts(r);
    if (b === "overdue") return orderIsOverdue(r);
    if (b === "stale") return typeof requestIsStale === "function" && requestIsStale(r);
    if (b === "open" || b === "unfinished" || b === "needed") return r.status !== "مكتمل" && r.status !== "ملغي" && !r.closed;
    if (b === "new") return r.status === "جديد";
    if (b === "active") return r.status === "جاري التنفيذ";
    if (b === "cancelled") return r.status === "ملغي";
    if (b === "unpaid") return !r.closed && Math.max(0, (+r.total || 0) - (+r.deposit || 0)) > 0;
    return true;
  }

  function orderTagList() {
    return (typeof settings === "function" ? (settings().orderTags || []) : []);
  }

  function tagSummaryHtml(all) {
    const tags = orderTagList();
    if (!tags.length) return "";
    const chips = tags.map(t =>
      simpleButton(t, "🏷️", `showRequestBucket('tag:${t.replace(/'/g, "\\'")}')`)
    ).join("");
    return `<div class="simple-summary-title"><b>🏷️ حسب التصنيف اليدوي</b></div>
      <div class="simple-order-grid">${chips}${simpleButton("بدون تصنيف", "➖", "showRequestBucket('tag:')")}</div>`;
  }

  function orderLocationLabel(r) {
    const x = locationForOrder(r);
    return `${x.center}${x.village && x.village !== "بدون قرية" ? " • " + x.village : ""}`;
  }

  function renderRequestSummary() {
    const el = $("requestList");
    if (!el) return;
    const all = requestRows();
    const open = all.filter(r => r.status !== "مكتمل" && r.status !== "ملغي" && !r.closed);
    const counts = {
      all: all.length,
      open: open.length,
      newOrders: all.filter(r => r.status === "جديد").length,
      active: all.filter(r => r.status === "جاري التنفيذ").length,
      completed: all.filter(orderIsCompleted).length,
      cancelled: all.filter(r => r.status === "ملغي").length,
      frozen: all.filter(r => r.status === "مجمد").length,
      workshop: all.filter(orderIsWorkshop).length,
      parts: all.filter(orderIsParts).length,
      overdue: all.filter(orderIsOverdue).length,
      today: all.filter(orderIsToday).length
    };
    const completedTimed = all.filter(r => orderIsCompleted(r) && requestTotalCompletionMs(r)!==null);
    const avgAll = completedTimed.length ? completedTimed.reduce((a,r)=>a+requestTotalCompletionMs(r),0)/completedTimed.length : null;
    const workshopTimed = all.filter(r => orderIsCompleted(r) && orderIsWorkshop(r) && requestWorkshopExecutionMs(r)!==null);
    const avgWorkshop = workshopTimed.length ? workshopTimed.reduce((a,r)=>a+requestWorkshopExecutionMs(r),0)/workshopTimed.length : null;

    el.innerHTML = `
      <section class="simple-home request-simple-home ps-context-target" data-ps-title="ملخص أوامر الشغل">
        <div class="simple-summary-title"><b>🛠️ أوامر الشغل</b><span>${all.length} إجمالي ${psActions("ملخص أوامر الشغل")}</span></div>
        ${counts.overdue > 0
          ? `<div class="simple-line-bar simple-line-warn" data-wf-event="click" data-wf-code="showRequestBucket('overdue')" role="button" tabindex="0"><span>⚠️ ${counts.overdue} أمر متأخر عن موعده</span><b>عرض ›</b></div>`
          : `<div class="simple-line-bar simple-line-ok"><span>✅ لا توجد أوامر متأخرة حاليًا</span></div>`}
        <div class="simple-order-grid">
          ${countTile("المطلوب الآن","🎯",counts.open,"showRequestBucket('needed')","primary-tile")}
          ${countTile("الجديد","🆕",counts.newOrders,"showRequestByStatus('جديد')")}
          ${countTile("جاري التنفيذ","🔧",counts.active,"showRequestByStatus('جاري التنفيذ')")}
          ${counts.frozen>0?countTile("مجمّد","❄️",counts.frozen,"showRequestByStatus('مجمد')"):""}
          ${countTile("متأخر","⚠️",counts.overdue,"showRequestBucket('overdue')")}
          ${countTile("الورشة","🏭",counts.workshop,"showRequestByLocation('workshop')","",avgWorkshop!==null?`⏱️ متوسط ${formatDuration(avgWorkshop)}`:"")}
          ${countTile("انتظار قطع","📦",counts.parts,"showRequestBucket('parts')")}
          ${countTile("المكتملة","✅",counts.completed,"showRequestBucket('completed')","",avgAll!==null?`⏱️ متوسط ${formatDuration(avgAll)}`:"")}
          ${countTile("الملغاة","❌",counts.cancelled,"showRequestByStatus('ملغي')")}
          ${countTile("كل الأوامر","🛠️",all.length,"showAllRequests()","primary-tile")}
        </div>
        ${tagSummaryHtml(all)}
      </section>`;
  }

  window.renderRequestFolders = function () {
    /* لم تعد هناك بطاقات مكررة؛ الملخص الموحد موجود داخل requestList. */
    const el = $("requestFolders");
    if (el) el.innerHTML = "";
  };

  defineOverride("renderRequests", "workshop-mini-simple-ui.js", function () {
    const el = $("requestList");
    if (!el) return;
    const all = requestRows();

    if (!state.requests) {
      renderRequestSummary();
      return;
    }

    const q = ($("requestSearch")?.value || "").toLowerCase().trim();
    const sf = $("requestOpsStatus")?.value || state.requestStatus || "";
    const wf = $("requestOpsWorkshop")?.value || state.requestLocation || "";
    const focus = $("requestOpsFocus")?.value || state.requestBucket || "";
    const sort = $("requestOpsSort")?.value || "oldest";

    let filtered = all.filter(r => {
      const text = [r.no, customerName(r.customerId), r.fault, orderLocationLabel(r), r.tag].filter(Boolean).join(" ").toLowerCase();
      let ok = !q || text.includes(q);
      if (focus) ok = ok && bucketFilter(r,focus);
      if (sf) ok = ok && r.status === sf;
      if (wf === "workshop") ok = ok && r.executionPlace === "الورشة";
      if (wf === "home") ok = ok && r.executionPlace !== "الورشة";
      return ok;
    });

    const byDate=(r)=>new Date(r.createdAt||r.visit||0).getTime()||0;
    if(sort==="newest") filtered.sort((a,b)=>byDate(b)-byDate(a));
    else if(sort==="visit") filtered.sort((a,b)=>(new Date(a.visit||"9999-12-31")-new Date(b.visit||"9999-12-31")));
    else if(sort==="age") filtered.sort((a,b)=>(requestAgeMs(b)||0)-(requestAgeMs(a)||0));
    else if(sort==="completion") filtered.sort((a,b)=>(requestTotalCompletionMs(b)||0)-(requestTotalCompletionMs(a)||0));
    else filtered.sort((a,b)=>byDate(a)-byDate(b));

    const title = focus === "today" ? "أوامر اليوم" :
      focus === "workshop" ? "أوامر الورشة" :
      focus === "completed" ? "الأوامر المكتملة" :
      focus === "parts" ? "انتظار قطع الغيار" :
      focus === "overdue" ? "الأوامر المتأخرة" :
      focus === "stale" ? "الأوامر القديمة (محتاجة تنفيذ)" :
      focus === "unfinished" ? "الأوامر غير المكتملة" :
      focus === "needed" ? "المطلوب الآن" :
      focus === "new" ? "الأوامر الجديدة" :
      focus === "active" ? "جاري التنفيذ" :
      focus === "cancelled" ? "الأوامر الملغاة" :
      focus && focus.indexOf("tag:") === 0 ? `🏷️ ${focus.slice(4) || "بدون تصنيف"}` : "كل الأوامر";

    const selectHtml=(id,options,val,placeholder="كل") =>
      `<select id="${id}" data-wf-event="change" data-wf-code="renderRequests()">${placeholder?`<option value="">${placeholder}</option>`:""}${options.map(x=>`<option value="${esc2(x.v)}" ${String(val)===String(x.v)?"selected":""}>${esc2(x.t)}</option>`).join("")}</select>`;

    el.innerHTML = `
      <div class="simple-list-head">
        <div><b>${title}</b><small>${filtered.length} أمر</small></div>
        <button type="button" class="secondary small-btn" data-wf-event="click" data-wf-code="hideAllRequests()">رجوع للملخص</button>
      </div>
      <div class="request-filter-panel">
        <div class="request-filter-grid">
          ${selectHtml("requestOpsFocus",[
            {v:"",t:"كل الأوامر"},{v:"needed",t:"🎯 المطلوب الآن"},{v:"completed",t:"✅ مكتمل"},
            {v:"overdue",t:"⚠️ متأخر"},{v:"stale",t:"🔴 قديم (لسه واقف)"},{v:"parts",t:"📦 انتظار قطع"},
            {v:"today",t:"📅 اليوم"},{v:"unpaid",t:"🧾 غير محصل"}
          ],focus,"التركيز")}
          ${selectHtml("requestOpsStatus",[
            {v:"جديد",t:"جديد"},{v:"جاري التنفيذ",t:"جاري التنفيذ"},{v:"مكتمل",t:"مكتمل"},{v:"ملغي",t:"ملغي"}
          ],sf,"الحالة")}
          ${selectHtml("requestOpsWorkshop",[
            {v:"workshop",t:"🏭 في الورشة"},{v:"home",t:"🏠 في المنزل"}
          ],wf,"📍 مكان التنفيذ")}
          ${selectHtml("requestOpsSort",[
            {v:"oldest",t:"الأقدم أولًا"},{v:"newest",t:"الأحدث أولًا"},{v:"visit",t:"حسب موعد الزيارة"},
            {v:"age",t:"الأكبر عمرًا"},{v:"completion",t:"أطول مدة إكمال"}
          ],sort,"الترتيب")}
        </div>
      </div>
      ${requestAgeLegendHtml()}
      ${filtered.length ? filtered.map(r => {
        const loc = locationForOrder(r);
        const status = r.closed ? "مغلق" : (r.status || "—");
        const canEditStatus = !r.closed && !r.paid;
        const cust = arr(K.c).find(x => x.id === r.customerId) || {};
        const ageInfo = requestAgeInfo(r);
        const age = ageInfo ? ageInfo.label : "";
        const totalMs=requestTotalCompletionMs(r);
        const workshopMs=requestWorkshopExecutionMs(r);
        return `<div class="simple-record${ageInfo ? " " + ageInfo.cls : ""}">
          <div class="simple-record-icon">${r.closed ? "🔒" : "🛠️"}</div>
          <div class="simple-record-main">
            <a href="request.html?id=${r.id}"><b>${esc2(r.no || "أمر شغل")}</b></a>
            <span>${esc2(customerName(r.customerId))} • ${esc2(deviceName(r.deviceId))}</span>
            ${cust.phone ? `<small><a class="tel-link" href="tel:${esc2(cust.phone)}" target="_blank" rel="noopener" data-wf-event="click" data-wf-code="event.stopPropagation()">📞 ${esc2(cust.phone)}</a></small>` : ""}
            <small>📍 ${esc2(loc.center)}${loc.village ? " • " + esc2(loc.village) : ""} • ${r.visit ? new Date(r.visit).toLocaleString("ar-EG",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : "بدون موعد"}${r.tag ? " • 🏷️ " + esc2(r.tag) : ""}</small>
            ${r.fault ? `<small>📝 ${esc2(r.fault)}</small>` : ""}
            <div class="request-timing">
              ${ageInfo ? `<span class="request-age age-badge ${ageInfo.cls}" title="⏱️ عمر الأمر: ${esc2(ageInfo.range)}">${ageInfo.dot} عمر الأمر: ${esc2(age)}</span>` : ""}
              ${totalMs!==null ? `<span>⏱️ الإكمال: ${esc2(formatDuration(totalMs))}</span>` : ""}
              ${r.executionPlace==="الورشة" && workshopMs!==null ? `<span>🏭 تنفيذ الورشة: ${esc2(formatDuration(workshopMs))}</span>` : ""}
            </div>
          </div>
          <div class="simple-record-side">
            ${canEditStatus ? `<select class="simple-status-select" data-wf-event="click" data-wf-code="event.stopPropagation()" data-wf-event="change" data-wf-code="changeRequestStatus('${r.id}',this.value)">${nextStatusOptions(r.status).map(x=>`<option ${r.status===x?"selected":""}>${esc2(x)}</option>`).join("")}</select>` : `<span class="simple-status ${r.closed ? "closed" : ""}">${esc2(status)}</span>`}
            ${canReturnRequest(r) ? `<button type="button" class="secondary mini-action return-btn" data-wf-event="click" data-wf-code="markRequestReturned('${r.id}')">🔄 مرتجع${r.closed ? ` (${Math.max(0,returnWindowDaysLeft(r))}ي)` : ""}</button>` : ""}
            <b>${(+r.total||0).toFixed(2)} ج</b>
            ${(+r.deposit||0) > 0 ? `<small class="deposit-chip">💵 عربون ${(+r.deposit).toFixed(2)} ج</small>` : ""}
          </div>
        </div>`;
      }).join("") : `<div class="item">لا توجد أوامر في هذا القسم.</div>`}`;
  });

  /* markPaidAndClose / closeOrder: بقوا نسخة واحدة موحّدة في app-shared.js
     (بيتحمّل قبل الملف ده في كل صفحة)، فمفيش داعي نستبدلهم هنا تاني. */

  /* ---------- الدخول المباشر من إحصائيات الصفحة الرئيسية (?bucket=...) ---------- */
  function applyDeepLinkBucket() {
    const bucket = new URLSearchParams(location.search).get("bucket");
    if (!bucket) return;
    if ($("requestList")) {
      if (bucket === "all") window.showAllRequests();
      else if (bucket === "workshop") window.showRequestByLocation("workshop");
      else window.showRequestBucket(bucket);
    } else if ($("customerList")) {
      if (bucket === "all") window.showAllCustomers();
      else window.showCustomerBucket(bucket);
    } else if ($("deviceList")) {
      if (bucket === "all") window.showAllDevices();
      else window.showDeviceBucket(bucket);
    } else if ($("partList")) {
      if (bucket === "low") window.showLowStockParts();
      else if (bucket === "all") window.showAllParts();
      else window.showPartsCategory(decodeURIComponent(bucket));
    }
  }

  function initSimpleView() {
    /* نخفي القوائم والبحث افتراضيًا. */
    ["customerSearch","deviceSearch","partSearch","requestSearch"].forEach(id => {
      $(id)?.classList.add("hidden");
    });

    if ($("customerSearch")) $("customerSearch").oninput = debounce(renderCustomers, 120);
    if ($("deviceSearch")) $("deviceSearch").oninput = debounce(renderDevices, 120);
    if ($("partSearch")) $("partSearch").oninput = debounce(renderParts, 120);
    if ($("requestSearch")) $("requestSearch").oninput = debounce(renderRequests, 120);

    renderCustomers();
    renderDevices();
    renderParts();
    renderRequests();
    applyDeepLinkBucket();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(initSimpleView, 0));
})();
