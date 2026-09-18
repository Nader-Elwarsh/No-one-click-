/* app-customer-autocomplete.js — بحث لحظي عن العميل بدل Select تقليدي بكل العملاء.
   نفس فكرة قطع الغيار بالظبط (rPartSearch/rPart/rPartResults في app-requests.js):
   input نصي للبحث + input hidden بيحمل الـ id الفعلي + قائمة نتائج منسدلة.
   الحقل المخفي (fieldId) بيفضل بنفس اسم الـ select القديم (rCustomer/dCustomer/qoCustomer)
   وبيحمل .value زيه بالظبط، فكل الكود اللي كان بيقرأ rCustomer.value أو يعمل
   rCustomer.onchange=... يفضل شغال من غير أي تعديل تاني — إحنا بس بنعمل
   hidden.dispatchEvent(new Event("change")) لما يتم الاختيار عشان أي onchange
   متسجل على الحقل يتنفذ زي ما كان بيحصل مع select عادي. */

function customerOptionLabel(c) {
  return `${c.name || "بدون اسم"} - ${c.phone || "بدون تليفون"}`;
}

/* بديل fillCustomer(el,selected) لكن للحقول اللي اتحولت لبحث لحظي.
   بيحط الـ id في الحقل المخفي، وبيكتب اسم العميل في مربع البحث عشان
   يبان للمستخدم مين المختار حاليًا (زي ما الـ select كان بيعرض العميل المختار). */
function fillCustomerAutocomplete(fieldId, selectedId = "") {
  const hidden = document.getElementById(fieldId);
  const search = document.getElementById(fieldId + "Search");
  if (!hidden) return;
  hidden.value = selectedId || "";
  if (search) {
    const c = selectedId ? arr(K.c).find(x => x.id === selectedId) : null;
    search.value = c ? customerOptionLabel(c) : "";
  }
}

function filterCustomerOptions(fieldId, q) {
  const box = document.getElementById(fieldId + "Results");
  if (!box) return;
  const hidden = document.getElementById(fieldId);
  if (hidden) hidden.value = "";
  q = String(q ?? document.getElementById(fieldId + "Search")?.value ?? "").trim();
  const qLower = q.toLowerCase();
  const list = arr(K.c);
  const matches = (qLower ? list.filter(c => {
    const text = [
      c.name, c.phone, c.phone2, c.nickname,
      typeof addressText === "function" ? addressText(c.mainAddress || {}) : "",
      typeof addressText === "function" ? addressText(c.extraAddress || {}) : ""
    ].filter(Boolean).join(" ").toLowerCase();
    return text.includes(qLower);
  }) : list).slice(0, 50);
  box.innerHTML = matches.length ? matches.map(c => {
    const addr = typeof addressText === "function" ? addressText(c.mainAddress || {}) : "";
    return `<div class="part-ac-item" onmousedown="selectCustomerOption('${fieldId}','${c.id}')"><b>${esc(c.name || "بدون اسم")}</b><span>📞 ${esc(c.phone || "—")}${addr ? " • " + esc(addr) : ""}</span></div>`;
  }).join("") : '<div class="part-ac-empty">لا توجد نتائج مطابقة.</div>';
  box.classList.remove("hidden");
}

function selectCustomerOption(fieldId, cid) {
  const c = arr(K.c).find(x => x.id === cid);
  if (!c) return;
  const hidden = document.getElementById(fieldId), search = document.getElementById(fieldId + "Search"), box = document.getElementById(fieldId + "Results");
  if (hidden) {
    hidden.value = cid;
    hidden.dispatchEvent(new Event("change"));
  }
  if (search) search.value = customerOptionLabel(c);
  if (box) box.classList.add("hidden");
}

function hideCustomerResults(fieldId) {
  setTimeout(() => document.getElementById(fieldId + "Results")?.classList.add("hidden"), 150);
}
