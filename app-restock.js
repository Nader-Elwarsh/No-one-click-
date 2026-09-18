/* app-restock.js — قسمين مرتبطين ببعض:

   1) نافذة موحّدة "إضافة قطعة جديدة للمخزن" (quickAddPart...) — بتتفتح من أي بحث
      عن قطعة غيار في النظام (قطع الغيار المستخدمة في الأمر، إضافة قطعة لأمر
      شغل قائم، شاشة التوريد تحت) لو الاسم اللي اتكتب مش موجود في المخزن.
      النافذة بتتبني ديناميكيًا وتتضاف لل body مرة واحدة بس وتتشارك بين كل
      الأماكن دي، بدل ما نكرر نموذج القطعة الكامل في كل شاشة على حدة.

   2) "توريد جديد" في شاشة المخزن: زيادة كمية صنف موجود (مع تحديث اختياري
      لسعر الشراء) أو إضافة صنف جديد بأول كمية له — الاتنين بيتسجلوا كحركة
      "توريد" في سجل حركات المخزن (K.m) عشان يبانوا في تقرير المخزن وسجل
      الصنف، بخلاف حركات "الخروج/الإرجاع" اللي بتتسجل تلقائي مع أوامر الشغل. */

/* ---------------------- 1) نافذة إضافة قطعة جديدة موحّدة ---------------------- */

let _qapCtx = null;

/* anchorEl (اختياري): عنصر في الصفحة نحط النافذة بعده مباشرة، عشان تفضل
   ظاهرة في نفس السياق اللي انتي شغالة فيه (تحت مربع البحث اللي كتبتي فيه
   الاسم) بدل ما تظهر تحت في نهاية الصفحة وتحتاجي تسكرولي لتحت كل مرة.
   بندوّر كمان على أقرب "صف" كامل (label أو part-add) نحط النافذة بعده،
   بدل ما نحطها جوه صف الـgrid نفسه (زي مربع البحث) وتكسر ترتيب أعمدته. */
function _ensureQuickAddPartBox(anchorEl) {
  let box = document.getElementById("quickAddPartBox");
  if (!box) {
    box = document.createElement("section");
    box.id = "quickAddPartBox";
    box.className = "quick-add hidden wide";
    box.innerHTML = `
      <h3>➕ إضافة قطعة جديدة للمخزن</h3>
      <div class="form-grid">
        <label class="wide">اسم القطعة<input id="qapName"></label>
        <label>التصنيف<div class="part-autocomplete"><input type="text" id="qapCategorySearch" class="part-autocomplete-input" placeholder="🔍 اكتب اسم التصنيف..." autocomplete="off" data-wf-event="input" data-wf-code="filterListOptions('qapCategory', this.value)" data-wf-event="focus" data-wf-code="filterListOptions('qapCategory', this.value)" data-wf-event="blur" data-wf-code="hideListResults('qapCategory')"><input type="hidden" id="qapCategory"><div id="qapCategoryResults" class="part-autocomplete-results hidden"></div></div></label>
        <label>الكود <small>اختياري</small><input id="qapCode"></label>
        <label>الكمية الأولى<input id="qapQty" type="number" min="0" value="1"></label>
        <label>سعر الشراء<input id="qapBuy" type="number" min="0" step=".01" value="0"></label>
        <label>سعر الاستخدام<input id="qapUse" type="number" min="0" step=".01" value="0"></label>
      </div>
      <div class="actions">
        <button type="button" class="primary" data-wf-event="click" data-wf-code="saveQuickAddPart()">💾 حفظ القطعة</button>
        <button type="button" class="secondary" data-wf-event="click" data-wf-code="closeQuickAddPart()">إلغاء</button>
      </div>`;
  }
  const rowAnchor = anchorEl ? (anchorEl.closest(".part-add, label") || anchorEl) : null;
  if (rowAnchor) rowAnchor.insertAdjacentElement("afterend", box);
  else if (!box.parentNode) document.body.appendChild(box);
  return box;
}

/* name: الاسم المكتوب في مربع البحث اللي فتح منه المستخدم الإضافة (بيتحط
   كقيمة مبدئية قابلة للتعديل). ctx.onCreated(part): بيتنفّذ بعد الحفظ عشان
   الشاشة اللي فتحت النافذة تختار الصنف الجديد تلقائيًا (زي أي quick-add تاني
   في النظام). ctx.defaultQty: كمية مبدئية مقترحة (مثلاً لو جاي من شاشة توريد).
   ctx.anchor: id عنصر في الصفحة نحط النافذة بعده مباشرة (شوف _ensureQuickAddPartBox). */
