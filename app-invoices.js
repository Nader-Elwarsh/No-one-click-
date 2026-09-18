/* فواتير المخزن: صورة فاتورة واحدة ممكن تتربط بأكتر من صنف، وتظهر بعدين في صفحة كل صنف مرتبط بيها. */
let _editingInvoiceId = null;

function toggleInvoicesBox() {
  const box = document.getElementById("invoicesBox");
  if (!box) return;
  box.classList.toggle("hidden");
  if (!box.classList.contains("hidden")) { invoiceFormReset(); renderInvoices(); }
}

function invoicePartOptionsHtml(filter) {
  filter = (filter || "").trim();
  const parts = arr(K.p).filter(p => !p.archived);
  const list = filter ? parts.filter(p => (p.name || "").includes(filter) || (p.code || "").includes(filter)) : parts;
  let html = list.length ? list.slice(0, 80).map(p => `<label class="inv-part-check"><input type="checkbox" value="${p.id}" class="inv-part-cb"> ${esc(p.name)}${p.code ? ` <small>(${esc(p.code)})</small>` : ""}</label>`).join("") : `<div class="hint">لا توجد أصناف مطابقة.</div>`;
  // لو الاسم المكتوب في البحث مش موجود بالظبط في المخزن، نسيب خيار
  // إضافته كصنف جديد مباشرة (بنفس نافذة "إضافة قطعة جديدة" المشتركة
  // المستخدمة في التوريد)، عشان تقدري تسجّليه وتكتبي تفاصيله من الفاتورة
  // نفسها من غير ما تخرجي من هنا وتدخلي لشاشة تانية.
  if (filter && !parts.some(p => (p.name || "").trim().toLowerCase() === filter.toLowerCase())) {
    html += `<button type="button" class="secondary small-btn inv-add-new-part" data-newpart="${esc(filter)}">➕ "${esc(filter)}" صنف جديد — إضافته للمخزن</button>`;
  }
  return html;
}
function filterInvoicePartOptions() {
  const host = document.getElementById("invPartOptions"); if (!host) return;
  const q = document.getElementById("invPartFilter")?.value || "";
  const checked = new Set(Array.from(host.querySelectorAll(".inv-part-cb:checked")).map(x => x.value));
  host.innerHTML = invoicePartOptionsHtml(q);
  host.querySelectorAll(".inv-part-cb").forEach(cb => { if (checked.has(cb.value)) cb.checked = true; });
  host.querySelectorAll(".inv-add-new-part").forEach(btn => {
    btn.addEventListener("click", () => {
      const typedName = btn.dataset.newpart;
      openQuickAddPart(typedName, {
        anchor: "invPartOptions",
        onCreated: (p) => {
          const filterEl = document.getElementById("invPartFilter"); if (filterEl) filterEl.value = "";
          filterInvoicePartOptions();
          const cb = document.querySelector(`#invPartOptions .inv-part-cb[value="${p.id}"]`);
          if (cb) { cb.checked = true; cb.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
        }
      });
    });
  });
}
function invoiceFormReset() {
  _editingInvoiceId = null;
  const photo = document.getElementById("invPhoto"); if (photo) photo.value = ""; refreshDualPhotoName("invPhoto");
  const preview = document.getElementById("invPhotoPreview"); if (preview) preview.innerHTML = "";
  const note = document.getElementById("invNote"); if (note) note.value = "";
  const btn = document.getElementById("invSaveBtn"); if (btn) btn.textContent = "💾 حفظ الفاتورة";
  const filterEl = document.getElementById("invPartFilter"); if (filterEl) filterEl.value = "";
  filterInvoicePartOptions();
}
// معاينة صورة الفاتورة فورًا بعد اختيارها (كاميرا أو من الصور)، عشان تبقى
// ظاهرة وواضحة على الصفحة نفسها جنب قائمة اختيار الأصناف المرتبطة بيها —
// بدل ما تحتاجي تحفظي وتضغطي "عرض" الأول عشان تشوفيها.
async function showInvoicePhotoPreview(dataURL) {
  renderLivePhotoPreview("invPhotoPreview", dataURL);
}
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("invPhoto")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) { showInvoicePhotoPreview(""); return; }
    const dataURL = await imageToDataURL(f, 1400, 0.8);
    showInvoicePhotoPreview(dataURL);
  });
});
async function editInvoiceLinks(invId) {
  const inv = arr(K.inv).find(x => x.id === invId); if (!inv) return;
  const box = document.getElementById("invoicesBox");
  if (box && box.classList.contains("hidden")) box.classList.remove("hidden");
  _editingInvoiceId = invId;
  const note = document.getElementById("invNote"); if (note) note.value = inv.note || "";
  const filterEl = document.getElementById("invPartFilter"); if (filterEl) filterEl.value = "";
  filterInvoicePartOptions();
  (inv.partIds || []).forEach(pid => {
    const cb = document.querySelector(`#invPartOptions .inv-part-cb[value="${pid}"]`);
    if (cb) cb.checked = true;
  });
  const btn = document.getElementById("invSaveBtn"); if (btn) btn.textContent = "💾 تحديث الفاتورة";
  document.getElementById("invoiceForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const src = window.ImageStore ? await window.ImageStore.resolveSrc(inv.photo) : inv.photo;
  if (src) showInvoicePhotoPreview(src);
}
async function saveInvoice() {
  const file = document.getElementById("invPhoto")?.files?.[0] || null;
  const note = (document.getElementById("invNote")?.value || "").trim();
  const partIds = Array.from(document.querySelectorAll("#invPartOptions .inv-part-cb:checked")).map(x => x.value);
  const list = arr(K.inv);
  if (_editingInvoiceId) {
    const inv = list.find(x => x.id === _editingInvoiceId);
    if (!inv) { invoiceFormReset(); renderInvoices(); return; }
    // لو في أصناف كانت مربوطة بالفاتورة دي وبقت مش متحدّدة دلوقتي (يعني
    // هتتشال من الربط)، ننبّه قبل الحفظ عشان تتأكدي إنه مقصود ومش بغلط.
    const removedIds = (inv.partIds || []).filter(pid => !partIds.includes(pid));
    if (removedIds.length) {
      const removedNames = removedIds.map(pid => arr(K.p).find(p => p.id === pid)?.name).filter(Boolean);
      const namesText = removedNames.length ? removedNames.join("، ") : `${removedIds.length} صنف`;
      if (!confirm(`دا هيلغي ربط هذه الفاتورة بـ: ${namesText}.\nمتأكدة إنك عايزة تكمّلي الحفظ كده؟`)) return;
    }
    if (file) {
      const dataURL = await imageToDataURL(file, 1400, 0.72);
      inv.photo = window.ImageStore ? await window.ImageStore.save(dataURL, inv.photo) : dataURL;
    }
    inv.note = note; inv.partIds = partIds;
    if (!saveJSONSafe(K.inv, list)) return;
    invoiceFormReset(); renderInvoices();
    if (typeof partProfile === "function") partProfile();
    return;
  }
  if (!file) return alert("اختر صورة الفاتورة الأول.");
  const dataURL = await imageToDataURL(file, 1400, 0.72);
  const photo = window.ImageStore ? await window.ImageStore.save(dataURL) : dataURL;
  list.push({ id: id(), photo, note, partIds, at: new Date().toISOString() });
  if (!saveJSONSafe(K.inv, list)) return;
  invoiceFormReset(); renderInvoices();
  alert("تم حفظ الفاتورة" + (partIds.length ? ` وربطها بـ ${partIds.length} صنف.` : "."));
}
function deleteInvoiceRecord(invId) {
  const list = arr(K.inv), inv = list.find(x => x.id === invId); if (!inv) return;
  if (!confirm("حذف هذه الفاتورة نهائيًا؟ (مش هيأثر على الأصناف أو كمياتها، مجرد صورة الفاتورة وربطها هيتشال)")) return;
  if (window.ImageStore?.delete && inv.photo) window.ImageStore.delete(inv.photo);
  if (!saveJSONSafe(K.inv, list.filter(x => x.id !== invId))) return;
  if (_editingInvoiceId === invId) invoiceFormReset();
  renderInvoices();
  if (typeof partProfile === "function") partProfile();
}
function invoicePartNames(inv) {
  return (inv.partIds || []).map(pid => arr(K.p).find(p => p.id === pid)?.name).filter(Boolean);
}
// بيملا صور الفواتير (اللي اتحطت كـplaceholder فاضي وقت الرندر) بعد ما
// نجيبها من مخزن الصور بشكل غير متزامن — نفس الأسلوب المستخدم لصورة
// الصنف/الجهاز في partProfile، عشان الصورة تظهر واضحة على الصفحة نفسها
// من غير ما تحتاجي تضغطي "عرض" الأول.
async function resolveInvoiceThumbs(root) {
  const imgs = Array.from((root || document).querySelectorAll(".invoice-thumb[data-photo-ref]"));
  await Promise.all(imgs.map(async img => {
    const ref = img.dataset.photoRef;
    const src = window.ImageStore ? await window.ImageStore.resolveSrc(ref) : ref;
    if (src) img.src = src;
  }));
}
function renderInvoices() {
  const host = document.getElementById("invoicesList"); if (!host) return;
  const list = arr(K.inv).slice().reverse();
  if (!list.length) { host.innerHTML = `<div class="hint">لا توجد فواتير مسجّلة بعد.</div>`; return; }
  host.innerHTML = list.map(inv => {
    const names = invoicePartNames(inv);
    return `<div class="item invoice-row">
      <img class="invoice-thumb" alt="🧾" data-photo-ref="${esc(inv.photo)}" data-wf-event="click" data-wf-code="showImagePreview('${esc(inv.photo)}','🧾 فاتورة مخزن')">
      <div class="invoice-meta">
        <small>${new Date(inv.at).toLocaleDateString("ar-EG")}${inv.note ? " • " + esc(inv.note) : ""}</small>
        <small>${names.length ? `🔗 ${names.map(esc).join("، ")}` : "بدون ربط بصنف"}</small>
      </div>
      <div class="compact-actions"><button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="editInvoiceLinks('${inv.id}')">✏️ تعديل الربط</button><button type="button" class="danger-btn mini-action" data-wf-event="click" data-wf-code="deleteInvoiceRecord('${inv.id}')">🗑️ حذف</button></div>
    </div>`;
  }).join("");
  resolveInvoiceThumbs(host);
}
/* يستخدم من صفحة الصنف نفسه: بيعرض الفواتير المرتبطة بيه فعلًا (مع زرار
   إلغاء ربط لكل واحدة، بتأكيد قبل التنفيذ)، وتحته قسم قابل للفتح لربط
   الصنف بفاتورة تانية موجودة (تقدري تربطيه بأكتر من فاتورة من غير حدود). */
function partLinkedInvoicesHtml(partId) {
  const linked = arr(K.inv).filter(inv => (inv.partIds || []).includes(partId)).slice().reverse();
  const linkedRows = linked.length ? linked.map(inv => `
    <div class="item invoice-row">
      <img class="invoice-thumb" alt="🧾" data-photo-ref="${esc(inv.photo)}" data-wf-event="click" data-wf-code="showImagePreview('${esc(inv.photo)}','🧾 فاتورة مخزن')">
      <div class="invoice-meta"><small>${new Date(inv.at).toLocaleDateString("ar-EG")}${inv.note ? " • " + esc(inv.note) : ""}</small></div>
      <button type="button" class="danger-btn mini-action" data-wf-event="click" data-wf-code="unlinkPartInvoice('${partId}','${inv.id}')">🗑️ إلغاء الربط</button>
    </div>`).join("") : `<div class="hint">لا توجد فواتير مرتبطة بهذا الصنف حتى الآن.</div>`;
  return `<h2>🧾 فواتير مرتبطة بهذا الصنف</h2>
    <div class="invoice-list">${linkedRows}</div>
    <button type="button" class="secondary small-btn" data-wf-event="click" data-wf-code="togglePartInvoiceLinker('${partId}')">➕ ربط بفاتورة موجودة</button>
    <div id="partInvoiceLinker_${partId}" class="hidden" style="margin-top:8px">
      <input type="text" placeholder="🔍 دوّر بالتاريخ أو الملاحظة..." data-wf-event="input" data-wf-code="renderPartInvoiceLinkOptions('${partId}', this.value)">
      <div id="partInvoiceLinkOptions_${partId}" class="inv-part-options" style="margin-top:6px"></div>
    </div>`;
}
function togglePartInvoiceLinker(partId) {
  const box = document.getElementById(`partInvoiceLinker_${partId}`); if (!box) return;
  box.classList.toggle("hidden");
  if (!box.classList.contains("hidden")) renderPartInvoiceLinkOptions(partId, "");
}
function renderPartInvoiceLinkOptions(partId, filter) {
  const host = document.getElementById(`partInvoiceLinkOptions_${partId}`); if (!host) return;
  filter = (filter || "").trim();
  const candidates = arr(K.inv).filter(inv => !(inv.partIds || []).includes(partId)).slice().reverse();
  const filtered = filter ? candidates.filter(inv => (inv.note || "").includes(filter) || new Date(inv.at).toLocaleDateString("ar-EG").includes(filter)) : candidates;
  host.innerHTML = filtered.length ? filtered.slice(0, 60).map(inv => `
    <div class="item invoice-row">
      <img class="invoice-thumb" alt="🧾" data-photo-ref="${esc(inv.photo)}" data-wf-event="click" data-wf-code="showImagePreview('${esc(inv.photo)}','🧾 فاتورة مخزن')">
      <div class="invoice-meta"><small>${new Date(inv.at).toLocaleDateString("ar-EG")}${inv.note ? " • " + esc(inv.note) : ""}</small></div>
      <button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="linkPartInvoice('${partId}','${inv.id}')">🔗 ربط</button>
    </div>`).join("") : `<div class="hint">${filter ? "لا توجد فواتير مطابقة." : "كل الفواتير المسجّلة مرتبطة بالصنف ده فعلًا."}</div>`;
  resolveInvoiceThumbs(host);
}
function linkPartInvoice(partId, invId) {
  const list = arr(K.inv), inv = list.find(x => x.id === invId); if (!inv) return;
  if (!(inv.partIds || []).includes(partId)) {
    inv.partIds = [...(inv.partIds || []), partId];
    if (!saveJSONSafe(K.inv, list)) return;
  }
  if (typeof partProfile === "function") partProfile();
}
function unlinkPartInvoice(partId, invId) {
  const list = arr(K.inv), inv = list.find(x => x.id === invId); if (!inv) return;
  const when = `${new Date(inv.at).toLocaleDateString("ar-EG")}${inv.note ? " — " + inv.note : ""}`;
  if (!confirm(`هل أنت متأكدة من إلغاء ربط هذه الفاتورة (${when}) بهذا الصنف؟`)) return;
  inv.partIds = (inv.partIds || []).filter(pid => pid !== partId);
  if (!saveJSONSafe(K.inv, list)) return;
  if (typeof partProfile === "function") partProfile();
}
document.addEventListener("DOMContentLoaded", () => { if (document.getElementById("invoicesList")) renderInvoices(); });
