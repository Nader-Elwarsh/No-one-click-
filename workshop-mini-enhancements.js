/* Workshop Mini V2 — focused enhancements
   Scope: Customers / Devices only, plus safe shared helpers.
   Keeps the existing project structure, localStorage and UI.
*/
(function () {
  "use strict";

  // duplicateCustomerByPhone وقراءة/كتابة العملاء والأجهزة وأوامر الشغل
  // والمخزون والحركات: كانت متكررة هنا بنفس منطق app.js بالظبط. اتوحّدت
  // في shared-data.js (K/arr/put) — الملف ده لازم يتحمّل بعده.
  function customerRows() { return arr(K.c); }
  function deviceRows() { return arr(K.d); }
  function requestRows() { return arr(K.r); }
  function stockRows() { return arr(K.p); }
  function moveRows() { return arr(K.m); }
  function restorePartsForRequestsInto(stock, requests) {
    (requests || []).forEach(function (r) {
      (r.parts || []).forEach(function (part) {
        const p = stock.find(function (x) { return x.id === part.partId; });
        if (p) p.qty = (+p.qty || 0) + (+part.qty || 0);
      });
    });
  }

  // صور الأجهزة متخزنة في IndexedDB (image-store.js) مش جوه سجل الجهاز
  // نفسه، فحذف سجل الجهاز من localStorage لوحده مش كافي — لازم نمسح
  // صورته من IndexedDB برضه وإلا فضلت يتيمة هناك للأبد. نفس المنطق
  // المستخدم بالفعل في deletePartRecord لكن للأجهزة.
  function deleteDevicePhotos(devices) {
    if (!window.ImageStore?.delete) return;
    (devices || []).forEach(function (d) {
      if (d.photo) window.ImageStore.delete(d.photo);
    });
  }

  // Customer search: keep the existing UI, but search all useful customer
  // fields including both addresses and make Arabic/phone matching forgiving.
  defineOverride("renderCustomers", "workshop-mini-enhancements.js", function () {
    const el = document.getElementById("customerList");
    if (!el) return;
    const raw = (document.getElementById("customerSearch")?.value || "").toLowerCase().trim();
    const q = raw.replace(/\s+/g, " ");
    const rows = customerRows().filter(function (c) {
      const main = typeof addressText === "function" ? addressText(c.mainAddress || {}) : "";
      const extra = typeof addressText === "function" ? addressText(c.extraAddress || {}) : "";
      const hay = [
        c.name, c.phone, c.phone2, c.nickname,
        main, extra,
        c.mainAddress?.street, c.extraAddress?.street
      ].filter(Boolean).join(" ").toLowerCase();
      return !q || hay.includes(q);
    });

    el.innerHTML = rows.length ? rows.map(function (c) {
      const devices = deviceRows().filter(function (d) { return d.customerId === c.id; });
      const orders = requestRows().filter(function (r) { return r.customerId === c.id; });
      const main = typeof addressText === "function" ? addressText(c.mainAddress || {}) : "";
      return `<div class="item record-card">
        <div class="card-side-actions">
          <a class="primary small-btn" href="customer.html?id=${c.id}">فتح 360°</a>
          <button class="danger-btn small-btn" type="button" data-wf-event="click" data-wf-code="deleteCustomerRecord('${c.id}')">🗑️ حذف</button>
        </div>
        <div class="record-main">
          <div class="item-head">
            <a href="customer.html?id=${c.id}"><b>👤 ${esc(c.name)}</b></a>
            <span class="badge">🔧 ${devices.length} أجهزة • 🛠️ ${orders.length} أوامر</span>
          </div>
          <div>📞 ${esc(c.phone || "—")}</div>
          <div>📍 ${esc(main || "—")}</div>
        </div>
      </div>`;
    }).join("") : '<div class="item">لا توجد نتائج.</div>';
  });

  // Customer 360°: same page, clearer summary and linked records.
  defineOverride("customerProfile", "workshop-mini-enhancements.js", function () {
    const el = document.getElementById("customerProfile");
    if (!el) return;
    const idValue = new URLSearchParams(location.search).get("id");
    const c = customerRows().find(function (x) { return x.id === idValue; });
    if (!c) {
      el.innerHTML = "<div class='item'>العميل غير موجود.</div>";
      return;
    }

    const ds = deviceRows().filter(function (d) { return d.customerId === c.id; });
    const rs = requestRows().filter(function (r) { return r.customerId === c.id; });
    const main = typeof addressText === "function" ? addressText(c.mainAddress || {}) : "";
    const extra = typeof addressText === "function" ? addressText(c.extraAddress || {}) : "";

    // إجمالي ما دفعه العميل فعليًا: الأوامر المقفولة/المدفوعة بالكامل تدخل
    // بإجماليها كاملاً، والأوامر المفتوحة تدخل بالعربون المحصّل منها فقط.
    // ده بيفرق عن "إجمالي قيمة التعامل" اللي بيشمل حتى المبالغ اللي لسه
    // ما اتحصلتش، وعن "المتبقي" اللي بيوضح العميل مديون بكام لحد دلوقتي.
    const totalOrdersValue = rs.reduce(function (a, r) { return a + (+r.total || 0); }, 0);
    const totalPaid = rs.reduce(function (a, r) {
      return a + ((r.closed || r.paid) ? (+r.total || 0) : Math.min(+r.deposit || 0, +r.total || 0));
    }, 0);
    const totalRemaining = rs.reduce(function (a, r) {
      return a + (r.closed || r.paid ? 0 : Math.max(0, (+r.total || 0) - (+r.deposit || 0)));
    }, 0);

    // أكتر قطعة غيار اتصرفت مع هذا العميل عبر كل أوامره: بنجمع كل بنود
    // قطع الغيار (غير الخارجية) في كل أوامره حسب partId، وناخد الأعلى
    // في إجمالي المبلغ المصروف عليها.
    const partUsage = {};
    rs.forEach(function (r) {
      (r.parts || []).forEach(function (part) {
        if (part.external || !part.partId) return;
        const e = (partUsage[part.partId] ||= { qty: 0, amount: 0 });
        e.qty += (+part.qty || 0);
        e.amount += (+part.qty || 0) * (+part.sell || 0);
      });
    });
    const topPartEntry = Object.entries(partUsage).sort(function (a, b) { return b[1].amount - a[1].amount; })[0];
    const topPartLabel = topPartEntry
      ? (function () {
          const p = stockRows().find(function (x) { return x.id === topPartEntry[0]; });
          return `${esc(p?.name || "قطعة محذوفة")} (${topPartEntry[1].qty})`;
        })()
      : "—";

    el.innerHTML = `
      <div class="profile ps-context-target" data-ps-title="كشف حساب العميل ${esc(c.name)}">
        <div class="page-head">
          <h1 class="profile-title">👤 ${esc(c.name)}</h1>
          <div class="compact-actions">
            <button class="secondary" data-wf-event="click" data-wf-code="editCustomer('${c.id}')">✏️ تعديل</button>
            ${typeof psActions==="function"?psActions("كشف حساب العميل "+(c.name||"")):""}
            <a class="primary" href="devices.html?customer=${c.id}">➕ جهاز</a>
            <a class="primary" href="requests.html?customer=${c.id}">➕ أمر شغل</a>
          </div>
        </div>
        <div class="profile-grid">
          <div class="kv"><b>📞 التليفون</b>${typeof contactLinksHtml==="function"?contactLinksHtml(c.phone):esc(c.phone||"—")}</div>
          <div class="kv"><b>📍 العنوان الأساسي</b>${esc(main || "—")}</div>
          <div class="kv"><b>📍 العنوان الإضافي</b>${esc(extra || "—")}</div>
          <div class="kv"><b>🔧 عدد الأجهزة</b>${ds.length}</div>
          <div class="kv"><b>🛠️ عدد أوامر الشغل</b>${rs.length}</div>
        </div>
        <div class="report-cards" style="margin-top:10px">
          <div class="report-card"><span>📊 إجمالي قيمة التعامل</span><b>${totalOrdersValue.toFixed(2)} ج</b></div>
          <div class="report-card"><span>💰 إجمالي ما دفعه العميل</span><b>${totalPaid.toFixed(2)} ج</b></div>
          <div class="report-card"><span>🧾 المتبقي عليه حاليًا</span><b>${totalRemaining.toFixed(2)} ج</b></div>
          <div class="report-card"><span>🔧 أكتر قطعة اتصرفت معاه</span><b>${topPartLabel}</b></div>
        </div>
        ${rs.length ? `
        <h2>🧾 كشف حساب تفصيلي</h2>
        <div class="statement-table-wrap" style="overflow-x:auto">
          <table class="statement-table" style="width:100%;border-collapse:collapse">
            <thead><tr>
              <th style="text-align:right">التاريخ</th><th style="text-align:right">رقم الأمر</th>
              <th style="text-align:right">الحالة</th><th style="text-align:right">الإجمالي</th>
              <th style="text-align:right">المدفوع</th><th style="text-align:right">المتبقي</th>
            </tr></thead>
            <tbody>
              ${rs.slice().sort(function (a, b) { return (a.createdAt || "").localeCompare(b.createdAt || ""); }).map(function (r) {
                const total = +r.total || 0;
                const paid = (r.closed || r.paid) ? total : Math.min(+r.deposit || 0, total);
                const remaining = (r.closed || r.paid) ? 0 : Math.max(0, total - (+r.deposit || 0));
                const dateLabel = r.createdAt ? new Date(r.createdAt).toLocaleDateString("ar-EG") : "—";
                return `<tr>
                  <td>${esc(dateLabel)}</td>
                  <td><a href="request.html?id=${r.id}">${esc(r.no || "—")}</a></td>
                  <td>${esc(r.status || "—")}${r.closed ? " 🔒" : ""}</td>
                  <td>${total.toFixed(2)} ج</td>
                  <td>${paid.toFixed(2)} ج</td>
                  <td>${remaining.toFixed(2)} ج</td>
                </tr>`;
              }).join("")}
            </tbody>
            <tfoot><tr style="font-weight:bold">
              <td colspan="3">الإجمالي</td>
              <td>${totalOrdersValue.toFixed(2)} ج</td>
              <td>${totalPaid.toFixed(2)} ج</td>
              <td>${totalRemaining.toFixed(2)} ج</td>
            </tr></tfoot>
          </table>
        </div>` : ""}
      </div>

      <h2>🔧 الأجهزة</h2>
      ${ds.length ? ds.map(function (d) {
        const deviceOrders = requestRows().filter(function (r) { return r.deviceId === d.id; });
        const count = deviceOrders.length;
        const isRecurring = count >= 2;
        const activeDeviceOrders = deviceOrders.filter(function (r) { return r.status !== "مكتمل" && r.status !== "ملغي"; });
        const deviceAge = typeof worstRequestAgeInfo === "function" ? worstRequestAgeInfo(activeDeviceOrders) : null;
        return `<div class="item record-card${deviceAge ? " " + deviceAge.cls : ""}">
          <div class="card-side-actions">
            <a class="primary small-btn" href="device.html?id=${d.id}">فتح الجهاز 360°</a>
          </div>
          <div class="record-main">
            <div><a href="device.html?id=${d.id}"><b>${esc(d.type)} — ${esc(d.brand)}</b></a>${isRecurring ? ' <span class="badge simple-line-warn" style="display:inline-block">🔁 يتكرر عطله</span>' : ""}${deviceAge ? ` <span class="badge age-badge ${deviceAge.cls}" title="⏱️ أقدم أمر مفتوح: ${esc(deviceAge.range)}">${deviceAge.dot} ${esc(deviceAge.label)}</span>` : ""}</div>
            <div>${esc(d.category || "—")} • ${esc(d.model || "بدون موديل")}</div>
            <div class="badge">🛠️ ${count} أوامر شغل</div>
          </div>
        </div>`;
      }).join("") : "<div class='item'>لا توجد أجهزة.</div>"}

      <h2>🛠️ أوامر الشغل</h2>
      ${rs.length ? rs.map(function (r) {
        const rAge = typeof requestAgeInfo === "function" ? requestAgeInfo(r) : null;
        return `<div class="item record-card${rAge ? " " + rAge.cls : ""}">
          <div class="card-side-actions">
            <a class="primary small-btn" href="request.html?id=${r.id}">فتح 360°</a>
          </div>
          <div class="record-main">
            <div>
              <a href="request.html?id=${r.id}"><b>${esc(r.no || "أمر شغل")}</b></a>
              <span class="badge">${esc(r.status || "—")}${r.closed ? " 🔒" : ""}</span>${rAge ? ` <span class="badge age-badge ${rAge.cls}" title="⏱️ عمر الأمر: ${esc(rAge.range)}">${rAge.dot} ${esc(rAge.label)}</span>` : ""}
            </div>
            <div>🔧 ${esc(typeof deviceName === "function" ? deviceName(r.deviceId) : "—")}</div>
            <div>💰 الإجمالي ${(+r.total || 0).toFixed(2)} ج • 💵 العربون ${(+r.deposit || 0).toFixed(2)} ج</div>
          </div>
        </div>`;
      }).join("") : "<div class='item'>لا توجد أوامر.</div>"}
    `;
  });

  // Individual customer deletion is allowed in the experimental build.
  // It warns clearly and removes dependent devices/orders so no orphan
  // records remain. Parts used by those orders return to stock.
  defineOverride("deleteCustomerRecord", "workshop-mini-enhancements.js", function (cid) {
    const c = customerRows().find(function (x) { return x.id === cid; });
    if (!c) return;

    const devices = deviceRows().filter(function (d) { return d.customerId === cid; });
    const deviceIds = new Set(devices.map(function (d) { return d.id; }));
    const orders = requestRows().filter(function (r) {
      return r.customerId === cid || deviceIds.has(r.deviceId);
    });

    const message =
      `⚠️ حذف العميل «${c.name || ""}»\n\n` +
      `سيتم حذف العميل مع ${devices.length} جهاز و ${orders.length} أمر شغل مرتبط به.\n` +
      `وسيتم إرجاع قطع الغيار المصروفة لهذه الأوامر إلى المخزن.\n\n` +
      `هل تريد المتابعة؟`;

    if (!confirm(message)) return;

    // بُني الحذف ده أصلًا بخمس كتابات منفصلة لـlocalStorage (قطع، حركات
    // مخزن، أوامر، أجهزة، عملاء) من غير أي حماية لو فشلت وحدة منهم في
    // النص، ومن غير ما يمسح حركات المحفظة المرتبطة بالأوامر المحذوفة (تفضل
    // "دخل" ظاهر في المحفظة لأمر شغل بقى غير موجود أصلًا) ولا تسجيلات
    // المكالمات المرتبطة بيها (تفضل يتيمة في IndexedDB للأبد). اتصلحوا
    // التلاتة هنا: كتابة واحدة ذرية (commitStorage) + تنضيف حركات المحفظة
    // + تنضيف التسجيلات، بنفس المنطق المستخدم بالظبط في حذف أمر شغل واحد
    // (app-delete-tools.js).
    const orderIds = orders.map(function (r) { return r.id; });
    const stock = stockRows();
    const partsDelta = orders.flatMap(function (r) {
      return (r.parts || []).filter(function (x) { return !x.external && x.partId; }).map(function (x) { return { partId: x.partId, qty: +x.qty || 0 }; });
    });
    const removedMoves = moveRows().filter(function (m) { return orderIds.indexOf(m.requestId) !== -1; });
    restorePartsForRequestsInto(stock, orders);
    const values = {};
    values[window.K.p] = stock;
    values[window.K.m] = moveRows().filter(function (m) { return orderIds.indexOf(m.requestId) === -1; });
    values[window.K.r] = requestRows().filter(function (r) { return orderIds.indexOf(r.id) === -1; });
    values[window.K.d] = deviceRows().filter(function (d) { return d.customerId !== cid; });
    values[window.K.c] = customerRows().filter(function (x) { return x.id !== cid; });
    values[window.K.wtx] = typeof walletEntriesAfterRemovingRequests === "function" ? walletEntriesAfterRemovingRequests(orderIds) : arr(window.K.wtx);
    if (!window.commitStorage(values)) { alert("تعذر حذف العميل بالكامل؛ لم يتم تنفيذ أي تغيير."); return; }

    deleteDevicePhotos(devices);
    if (typeof cleanupRequestRecordings === "function") cleanupRequestRecordings(orders);
    window.auditLog?.("حذف", "عميل", cid, `${c.name || ""} (${devices.length} جهاز، ${orders.length} أمر شغل)`);
    if (typeof pushToTrash === "function") pushToTrash("customer", `العميل ${c.name || ""}`, {
      customer: c, devices: devices, requests: orders, moves: removedMoves, partsDelta: partsDelta,
      walletRefKeys: typeof walletRefKeysForOrders === "function" ? walletRefKeysForOrders(orderIds) : []
    });

    refreshAllScreens();

    alert("تم حذف العميل والبيانات المرتبطة به بنجاح.");
  });

  // Device deletion is also allowed for testing, with confirmation.
  // Linked orders are removed and their used parts are returned to stock.
  defineOverride("deleteDeviceRecord", "workshop-mini-enhancements.js", function (did) {
    const d = deviceRows().find(function (x) { return x.id === did; });
    if (!d) return;

    const orders = requestRows().filter(function (r) { return r.deviceId === did; });
    const message =
      `⚠️ حذف الجهاز «${d.type || ""} — ${d.brand || ""}»\n\n` +
      `سيتم حذف الجهاز مع ${orders.length} أمر شغل مرتبط به.\n` +
      `وسيتم إرجاع قطع الغيار المصروفة لهذه الأوامر إلى المخزن.\n\n` +
      `هل تريد المتابعة؟`;

    if (!confirm(message)) return;

    const orderIds = orders.map(function (r) { return r.id; });
    const stock = stockRows();
    const partsDelta = orders.flatMap(function (r) {
      return (r.parts || []).filter(function (x) { return !x.external && x.partId; }).map(function (x) { return { partId: x.partId, qty: +x.qty || 0 }; });
    });
    const removedMoves = moveRows().filter(function (m) { return orderIds.indexOf(m.requestId) !== -1; });
    restorePartsForRequestsInto(stock, orders);
    const values = {};
    values[window.K.p] = stock;
    values[window.K.m] = moveRows().filter(function (m) { return orderIds.indexOf(m.requestId) === -1; });
    values[window.K.r] = requestRows().filter(function (r) { return r.deviceId !== did; });
    values[window.K.d] = deviceRows().filter(function (x) { return x.id !== did; });
    values[window.K.wtx] = typeof walletEntriesAfterRemovingRequests === "function" ? walletEntriesAfterRemovingRequests(orderIds) : arr(window.K.wtx);
    if (!window.commitStorage(values)) { alert("تعذر حذف الجهاز بالكامل؛ لم يتم تنفيذ أي تغيير."); return; }

    deleteDevicePhotos([d]);
    if (typeof cleanupRequestRecordings === "function") cleanupRequestRecordings(orders);
    window.auditLog?.("حذف", "جهاز", did, `${d.type || ""} — ${d.brand || ""} (${orders.length} أمر شغل)`);
    if (typeof pushToTrash === "function") pushToTrash("device", `الجهاز ${d.type || ""} — ${d.brand || ""}`, {
      device: d, requests: orders, moves: removedMoves, partsDelta: partsDelta,
      walletRefKeys: typeof walletRefKeysForOrders === "function" ? walletRefKeysForOrders(orderIds) : []
    });

    refreshAllScreens();

    alert("تم حذف الجهاز والبيانات المرتبطة به بنجاح.");
  });

  // Device search: keep the existing search but include model/description.
  defineOverride("renderDevices", "workshop-mini-enhancements.js", function () {
    const el = document.getElementById("deviceList");
    if (!el) return;
    const q = (document.getElementById("deviceSearch")?.value || "").toLowerCase().trim();

    const rows = deviceRows().filter(function (d) {
      const hay = [
        typeof customerName === "function" ? customerName(d.customerId) : "",
        d.type, d.category, d.brand, d.model, d.desc
      ].filter(Boolean).join(" ").toLowerCase();
      return !q || hay.includes(q);
    });

    el.innerHTML = rows.length ? rows.map(function (d) {
      return `<div class="item record-card">
        <div class="card-side-actions">
          <a class="primary small-btn" href="device.html?id=${d.id}">فتح 360°</a>
          <button class="danger-btn small-btn" type="button" data-wf-event="click" data-wf-code="deleteDeviceRecord('${d.id}')">🗑️ حذف</button>
        </div>
        <div class="record-main">
          <div class="item-head">
            <a href="device.html?id=${d.id}"><b>🔧 ${esc(d.type)} — ${esc(d.brand)}</b></a>
            <span class="badge">${esc(typeof customerName === "function" ? customerName(d.customerId) : "—")}</span>
          </div>
          <div>${esc(d.category || "—")} • ${esc(d.model || "بدون موديل")}</div>
        </div>
      </div>`;
    }).join("") : '<div class="item">لا توجد أجهزة.</div>';
  });

  // Run after app.js has initialized the page.
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
      window.renderCustomers?.();
      window.renderDevices?.();
      window.customerProfile?.();
    }, 0);
  });
})();
