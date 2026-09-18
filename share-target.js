/* share-target.js — منطق صفحة استقبال "مشاركة" مكالمة من تطبيق تاني (زي
   تطبيق تسجيل المكالمات) وتحويلها لأمر شغل بسرعة، أو إلحاقها بأمر مفتوح
   موجود بالفعل، من غير ما المستخدم يفتح النظام ويدور يدويًا بنفسه.
   راجع: manifest.json (share_target) — service-worker.js (استقبال
   الـ POST الفعلي وحفظه) — share-store.js (تمرير البيانات للصفحة دي
   أول مرة بس) — pending-calls.html (قائمة المكالمات اللي لسه ماتعملهاش
   أمر شغل، لو المستخدم قفل الصفحة قبل ما يكمّل). */

// آخر مكالمة "معلّقة" شغالين عليها دلوقتي (لو موجودة) — بتتشال من
// التخزين لما ننشئ أو نلحق أمر شغل بنجاح، وبتفضل موجودة لو المستخدم
// قفل الصفحة من غير ما يكمّل (عشان كده بنحفظها فورًا، مش بس وقت الإنشاء).
let __pendingCallId = null;
// ref التسجيل الصوتي في IndexedDB (لو موجود)، بييجي من المكالمة المعلّقة
// نفسها (اتخزن فيها من أول لحظة)، مش بيتخزن تاني هنا عشان منكررش النسخ.
let __audioRef = null;
// رقم الأمر المفتوح (لو لقينا واحد لنفس العميل) — لو المستخدم اختار
// "ألحق بالأمر ده" بدل ما ينشئ أمر جديد.
let __existingOpenRequestId = null;

function extractPhoneFromText(s) {
  if (!s) return "";
  let m = String(s).match(/(?:\+?20|0)?1[0125]\d{8}/g);
  if (!m || !m.length) return "";
  let raw = m[0].replace(/\D/g, "");
  if (raw.startsWith("20")) raw = raw.slice(2);
  if (!raw.startsWith("0")) raw = "0" + raw;
  return raw;
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) { resolve(""); return; }
    let r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function findOpenRequestForCustomer(customerId) {
  return arr(K.r).find(x => x.customerId === customerId && x.status !== "مكتمل" && x.status !== "ملغي") || null;
}

// بيحفظ المكالمة كـ"معلّقة" في localStorage فور وصولها، قبل حتى ما نملى
// الفورم — عشان لو المستخدم قفل الصفحة أو الموبايل من غير ما يكمّل،
// المكالمة تفضل موجودة وميضيعش فيها حاجة (يقدر يكملها بعدين من لوحة
// التحكم عن طريق pending-calls.html).
function savePendingCall(entry) {
  let list = arr(K.pc);
  list.push(entry);
  put(K.pc, list);
}

function removePendingCall(callId) {
  if (!callId) return;
  put(K.pc, arr(K.pc).filter(x => x.id !== callId));
}