function openQuickAddPart(name, ctx = {}) {
  _qapCtx = ctx;
  const anchorEl = ctx.anchor ? document.getElementById(ctx.anchor) : null;
  const box = _ensureQuickAddPartBox(anchorEl);
  document.getElementById("qapName").value = (name || "").trim();
  fillListSearch("qapCategory", "partCat", "");
  document.getElementById("qapCode").value = "";
  document.getElementById("qapQty").value = ctx.defaultQty ?? 1;
  document.getElementById("qapBuy").value = "";
  document.getElementById("qapUse").value = "";
  box.classList.remove("hidden");
  box.scrollIntoView({ behavior: "smooth", block: anchorEl ? "nearest" : "center" });
  document.getElementById("qapName")?.focus();
}

function closeQuickAddPart() {
  document.getElementById("quickAddPartBox")?.classList.add("hidden");
  _qapCtx = null;
}

function saveQuickAddPart() {
  const name = (document.getElementById("qapName")?.value || "").trim();
  if (!name) return alert("اكتب اسم القطعة.");
  const dup = findDuplicatePartName(name);
  if (dup) return alert(`⚠️ الصنف «${dup.name}» موجود بالفعل بنفس الاسم. اختره من نتائج البحث بدل ما تضيفه مرة تانية.`);
  const category = document.getElementById("qapCategory")?.value || "";
  if (!category) return alert("اختر تصنيف القطعة (أو أضف تصنيف جديد من نفس المربع).");
  const code = (document.getElementById("qapCode")?.value || "").trim();
  const dupCode = code ? findDuplicatePartCode(code) : null;
  if (dupCode) return alert(`⚠️ الكود «${code}» مستخدم بالفعل مع «${dupCode.name}». اختر كودًا مختلفًا أو اتركه فاضي.`);
  const qty = +(document.getElementById("qapQty")?.value || 0);
  const buy = +(document.getElementById("qapBuy")?.value || 0);
  const use = +(document.getElementById("qapUse")?.value || 0);
  if (!Number.isFinite(qty) || qty < 0) return alert("اكتب كمية أولى صحيحة (صفر أو أكبر).");
  if (!Number.isFinite(buy) || buy < 0 || !Number.isFinite(use) || use < 0) return alert("اكتب أسعار صحيحة.");
  const p = { id: id(), name, category, code, location: "", qty, min: 0, buy, use, photo: "", createdAt: new Date().toISOString() };
  const all = arr(K.p);
  all.push(p);
  const result=withRollback([K.p,K.m],()=>{
    if(!put(K.p,all))return{ok:false};
    if(qty>0){const moves=arr(K.m);moves.push({id:id(),partId:p.id,type:"توريد",note:"إضافة صنف جديد",qty,at:new Date().toISOString()});if(!put(K.m,moves))return{ok:false}}
    return{ok:true};
  });
  if(!result?.ok)return;
  closeQuickAddPart();
  refreshAllScreens?.();
  renderParts?.();
  const ctx = _qapCtx;
  _qapCtx = null;
  if (ctx?.onCreated) ctx.onCreated(p);
}

/* ---------------------- 2) توريد جديد (شاشة المخزن) ---------------------- */

function toggleRestockBox() {
  const box = document.getElementById("restockBox");
  if (!box) return;
  box.classList.toggle("hidden");
  if (!box.classList.contains("hidden")) {
    document.getElementById("stkPart").value = "";
    document.getElementById("stkPartSearch").value = "";
    document.getElementById("stkQty").value = 1;
    document.getElementById("stkBuy").value = "";
    document.getElementById("stkNote").value = "";
    document.getElementById("stkInvoice").value = ""; refreshDualPhotoName("stkInvoice");
    renderLivePhotoPreview("stkInvoicePreview", "");
    document.getElementById("stkCurrentHint").textContent = "اكتب اسم القطعة أو الكود، أو اسم صنف جديد عشان تضيفه.";
    document.getElementById("stkPartSearch")?.focus();
  }
}
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("stkInvoice")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) { renderLivePhotoPreview("stkInvoicePreview", ""); return; }
    const dataURL = await imageToDataURL(f, 1400, 0.8);
    renderLivePhotoPreview("stkInvoicePreview", dataURL);
  });
});

