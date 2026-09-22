/* =========================================================
   الورشة الفنية — أكواد الكباسات (app-compressor-codes.js)
   =========================================================
   مرجع بحث عن قدرات الكباسات (قاعدة موديلات ومواصفات عبر 56 ماركة)،
   مأخوذ من ملف إكسل مرجعي وحُوّل لقاعدة بيانات ثابتة منظمة في
   compressor-index.js وcompressor-brands/*.js. كل سجل موحّد الحقول:
   model, hp (نسبة حصان زي 1/6 أو 1 1/2), refrigerant, btu, kcal,
   application, run_capacitor, start_capacitor, oil_qty/oil_unit,
   amp, watt, freq, displacement, rpm, temp_capacity{}, notes, extra{}.

   طبقة إضافات محلية فوق القاعدة الأصلية (بدون أي تعديل في المرجع نفسه):
   - مفضلة: كباسات بتستخدمها كتير، تفتحها بضغطة من غير بحث.
   - إضافات يدوية: موديلات ناقصة تضيفها إنت وتتخزن في localStorage.
   ========================================================= */
(function (window) {
  "use strict";

  const LS_FAV = "wf_comp_fav";
  const LS_CUSTOM = "wf_comp_custom";
  const MAX_RESULTS = 100;
  let recordsCache = null;
  let brandsCache = null;
  const searchCache = new Map();
  const actionRegistry = new Map();
  let compressorDbReady = false;
  let compressorAllReady = false;
  let compressorAllPromise = null;
  let editingCustomId = null;

  function getLS(k, f) { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } }
  function putLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { alert("تعذر الحفظ محليًا: " + (e?.message || e)); return false; } }

  function favorites() {
    const seen=new Set();
    return getLS(LS_FAV,[]).filter(f=>{const k=compressorKey(f?.brand,f?.model);if(!f?.model||seen.has(k))return false;seen.add(k);return true});
  }
  function customEntries() {
    const seen=new Set();
    return getLS(LS_CUSTOM,[]).filter(c=>{const k=compressorKey(c?.brand,c?.rec?.model);if(!c?.rec?.model||seen.has(k))return false;seen.add(k);return true});
  }

  function normalize(s) {
    return String(s == null ? "" : s).toUpperCase().replace(/[\s\-_\/\\]/g, "");
  }
  function compressorKey(brand, model) { return `${normalize(brand)}|${normalize(model)}`; }

  function db() { return window.COMPRESSOR_DB_BRANDS || {}; }
  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error("تعذر تحميل جزء من قاعدة الأكواد"));document.head.appendChild(s)})}
  function loadCompressorDb(){
    if(compressorDbReady)return Promise.resolve();
    return loadScript("compressor-index.js").then(()=>{window.COMPRESSOR_DB_BRANDS=window.COMPRESSOR_DB_BRANDS||{};compressorDbReady=true});
  }
  function allBrands() { if (!brandsCache) brandsCache = Object.keys(window.COMPRESSOR_INDEX?.brands||db()).sort((a, b) => a.localeCompare(b, "ar")); return brandsCache; }
  function totalRecords(){return window.COMPRESSOR_INDEX?.total||flatRecords().length}
  function loadAllCompressorBrands(){
    if(compressorAllReady)return Promise.resolve();if(compressorAllPromise)return compressorAllPromise;
    const entries=Object.values(window.COMPRESSOR_INDEX?.brands||{});
    compressorAllPromise=Promise.all(entries.map(x=>loadScript(x.file))).then(()=>{compressorAllReady=true;recordsCache=null;brandsCache=null;searchCache.clear()});
    return compressorAllPromise;
  }
  function loadCompressorBrand(brand){
    const meta=window.COMPRESSOR_INDEX?.brands?.[brand];if(!meta)return Promise.resolve();
    if(window.COMPRESSOR_DB_BRANDS?.[brand])return Promise.resolve();
    return loadScript(meta.file).then(()=>{recordsCache=null;searchCache.clear()});
  }

  function flatRecords() {
    if (recordsCache) return recordsCache;
    const out = [];
    const seen = new Set();
    const d = db();
    for (const brand of Object.keys(d)) for (const rec of d[brand]) { const key=compressorKey(brand,rec.model); if(seen.has(key))continue; seen.add(key); out.push({ brand, custom: false, rec, _modelNorm:normalize(rec.model), _searchBlob: recordSearchBlob(rec) }); }
    for (const c of customEntries()) { const brand=c.brand||"إضافات يدوية",key=compressorKey(brand,c.rec?.model); if(seen.has(key))continue; seen.add(key); out.push({ brand, custom: true, rec: c.rec, _id: c.id, _modelNorm:normalize(c.rec?.model), _searchBlob: recordSearchBlob(c.rec) }); }
    recordsCache = out;
    return recordsCache;
  }

  // كل قيم السجل (بما فيها الحقول المتداخلة زي temp_capacity/extra) في نص واحد للبحث الحر
  function recordSearchBlob(rec) {
    const parts = [];
    for (const k in rec) {
      const v = rec[k];
      if (v == null) continue;
      if (typeof v === "object") { for (const kk in v) parts.push(v[kk]); }
      else parts.push(v);
    }
    return parts.map(normalize).join(" ");
  }

  function duplicateGroups(){
    const groups=new Map(),add=(brand,rec,source,id=null)=>{if(!rec?.model)return;const key=compressorKey(brand,rec.model);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({brand,rec,source,id})};
    for(const brand of Object.keys(db()))for(const rec of db()[brand])add(brand,rec,"القاعدة الأساسية");
    for(const c of getLS(LS_CUSTOM,[]))add(c.brand||"إضافات يدوية",c.rec,"إضافة يدوية",c.id);
    return [...groups].filter(([,rows])=>rows.length>1).map(([key,rows])=>({key,rows,fields:[...new Set(rows.flatMap(x=>Object.keys(x.rec||{})))].filter(f=>new Set(rows.map(x=>JSON.stringify(x.rec?.[f]??null))).size>1)})).sort((a,b)=>b.rows.length-a.rows.length||a.key.localeCompare(b.key));
  }
  function renderDuplicateReview(){
    const host=document.getElementById("compDuplicatesResult");if(!host)return;const groups=duplicateGroups();
    if(!groups.length){host.innerHTML='<p class="hint">✅ لا توجد مجموعات تكرار حسب المقارنة الموحّدة.</p>';return}
    const shown=groups.slice(0,100);
    host.innerHTML=`<p class="hint">تم العثور على ${groups.length.toLocaleString("ar-EG")} مجموعة مكررة. المعروض أول ${shown.length} مجموعة فقط. القاعدة الأساسية للقراءة فقط؛ الإضافات اليدوية يمكن تعديلها أو حذفها بعد تأكيدك.</p>`+shown.map(g=>`<details class="comp-duplicate-group"><summary><b>${esc(g.rows[0].brand)} — ${esc(g.rows[0].rec.model)}</b> (${g.rows.length} سجلات${g.fields.length?`, اختلاف في ${g.fields.length} حقول`:"، نفس القيم"})</summary><div class="comp-duplicate-rows">${g.rows.map((x,i)=>`<div class="item"><b>السجل ${i+1} — ${esc(x.source)}</b><small>${esc(Object.entries(x.rec).map(([k,v])=>`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join(' | '))}</small>${x.id?`<div class="compact-actions duplicate-row-actions"><button type="button" class="secondary mini-action" data-duplicate-action="edit" data-duplicate-id="${escAttr(x.id)}">✏️ تعديل</button><button type="button" class="secondary mini-action" data-duplicate-action="delete" data-duplicate-id="${escAttr(x.id)}">🗑️ حذف</button></div>`:`<small class="hint">مرجع أساسي — لا يمكن تعديله أو حذفه من التطبيق.</small>`}</div>`).join("")}</div></details>`).join("");
  }

  function duplicateReviewAction(event){
    const button=event.target.closest("[data-duplicate-action]"),id=button?.dataset.duplicateId;if(!id)return;
    const list=getLS(LS_CUSTOM,[]),item=list.find(x=>x.id===id);if(!item)return;
    if(button.dataset.duplicateAction==="delete"){
      if(!confirm(`⚠️ سيتم حذف الإضافة اليدوية «${item.rec?.model||""}» نهائيًا. لا تحذف سجلًا يدويًا إلا إذا تأكدت أنه مكرر أو غير صحيح. هل تريد المتابعة؟`))return;
      if(!putLS(LS_CUSTOM,list.filter(x=>x.id!==id)))return;
      recordsCache=null;searchCache.clear();renderDuplicateReview();renderCompressorResults();toast("✅ تم حذف الإضافة اليدوية");return;
    }
    editingCustomId=id;toggle("compAddBox");
    const fields={ccModel:item.rec?.model||"",ccBrand:item.brand||"",ccHp:item.rec?.hp||"",ccAmp:item.rec?.amp||"",ccBtu:item.rec?.btu||"",ccFreon:item.rec?.refrigerant||"",ccApp:item.rec?.application||"",ccRunCap:item.rec?.run_capacitor||"",ccStartCap:item.rec?.start_capacitor||"",ccOil:item.rec?.oil_qty||"",ccNote:item.rec?.notes||""};
    Object.entries(fields).forEach(([key,value])=>{const el=document.getElementById(key);if(el)el.value=value});
    const save=document.getElementById("compSaveCustom");if(save)save.textContent="💾 حفظ التعديل";
    document.getElementById("ccModel")?.focus();
  }

  function downloadDuplicatePlan(){
    const groups=duplicateGroups().map(g=>({key:g.key,brand:g.rows[0].brand,model:g.rows[0].rec.model,recordCount:g.rows.length,differentFields:g.fields,sources:g.rows.map(x=>x.source),records:g.rows.map(x=>x.rec)}));
    const payload={type:"compressor-duplicate-review",version:1,createdAt:new Date().toISOString(),warning:"مراجعة فقط — لا تُستخدم للحذف التلقائي",groups};
    const a=document.createElement("a"),url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));a.href=url;a.download="compressor-duplicate-review-plan.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(`✅ تم تنزيل خطة ${groups.length.toLocaleString("ar-EG")} مجموعة`);
  }
  function mergeCompatibleCustom(){
    const raw=getLS(LS_CUSTOM,[]),groups=duplicateGroups().filter(g=>g.rows.every(x=>x.source==="إضافة يدوية")&&g.fields.length===0);
    if(!groups.length){toast("لا توجد إضافات يدوية متوافقة للدمج");return}
    if(!confirm(`سيتم دمج ${groups.length} مجموعة يدوية متوافقة بعد إنشاء نسخة أمان. لا يمكن التراجع إلا باستيراد النسخة. هل تريد المتابعة؟`))return;
    const backupKey="wf_compressor_custom_merge_backup";if(!putLS(backupKey,{createdAt:new Date().toISOString(),records:raw}))return;
    const duplicateKeys=new Set(groups.map(g=>g.key)),kept=new Map();
    for(const row of raw){const key=compressorKey(row.brand,row.rec?.model);if(!duplicateKeys.has(key)){kept.set(`${key}|${row.id}`,row);continue}if(!kept.has(key))kept.set(key,row)}
    const merged=[...kept.values()];if(!putLS(LS_CUSTOM,merged)){putLS(LS_CUSTOM,raw);return}
    recordsCache=null;searchCache.clear();renderDuplicateReview();renderCompressorResults();toast(`✅ تم دمج ${raw.length-merged.length} سجل يدوي بعد حفظ نسخة أمان`);
  }

  function searchCompressors(query, brandFilter) {
    const q = normalize(query);
    const cacheKey = `${q}|${brandFilter||""}`;
    if (searchCache.has(cacheKey)) return searchCache.get(cacheKey).slice();
    let list = flatRecords();
    if (brandFilter) list = list.filter(x => x.brand === brandFilter);
    if (q) {
      list = list.filter(x => x._searchBlob.includes(q));
      list.sort((a, b) => {
        const am = a._modelNorm.startsWith(q) ? 0 : 1;
        const bm = b._modelNorm.startsWith(q) ? 0 : 1;
        return am - bm;
      });
    }
    if (searchCache.size >= 40) searchCache.delete(searchCache.keys().next().value);
    searchCache.set(cacheKey,list);
    return list.slice();
  }

  function isFavorite(brand, model) { const key=compressorKey(brand,model); return favorites().some(f => compressorKey(f.brand,f.model)===key); }

  function toggleFavorite(brand, model, recJson) {
    let favs = favorites();
    const key=compressorKey(brand,model),idx = favs.findIndex(f => compressorKey(f.brand,f.model) === key);
    if (idx >= 0) favs.splice(idx, 1);
    else {
      let rec;
      try { rec = JSON.parse(recJson); } catch(e) { console.error("[compressor] بيانات المفضلة غير صالحة", e); return; }
      favs.push({ brand, model, rec, addedAt: new Date().toISOString() });
    }
    putLS(LS_FAV, favs);
    renderCompressorResults();
  }

  window.toggleCompressorFavorite = function (brand, model, recJson) { toggleFavorite(brand, model, recJson); };

  window.deleteCustomCompressor = function (id) {
    if (!confirm("حذف الإضافة اليدوية دي؟")) return;
    putLS(LS_CUSTOM, customEntries().filter(c => c.id !== id));
    recordsCache = null;
    searchCache.clear();
    renderCompressorResults();
  };

  // ---------- تنسيق القيم للعرض ----------
  function hpDisplay(rec) { return rec.hp ? `${rec.hp} HP` : null; }
  function fmtNum(v) { return (typeof v === "number") ? (Math.round(v * 100) / 100).toLocaleString("en-US") : v; }

  const TEMP_LABELS = { "-23.3": "عند -23.3°", "-5": "عند -5°", "-6.7": "عند -6.7°", "7.2+": "عند 7.2°+" };

  function kv(icon, label, value) {
    if (value == null || value === "") return "";
    return `<div class="comp-kv"><small>${icon} ${esc(label)}</small><b>${esc(value)}</b></div>`;
  }

  function primaryGridHtml(rec) {
    return `<div class="comp-primary-grid">
      ${kv("⚙️", "القدرة (حصان)", hpDisplay(rec))}
      ${kv("🌡️", "القدرة (BTU)", rec.btu != null ? fmtNum(rec.btu) : null)}
      ${kv("🧪", "الفريون", rec.refrigerant)}
      ${kv("🎯", "التطبيق", rec.application)}
    </div>`;
  }

  function capacitorOilHtml(rec) {
    const chips = [];
    if (rec.run_capacitor != null) chips.push(`<span class="comp-field">⚡ مكثف التشغيل: <b>${esc(rec.run_capacitor)}</b></span>`);
    if (rec.start_capacitor != null) chips.push(`<span class="comp-field">🔌 مكثف الإقلاع/التقويم: <b>${esc(rec.start_capacitor)}</b></span>`);
    if (rec.oil_qty != null) chips.push(`<span class="comp-field">🛢️ كمية الزيت: <b>${esc(rec.oil_qty)}${rec.oil_unit ? " " + esc(rec.oil_unit) : ""}</b></span>`);
    if (!chips.length) return "";
    return `<div class="comp-fields">${chips.join("")}</div>`;
  }

  function extraDetailsHtml(rec) {
    const chips = [];
    if (rec.amp != null) chips.push(`<span class="comp-field">🔋 الأمبير (RLA): <b>${esc(fmtNum(rec.amp))}</b></span>`);
    if (rec.watt != null) chips.push(`<span class="comp-field">💡 الاستهلاك: <b>${esc(fmtNum(rec.watt))} W</b></span>`);
    if (rec.kcal != null) chips.push(`<span class="comp-field">🌡️ القدرة (kCal/hr): <b>${esc(fmtNum(rec.kcal))}</b></span>`);
    if (rec.freq != null) chips.push(`<span class="comp-field">〰️ التردد: <b>${esc(rec.freq)} HZ</b></span>`);
    if (rec.displacement != null) chips.push(`<span class="comp-field">📐 الإزاحة: <b>${esc(fmtNum(rec.displacement))} cc</b></span>`);
    if (rec.rpm != null) chips.push(`<span class="comp-field">🌀 السرعة: <b>${esc(rec.rpm)}</b></span>`);
    if (rec.temp_capacity) {
      for (const t in rec.temp_capacity) chips.push(`<span class="comp-field">🌡️ القدرة ${esc(TEMP_LABELS[t] || t)}: <b>${esc(fmtNum(rec.temp_capacity[t]))}</b></span>`);
    }
    if (rec.extra) {
      for (const k in rec.extra) chips.push(`<span class="comp-field">${esc(k)}: <b>${esc(rec.extra[k])}</b></span>`);
    }
    if (!chips.length) return "";
    return `<details class="comp-extra"><summary>🔎 بيانات إضافية</summary><div class="comp-fields">${chips.join("")}</div></details>`;
  }

  /* ---------------------------------------------------------------------
     بدائل من شركات تانية: مش جدول تعادل معتمد ولا موثّق تجاريًا — مجرد
     مطابقة بين المواصفات المسجّلة فعليًا في نفس القاعدة (نفس الفريون،
     نفس التطبيق LBP/HBP، وقدرة قريبة من نفس الموديل بالإزاحة أو BTU
     ضمن هامش 15%)، من ماركة مختلفة، ومن القاعدة الأساسية بس (مش من
     إضافات يدوية غير موثّقة). النتيجة للاسترشاد فقط ولازم تتأكد بنفسك
     من التوافق الفعلي (المقاس، نوع التوصيل الكهربي، كمية ونوع الزيت)
     قبل ما تستخدم أي بديل فعليًا.
  --------------------------------------------------------------------- */
  function closenessOk(rec, other) {
    if (rec.displacement != null && other.displacement != null) return Math.abs(rec.displacement - other.displacement) / rec.displacement <= 0.15;
    if (rec.btu != null && other.btu != null) return Math.abs(rec.btu - other.btu) / rec.btu <= 0.15;
    return false;
  }
  function closenessScore(rec, other) {
    if (rec.displacement != null && other.displacement != null) return Math.abs(rec.displacement - other.displacement);
    if (rec.btu != null && other.btu != null) return Math.abs(rec.btu - other.btu) / 10;
    return 999;
  }
  function computeAlternatives(item) {
    const rec = item.rec;
    if (!rec) return [];
    if (rec.displacement == null && rec.btu == null) return [];
    const targetKey = compressorKey(item.brand, rec.model);
    const out = [];
    for (const brand of Object.keys(db())) {
      if (brand === item.brand) continue;
      for (const other of db()[brand]) {
        if (compressorKey(brand, other.model) === targetKey) continue;
        if (rec.refrigerant && other.refrigerant && normalize(rec.refrigerant) !== normalize(other.refrigerant)) continue;
        if (rec.application && other.application && rec.application !== other.application) continue;
        if (!closenessOk(rec, other)) continue;
        out.push({ brand, rec: other, score: closenessScore(rec, other) });
      }
    }
    out.sort((a, b) => a.score - b.score);
    return out.slice(0, 8);
  }
  function alternativesHtml(item) {
    const alts = computeAlternatives(item);
    if (!alts.length) return "";
    const rows = alts.map(a => `<div class="item"><div class="item-head"><b>🔩 ${esc(a.rec.model)}</b><span class="badge">${esc(a.brand)}</span></div>${primaryGridHtml(a.rec)}</div>`).join("");
    return `<details class="comp-alt">
      <summary>🔄 بدائل بمواصفات قريبة من شركات تانية (${alts.length})</summary>
      <p class="hint">⚠️ للاسترشاد فقط — مطابقة حسب الفريون والتطبيق وقدرة قريبة (ضمن ${"15%"}) من نفس القاعدة، مش جدول تعادل معتمد من الشركات المصنّعة. لازم تتأكد بنفسك من المقاس ونوع التوصيل وكمية ونوع الزيت قبل استخدام أي بديل فعليًا.</p>
      <div class="comp-alt-rows">${rows}</div>
    </details>`;
  }

  function specTextForCopy(item) {
    const rec = item.rec;
    const lines = [`${rec.model} (${item.brand})`];
    if (rec.hp) lines.push(`القدرة (حصان): ${rec.hp} HP`);
    if (rec.btu != null) lines.push(`القدرة (BTU): ${fmtNum(rec.btu)}`);
    if (rec.refrigerant) lines.push(`الفريون: ${rec.refrigerant}`);
    if (rec.application) lines.push(`التطبيق: ${rec.application}`);
    if (rec.run_capacitor != null) lines.push(`مكثف التشغيل: ${rec.run_capacitor}`);
    if (rec.start_capacitor != null) lines.push(`مكثف الإقلاع/التقويم: ${rec.start_capacitor}`);
    if (rec.oil_qty != null) lines.push(`كمية الزيت: ${rec.oil_qty}${rec.oil_unit ? " " + rec.oil_unit : ""}`);
    if (rec.amp != null) lines.push(`الأمبير: ${rec.amp}`);
    if (rec.notes) lines.push(`ملاحظات: ${rec.notes}`);
    return lines.join("\n");
  }

  function resultCardHtml(item) {
    const rec = item.rec;
    const model = rec.model || "—";
    const fav = !item.custom && isFavorite(item.brand, model);
    // ملحوظة مهمة: مكنش ممكن نحط JSON.stringify(rec) (اللي فيه علامات
    // اقتباس مزدوجة كتير أصلاً بحكم بنية الـ JSON) جوه onclick بعد تنظيفه
    // بـ esc() بس — لأن المتصفح بيفك ترميز HTML entities (زي &quot;) في
    // قيمة الـ attribute *قبل* ما ينفّذها كجافاسكريبت، فالـ " المرمّزة
    // كانت بترجع " عادية قدام الـ JS وتقفل السترنج بدري لكل سجل بيتفتح.
    // النتيجة: زرار "⭐ حفظ في المفضلة" كان بيفشل صامتًا لكل الموديلات.
    // escAttr() بتهرّب الاقتباس المفرد بطريقة جافاسكريبت (\\') وتحوّل
    // المزدوج لـ HTML entity (وده آمن هنا لأن الـ argument نفسه متلفوف
    // بعلامة اقتباس مفردة، مش مزدوجة) — نفس الطريقة المستخدمة في باقي
    // النظام لأي نص بيتحط جوه onclick.
    const specId = "spec_" + Math.random().toString(36).slice(2);
    const actionId = "a" + Math.random().toString(36).slice(2);
    actionRegistry.set(actionId,{item,specId});
    return `<div class="item">
      <div class="item-head">
        <b>🔩 ${esc(model)}</b>
        <span class="badge">${esc(item.brand)}</span>
      </div>
      ${item.custom ? `<span class="badge" style="margin-bottom:6px;display:inline-block">🖊️ إضافة يدوية</span>` : ""}
      ${primaryGridHtml(rec)}
      ${capacitorOilHtml(rec)}
      ${rec.notes ? `<p class="hint">📝 ${esc(rec.notes)}</p>` : ""}
      ${extraDetailsHtml(rec)}
      ${alternativesHtml(item)}
      <textarea id="${specId}" class="hidden">${esc(specTextForCopy(item))}</textarea>
      <div class="actions comp-actions">
        ${item.custom
          ? `<button type="button" class="secondary small-btn" data-comp-action="edit" data-comp-id="${escAttr(actionId)}">✏️ تعديل</button><button type="button" class="secondary small-btn" data-comp-action="delete" data-comp-id="${escAttr(actionId)}">🗑️ حذف الإضافة</button>`
          : `<button type="button" class="secondary small-btn" data-comp-action="favorite" data-comp-id="${escAttr(actionId)}">${fav ? "💔 إزالة من المفضلة" : "⭐ حفظ في المفضلة"}</button>`}
        <button type="button" class="secondary small-btn" data-comp-action="copy" data-comp-id="${escAttr(actionId)}">📋 نسخ البيانات</button>
      </div>
    </div>`;
  }

  window.copyCompressorSpec = function (specId) {
    const el = document.getElementById(specId);
    if (!el) return;
    const text = el.value;
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast("✅ اتنسخت بيانات الكباس")).catch(() => alert(text));
    else alert(text);
  };

  function toast(msg) {
    let t = document.getElementById("compToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "compToast";
      t.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#17324d;color:#fff;padding:9px 16px;border-radius:20px;font-size:13px;z-index:999;box-shadow:0 4px 14px #00000033";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(t._h);
    t._h = setTimeout(() => (t.style.display = "none"), 1800);
  }

  function renderFavoritesBar() {
    const host = document.getElementById("compFavorites");
    if (!host) return;
    const favs = favorites();
    if (!favs.length) { host.innerHTML = ""; return; }
    host.innerHTML = `<h3>⭐ المفضلة (${favs.length})</h3><div class="comp-fav-chips">` +
      favs.map(f => `<button type="button" class="secondary mini-action" data-comp-fav-model="${escAttr(f.model)}" data-comp-fav-brand="${escAttr(f.brand)}">${esc(f.model)} <small>(${esc(f.brand)})</small></button>`).join("") +
      `</div>`;
  }

  function handleCompressorAction(event){
    const fav=event.target.closest("[data-comp-fav-model]");
    if(fav){const search=document.getElementById("compSearch");if(search){search.value=fav.dataset.compFavModel;renderCompressorResults()}return}
    const button=event.target.closest("[data-comp-action]");if(!button)return;
    const entry=actionRegistry.get(button.dataset.compId);if(!entry)return;
    if(button.dataset.compAction==="copy")return copyCompressorSpec(entry.specId);
    if(button.dataset.compAction==="edit")return duplicateReviewAction({target:{closest:()=>({dataset:{duplicateAction:"edit",duplicateId:entry.item._id}})}});
    if(button.dataset.compAction==="delete")return deleteCustomCompressor(entry.item._id);
    if(button.dataset.compAction==="favorite")return toggleFavorite(entry.item.brand,entry.item.rec.model,JSON.stringify(entry.item.rec));
  }

  window.renderCompressorResults = function () {
    const qEl = document.getElementById("compSearch");
    const brandEl = document.getElementById("compBrandFilter");
    const q = qEl ? qEl.value.trim() : "";
    const brand = brandEl ? brandEl.value : "";
    const host = document.getElementById("compResults");
    const countEl = document.getElementById("compResultCount");
    if(host)host.setAttribute("aria-busy","true");
    actionRegistry.clear();
    renderFavoritesBar();
    if (!q && !brand) {
      host.innerHTML = `<p class="hint">اكتب كود الكباس (أو جزء منه)، أو أي قيمة تانية زي نوع الفريون (مثال: R600a) — أو اختر ماركة من القايمة، والنتائج هتظهر هنا. القاعدة فيها أكتر من ${totalRecords().toLocaleString("ar-EG")} موديل عبر ${allBrands().length} ماركة.</p>`;
      countEl.textContent = "";
      if(host)host.setAttribute("aria-busy","false");
      return;
    }
    const results = searchCompressors(q, brand);
    countEl.textContent = results.length > MAX_RESULTS
      ? `عدد النتائج: ${results.length} — هيظهر أول ${MAX_RESULTS} بس، ضيّق البحث عشان تشوف نتيجتك بسرعة`
      : `عدد النتائج: ${results.length}`;
    if (!results.length) {
      host.innerHTML = `<p class="hint">مفيش نتائج مطابقة. لو الموديل ده مش موجود فعلاً في الملف المرجعي، تقدر تضيفه يدويًا بالزرار فوق وهيتحفظ عندك وهيظهر في البحث بعد كده.</p>`;
      host.setAttribute("aria-busy","false");
      return;
    }
    host.innerHTML = results.slice(0, MAX_RESULTS).map(resultCardHtml).join("");
    host.setAttribute("aria-busy","false");
  };

  window.fillCompressorBrandFilter = function () {
    const el = document.getElementById("compBrandFilter");
    if (!el) return;
    el.innerHTML = `<option value="">كل الماركات</option>` + allBrands().map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join("");
  };

  function id_() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2); }

  window.saveCustomCompressor = function () {
    const model = document.getElementById("ccModel").value.trim();
    if (!model) { alert("لازم تكتب كود الموديل"); return; }
    const brand = document.getElementById("ccBrand").value.trim() || "إضافات يدوية";
    const key=compressorKey(brand,model);
    const duplicateBase=Object.entries(db()).some(([b,rows])=>rows.some(r=>compressorKey(b,r.model)===key));
    const duplicateCustom=customEntries().some(c=>c.id!==editingCustomId&&compressorKey(c.brand,c.rec?.model)===key);
    if(duplicateBase||duplicateCustom){alert(`⚠️ الكود «${model}» موجود بالفعل تحت ماركة «${brand}»، ولن تتم إضافته مرة أخرى.`);return}
    const rec = { model };
    const hpRaw = document.getElementById("ccHp").value.trim();
    if (hpRaw) rec.hp = hpRaw;
    const map = [["ccAmp", "amp"], ["ccBtu", "btu"], ["ccFreon", "refrigerant"], ["ccApp", "application"], ["ccRunCap", "run_capacitor"], ["ccStartCap", "start_capacitor"], ["ccOil", "oil_qty"], ["ccNote", "notes"]];
    map.forEach(([id, key]) => {
      const v = document.getElementById(id)?.value.trim();
      if (v) rec[key] = v;
    });
    const list = getLS(LS_CUSTOM,[]);
    if(editingCustomId){const existing=list.find(x=>x.id===editingCustomId);if(!existing){alert("تعذر العثور على الإضافة المراد تعديلها؛ ربما حُذفت من مكان آخر.");return}existing.brand=brand;existing.rec=rec;existing.updatedAt=new Date().toISOString()}else list.push({ id: id_(), brand, rec, addedAt: new Date().toISOString() });
    if(!putLS(LS_CUSTOM, list))return;
    recordsCache = null;
    searchCache.clear();
    ["ccModel", "ccBrand", "ccHp", "ccAmp", "ccBtu", "ccFreon", "ccApp", "ccRunCap", "ccStartCap", "ccOil", "ccNote"].forEach(x => { const e = document.getElementById(x); if (e) e.value = ""; });
    editingCustomId=null;const save=document.getElementById("compSaveCustom");if(save)save.textContent="💾 حفظ";toggle("compAddBox");
    document.getElementById("compSearch").value = model;
    renderCompressorResults();
  };

  /* ---------------------------------------------------------------------
     مشاركة الإضافات اليدوية مع فنيين تانيين: نفس مبدأ تصدير/استيراد
     أكواد الأعطال بالظبط، بس هنا بيصدّر الإضافات اليدوية فقط (LS_CUSTOM)
     مش القاعدة المرجعية الأساسية (اللي أصلاً موجودة عند الاتنين جوه
     التطبيق نفسه ومش محتاجة نقل). الاستيراد بيدمج (merge) من غير ما
     يكرر كود موجود بالفعل عند حد الاتنين (سواء في القاعدة الأساسية أو
     في إضافاته اليدوية هو).
  --------------------------------------------------------------------- */
  function exportCustomCompressors() {
    const list = customEntries();
    if (!list.length) { alert("مفيش إضافات يدوية للتصدير دلوقتي."); return; }
    const data = { customCompressors: list, _meta: { exportedAt: new Date().toISOString(), app: "الورشة الفنية — أكواد الكباسات", kind: "compressor-custom-only" } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const a = document.createElement("a");
    a.href = url; a.download = `اضافات-كباسات-الورشة-الفنية-${stamp}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function importCustomCompressorsFile(input) {
    const file = input?.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const incoming = Array.isArray(data) ? data : (Array.isArray(data?.customCompressors) ? data.customCompressors : null);
        if (!incoming) throw new Error("bad");
        const list = customEntries();
        let added = 0, skipped = 0;
        incoming.forEach(raw => {
          const model = raw?.rec?.model || raw?.model;
          if (!model) return;
          const brand = raw.brand || "إضافات يدوية";
          const key = compressorKey(brand, model);
          const duplicateBase = Object.entries(db()).some(([b, rows]) => rows.some(r => compressorKey(b, r.model) === key));
          const duplicateCustom = list.some(c => compressorKey(c.brand, c.rec?.model) === key);
          if (duplicateBase || duplicateCustom) { skipped++; return; }
          const rec = raw.rec && typeof raw.rec === "object" ? { ...raw.rec, model } : { ...raw, model };
          delete rec.brand;
          list.push({ id: id_(), brand, rec, addedAt: new Date().toISOString() });
          added++;
        });
        if (!putLS(LS_CUSTOM, list)) return;
        recordsCache = null; searchCache.clear();
        toast(`✅ اتضاف ${added} كود جديد${skipped ? ` (اتجاهل ${skipped} مكرر موجود عندك بالفعل)` : ""}`);
        renderCompressorResults();
      } catch (err) { alert("⚠️ ملف غير صالح. تأكد إنه ملف إضافات كباسات مُصدَّر من نفس النظام."); }
      input.value = "";
    };
    reader.readAsText(file);
  }

  window.initCompressorCodesPage = function () {
    const search=document.getElementById("compSearch"),brand=document.getElementById("compBrandFilter");
    const loadAndRender=()=>{const q=search?.value.trim(),b=brand?.value;return (b&&!q?loadCompressorBrand(b):loadAllCompressorBrands()).then(()=>renderCompressorResults())};
    search?.addEventListener("input",loadAndRender);
    brand?.addEventListener("change",loadAndRender);
    document.getElementById("compAddToggle")?.addEventListener("click",()=>{editingCustomId=null;const save=document.getElementById("compSaveCustom");if(save)save.textContent="💾 حفظ";toggle("compAddBox")});
    document.getElementById("compCancelAdd")?.addEventListener("click",()=>{editingCustomId=null;const save=document.getElementById("compSaveCustom");if(save)save.textContent="💾 حفظ";toggle("compAddBox")});
    document.getElementById("compSaveCustom")?.addEventListener("click",()=>loadAllCompressorBrands().then(saveCustomCompressor));
    document.getElementById("compDuplicatesToggle")?.addEventListener("click",()=>{const panel=document.getElementById("compDuplicatesPanel");if(!panel)return;panel.classList.toggle("hidden");if(!panel.classList.contains("hidden"))loadAllCompressorBrands().then(renderDuplicateReview)});
    document.getElementById("compMergeCustom")?.addEventListener("click",()=>loadAllCompressorBrands().then(mergeCompatibleCustom));
    document.getElementById("compExportDuplicatePlan")?.addEventListener("click",()=>loadAllCompressorBrands().then(downloadDuplicatePlan));
    document.getElementById("compExportCustom")?.addEventListener("click",exportCustomCompressors);
    document.getElementById("compImportCustom")?.addEventListener("change",function(){importCustomCompressorsFile(this)});
    document.getElementById("compResults")?.addEventListener("click",handleCompressorAction);
    document.getElementById("compFavorites")?.addEventListener("click",handleCompressorAction);
    document.getElementById("compDuplicatesResult")?.addEventListener("click",duplicateReviewAction);
    const host=document.getElementById("compResults");if(host)host.setAttribute("aria-busy","true");
    const params=new URLSearchParams(location.search);
    const qParam=params.get("q"),brandParam=params.get("brand");
    loadCompressorDb().then(()=>{
      fillCompressorBrandFilter();
      if(qParam&&search)search.value=qParam;
      if(brandParam&&brand&&allBrands().includes(brandParam))brand.value=brandParam;
      if(qParam||brandParam)return loadAndRender();
      renderCompressorResults();
    }).catch(e=>{if(host){host.innerHTML=`<p class="hint" role="alert">⚠️ ${esc(e.message)}</p>`;host.setAttribute("aria-busy","false")}});
  };

  // ---------- واجهة عامة للبحث الشامل (global-search.js) ----------
  // بحث خفيف بيرجّع من القاعدة المحمّلة فعليًا وقت الاستدعاء بس (مفيش
  // تحميل تلقائي هنا)؛ استخدم ensureAll() الأول لو محتاج تضمن تحميل
  // القاعدة كاملة قبل البحث (بيتحمّل مرة واحدة بس ويتخزن بعدها).
  window.CompressorRef = {
    ensureAll: loadAllCompressorBrands,
    search: function (q, brandFilter) { try { return searchCompressors(q, brandFilter); } catch (e) { return []; } },
    isReady: function () { return compressorAllReady; },
    totalRecords: totalRecords
  };
})(window);