async function initShareTarget() {
  let box = document.getElementById("shareSummaryBox");
  if (!box) return; // الصفحة دي مش share-target.html

  let q = new URLSearchParams(location.search);
  let resumeId = q.get("resume");
  let isFresh = q.get("shared") === "1";
  if (!isFresh && !resumeId) { box.classList.add("hidden"); return; }

  let title = "", text = "", url = "", fileName = "", audioRef = null, entryId = null;

  if (isFresh) {
    let payload = (typeof shareTake === "function") ? await shareTake() : null;
    if (!payload) {
      box.innerHTML = '<div class="hint">مفيش بيانات مشاركة جديدة قدرنا نقراها (ممكن الصفحة اتفتحت تاني بعد أول مرة). تقدر تكمّل أمر شغل عادي من الفورم تحت براحتك.</div>';
      return;
    }
    title = payload.title; text = payload.text; url = payload.url; fileName = payload.fileName;
    if (payload.file) {
      let audioBox = document.getElementById("shareAudioPreview");
      if (audioBox) {
        try {
          let objUrl = URL.createObjectURL(payload.file);
          audioBox.innerHTML = `<audio controls src="${objUrl}" style="width:100%"></audio>`;
          audioBox.classList.remove("hidden");
        } catch (e) { console.error("[share-target] تعذرت معاينة الملف", e); }
      }
      let dataUrl = await fileToDataURL(payload.file).catch(() => "");
      if (dataUrl && window.ImageStore) {
        try { audioRef = await window.ImageStore.save(dataUrl); }
        catch (e) { console.error("[share-target] فشل حفظ التسجيل مؤقتًا", e); }
      }
    }
    let combinedTextForPhone = [title, text, url].filter(Boolean).join("\n");
    let phone = extractPhoneFromText(combinedTextForPhone) || extractPhoneFromText(fileName);
    entryId = id();
    savePendingCall({ id: entryId, title, text, url, fileName, audioRef, phone, at: Date.now() });
  } else {
    let pending = arr(K.pc).find(x => x.id === resumeId);
    if (!pending) {
      box.innerHTML = '<div class="hint">المكالمة دي اتشالت أو اتحولت لأمر شغل بالفعل. تقدر تكمّل أمر شغل عادي من الفورم تحت.</div>';
      return;
    }
    title = pending.title; text = pending.text; url = pending.url; fileName = pending.fileName; audioRef = pending.audioRef; entryId = pending.id;
    if (audioRef && window.ImageStore) {
      let audioBox = document.getElementById("shareAudioPreview");
      try {
        let src = await window.ImageStore.resolveSrc(audioRef);
        if (audioBox && src) {
          audioBox.innerHTML = `<audio controls src="${src}" style="width:100%"></audio>`;
          audioBox.classList.remove("hidden");
        }
      } catch (e) { console.error("[share-target] تعذر استرجاع التسجيل", e); }
    }
  }

  __pendingCallId = entryId;
  __audioRef = audioRef;

  let combinedText = [title, text, url].filter(Boolean).join("\n");
  let phone = extractPhoneFromText(combinedText) || extractPhoneFromText(fileName);

  let summary = [];
  if (combinedText) summary.push(`<div class="kv"><b>📄 بيانات من تطبيق المشاركة</b><div>${esc(combinedText).replace(/\n/g, "<br>")}</div></div>`);
  if (fileName) summary.push(`<div class="kv"><b>🎙️ الملف المرفق</b>${esc(fileName)}</div>`);
  box.innerHTML = summary.join("") || '<div class="hint">اتشاركت من غير نص أو اسم ملف واضح — كمّل البيانات يدويًا تحت.</div>';

  let faultEl = document.getElementById("qoFault");
  if (faultEl && !faultEl.value.trim()) {
    faultEl.value = "📞 بلاغ عن طريق مكالمة" + (combinedText ? ("\n" + combinedText) : "");
  }

  let note = document.getElementById("sharePhoneNote");
  let existing = phone && (typeof duplicateCustomerByPhone === "function") ? duplicateCustomerByPhone(phone) : null;
  if (existing) {
    fillCustomerAutocomplete("qoCustomer", existing.id);
    fillDevice(document.getElementById("qoDevice"), existing.id, "");
    if (note) note.textContent = `✅ الرقم ${phone} متسجل عندك للعميل: ${existing.name || "—"} (اتحدد تلقائيًا تحت).`;

    let openReq = findOpenRequestForCustomer(existing.id);
    if (openReq) {
      __existingOpenRequestId = openReq.id;
      let attachBox = document.getElementById("shareAttachExistingBox");
      if (attachBox) {
        attachBox.classList.remove("hidden");
        attachBox.innerHTML = `<div class="hint">👤 للعميل ده أمر شغل مفتوح بالفعل: <b>${esc(openReq.no)}</b> (${esc(openReq.status)}). ممكن تلحق التسجيل/البيانات دي بيه بدل ما تعمل أمر جديد.</div>
        <div class="actions"><button type="button" class="primary" data-wf-event="click" data-wf-code="attachRecordingToExistingRequest()">📎 ألحق بالأمر ${esc(openReq.no)}</button><button type="button" class="secondary" data-wf-event="click" data-wf-code="dismissAttachExisting()">➕ لأ، أمر جديد</button></div>`;
      }
    }
  } else if (phone) {
    if (note) note.textContent = `🆕 الرقم ${phone} مش متسجل عندك — دوس "➕ عميل" واتملى لك تلقائيًا.`;
    let phoneEl = document.getElementById("qoPhone");
    if (phoneEl) phoneEl.value = phone;
    toggleQuickAdd("qoCustomerBox");
  } else if (note) {
    note.textContent = "ℹ️ مقدرناش نطلع رقم تليفون من المشاركة تلقائيًا — اختار العميل يدويًا تحت.";
  }
}

function dismissAttachExisting() {
  __existingOpenRequestId = null;
  let attachBox = document.getElementById("shareAttachExistingBox");
  if (attachBox) attachBox.classList.add("hidden");
}