function filterRestockPartOptions(q) {
  const box = document.getElementById("stkPartResults");
  if (!box) return;
  const hidden = document.getElementById("stkPart");
  if (hidden) hidden.value = "";
  q = String(q ?? document.getElementById("stkPartSearch")?.value ?? "").trim();
  const list = arr(K.p).filter(p => !p.archived);
  const qLower = q.toLowerCase();
  const matches = (q ? list.filter(p => (p.name || "").toLowerCase().includes(qLower) || (p.code || "").toLowerCase().includes(qLower)) : list).slice(0, 50);
  let html = matches.length
    ? matches.map(p => `<div class="part-ac-item" data-value="${esc(p.id)}"><b>${esc(p.name)}</b><span>الحالي: ${+p.qty || 0}</span></div>`).join("")
    : '<div class="part-ac-empty">لا توجد أصناف مطابقة.</div>';
  if (q && !list.some(p => (p.name || "").toLowerCase() === qLower)) {
    html += `<div class="part-ac-item ac-add-new" data-newpart="${esc(q)}"><b>➕ "${esc(q)}" صنف جديد — إضافته للمخزن</b></div>`;
  }
  box.innerHTML = html;
  box.querySelectorAll("[data-value]").forEach(item => {
    item.onmousedown = () => selectRestockPart(item.dataset.value);
  });
  box.querySelectorAll("[data-newpart]").forEach(item => {
    item.onmousedown = () => {
      const typedName = item.dataset.newpart;
      const qty = +(document.getElementById("stkQty")?.value || 1);
      box.classList.add("hidden");
      openQuickAddPart(typedName, {
        anchor: "stkPartResults",
        defaultQty: Number.isFinite(qty) && qty > 0 ? qty : 1,
        onCreated: (p) => {
          toggleRestockBox();
          alert(`✅ تمت إضافة الصنف الجديد «${p.name}» للمخزن بكمية ${p.qty}.`);
        }
      });
    };
  });
  box.classList.remove("hidden");
}

function selectRestockPart(pid) {
  const p = arr(K.p).find(x => x.id === pid);
  if (!p) return;
  const hidden = document.getElementById("stkPart"), search = document.getElementById("stkPartSearch"), box = document.getElementById("stkPartResults"), hint = document.getElementById("stkCurrentHint"), buyEl = document.getElementById("stkBuy");
  if (hidden) hidden.value = pid;
  if (search) search.value = p.name;
  if (box) box.classList.add("hidden");
  if (hint) hint.textContent = `الكمية الحالية: ${+p.qty || 0} — سعر الشراء الحالي: ${(+p.buy || 0).toFixed(2)} ج.`;
  if (buyEl) buyEl.placeholder = (+p.buy || 0).toFixed(2);
}

function hideRestockPartResults() {
  setTimeout(() => document.getElementById("stkPartResults")?.classList.add("hidden"), 150);
}

async function saveRestock() {
  const pid = document.getElementById("stkPart")?.value || "";
  if (!pid) return alert("اختر قطعة موجودة من نتائج البحث، أو استخدم خيار «صنف جديد» لو مش موجودة.");
  const qty = +(document.getElementById("stkQty")?.value || 0);
  if (!Number.isFinite(qty) || qty < 1) return alert("اكتب كمية واردة صحيحة (أكبر من صفر).");
  const buyEl = document.getElementById("stkBuy"), note = (document.getElementById("stkNote")?.value || "").trim();
  const invoiceFile = document.getElementById("stkInvoice")?.files?.[0] || null;
  const all = arr(K.p), p = all.find(x => x.id === pid);
  if (!p) return alert("القطعة غير موجودة (ربما اتحذفت). جرّب تدور تاني.");
  p.qty = (+p.qty || 0) + qty;
  if (buyEl?.value !== "" && buyEl?.value != null) {
    const nb = +buyEl.value;
    if (Number.isFinite(nb) && nb >= 0) p.buy = nb;
  }
  let invoice = "";
  if (invoiceFile) {
    const dataURL = await imageToDataURL(invoiceFile, 1400, 0.72);
    invoice = window.ImageStore ? await window.ImageStore.save(dataURL) : dataURL;
  }
  const result=withRollback([K.p,K.m],()=>{
    if(!put(K.p,all))return{ok:false};
    const moves=arr(K.m);moves.push({id:id(),partId:pid,type:"توريد",note,qty,invoice,at:new Date().toISOString()});
    if(!put(K.m,moves))return{ok:false};
    return{ok:true};
  });
  if(!result?.ok)return;
  refreshAllScreens?.();
  renderParts?.();
  alert(`✅ تم تسجيل توريد ${qty} من «${p.name}». الكمية الحالية الآن: ${p.qty}.`);
  toggleRestockBox();
}
