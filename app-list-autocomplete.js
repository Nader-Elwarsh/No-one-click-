/* app-list-autocomplete.js — تحويل قوائم select الطويلة (المركز/القرية/نوع الجهاز/
   التصنيف/الماركة/تصنيف القطع/التصنيف اليدوي لأمر الشغل...) لبحث لحظي، زي فكرة
   app-customer-autocomplete.js بالظبط: input نصي للبحث + input hidden بيحمل القيمة
   الفعلية + قائمة نتائج منسدلة، وبإضافة ميزة "إضافة خيار جديد" من نفس المكان (من غير
   ما نخرج للإعدادات) لو المستخدم كتب اسم مش موجود في القائمة.

   كل "قايمة" بتتسجل هنا مرة واحدة في LIST_SOURCES: إزاي تجيب القيمة (getList) وإزاي
   تضيف عنصر جديد (addNew). أي قايمة تانية طويلة تتضاف بنفس الطريقة من غير ما نلمس
   منطق البحث/العرض نفسه.

   بعض القوايم محتاجة "سياق" (زي قرى مركز معيّن، أو تصنيفات نوع جهاز معيّن) —
   بنجيبه لحظيًا وقت البحث من حقل تاني مرتبط (مسجل في data-ctx-field عبر ctxKey)،
   مش محفوظ ثابت، عشان لو المستخدم غيّر الحقل الأساسي بعدين يتحدث الفلتر تلقائيًا
   من غير أي مزامنة إضافية.

   ملاحظة: قوائم دورة حالة أمر الشغل الثابتة (الحالة، حالة الورشة، مكان التنفيذ)
   متعمّد إنها تفضل select عادي وميتحولوش هنا — دي مش قوائم قابلة للتوسع، وإضافة
   عنصر جديد فيها هتكسر منطق دورة الحالة المعتمد (راجع WORK_ORDER_LIFECYCLE_APPROVED.md).
   وكمان قايمة "المحفظة" (rDepositWallet) متسيبتش هنا لأن إنشاء محفظة حقيقية محتاج
   بيانات تانية (نوعها، رصيدها) مش مجرد اسم. */

const LIST_SOURCES = {
  center: {
    emptyHint: "لا توجد نتائج. اكتب اسم المركز واضغط إضافة.",
    getList() { return settings().centers || []; },
    addNew(name) {
      let s = settings();
      s.centers = s.centers || [];
      if (!s.centers.includes(name)) s.centers.push(name);
      s.villages = s.villages || {};
      s.villages[name] = s.villages[name] || [];
      put(K.s, s);
      return true;
    }
  },
  village: {
    emptyHint: "لا توجد نتائج. اكتب اسم القرية واضغط إضافة.",
    ctxKey: "center", ctxLabel: "المركز",
    getList(ctx) { return (settings().villages || {})[ctx.center] || []; },
    addNew(name, ctx) {
      if (!ctx.center) { alert("اختر المركز أولاً قبل إضافة قرية جديدة."); return false; }
      let s = settings();
      s.villages = s.villages || {};
      s.villages[ctx.center] = s.villages[ctx.center] || [];
      if (!s.villages[ctx.center].includes(name)) s.villages[ctx.center].push(name);
      put(K.s, s);
      return true;
    }
  },
  brand: {
    emptyHint: "لا توجد نتائج. اكتب اسم الماركة واضغط إضافة.",
    getList() { return settings().brands || []; },
    addNew(name) {
      let s = settings();
      s.brands = s.brands || [];
      if (!s.brands.includes(name)) s.brands.push(name);
      put(K.s, s);
      return true;
    }
  },
  type: {
    emptyHint: "لا توجد نتائج. اكتب اسم نوع الجهاز واضغط إضافة.",
    getList() { return Object.keys(settings().types || {}); },
    addNew(name) {
      let s = settings();
      s.types = s.types || {};
      if (!(name in s.types)) s.types[name] = [];
      put(K.s, s);
      return true;
    }
  },
  category: {
    emptyHint: "لا توجد نتائج. اكتب اسم التصنيف واضغط إضافة.",
    ctxKey: "type", ctxLabel: "نوع الجهاز",
    getList(ctx) { return (settings().types || {})[ctx.type] || []; },
    addNew(name, ctx) {
      if (!ctx.type) { alert("اختر نوع الجهاز أولاً قبل إضافة تصنيف جديد."); return false; }
      let s = settings();
      s.types = s.types || {};
      s.types[ctx.type] = s.types[ctx.type] || [];
      if (!s.types[ctx.type].includes(name)) s.types[ctx.type].push(name);
      put(K.s, s);
      return true;
    }
  },
  partCat: {
    emptyHint: "لا توجد نتائج. اكتب اسم التصنيف واضغط إضافة.",
    getList() { return settings().partCats || []; },
    addNew(name) {
      let s = settings();
      s.partCats = s.partCats || [];
      if (!s.partCats.includes(name)) s.partCats.push(name);
      put(K.s, s);
      return true;
    }
  },
  orderTag: {
    emptyHint: "لا توجد نتائج. اكتب اسم التصنيف واضغط إضافة.",
    getList() { return settings().orderTags || []; },
    addNew(name) {
      let s = settings();
      s.orderTags = s.orderTags || [];
      s.orderTagsDisabled = s.orderTagsDisabled || [];
      if (s.orderTags.includes(name) || s.orderTagsDisabled.includes(name)) { alert("التصنيف ده موجود بالفعل."); return false; }
      s.orderTags.push(name);
      put(K.s, s);
      return true;
    }
  }
};