// بعد ما التسجيل يتلحق بأمر شغل (جديد أو مفتوح)، بنسأل المستخدم يحب
// يحتفظ بالتسجيل جوه الأمر (ياخد مساحة تخزين دائمة في IndexedDB) ولا
// يحذفه فورًا — غالبًا التسجيل مطلوب بس وقت إنشاء الأمر (لمعرفة رقم
// التليفون/تفاصيل العطل)، فمفيش داعي يفضل مخزّن بعد كده. لو اختار
// الحذف، بنمسحه فورًا من ImageStore عشان مايخدش مساحة من غير فايدة.
async function maybeDiscardRecording(ref) {
  if (!ref) return null;
  let keep = confirm("تم إرفاق التسجيل الصوتي بأمر الشغل.\n\nموافق = الاحتفاظ به داخل الأمر.\nإلغاء = حذفه الآن لتوفير مساحة التخزين (يُنصح به لو مش محتاجه غير وقت إنشاء الأمر).");
  if (keep) return ref;
  if (window.ImageStore?.delete) { try { await window.ImageStore.delete(ref); } catch (e) { console.error("[share-target] فشل حذف التسجيل", e); } }
  return null;
}

// إلحاق التسجيل/الملاحظة الجديدة بأمر شغل مفتوح بالفعل، بدل إنشاء أمر
// مكرر لنفس العميل ونفس المشكلة.
async function attachRecordingToExistingRequest() {
  if (!__existingOpenRequestId) return;
  let list = arr(K.r);
  let idx = list.findIndex(x => x.id === __existingOpenRequestId);
  if (idx === -1) { alert("الأمر ده مش موجود، جرب تاني."); return; }
  let r = list[idx];
  let faultEl = document.getElementById("qoFault");
  let addedNote = (faultEl?.value || "").trim();
  if (addedNote) {
    let stamp = new Date().toLocaleString("ar-EG");
    r.fault = (r.fault ? r.fault + "\n\n" : "") + `— مكالمة إضافية (${stamp}):\n${addedNote}`;
  }
  if (__audioRef) {
    let keptRef = await maybeDiscardRecording(__audioRef);
    if (keptRef) {
      r.callRecordings = Array.isArray(r.callRecordings) ? r.callRecordings : [];
      r.callRecordings.push({ ref: keptRef, at: Date.now() });
    }
  }
  list[idx] = r;
  if(!saveJSONSafe(K.r,list))return;
  removePendingCall(__pendingCallId);
  location.href = `request.html?id=${r.id}`;
}

// إنشاء أمر شغل جديد بالكامل من بيانات المكالمة — نفس منطق
// quickCreateRequest (app-quick-add.js) بالظبط، بس بتلحق مرجع تسجيل
// المكالمة (لو موجود) على الأمر بعد إنشائه. اتعملت نسخة منفصلة بدل
// تعديل quickCreateRequest الأصلية عشان الأخيرة دي مستخدمة في "أمر شغل
// سريع" بالشاشة الرئيسية ومالهاش أي علاقة بمشاركة المكالمات.
async function createRequestFromCallShare() {
  let cid = document.getElementById("qoCustomer")?.value, did = document.getElementById("qoDevice")?.value, fault = (document.getElementById("qoFault")?.value || "").trim();
  if (!cid) return alert("اختر العميل أولاً.");
  if (!did) return alert("اختر الجهاز أولاً.");
  if (!fault) return alert("اكتب وصف العطل.");
  let s = settings();
  let r = { id: id(), no: orderNo(), customerId: cid, deviceId: did, addressKey: "main", visit: "", status: "جديد", executionPlace: (s.executionPlaces || [])[0] || "عند العميل", workshopStatus: (s.workshopStatuses || [])[0] || "غير مطلوب", partsWaiting: false, tag: "", fault, work: "", labor: 0, parts: [], partsTotal: 0, partsCost: 0, total: 0, deposit: 0, remain: 0, closed: false, createdAt: new Date().toISOString() };
  if (__audioRef) {
    let keptRef = await maybeDiscardRecording(__audioRef);
    if (keptRef) r.callRecordings = [{ ref: keptRef, at: Date.now() }];
  }
  recordStatusHistory(r, "", r.status);
  applyStatusTimestamp(r, r.status);
  if(!saveJSONSafe(K.r,arr(K.r).concat(r)))return;
  removePendingCall(__pendingCallId);
  location.href = `request.html?id=${r.id}`;
}

// لازم نستنى initQuickOrder (بتاعة app-quick-add.js) تخلص الأول، لأنها
// بترجّع قايمة الجهاز لحالتها الفاضية عند تحميل الصفحة (خاصة بأمر الشغل
// السريع في الشاشة الرئيسية) — لو initShareTarget اشتغلت قبلها كانت
// هتمسح العميل/الجهاز اللي حددناهم تلقائيًا من رقم التليفون.
if (typeof window.initQuickOrder === "function") {
  const _oldInitQuickOrderForShare = window.initQuickOrder;
  window.initQuickOrder = function () {
    _oldInitQuickOrderForShare();
    initShareTarget();
  };
}
