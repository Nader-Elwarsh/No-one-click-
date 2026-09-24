/* app-data-management.js — حذف كل البيانات التشغيلية + النسخ الاحتياطي واستعادته. */
let backupBusy=false,destructiveBusy=false;
function captureLocalDataState(){const raw={};Object.values(K).forEach(k=>raw[k]=localStorage.getItem(k));return{raw,notif:localStorage.getItem("wf_notif_enabled"),schema:localStorage.getItem("wf_schema_version"),lastBackup:localStorage.getItem("wf_last_backup_at")}}
function restoreLocalDataState(state){if(!state)return;for(const [k,v] of Object.entries(state.raw||{})){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){console.error("[backup] تعذر إعادة مفتاح",k,e)}}for(const [k,v] of [["wf_notif_enabled",state.notif],["wf_schema_version",state.schema],["wf_last_backup_at",state.lastBackup]]){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){console.error("[backup] تعذر إعادة الإعداد",k,e)}}window.invalidateReadCache?.()}
async function deleteAllOperationalData(){if(destructiveBusy)return;destructiveBusy=true;try{if(!confirm("سيتم حذف العملاء والأجهزة وأوامر الشغل وقطع الغيار وحركات المخزن والمصاريف وحركات الحسابات والخزنة. الإعدادات والمراكز والقرى لن تتأثر. هل تريد المتابعة؟"))return;if(!confirm("تأكيد نهائي جدًا: حذف كل البيانات التشغيلية؟"))return;const state=captureLocalDataState(),oldImages=window.ImageStore?.exportAll?await window.ImageStore.exportAll():{};try{if(window.ImageStore?.clearAll&&!await window.ImageStore.clearAll())throw new Error("clear-images");const values={};[K.c,K.d,K.r,K.p,K.m,K.e,K.tr,K.wtx,K.inv].forEach(k=>values[k]=[]);if(!commitStorage(values))throw new Error("storage-failed");alert("تم حذف كل البيانات التشغيلية. سيتم تحديث الصفحة.");location.reload()}catch(e){restoreLocalDataState(state);try{if(window.ImageStore?.clearAll){await window.ImageStore.clearAll();if(window.ImageStore?.importAll)await window.ImageStore.importAll(oldImages)}}catch(imageError){console.error("[backup] تعذر إعادة الصور بعد فشل الحذف",imageError)}alert("تعذر إكمال الحذف. تم إلغاء العملية وإعادة البيانات السابقة قدر الإمكان.")}}finally{destructiveBusy=false}}