/* fieldId: id حقل الـ hidden. ctxFieldId: (اختياري) id حقل تاني (زي المركز أو نوع
   الجهاز) اللي القايمة دي مبنية عليه — بيتحفظ في data-ctx-field عشان يتقرأ منه وقت
   البحث بدل ما يتسجل ثابت. */
function fillListSearch(fieldId, kind, selected = "", ctxFieldId = null) {
  const hidden = document.getElementById(fieldId);
  const search = document.getElementById(fieldId + "Search");
  if (!hidden) return;
  hidden.dataset.listKind = kind;
  if (ctxFieldId) hidden.dataset.ctxField = ctxFieldId;
  hidden.value = selected || "";
  if (search) search.value = selected || "";
}

function _listCtx(hidden, src) {
  if (!src || !src.ctxKey) return {};
  const cf = hidden.dataset.ctxField;
  return { [src.ctxKey]: cf ? (document.getElementById(cf)?.value || "") : "" };
}

function filterListOptions(fieldId, q) {
  const hidden = document.getElementById(fieldId);
  const box = document.getElementById(fieldId + "Results");
  if (!hidden || !box) return;
  const src = LIST_SOURCES[hidden.dataset.listKind];
  if (!src) return;
  // زي فكرة filterCustomerOptions بالظبط: أول ما المستخدم يبدأ يكتب، الاختيار
  // القديم (لو موجود) بيتلغى لحد ما يختار حاجة من القايمة تاني أو يضيف جديد —
  // عشان مايفضلش في الحقل قيمة قديمة متجاهلها كتابة جزئية.
  hidden.value = "";
  const ctx = _listCtx(hidden, src);
  if (src.ctxKey && !ctx[src.ctxKey]) {
    box.innerHTML = `<div class="part-ac-empty">اختر ${esc(src.ctxLabel)} أولاً.</div>`;
    box.classList.remove("hidden");
    return;
  }
  q = String(q ?? document.getElementById(fieldId + "Search")?.value ?? "").trim();
  const list = src.getList(ctx) || [];
  const qLower = q.toLowerCase();
  const matches = (qLower ? list.filter(x => x.toLowerCase().includes(qLower)) : list).slice(0, 50);
  let html = matches.length
    ? matches.map(x => `<div class="part-ac-item" data-value="${esc(x)}"><b>${esc(x)}</b></div>`).join("")
    : `<div class="part-ac-empty">${esc(src.emptyHint || "لا توجد نتائج مطابقة.")}</div>`;
  if (q && !list.some(x => x.toLowerCase() === qLower)) {
    html += `<div class="part-ac-item ac-add-new" data-add="${esc(q)}"><b>➕ إضافة "${esc(q)}" كخيار جديد</b></div>`;
  }
  box.innerHTML = html;
  box.querySelectorAll("[data-value]").forEach(item => {
    item.onmousedown = () => selectListOption(fieldId, item.dataset.value);
  });
  box.querySelectorAll("[data-add]").forEach(item => {
    item.onmousedown = () => addNewListOption(fieldId, item.dataset.add);
  });
  box.classList.remove("hidden");
}

function selectListOption(fieldId, value) {
  const hidden = document.getElementById(fieldId), search = document.getElementById(fieldId + "Search"), box = document.getElementById(fieldId + "Results");
  if (hidden) {
    hidden.value = value;
    hidden.dispatchEvent(new Event("change"));
  }
  if (search) search.value = value;
  if (box) box.classList.add("hidden");
}

function addNewListOption(fieldId, name) {
  name = String(name || "").trim();
  if (!name) return;
  const hidden = document.getElementById(fieldId);
  if (!hidden) return;
  const src = LIST_SOURCES[hidden.dataset.listKind];
  if (!src) return;
  const ctx = _listCtx(hidden, src);
  if (src.addNew(name, ctx) === false) return;
  selectListOption(fieldId, name);
}

function hideListResults(fieldId) {
  setTimeout(() => document.getElementById(fieldId + "Results")?.classList.add("hidden"), 150);
}
