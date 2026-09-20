/* app-trash.js — سلة المهملات: نسخة قابلة للاسترجاع من آخر عمليات حذف
   العميل/الجهاز/أمر الشغل الفردية (مش الحذف الجماعي "حذف الكل" — ده بيفضل
   نهائي زي ما هو ومتأكد عليه مرتين أصلًا). كل عملية حذف من التلاتة دي
   بتحفظ نسخة كاملة من البيانات المحذوفة + أي أثر جانبي (قطع رجعت للمخزون،
   حركات مخزون اتشالت، حركات محفظة اتقفلت) عشان يبقى ممكن ترجيعها بالظبط
   زي ما كانت، مش مجرد إعادة إضافة السجل الأساسي لوحده. */
const TRASH_LIMIT = 200;

function pushToTrash(type, label, payload) {
  const list = arr(K.trash);
  list.push({ id: id(), type, label: String(label || ""), payload, deletedAt: new Date().toISOString() });
  put(K.trash, list.slice(-TRASH_LIMIT));
}

function trashEntries() { return arr(K.trash).slice().reverse(); }

// بيرجع كل حركات المحفظة اللي كانت متسجلة "محذوفة" (deleted:true) بنفس
// refKeys بتاعة الأوامر دي وقت الحذف، عشان نقدر نرجعها كما هي بعد الاسترجاع
// (من غير ما نلمس أي حركة تانية اتحذفت لسبب مختلف تمامًا بعد كده).
function walletRefKeysForOrders(orderIds) {
  return (orderIds || []).flatMap(rid => [`order-deposit-${rid}`, `order-final-${rid}`]);
}

function restoreFromTrash(trashId) {
  const list = arr(K.trash);
  const idx = list.findIndex(x => x.id === trashId);
  if (idx < 0) return;
  const entry = list[idx];
  if (!confirm(`استرجاع "${entry.label}"؟ هيرجع بكل بياناته وحركاته المرتبطة زي ما كانت قبل الحذف.`)) return;
  const p = entry.payload || {};
  const values = {};

  if (entry.type === "request") {
    values[K.r] = arr(K.r).concat([p.request]);
    values[K.m] = arr(K.m).concat(p.moves || []);
  } else if (entry.type === "device") {
    values[K.d] = arr(K.d).concat([p.device]);
    values[K.r] = arr(K.r).concat(p.requests || []);
    values[K.m] = arr(K.m).concat(p.moves || []);
  } else if (entry.type === "customer") {
    values[K.c] = arr(K.c).concat([p.customer]);
    values[K.d] = arr(K.d).concat(p.devices || []);
    values[K.r] = arr(K.r).concat(p.requests || []);
    values[K.m] = arr(K.m).concat(p.moves || []);
  } else return;

  // رجّع القطع اللي كانت اتحطت في المخزون وقت الحذف — بننقص بالظبط نفس
  // الكمية اللي اتضافت، ولو المخزون الحالي مش كافي (اتصرف في حاجة تانية من
  // ساعتها) بنوقف عند صفر بدل ما نخليه سالب، ونوضح ده للمستخدم.
  const stock = arr(K.p);
  let shortfall = false;
  (p.partsDelta || []).forEach(d => {
    const part = stock.find(x => x.id === d.partId);
    if (!part) return;
    const next = (+part.qty || 0) - d.qty;
    if (next < 0) shortfall = true;
    part.qty = Math.max(0, next);
  });
  values[K.p] = stock;

  const refKeys = new Set(p.walletRefKeys || []);
  values[K.wtx] = arr(K.wtx).map(x => refKeys.has(String(x.refKey || "")) ? { ...x, deleted: false } : x);
  values[K.trash] = arr(K.trash).filter(x => x.id !== trashId);

  if (!commitStorage(values)) { alert("تعذر الاسترجاع؛ لم يتم تنفيذ أي تغيير."); return; }
  window.auditLog?.("استرجاع", entry.type === "customer" ? "عميل" : entry.type === "device" ? "جهاز" : "أمر شغل", entry.id, entry.label);
  refreshAllScreens?.();
  renderTrash();
  alert(shortfall ? "تم الاسترجاع، لكن كمية بعض القطع في المخزون حاليًا أقل مما كان قبل الحذف (اتصرفت في حاجة تانية)، فرجعت لصفر بدل ما تبقى بالكمية الكاملة." : "تم الاسترجاع بنجاح.");
}

function permanentlyDeleteTrash(trashId) {
  const entry = arr(K.trash).find(x => x.id === trashId);
  if (!entry) return;
  if (!confirm(`حذف "${entry.label}" نهائيًا من سلة المهملات؟ بعدها مش هينفع يترجع خالص.`)) return;
  if (!put(K.trash, arr(K.trash).filter(x => x.id !== trashId))) { alert("تعذر الحذف النهائي؛ لم يتم حذف السجل."); return; }
  const payload = entry.payload || {};
  if (entry.type === "request") cleanupRequestRecordings?.(payload.request ? [payload.request] : []);
  if (entry.type === "device") {
    cleanupDevicePhotos?.(payload.device ? [payload.device] : []);
    cleanupRequestRecordings?.(payload.requests || []);
  }
  if (entry.type === "customer") {
    cleanupDevicePhotos?.(payload.devices || []);
    cleanupRequestRecordings?.(payload.requests || []);
  }
  renderTrash();
}

function renderTrash() {
  const host = document.getElementById("trashResult");
  if (!host) return;
  const rows = trashEntries();
  const icon = { customer: "👤", device: "🔧", request: "🛠️" };
  host.innerHTML = rows.length
    ? `<div class="audit-list">${rows.map(x => `<div class="setting-row"><span><b>${icon[x.type] || "🗑️"} ${esc(x.label)}</b><small class="hint">اتحذف ${esc(new Date(x.deletedAt).toLocaleString("ar-EG"))}</small></span><span class="compact-actions"><button class="secondary small-btn" type="button" data-wf-event="click" data-wf-code="restoreFromTrash('${x.id}')">↩️ استرجاع</button><button class="danger-btn small-btn" type="button" data-wf-event="click" data-wf-code="permanentlyDeleteTrash('${x.id}')">🗑️ حذف نهائي</button></span></div>`).join("")}</div>`
    : `<div class="hint">سلة المهملات فاضية حاليًا.</div>`;
}
document.addEventListener("DOMContentLoaded", renderTrash);