function daysSinceLastBackup(){let last=localStorage.getItem("wf_last_backup_at");if(!last)return null;let d=new Date(last);if(Number.isNaN(d.getTime()))return null;return Math.floor((Date.now()-d.getTime())/86400000)}
function lastBackupInfoText(){let days=daysSinceLastBackup();if(days===null)return "⚠️ لسه معملتش أي نسخة احتياطية أبدًا.";if(days===0)return "✅ آخر نسخة احتياطية: النهاردة.";if(days===1)return "✅ آخر نسخة احتياطية: من يوم واحد.";return `${days>=14?"⚠️":"✅"} آخر نسخة احتياطية: من ${days} يوم.`}
function renderBackupInfo(){let el=document.getElementById("lastBackupInfo");if(el)el.textContent=lastBackupInfoText();renderAutomaticBackupControls()}
const AUTO_BACKUP_PREF_KEY="wf_auto_backup_enabled",AUTO_BACKUP_HASH_KEY="wf_auto_backup_data_hash",AUTO_BACKUP_CHECK_KEY="wf_auto_backup_last_check",AUTO_BACKUP_PROMPT_KEY="wf_auto_backup_last_prompt",AUTO_BACKUP_ASK_SNOOZE_KEY="wf_auto_backup_ask_snoozed_until",AUTO_BACKUP_INTERVAL_MS=4*60*60*1000,AUTO_BACKUP_ASK_SNOOZE_DAYS=3,AUTO_BACKUP_LEGACY_RESET_KEY="wf_auto_backup_legacy_reset_done";
function automaticBackupEnabled(){return localStorage.getItem(AUTO_BACKUP_PREF_KEY)==="yes"}
function renderAutomaticBackupControls(){let host=document.getElementById("lastBackupInfo");if(!host||document.getElementById("automaticBackupControls"))return;let box=document.createElement("div");box.id="automaticBackupControls";box.className="hint";box.innerHTML=`<label style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="automaticBackupToggle" type="checkbox" ${automaticBackupEnabled()?"checked":""}> <span>🔄 السماح بفحص البيانات كل 4 ساعات وطلب موافقتي قبل تنزيل نسخة تلقائية عند وجود تغيير</span></label><small id="automaticBackupStatus"></small>`;host.insertAdjacentElement("afterend",box);box.querySelector("#automaticBackupToggle").addEventListener("change",e=>{localStorage.setItem(AUTO_BACKUP_PREF_KEY,e.target.checked?"yes":"no");if(e.target.checked){localStorage.removeItem(AUTO_BACKUP_CHECK_KEY);localStorage.removeItem(AUTO_BACKUP_PROMPT_KEY);runAutomaticBackupCheck(true)}else{let s=document.getElementById("automaticBackupStatus");if(s)s.textContent="تم إيقاف النسخ التلقائي."}});renderAutomaticBackupStatus()}
function renderAutomaticBackupStatus(message){let el=document.getElementById("automaticBackupStatus");if(!el)return;el.textContent=message|| (automaticBackupEnabled()?"النسخ التلقائي مفعّل؛ لن يتم تنزيل نسخة إلا بعد تغيير البيانات وموافقتك.":"النسخ التلقائي غير مفعّل.")}
// كانت "لا الآن" بتحفظ AUTO_BACKUP_PREF_KEY="no" بشكل نهائي — يعني نفس
// تأثير رفض الميزة للأبد، من غير أي طريقة تلقائية لإعادة السؤال تاني
// (المستخدم لازم يفتكر إنه يروح ⚙️ الإعدادات بنفسه ويفعّل الخانة يدويًا).
// ده أصل سبب "النظام مفروض يفكّرني بالنسخة الاحتياطية كل 4 ساعات ومش
// بيعملها": أي ضغطة واحدة على "لا الآن" (حتى لو بالغلط) كانت بتوقف
// التذكير بالكامل وللأبد. الإصلاح: "لا الآن" بقت تأجيل مؤقت (زي أجل
// تذكير النسخة العادي في backup-reminder.js) بدل رفض نهائي: بترجع تسأل
// تاني بعد AUTO_BACKUP_ASK_SNOOZE_DAYS أيام، من غير ما تلمس تفضيل
// "مفعّل/معطّل" نفسه خالص.
function isAutomaticBackupAskSnoozed(){
  try{
    let until=localStorage.getItem(AUTO_BACKUP_ASK_SNOOZE_KEY);
    if(!until)return false;
    return new Date(until).getTime()>Date.now();
  }catch(e){return false}
}
function renderAutomaticBackupPermission(){if(localStorage.getItem(AUTO_BACKUP_PREF_KEY)!==null||isAutomaticBackupAskSnoozed())return;let host=document.getElementById("backupReminder")||document.getElementById("automaticBackupControls");if(!host||document.getElementById("automaticBackupPermission"))return;let box=document.createElement("div");box.id="automaticBackupPermission";box.className="notice backup-reminder-banner";box.innerHTML=`🔄 هل تسمح للنظام بفحص تغييرات البيانات كل 4 ساعات وطلب موافقتك قبل تنزيل نسخة احتياطية؟<div class="backup-reminder-actions"><button type="button" class="primary small-btn" id="enableAutomaticBackup">تفعيل النسخ التلقائي</button><button type="button" class="secondary small-btn" id="skipAutomaticBackup">لا الآن (اسألني تاني بعد ${AUTO_BACKUP_ASK_SNOOZE_DAYS} أيام)</button></div>`;host.appendChild(box);box.querySelector("#enableAutomaticBackup").addEventListener("click",()=>{localStorage.setItem(AUTO_BACKUP_PREF_KEY,"yes");localStorage.removeItem(AUTO_BACKUP_ASK_SNOOZE_KEY);box.remove();renderAutomaticBackupControls();runAutomaticBackupCheck(true)});box.querySelector("#skipAutomaticBackup").addEventListener("click",()=>{let d=new Date();d.setDate(d.getDate()+AUTO_BACKUP_ASK_SNOOZE_DAYS);localStorage.setItem(AUTO_BACKUP_ASK_SNOOZE_KEY,d.toISOString());box.remove()})}
function canonicalBackupValue(value){if(Array.isArray(value))return value.map(canonicalBackupValue);if(value&&typeof value==="object")return Object.keys(value).sort().reduce((o,k)=>{if(k!=="exportedAt")o[k]=canonicalBackupValue(value[k]);return o},{});return value}
async function backupDataFingerprint(data){let text=JSON.stringify(canonicalBackupValue(data));try{if(window.crypto?.subtle&&window.TextEncoder){let bytes=await window.crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("")}}catch(e){}let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
function renderAutomaticBackupNotice(message){renderAutomaticBackupStatus(message);if(message&&typeof renderBackupReminder==="function")renderBackupReminder()}
async function createAutomaticBackup(){if(backupBusy)return false;backupBusy=true;try{let data=await snapshotAllData(),hash=await backupDataFingerprint(data);if(!confirm("تم اكتشاف تغيير في بيانات الورشة منذ آخر نسخة احتياطية. هل تريد تنزيل نسخة احتياطية الآن؟"))return false;if(!downloadBackupData(data,"نسخة-احتياطية-تلقائية"))throw new Error("download");localStorage.setItem("wf_last_backup_at",data._meta.exportedAt);localStorage.setItem(AUTO_BACKUP_HASH_KEY,hash);localStorage.setItem(AUTO_BACKUP_CHECK_KEY,String(Date.now()));localStorage.setItem(AUTO_BACKUP_PROMPT_KEY,String(Date.now()));renderBackupInfo();renderAutomaticBackupNotice("✅ تم إنشاء النسخة التلقائية بعد موافقتك.");return true}catch(e){console.error("[auto-backup] فشل النسخ",e);renderAutomaticBackupNotice("تعذر إنشاء النسخة التلقائية. يمكنك استخدام زر التصدير اليدوي من الإعدادات.");return false}finally{backupBusy=false}}
async function runAutomaticBackupCheck(force=false){if(!automaticBackupEnabled()||backupBusy)return;let now=Date.now(),last=+(localStorage.getItem(AUTO_BACKUP_CHECK_KEY)||0);if(!force&&last&&now-last<AUTO_BACKUP_INTERVAL_MS)return;localStorage.setItem(AUTO_BACKUP_CHECK_KEY,String(now));try{let data=await snapshotAllData(),hash=await backupDataFingerprint(data),previous=localStorage.getItem(AUTO_BACKUP_HASH_KEY);if(previous&&previous===hash){renderAutomaticBackupNotice("✅ لم تتغير البيانات منذ آخر نسخة؛ لا حاجة لإنشاء نسخة جديدة.");return}let prompted=+(localStorage.getItem(AUTO_BACKUP_PROMPT_KEY)||0);if(!force&&prompted&&now-prompted<AUTO_BACKUP_INTERVAL_MS)return;localStorage.setItem(AUTO_BACKUP_PROMPT_KEY,String(now));await createAutomaticBackup()}catch(e){console.error("[auto-backup] فشل فحص التغيير",e)}}
function scheduleAutomaticBackupCheck(){setTimeout(async()=>{await runAutomaticBackupCheck();scheduleAutomaticBackupCheck()},AUTO_BACKUP_INTERVAL_MS)}
// إصلاح لمرة واحدة فقط: أي جهاز كانت عنده القيمة القديمة "no" محفوظة
// (سواء من ضغطة "لا الآن" القديمة اللي كانت توقف التذكير للأبد، أو أي
// تعطيل قديم قبل هذا الإصلاح) بيرجع يتسأل تاني مرة واحدة بس، من غير ما
// يأثر على أي جهاز أصلاً معندوش القيمة دي (يعني من غير أي تغيير في
// سلوك المستخدم الجديد). بعد المرة دي، أي اختيار (تفعيل أو تعطيل) بيتحفظ
// عادي ومايتلمسش تاني.
function migrateLegacyAutoBackupOptOut(){
  try{
    if(localStorage.getItem(AUTO_BACKUP_LEGACY_RESET_KEY))return;
    if(localStorage.getItem(AUTO_BACKUP_PREF_KEY)==="no")localStorage.removeItem(AUTO_BACKUP_PREF_KEY);
    localStorage.setItem(AUTO_BACKUP_LEGACY_RESET_KEY,"1");
  }catch(e){}
}
function initAutomaticBackup(){migrateLegacyAutoBackupOptOut();renderAutomaticBackupControls();if(localStorage.getItem(AUTO_BACKUP_PREF_KEY)===null){renderAutomaticBackupPermission();return}if(!automaticBackupEnabled())return;runAutomaticBackupCheck();scheduleAutomaticBackupCheck()}
document.addEventListener("DOMContentLoaded",()=>{renderBackupInfo();initAutomaticBackup()});

/* تنبيه استباقي لو مساحة التخزين المتاحة للمتصفح (localStorage +
   IndexedDB للصور) قربت تخلص، قبل ما الحفظ يفشل فعليًا فجأة من غير سابق
   إنذار. navigator.storage.estimate() غير مدعوم من كل المتصفحات القديمة،
   فلو غير متاح بنسيب المكان فاضي من غير ما نخترع نسبة غلط. */
async function renderStorageUsageInfo(){
  const el=document.getElementById("storageUsageInfo");if(!el)return;
  if(!navigator.storage?.estimate){el.textContent="";return}
  try{
    const {usage,quota}=await navigator.storage.estimate();
    if(!Number.isFinite(usage)||!Number.isFinite(quota)||quota<=0){el.textContent="";return}
    const pct=Math.round((usage/quota)*100),mb=n=>(n/1048576).toFixed(1);
    const warn=pct>=80;
    el.innerHTML=`${warn?"⚠️":"📦"} مساحة التخزين المستخدمة: ${mb(usage)} ميجا من ${mb(quota)} ميجا تقريبًا (${pct}%)${warn?" — قربت تخلص، يفضّل حذف صور/بيانات قديمة مش محتاجاها أو التصدير والاسترجاع على جهاز/متصفح بمساحة أكبر.":""}`;
    el.className=warn?"hint negative":"hint";
  }catch(e){el.textContent=""}
}
document.addEventListener("DOMContentLoaded",renderStorageUsageInfo);

// سجل التغييرات الحساسة كان بيعرض entityId الخام (نص عشوائي بحروف وأرقام،
// زي "a1b2c3d4-...") في نص كل سطر — ده اللي كان يبان "أرقام بحروف" غريبة.
// الدالة دي بترجعه لرابط فعلي للسجل نفسه (لو لسه موجود، أو لسه في سلة
// المهملات)، وبنستخدم x.details (اللي هو أصلاً اسم/رقم مفهوم اتسجل وقت
// الحدث زي اسم العميل أو رقم أمر الشغل) بدل الـ ID الخام في العرض.
function findTrashEntryByOriginalId(kind, origId) {
  if (!origId) return null;
  return arr(K.trash).find(t => {
    if (kind === "customer" && t.type === "customer") return t.payload?.customer?.id === origId;
    if (kind === "device" && t.type === "device") return t.payload?.device?.id === origId;
    if (kind === "request" && t.type === "request") return t.payload?.request?.id === origId;
    return false;
  }) || null;
}
function auditEntryHref(entity, entityId) {
  if (!entityId) return null;
  if (entity === "عميل") {
    if (arr(K.c).some(x => x.id === entityId)) return "customer.html?id=" + encodeURIComponent(entityId);
    const t = findTrashEntryByOriginalId("customer", entityId);
    return t ? "settings.html#trash-entry-" + encodeURIComponent(t.id) : null;
  }
  if (entity === "جهاز") {
    if (arr(K.d).some(x => x.id === entityId)) return "device.html?id=" + encodeURIComponent(entityId);
    const t = findTrashEntryByOriginalId("device", entityId);
    return t ? "settings.html#trash-entry-" + encodeURIComponent(t.id) : null;
  }
  if (entity === "أمر شغل") {
    if (arr(K.r).some(x => x.id === entityId)) return "request.html?id=" + encodeURIComponent(entityId);
    const t = findTrashEntryByOriginalId("request", entityId);
    return t ? "settings.html#trash-entry-" + encodeURIComponent(t.id) : null;
  }
  if (entity === "خزنة" || entity === "حركة خزنة") return "treasury.html";
  if (entity === "محفظة" || entity === "حركة محفظة" || entity === "محفظة/خزنة") return "wallets.html";
  return null;
}
function renderAuditLog(){
  const host=document.getElementById("auditLogResult");if(!host||typeof getAuditLog!=="function")return;
  const rows=getAuditLog().slice(0,80);
  host.innerHTML=rows.length?`<div class="audit-list">${rows.map(x=>{
    const label=`<b>${esc(x.action)}</b> — ${esc(x.entity)}${x.details?` — ${esc(x.details)}`:""}`;
    const timeHtml=`<small class="hint">${esc(new Date(x.at).toLocaleString("ar-EG"))}</small>`;
    const href=auditEntryHref(x.entity,x.entityId);
    return href?`<a class="setting-row audit-row" href="${href}"><span>${label}${timeHtml}</span></a>`:`<div class="setting-row audit-row"><span>${label}${timeHtml}</span></div>`;
  }).join("")}</div>`:`<div class="hint">لا توجد تغييرات مسجلة بعد.</div>`;
}
document.addEventListener("DOMContentLoaded",renderAuditLog);

async function snapshotAllData(){
  const data={};Object.values(K).forEach(k=>{data[k]=get(k,k===K.s?null:[])});
  data.wf_notif_enabled=localStorage.getItem("wf_notif_enabled");
  data.images=window.ImageStore?await window.ImageStore.exportAll():{};
  data._meta={exportedAt:new Date().toISOString(),app:"الورشة الفنية",version:1,schemaVersion:window.getSchemaVersion?window.getSchemaVersion():1};
  return data;
}
function downloadBackupData(data,prefix){
  try{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
    const a=document.createElement("a");a.href=url;a.download=`${prefix}-الورشة-الفنية-${stamp}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);return true;
  }catch(e){console.error("[backup] تعذر إنشاء ملف النسخة",e);return false}
}
function bytesToB64(bytes){let s="";bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s)}
function b64ToBytes(s){const bin=atob(s),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
async function encryptBackupData(data,password){const enc=new TextEncoder(),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),base=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveKey"]),key=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:150000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt"]),cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,enc.encode(JSON.stringify(data)));return{_encrypted:true,algorithm:"AES-GCM",kdf:"PBKDF2-SHA-256",iterations:150000,salt:bytesToB64(salt),iv:bytesToB64(iv),ciphertext:bytesToB64(new Uint8Array(cipher))}}
async function decryptBackupData(envelope,password){const dec=new TextDecoder(),base=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]),key=await crypto.subtle.deriveKey({name:"PBKDF2",salt:b64ToBytes(envelope.salt),iterations:envelope.iterations,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["decrypt"]),plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64ToBytes(envelope.iv)},key,b64ToBytes(envelope.ciphertext));return JSON.parse(dec.decode(plain))}
function backupSummary(data){const n=k=>Array.isArray(data[k])?data[k].length:0;return `المخطط: ${data._meta?.schemaVersion||1} — العملاء: ${n(K.c)} — الأجهزة: ${n(K.d)} — أوامر الشغل: ${n(K.r)} — قطع المخزن: ${n(K.p)} — حركات المخزن: ${n(K.m)} — حركات الحسابات: ${n(K.wtx)} — حركات الخزنة: ${n(K.tr)} — الصور/التسجيلات: ${data.images&&typeof data.images==="object"?Object.keys(data.images).length:0}`}
function validateBackupData(data){
  if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("bad");
  // متطلب مرن: النسخة لازم تكون فيها على الأقل مفتاح أساسي واحد قديم (زي
  // العملاء) عشان نتأكد إنها نسخة احتياطية حقيقية من النظام مش JSON عشوائي.
  // من غير ما نطلب وجود كل مفتاح موجود في النسخة الحالية من التطبيق —
  // النظام بيضيف مفاتيح تخزين جديدة بمرور الوقت (زي سلة المهملات)، فنسخة
  // احتياطية قديمة أُخذت قبل إضافة مفتاح جديد من حقها الطبيعي إنها ما
  // تحتويش عليه، وده مش عطل في النسخة ولا سبب لرفضها بالكامل.
  if(!(K.c in data))throw new Error("missing-core-keys");
  const keys=Object.values(K);
  for(const k of keys){
    if(!(k in data))continue; // غير موجود = نسخة أقدم من إضافة المفتاح ده، طبيعي
    const v=data[k],isSettings=k===K.s;
    if(isSettings?(v!==null&&(typeof v!=="object"||Array.isArray(v))):!Array.isArray(v))throw new Error(`invalid-${k}`);
    if(Array.isArray(v)&&v.some(x=>!x||typeof x!=="object"||Array.isArray(x)))throw new Error(`invalid-record-${k}`)
  }
  if(data.images!==undefined&&(data.images===null||typeof data.images!=="object"||Array.isArray(data.images)))throw new Error("invalid-images");
  if(data.images&&Object.values(data.images).some(x=>typeof x!=="string"))throw new Error("invalid-image-value");
  if(data._meta!==undefined&&(data._meta===null||typeof data._meta!=="object"||Array.isArray(data._meta)))throw new Error("invalid-meta");
  const schema=+(data._meta?.schemaVersion||1),current=+(window.CURRENT_SCHEMA_VERSION||schema);if(!Number.isInteger(schema)||schema<1)throw new Error("invalid-schema");if(schema>current)throw new Error("future-schema");
  if(data.wf_notif_enabled!==undefined&&data.wf_notif_enabled!==null&&typeof data.wf_notif_enabled!=="string")throw new Error("invalid-notification-setting");
  return {schemaVersion:schema};
}
async function backupAllData(){if(backupBusy)return;backupBusy=true;try{const data=await snapshotAllData(),hash=await backupDataFingerprint(data),password=prompt("كلمة مرور اختيارية للنسخة الاحتياطية. اتركها فارغة لنسخة عادية:");if(password===null)return;const output=password?await encryptBackupData(data,password):data;if(!downloadBackupData(output,password?"نسخة-احتياطية-مشفرة":"نسخة-احتياطية"))throw new Error("download");localStorage.setItem("wf_last_backup_at",data._meta.exportedAt);localStorage.setItem(AUTO_BACKUP_HASH_KEY,hash);localStorage.setItem(AUTO_BACKUP_CHECK_KEY,String(Date.now()));localStorage.setItem(AUTO_BACKUP_PROMPT_KEY,String(Date.now()));renderBackupInfo();if(typeof renderBackupReminder==="function")renderBackupReminder()}catch(e){console.error("[backup] فشل التصدير",e);alert("تعذر إنشاء النسخة الاحتياطية. تأكد من كلمة المرور ومساحة التخزين ثم حاول مرة أخرى.")}finally{backupBusy=false}}

async function restoreBackupFile(input){
  if(backupBusy)return;backupBusy=true;
  const file=input?.files?.[0];if(!file){backupBusy=false;return;}
  const reader=new FileReader();reader.onload=async()=>{
    let oldImages=null,oldData=null,oldState=null,safetyDownloaded=false;
    try{
      let data=JSON.parse(reader.result);if(data?._encrypted){const password=prompt("اكتب كلمة مرور النسخة المشفرة:");if(!password)throw new Error("missing-password");data=await decryptBackupData(data,password)}validateBackupData(data);
      const backupSchema=data._meta?.schemaVersion||1;
      const summary=backupSummary(data);
      oldState=captureLocalDataState();oldData=await snapshotAllData();oldImages=oldData.images;
      // ملف أمان مستقل يُنزّل قبل أي استبدال، ليظل متاحًا حتى لو حدث فشل غير متوقع.
      safetyDownloaded=downloadBackupData(oldData,"نسخة-أمان-قبل-الاسترجاع");
      if(!safetyDownloaded)throw new Error("safety-download");
      if(!confirm(`سيتم استبدال البيانات الحالية بالنسخة المختارة.\n\nمحتوى النسخة:\n${summary}\n\nتم تنزيل نسخة أمان تلقائية من الحالة الحالية قبل الاسترجاع. هل تريد المتابعة؟`)){input.value="";return}
      const staged={},keys=Object.values(K);keys.forEach(k=>{if(k in data)staged[k]=data[k]});
      if(window.ImageStore?.clearAll&&!await window.ImageStore.clearAll())throw new Error("clear-images");
      if(data.images&&window.ImageStore&&!await window.ImageStore.importAll(data.images))throw new Error("import-images");
      if(!commitStorage(staged))throw new Error("storage-failed");
      if("wf_notif_enabled" in data){if(data.wf_notif_enabled==null)localStorage.removeItem("wf_notif_enabled");else if(!put("wf_notif_enabled",data.wf_notif_enabled))throw new Error("notification-setting-failed")}
      if(window.setSchemaVersion)window.setSchemaVersion(Math.min(backupSchema,window.CURRENT_SCHEMA_VERSION||backupSchema));
      if(data._meta?.exportedAt)localStorage.setItem("wf_last_backup_at",data._meta.exportedAt);
      localStorage.setItem(AUTO_BACKUP_HASH_KEY,await backupDataFingerprint(await snapshotAllData()));localStorage.setItem(AUTO_BACKUP_CHECK_KEY,String(Date.now()));localStorage.setItem(AUTO_BACKUP_PROMPT_KEY,String(Date.now()));
      alert("✅ تم استرجاع النسخة الاحتياطية بنجاح. هيتم فتح الرئيسية الآن.");location.href="index.html";
    }catch(e){
      console.error("[backup] فشل الاسترجاع",e);
      restoreLocalDataState(oldState);
      try{if(window.ImageStore?.clearAll&&oldImages){await window.ImageStore.clearAll();await window.ImageStore.importAll(oldImages)}}catch(restoreError){console.error("[backup] تعذر استعادة الصور القديمة",restoreError)}
      alert(safetyDownloaded?"تعذر استرجاع النسخة. تم إلغاء العملية وإعادة البيانات المحلية قدر الإمكان. ملف الأمان التلقائي موجود في التنزيلات.":"تعذر قراءة النسخة. لم يتم تغيير البيانات الحالية.");
    }
    input.value="";
    backupBusy=false;
  };reader.readAsText(file);
}

function dataIntegrityReport(){
  const issues=[],seen=new Set(),collections=[[K.c,"العملاء"],[K.d,"الأجهزة"],[K.r,"أوامر الشغل"],[K.p,"قطع المخزن"],[K.m,"حركات المخزن"],[K.wtx,"حركات الحسابات"],[K.tr,"حركات الخزنة"]];
  const push=(o)=>{if(!issues.some(x=>x.key===o.key))issues.push(o)};
  for(const [key,label] of collections){for(const rec of arr(key)){if(!rec||typeof rec!=="object"){push({key:`bad:${key}:${Math.random()}`,message:`${label}: سجل غير صالح.`,link:null,fix:null});continue}if(rec.id){const token=key+":"+rec.id;if(seen.has(token))push({key:`dup:${token}`,message:`${label}: رقم مكرر ${rec.id}.`,link:null,fix:null});seen.add(token)}}}
  const customers=new Set(arr(K.c).map(x=>x?.id).filter(Boolean)),devices=new Set(arr(K.d).map(x=>x?.id).filter(Boolean)),parts=new Set(arr(K.p).map(x=>x?.id).filter(Boolean));
  arr(K.d).forEach(x=>{if(x?.customerId&&!customers.has(x.customerId))push({key:`dev-cust:${x.id}`,message:`الجهاز ${deviceName ? (x.type||"")+" — "+(x.brand||"") : x.id}: مرتبط بعميل غير موجود (رقم العميل المحفوظ: ${x.customerId}). المفروض تكون خانة العميل فاضية أو مربوطة بعميل موجود فعليًا.`,link:`device.html?id=${x.id}`,linkLabel:"فتح الجهاز نفسه",fix:{type:"unlinkDeviceCustomer",args:{deviceId:x.id},detail:"هيمسح ربط الجهاز بالعميل غير الموجود بس (تصبح خانة العميل فاضية)، من غير ما يمسح الجهاز نفسه. تقدر تربطه بعميل صحيح بعد كده من صفحة الجهاز."}})});
  const requestIds=new Set(arr(K.r).map(x=>x?.id).filter(Boolean));
  arr(K.r).forEach(r=>{
    const label=r.no||r.id||"بدون رقم",link=`request.html?id=${r.id}`,partsList=Array.isArray(r.parts)?r.parts:[];
    if(r?.customerId&&!customers.has(r.customerId))push({key:`req-cust:${r.id}`,message:`الأمر ${label}: العميل المرتبط بيه (رقم ${r.customerId}) غير موجود. المفروض يكون مربوط بعميل فعلي أو تشيل الربط من الأمر نفسه.`,link,linkLabel:"فتح الأمر نفسه",fix:null});
    if(r?.deviceId&&!devices.has(r.deviceId))push({key:`req-dev:${r.id}`,message:`الأمر ${label}: الجهاز المرتبط بيه (رقم ${r.deviceId}) غير موجود. المفروض يكون مربوط بجهاز فعلي أو تشيل الربط من الأمر نفسه.`,link,linkLabel:"فتح الأمر نفسه",fix:null});
    partsList.forEach((x,idx)=>{
      if(!x.external&&x.partId&&!parts.has(x.partId))push({key:`req-part:${r.id}:${idx}`,message:`الأمر ${label}: سطر قطعة رقم ${idx+1} في قائمة قطع الأمر (كمية ${x.qty}) بيشاور على قطعة اتمسحت من المخزن (رقم ${x.partId}). المفروض السطر ده يتشال لإن القطعة مش موجودة أصلًا.`,link,linkLabel:"فتح الأمر نفسه",fix:{type:"removeOrderPartLine",args:{requestId:r.id,index:idx},detail:"هيشيل سطر القطعة دي بس من قائمة قطع الأمر (لإنها اتمسحت من المخزن)، ويعيد حساب إجمالي قطع الغيار والإجمالي الكلي للأمر على أساس باقي القطع. باقي بيانات الأمر مش هتتغير."}});
      else if(!Number.isFinite(+x.qty)||+x.qty<=0)push({key:`req-qty:${r.id}:${idx}`,message:`الأمر ${label}: سطر قطعة رقم ${idx+1} في قائمة قطع الأمر عنده كمية غير صالحة (${x.qty}). المفروض تكون رقم أكبر من صفر.`,link,linkLabel:"فتح الأمر نفسه",fix:{type:"removeOrderPartLine",args:{requestId:r.id,index:idx},detail:"هيشيل سطر القطعة اللي كميته غير صالحة بس من قائمة قطع الأمر، ويعيد حساب إجمالي قطع الغيار والإجمالي الكلي على أساس باقي القطع."}});
    });
    const freshParts=(Array.isArray(r.parts)?r.parts:[]).filter((x,idx)=>!((!x.external&&x.partId&&!parts.has(x.partId))||!Number.isFinite(+x.qty)||+x.qty<=0));
    const partsTotal=freshParts.reduce((n,x)=>n+(+x.qty||0)*(+x.sell||0),0),partsCost=freshParts.reduce((n,x)=>n+(+x.qty||0)*(+x.cost||0),0),expectedTotal=(+r.labor||0)+partsTotal;
    const totalsMismatch=Math.abs((+r.partsTotal||0)-partsTotal)>.01||Math.abs((+r.partsCost||0)-partsCost)>.01||Math.abs((+r.total||0)-expectedTotal)>.01;
    if(totalsMismatch)push({key:`req-totals:${r.id}`,message:`الأمر ${label}: الإجمالي المسجّل حاليًا ${(+r.total||0).toFixed(2)} ج (وإجمالي قطع الغيار ${(+r.partsTotal||0).toFixed(2)} ج)، والمفروض يكونوا ${expectedTotal.toFixed(2)} ج و${partsTotal.toFixed(2)} ج على التوالي بناءً على تفاصيل القطع الفعلية في الأمر.`,link,linkLabel:"فتح الأمر نفسه",fix:{type:"recomputeOrderTotals",args:{requestId:r.id},detail:`هيعيد حساب إجمالي قطع الغيار (${partsTotal.toFixed(2)} ج) والإجمالي الكلي (${expectedTotal.toFixed(2)} ج) بناءً على القطع الفعلية في الأمر، من غير ما يغيّر أي حاجة تانية.`}});
    // العربون بيتسجّل وقت فتح الأمر لتوثيق مصدر الفلوس اللي دخلت المحفظة،
    // ووقتها لسه مش معروف إجمالي الأمر (تكاليف القطع/المصنعية) لحد ما يتقفل.
    // فطبيعي جدًا إن العربون يكون أكبر من الإجمالي المؤقت في أمر لسه مفتوح،
    // ودي مش حالة عطل. الفحص هنا بيتحقق بس من: (1) رقم غير صالح أصلًا، أو
    // (2) أمر مقفول (إجماليه النهائي معروف) والعربون فيه أكبر من الإجمالي ده.
    if(!Number.isFinite(+r.deposit)||+r.deposit<0)push({key:`req-deposit:${r.id}`,message:`الأمر ${label}: العربون المسجّل حاليًا ${r.deposit} غير صالح. المفروض يكون رقم صفر أو أكبر.`,link,linkLabel:"فتح الأمر نفسه",fix:{type:"clampOrderDeposit",args:{requestId:r.id},detail:"هيظبط العربون على صفر بس (لإنه مش رقم صالح أصلًا)، من غير ما يغيّر أي حاجة تانية في الأمر."}});
    else if(r.closed&&+r.deposit>expectedTotal+.01)push({key:`req-deposit:${r.id}`,message:`الأمر ${label} مقفول، والعربون المسجّل فيه (${(+r.deposit).toFixed(2)} ج) أكبر من إجمالي الأمر النهائي (${expectedTotal.toFixed(2)} ج). تأكد إن الإجمالي بعد القفل مسجّل صح.`,link,linkLabel:"فتح الأمر نفسه",fix:{type:"clampOrderDeposit",args:{requestId:r.id},detail:`هيظبط العربون ليكون رقم منطقي (بين صفر و${expectedTotal.toFixed(2)} ج) من غير ما يغيّر أي حاجة تانية في الأمر.`}});
  });
  arr(K.p).forEach(p=>{if(!Number.isFinite(+p.qty)||+p.qty<0)push({key:`part-qty:${p.id}`,message:`قطعة ${p.name||p.id||"بدون اسم"}: الكمية المسجّلة في المخزن حاليًا (${p.qty}) غير صالحة. المفروض تكون رقم صفر أو أكبر.`,link:`part.html?id=${p.id}`,linkLabel:"فتح القطعة نفسها",fix:{type:"zeroPartQty",args:{partId:p.id},detail:"هيظبط كمية القطعة دي في المخزن على صفر بس، من غير ما يغيّر سعرها أو أي بيانات تانية."}})});
  // حركات المخزن: لو القطعة لسه موجودة، الرابط بيودّي لصفحة حركات الصنف نفسها
  // مع #move-<id> يفتح ويظلّل الحركة بعينها (شوف shared-data.js وapp-part-moves.js).
  // لو القطعة اتمسحت خالص مفيش صفحة تفصيلية تتفتح للحركة، فبنوضّح كل التفاصيل
  // في الرسالة نفسها بدل الرابط.
  arr(K.m).forEach(m=>{
    const partOk=!!(m?.partId&&parts.has(m.partId));
    const moveLink=partOk?`part-moves.html?id=${m.partId}#move-${m.id}`:null;
    const whenText=m.at?new Date(m.at).toLocaleString("ar-EG"):"تاريخ غير معروف";
    if(!partOk)push({key:`move-part:${m.id}`,message:`حركة مخزن (${m.type||"بدون نوع"} — كمية ${m.qty} — ${whenText}): القطعة المرتبطة بيها (رقم ${m.partId||"غير معروف"}) اتمسحت من المخزن، فمفيش صفحة تفصيلية تقدر تفتحها للحركة دي تحديدًا.`,link:null,linkLabel:null,fix:null});
    if(!Number.isFinite(+m.qty)||+m.qty<=0)push({key:`move-qty:${m.id}`,message:`حركة مخزن (${m.type||"بدون نوع"} — ${whenText}): الكمية المسجلة (${m.qty}) غير صالحة. المفروض تكون رقم أكبر من صفر.`,link:moveLink,linkLabel:moveLink?"فتح الحركة نفسها":null,fix:null});
    if(m.requestId&&!requestIds.has(m.requestId))push({key:`move-req:${m.id}`,message:`حركة مخزن (${m.type||"بدون نوع"} — كمية ${m.qty} — ${whenText}): أمر الشغل المرتبط بيها (رقم ${m.requestId}) اتمسح.`,link:moveLink,linkLabel:moveLink?"فتح الحركة نفسها":null,fix:null});
  });
  // حركات الحسابات/الخزنة: الرابط بيودّي لصفحة المحفظة/الخزنة نفسها مع
  // #tx-<id> يفتح ويظلّل الحركة بعينها (شوف wallets.js وtreasury.js).
  const activeWallet=arr(K.wtx).filter(x=>!x.deleted),activeTreasury=arr(K.tr).filter(x=>!x.deleted),refSeen=new Set();
  activeWallet.forEach(x=>{
    const wLink=x.wallet?`wallet.html?type=wallet&name=${encodeURIComponent(x.wallet)}#tx-${x.id}`:"wallets.html";
    const wLabel=x.wallet?"فتح الحركة نفسها":"فتح الحسابات";
    const desc=`"${x.reason||"بدون سبب"}"${x.wallet?` في محفظة ${x.wallet}`:""}`;
    if(!Number.isFinite(+x.amount)||+x.amount<=0)push({key:`wtx-amt:${x.id}`,message:`حركة حساب ${desc}: المبلغ المسجل (${x.amount}) غير صالح. المفروض يكون رقم أكبر من صفر.`,link:wLink,linkLabel:wLabel,fix:null});
    if(x.type!=="in"&&x.type!=="out")push({key:`wtx-type:${x.id}`,message:`حركة حساب ${desc}: نوع الحركة (${x.type}) غير صالح. المفروض يكون "وارد" أو "صرف".`,link:wLink,linkLabel:wLabel,fix:null});
    if(x.refKey){
      if(refSeen.has(x.refKey))push({key:`wtx-refdup:${x.refKey}`,message:`حركات الحسابات: رابط مكرر ${x.refKey} على أكتر من حركة.`,link:wLink,linkLabel:wLabel,fix:null});
      refSeen.add(x.refKey);
      const orderId=String(x.refKey).replace(/^order-(?:deposit|final)-/,"");
      if(/^order-(?:deposit|final)-/.test(x.refKey)&&!requestIds.has(orderId))push({key:`wtx-reforder:${x.id}`,message:`حركة حساب ${desc}: مرتبطة بأمر شغل (رقم ${orderId}) غير موجود.`,link:wLink,linkLabel:wLabel,fix:null});
    }
  });
  activeTreasury.forEach(x=>{
    const tLink=`treasury.html#tx-${x.id}`,desc=`"${x.reason||"بدون سبب"}"`;
    if(!Number.isFinite(+x.amount)||+x.amount<=0)push({key:`tr-amt:${x.id}`,message:`حركة خزنة ${desc}: المبلغ المسجل (${x.amount}) غير صالح. المفروض يكون رقم أكبر من صفر.`,link:tLink,linkLabel:"فتح الحركة نفسها",fix:null});
    if(x.type!=="in"&&x.type!=="out")push({key:`tr-type:${x.id}`,message:`حركة خزنة ${desc}: نوع الحركة (${x.type}) غير صالح. المفروض يكون "وارد" أو "صرف".`,link:tLink,linkLabel:"فتح الحركة نفسها",fix:null});
  });
  const transferIds=new Set([...activeWallet,...activeTreasury].map(x=>x.transferId).filter(Boolean));
  transferIds.forEach(tid=>{
    const w=activeWallet.filter(x=>x.transferId===tid),t=activeTreasury.filter(x=>x.transferId===tid);
    const anchor=t[0]?{link:`treasury.html#tx-${t[0].id}`,label:"فتح طرف الخزنة"}:(w[0]&&w[0].wallet?{link:`wallet.html?type=wallet&name=${encodeURIComponent(w[0].wallet)}#tx-${w[0].id}`,label:"فتح طرف المحفظة"}:{link:"treasury.html",label:"فتح الخزنة"});
    if(w.length!==1||t.length!==1)push({key:`transfer-parts:${tid}`,message:`التحويل ${tid}: عدد أطرافه غير صحيح (${w.length} في المحفظة، ${t.length} في الخزنة). المفروض طرف واحد بالظبط في كل جانب.`,link:anchor.link,linkLabel:anchor.label,fix:null});
    else if(+w[0].amount!==+t[0].amount)push({key:`transfer-amt:${tid}`,message:`التحويل ${tid}: المبلغ مختلف بين طرفَي التحويل (${(+w[0].amount).toFixed(2)} ج في المحفظة مقابل ${(+t[0].amount).toFixed(2)} ج في الخزنة). المفروض يكونوا نفس المبلغ في الطرفين.`,link:anchor.link,linkLabel:anchor.label,fix:null});
  });
  return {issues,counts:{customers:arr(K.c).length,devices:arr(K.d).length,requests:arr(K.r).length,parts:arr(K.p).length,moves:arr(K.m).length,wallets:activeWallet.length,treasury:activeTreasury.length}};
}
function runDataIntegrityCheck(){
  const host=document.getElementById("dataIntegrityResult");if(!host)return;
  const report=dataIntegrityReport(),c=report.counts;
  if(!report.issues.length){host.innerHTML=`<div class="hint">✅ لم يتم العثور على تعارضات واضحة. تم فحص ${c.customers} عميل، ${c.devices} جهاز، ${c.requests} أمر، ${c.parts} قطعة، و${c.moves} حركة مخزن.</div>`;return}
  host.innerHTML=`<div class="hint">⚠️ تم العثور على ${report.issues.length} ملاحظة. لم يتم تعديل أي بيانات تلقائيًا. اضغط على أي ملاحظة عشان تفتح السجل نفسه وتشوف اللي ناقص، وكل ملاحظة قابلة للإصلاح ليها زرار خاص بيها بيقولك هيعمل إيه بالظبط قبل ما ينفّذ.</div>
  <ul class="integrity-list">${report.issues.slice(0,80).map(x=>`<li>
    <span>${esc(x.message)}</span>
    <span class="compact-actions">${x.link?`<a class="secondary mini-action" href="${esc(x.link)}">${esc(x.linkLabel||"فتح")} ›</a>`:""}${x.fix?`<button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="applyIntegrityFix('${x.key}')">🔧 إصلاح</button>`:""}</span>
  </li>`).join("")}</ul>${report.issues.length>80?`<div class="hint">تم عرض أول 80 ملاحظة فقط.</div>`:""}`;
}
function applyIntegrityFix(key){
  const issue=dataIntegrityReport().issues.find(x=>x.key===key);
  if(!issue||!issue.fix){runDataIntegrityCheck();return}
  if(!confirm(issue.fix.detail+"\n\nمتأكد إنك عايز تنفّذ الإصلاح ده؟"))return;
  const {type,args}=issue.fix;
  if(type==="unlinkDeviceCustomer"){
    const all=arr(K.d),d=all.find(x=>x.id===args.deviceId);if(!d)return runDataIntegrityCheck();
    d.customerId="";
    if(!saveJSONSafe(K.d,all))return;
    renderDevices?.();
  }else if(type==="zeroPartQty"){
    const all=arr(K.p),p=all.find(x=>x.id===args.partId);if(!p)return runDataIntegrityCheck();
    p.qty=0;
    if(!saveJSONSafe(K.p,all))return;
    renderParts?.();
  }else if(type==="removeOrderPartLine"){
    const all=arr(K.r),r=all.find(x=>x.id===args.requestId);if(!r||!Array.isArray(r.parts))return runDataIntegrityCheck();
    r.parts.splice(args.index,1);
    const partsTotal=r.parts.reduce((n,x)=>n+(+x.qty||0)*(+x.sell||0),0),partsCost=r.parts.reduce((n,x)=>n+(+x.qty||0)*(+x.cost||0),0);
    r.partsTotal=partsTotal;r.partsCost=partsCost;r.total=(+r.labor||0)+partsTotal;
    if(+r.deposit>r.total)r.deposit=r.total;
    if(!saveJSONSafe(K.r,all))return;
    renderRequests?.();
  }else if(type==="recomputeOrderTotals"){
    const all=arr(K.r),r=all.find(x=>x.id===args.requestId);if(!r)return runDataIntegrityCheck();
    const partsList=Array.isArray(r.parts)?r.parts:[];
    const partsTotal=partsList.reduce((n,x)=>n+(+x.qty||0)*(+x.sell||0),0),partsCost=partsList.reduce((n,x)=>n+(+x.qty||0)*(+x.cost||0),0);
    r.partsTotal=partsTotal;r.partsCost=partsCost;r.total=(+r.labor||0)+partsTotal;
    if(+r.deposit>r.total)r.deposit=r.total;
    if(!saveJSONSafe(K.r,all))return;
    renderRequests?.();
  }else if(type==="clampOrderDeposit"){
    const all=arr(K.r),r=all.find(x=>x.id===args.requestId);if(!r)return runDataIntegrityCheck();
    const expectedTotal=+r.total||0;
    if(!Number.isFinite(+r.deposit)||+r.deposit<0)r.deposit=0;
    else if(+r.deposit>expectedTotal)r.deposit=expectedTotal;
    if(!saveJSONSafe(K.r,all))return;
    renderRequests?.();
  }
  window.auditLog?.("إصلاح سلامة بيانات", "سجل", key, type);
  runDataIntegrityCheck();
}

// أمر شغل سريع من الرئيسية: عميل + جهاز + عطل، والباقي يتظبط من صفحة الأمر نفسها.
