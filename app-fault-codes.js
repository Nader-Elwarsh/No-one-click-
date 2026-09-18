/* =========================================================
   الورشة الفنية — أكواد أعطال الأجهزة (app-fault-codes.js)
   =========================================================
   قسم مرجعي مستقل تمامًا عن الأقسام الأساسية (مش مربوط بعميل أو جهاز
   أو أمر شغل معين): كود العطل (زي E1) + نوع الجهاز + الماركة (اختياري،
   فاضي = "كل الماركات") + وصف قصير + السبب المحتمل + خطوات الفحص/الحل.

   المشاركة مع فنيين تانيين: كل فني بيثبّت نفس التطبيق على جهازه وعنده
   نسخته الخاصة من localStorage، فمفيش مزامنة تلقائية بين الأجهزة. الحل
   العملي: تصدير الأكواد بس (exportFaultCodesOnly) كملف JSON صغير منفصل
   عن النسخة الاحتياطية الكاملة (اللي فيها بيانات عملاء حساسة)، والفني
   التاني يستورده (importFaultCodesFile) وبيتضاف/يتدمج مع نسخته هو من
   غير ما يمسح اللي عنده، ومن غير تكرار لنفس الكود بالظبط.
   ========================================================= */

/* ---------------------------------------------------------------------
   تطبيع النص وكشف التكرار (نفس مبدأ normalizePartText بالظبط)
--------------------------------------------------------------------- */
function normalizeFaultText(v){
  return String(v||"").toLowerCase().normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g,"")
    .replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/[ـ]/g,"")
    .replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x0660))
    .replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x06F0))
    .replace(/[\s\-_./\\]+/g,"").trim();
}
function findDuplicateFaultCode(deviceType,brand,code,excludeId){
  let nc=normalizeFaultText(code);if(!nc)return null;
  let nt=normalizeFaultText(deviceType),nb=normalizeFaultText(brand);
  return arr(K.fc).find(f=>String(f.id)!==String(excludeId||"")
    &&normalizeFaultText(f.code)===nc
    &&normalizeFaultText(f.deviceType)===nt
    &&normalizeFaultText(f.brand)===nb)||null;
}

/* ---------------------------------------------------------------------
   القوائم المستخدمة (نفس أنواع/ماركات الأجهزة في باقي النظام، من ⚙️
   الإعدادات ← أنواع الأجهزة والتصنيفات / الماركات — مفيش قايمة منفصلة).
--------------------------------------------------------------------- */
function fillFaultDeviceTypes(el,selected=""){
  if(!el)return;
  el.innerHTML='<option value="">كل الأنواع (عام)</option>'+Object.keys(settings().types||{}).map(t=>`<option ${t===selected?"selected":""}>${esc(t)}</option>`).join("");
}
function fillFaultBrands(el,selected=""){
  if(!el)return;
  el.innerHTML='<option value="">كل الماركات (عام)</option>'+(settings().brands||[]).map(b=>`<option ${b===selected?"selected":""}>${esc(b)}</option>`).join("");
}

/* ---------------------------------------------------------------------
   الحفظ والحذف
--------------------------------------------------------------------- */
function collectFaultFormData(){
  return {
    deviceType:(fcDeviceType?.value||"").trim(),
    brand:(fcBrand?.value||"").trim(),
    code:(fcCode?.value||"").trim(),
    title:(fcTitle?.value||"").trim(),
    cause:(fcCause?.value||"").trim(),
    fix:(fcFix?.value||"").trim(),
    note:(fcNote?.value||"").trim(),
    addedBy:(fcAddedBy?.value||"").trim()
  };
}
function persistFaultRecord(formData,existing){
  let f=existing||{id:id(),source:"manual",createdAt:new Date().toISOString()};
  Object.assign(f,formData);f.updatedAt=new Date().toISOString();
  let a=arr(K.fc);
  if(!saveJSONSafe(K.fc,existing?a.map(x=>x.id===f.id?f:x):a.concat(f)))return{ok:false};
  return{ok:true,fault:f};
}
function saveFaultCode(e,existing=null){
  e.preventDefault();
  let formData=collectFaultFormData();
  if(!formData.code)return alert("اكتب كود العطل.");
  if(!formData.title)return alert("اكتب وصف قصير للعطل.");
  let dup=findDuplicateFaultCode(formData.deviceType,formData.brand,formData.code,existing?.id);
  if(dup)return alert(`⚠️ الكود «${dup.code}» مسجّل بالفعل لنفس النوع/الماركة (${dup.title||""}).\n\nعدّل الكود الموجود بدل ما تضيف نسخة تانية.`);
  let result=persistFaultRecord(formData,existing);
  if(!result.ok)return;
  location.href=`faultcode.html?id=${result.fault.id}`;
}
/* زي saveFaultCode بالظبط بس من غير الانتقال لصفحة الكود — بتسيب النوع
   والماركة واسم الفني زي ما هم وتفضح بس حقول الكود/الوصف/السبب/الحل،
   عشان تدخل دفعة أكواد لنفس الماركة ورا بعض بسرعة من غير ما ترجع تفتح
   الفورم من الأول في كل مرة. متاحة بس وقت الإضافة الجديدة (مش أثناء تعديل
   كود موجود بالفعل).*/
function saveFaultCodeAndAddAnother(){
  let formData=collectFaultFormData();
  if(!formData.code)return alert("اكتب كود العطل.");
  if(!formData.title)return alert("اكتب وصف قصير للعطل.");
  let dup=findDuplicateFaultCode(formData.deviceType,formData.brand,formData.code,null);
  if(dup)return alert(`⚠️ الكود «${dup.code}» مسجّل بالفعل لنفس النوع/الماركة (${dup.title||""}).\n\nعدّل الكود الموجود بدل ما تضيف نسخة تانية.`);
  let result=persistFaultRecord(formData,null);
  if(!result.ok)return;
  fcCode.value="";fcTitle.value="";fcCause.value="";fcFix.value="";fcNote.value="";
  let hint=document.getElementById("faultDuplicateHint");
  if(hint){hint.textContent=`✅ اتحفظ الكود «${result.fault.code}» — اكتب اللي بعده.`;hint.className="hint success";}
  fcCode.focus();
  renderFaultCodes?.();
}
function deleteFaultCodeRecord(fid){
  let a=arr(K.fc),f=a.find(x=>x.id===fid);if(!f)return;
  if(!confirm(`حذف كود العطل «${f.code}» نهائيًا؟`))return;
  if(!saveJSONSafe(K.fc,a.filter(x=>x.id!==fid)))return;
  renderFaultCodes?.();
  if(document.getElementById("faultCodeProfile"))location.href="faultcodes.html";
}
function deleteAllFaultCodes(){
  let a=arr(K.fc);
  if(!a.length)return alert("لا توجد أكواد أعطال مسجّلة أصلًا.");
  if(!confirm(`حذف جميع أكواد الأعطال (${a.length}) نهائيًا؟ (كل الأنواع والماركات)`))return;
  if(!confirm("تأكيد نهائي: لا يمكن التراجع عن الحذف."))return;
  if(!saveJSONSafe(K.fc,[]))return;
  renderFaultCodes?.();
  alert("تم حذف جميع أكواد الأعطال.");
}
/* حذف كل الأكواد المطابقة لفلتر النوع/الماركة الحالي فوق القائمة — مفيد
   لو عايز تمسح دفعة معينة استوردتها (زي كل أكواد ماركة أو نوع بعينه) من
   غير ما تلمس باقي الأكواد. لازم تختار نوع أو ماركة على الأقل (منعًا من
   حذف الكل بالغلط من الزرار ده؛ لحذف الكل فعلًا فيه الزرار المخصص لده). */
function deleteFilteredFaultCodes(){
  let typeFilter=document.getElementById("fcFilterType")?.value||"";
  let brandFilter=document.getElementById("fcFilterBrand")?.value||"";
  if(!typeFilter&&!brandFilter)return alert("اختار نوع الجهاز أو الماركة فوق (فلتر القائمة) الأول، عشان تحدد الدفعة اللي عايز تمسحها. لحذف كل الأكواد من غير فلتر، استخدم زرار «حذف كل الأكواد».");
  let a=arr(K.fc);
  let matches=a.filter(f=>(!typeFilter||f.deviceType===typeFilter)&&(!brandFilter||f.brand===brandFilter));
  if(!matches.length)return alert("لا توجد أكواد مطابقة لهذا الفلتر.");
  let label=[typeFilter,brandFilter].filter(Boolean).join(" • ")||"الفلتر الحالي";
  if(!confirm(`حذف ${matches.length} كود مطابق لـ (${label}) نهائيًا؟`))return;
  if(!confirm("تأكيد نهائي: لا يمكن التراجع عن الحذف."))return;
  let ids=new Set(matches.map(x=>x.id));
  if(!saveJSONSafe(K.fc,a.filter(x=>!ids.has(x.id))))return;
  renderFaultCodes?.();
  alert(`تم حذف ${matches.length} كود.`);
}

/* ---------------------------------------------------------------------
   إضافة دفعة أكواد مرة واحدة (لصق نص): سطر لكل كود بالشكل
   "الكود | وصف قصير | السبب | الحل | ملاحظة" لنفس النوع/الماركة
   المختارين فوق. بيوري معاينة (وبيوضح أي سطر ناقص أو مكرر) قبل ما
   يتحفظ أي حاجة فعليًا في localStorage — التأكيد خطوة منفصلة.
--------------------------------------------------------------------- */
function parseBulkFaultLines(text){
  return String(text||"").split("\n").map(l=>l.trim()).filter(Boolean).map(line=>{
    let parts=line.split("|").map(p=>p.trim());
    return {code:parts[0]||"",title:parts[1]||"",cause:parts[2]||"",fix:parts[3]||"",note:parts[4]||""};
  });
}
function previewBulkFaultCodes(){
  let box=document.getElementById("bulkFaultPreview");if(!box)return;
  let deviceType=document.getElementById("bfDeviceType")?.value||"";
  let brand=document.getElementById("bfBrand")?.value||"";
  let rows=parseBulkFaultLines(document.getElementById("bfLines")?.value);
  if(!rows.length){box.innerHTML='<div class="item">اكتب سطر واحد على الأقل الأول.</div>';return}
  let validCount=0;
  let seenInBatch=new Set();
  let rowsHtml=rows.map((r,i)=>{
    if(!r.code||!r.title){
      return `<div class="item"><span class="danger">سطر ${i+1} هيتجاهل (لازم كود ووصف قصير مفصولين بـ | على الأقل)</span> — الجزء اللي اتفهم: «${esc(r.code||r.title||"—")}»</div>`;
    }
    let nc=normalizeFaultText(r.code);
    if(findDuplicateFaultCode(deviceType,brand,r.code,null)){
      return `<div class="item"><b>${esc(r.code)}</b> — ${esc(r.title)} <span class="badge">⚠️ مكرر لنفس النوع/الماركة، هيتجاهل</span></div>`;
    }
    if(seenInBatch.has(nc)){
      return `<div class="item"><b>${esc(r.code)}</b> — ${esc(r.title)} <span class="badge">⚠️ مكرر مع سطر فوق في نفس اللصقة، هيتجاهل</span></div>`;
    }
    seenInBatch.add(nc);
    validCount++;
    return `<div class="item"><b>${esc(r.code)}</b> — ${esc(r.title)}${r.cause?`<div>السبب: ${esc(r.cause)}</div>`:""}${r.fix?`<div>الحل: ${esc(r.fix)}</div>`:""}</div>`;
  }).join("");
  let summary=`<p class="hint">${validCount} كود هيتحفظ من ${rows.length} سطر، لـ <b>${esc(deviceType)||"كل الأنواع"}</b> • <b>${esc(brand)||"كل الماركات"}</b>. راجع القايمة تحت كويس قبل التأكيد.</p>`;
  let confirmBtn=validCount?`<div class="actions"><button type="button" class="primary" data-wf-event="click" data-wf-code="confirmBulkFaultCodes()">✅ تأكيد حفظ ${validCount} كود</button></div>`:"";
  box.innerHTML=summary+rowsHtml+confirmBtn;
}
function confirmBulkFaultCodes(){
  let deviceType=document.getElementById("bfDeviceType")?.value||"";
  let brand=document.getElementById("bfBrand")?.value||"";
  let rows=parseBulkFaultLines(document.getElementById("bfLines")?.value).filter(r=>r.code&&r.title);
  if(!rows.length)return alert("مفيش أكواد صالحة للحفظ.");
  let existing=arr(K.fc),added=0,skipped=0;
  let seenInBatch=new Set();
  rows.forEach(r=>{
    let nc=normalizeFaultText(r.code);
    if(findDuplicateFaultCode(deviceType,brand,r.code,null)||seenInBatch.has(nc)){skipped++;return}
    seenInBatch.add(nc);
    existing.push({
      id:id(),deviceType,brand,code:r.code,title:r.title,cause:r.cause,fix:r.fix,note:r.note,
      addedBy:"",source:"bulk",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
    });
    added++;
  });
  if(!saveJSONSafe(K.fc,existing))return;
  alert(`تم حفظ ${added} كود جديد.${skipped?` (اتجاهل ${skipped} كود مكرر).`:""}`);
  document.getElementById("bfLines").value="";
  document.getElementById("bulkFaultPreview").innerHTML="";
  renderFaultCodes?.();
}

/* ---------------------------------------------------------------------
   العرض: صفحة القائمة الرئيسية (فلاتر نوع/ماركة/بحث + فورم إضافة)
--------------------------------------------------------------------- */
function initFaultCodes(){
  let f=document.getElementById("faultForm");if(!f)return;
  let q=new URLSearchParams(location.search),editId=q.get("edit"),existing=editId?arr(K.fc).find(x=>x.id===editId):null;
  fillFaultDeviceTypes(fcDeviceType,existing?.deviceType||"");
  fillFaultBrands(fcBrand,existing?.brand||"");
  fillFaultDeviceTypes(document.getElementById("bfDeviceType"));
  fillFaultBrands(document.getElementById("bfBrand"));
  if(existing){
    fcCode.value=existing.code||"";fcTitle.value=existing.title||"";fcCause.value=existing.cause||"";
    fcFix.value=existing.fix||"";fcNote.value=existing.note||"";fcAddedBy.value=existing.addedBy||"";
    f.classList.remove("hidden");f.querySelector(".primary").textContent="💾 حفظ التعديلات وفتح الكود";
    document.getElementById("fcSaveAddAnotherBtn")?.classList.add("hidden");
  }
  f.onsubmit=e=>saveFaultCode(e,existing);
  let hint=document.getElementById("faultDuplicateHint");
  let checkDup=()=>{
    if(!hint)return;
    let dup=findDuplicateFaultCode(fcDeviceType.value,fcBrand.value,fcCode.value,existing?.id);
    if(dup){hint.innerHTML=`⚠️ نفس الكود مسجّل بالفعل لنفس النوع/الماركة: <b>${esc(dup.title||dup.code)}</b>.`;hint.className="hint negative";return}
    hint.textContent="";hint.className="hint";
  };
  fcCode.addEventListener("input",checkDup);fcDeviceType.addEventListener("change",checkDup);fcBrand.addEventListener("change",checkDup);
  let typeFilter=document.getElementById("fcFilterType"),brandFilter=document.getElementById("fcFilterBrand"),search=document.getElementById("faultSearch");
  if(typeFilter){typeFilter.innerHTML='<option value="">🔧 كل الأنواع</option>'+Object.keys(settings().types||{}).map(t=>`<option>${esc(t)}</option>`).join("");typeFilter.onchange=renderFaultCodes}
  if(brandFilter){brandFilter.innerHTML='<option value="">🏷️ كل الماركات</option>'+(settings().brands||[]).map(b=>`<option>${esc(b)}</option>`).join("");brandFilter.onchange=renderFaultCodes}
  if(search)search.oninput=renderFaultCodes;
  renderFaultCodes();
}
function renderFaultCodes(){
  let el=document.getElementById("faultList");if(!el)return;
  let q=(document.getElementById("faultSearch")?.value||"").toLowerCase();
  let typeFilter=document.getElementById("fcFilterType")?.value||"";
  let brandFilter=document.getElementById("fcFilterBrand")?.value||"";
  let a=arr(K.fc)
    .filter(f=>!typeFilter||f.deviceType===typeFilter)
    .filter(f=>!brandFilter||f.brand===brandFilter)
    .filter(f=>!q||(f.code+" "+f.title+" "+f.cause+" "+f.fix+" "+f.deviceType+" "+f.brand).toLowerCase().includes(q))
    .sort((x,y)=>(x.deviceType||"").localeCompare(y.deviceType||"","ar")||(x.brand||"").localeCompare(y.brand||"","ar")||(x.code||"").localeCompare(y.code||"","ar"));
  el.innerHTML=a.length?a.map(f=>`<div class="item ps-context-target" data-ps-title="كود عطل ${esc(f.code)}">
    <div class="item-head"><a href="faultcode.html?id=${f.id}"><b>🧯 ${esc(f.code)} — ${esc(f.title)}</b></a>${psActions("كود عطل "+f.code)}<button type="button" class="danger-btn small-btn" data-wf-event="click" data-wf-code="deleteFaultCodeRecord('${f.id}')">🗑️ حذف</button></div>
    <div>${esc(f.deviceType)||"كل الأنواع"} • 🏷️ ${esc(f.brand)||"كل الماركات"}</div>
    ${f.cause?`<div>السبب: ${esc(f.cause)}</div>`:""}
  </div>`).join(""):'<div class="item">لا توجد أكواد مسجّلة بهذا الفلتر بعد.</div>';
}

/* ---------------------------------------------------------------------
   العرض: صفحة ملف الكود الواحد
--------------------------------------------------------------------- */
function faultCodeProfile(){
  let el=document.getElementById("faultCodeProfile");if(!el)return;
  let f=arr(K.fc).find(x=>x.id===new URLSearchParams(location.search).get("id"));
  if(!f){el.innerHTML="<div class='item'>الكود غير موجود.</div>";return}
  el.classList.add("ps-context-target");el.setAttribute("data-ps-title",`كود عطل ${f.code}`);
  el.innerHTML=`<div class="profile">
    <div class="page-head"><h1 class="profile-title">🧯 ${esc(f.code)} — ${esc(f.title)}</h1>
      <div class="compact-actions"><a class="secondary" href="faultcodes.html?edit=${f.id}">✏️ تعديل</a><button class="danger-btn" data-wf-event="click" data-wf-code="deleteFaultCodeRecord('${f.id}')">🗑️ حذف</button>${psActions("كود عطل "+f.code)}</div>
    </div>
    <div class="profile-grid">
      <div class="kv"><b>نوع الجهاز</b>${esc(f.deviceType)||"كل الأنواع (عام)"}</div>
      <div class="kv"><b>الماركة</b>${esc(f.brand)||"كل الماركات (عام)"}</div>
      ${f.addedBy?`<div class="kv"><b>أضافه</b>${esc(f.addedBy)}</div>`:""}
    </div>
    ${f.cause?`<h3 class="expense-subtitle">🔍 السبب المحتمل</h3><div class="item">${esc(f.cause).replace(/\n/g,"<br>")}</div>`:""}
    ${f.fix?`<h3 class="expense-subtitle">🛠️ خطوات الفحص/الحل</h3><div class="item">${esc(f.fix).replace(/\n/g,"<br>")}</div>`:""}
    ${f.note?`<h3 class="expense-subtitle">📝 ملاحظات إضافية</h3><div class="item">${esc(f.note).replace(/\n/g,"<br>")}</div>`:""}
  </div>`;
}

/* ---------------------------------------------------------------------
   مشاركة الأكواد مع فنيين تانيين: تصدير/استيراد ملف منفصل تمامًا عن
   النسخة الاحتياطية الكاملة (اللي فيها بيانات عملاء حساسة). الاستيراد
   بيدمج (merge) مع الأكواد الموجودة أصلًا بدل ما يمسحها، ومش بيكرر
   كود موجود بالفعل لنفس النوع/الماركة.
--------------------------------------------------------------------- */
function exportFaultCodesOnly(){
  let data={faultCodes:arr(K.fc),_meta:{exportedAt:new Date().toISOString(),app:"الورشة الفنية — أكواد الأعطال",kind:"fault-codes-only"}};
  let blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  let url=URL.createObjectURL(blob);
  let stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
  let a=document.createElement("a");
  a.href=url;a.download=`اكواد-اعطال-الورشة-الفنية-${stamp}.json`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function importFaultCodesFile(input){
  let file=input?.files?.[0];if(!file)return;
  let reader=new FileReader();
  reader.onload=()=>{
    try{
      let data=JSON.parse(reader.result);
      let incoming=Array.isArray(data)?data:(Array.isArray(data?.faultCodes)?data.faultCodes:null);
      if(!incoming)throw new Error("bad");
      let existing=arr(K.fc),added=0,skipped=0;
      incoming.forEach(raw=>{
        if(!raw||!raw.code)return;
        let dup=findDuplicateFaultCode(raw.deviceType,raw.brand,raw.code,null);
        if(dup){skipped++;return}
        existing.push({
          id:id(),deviceType:raw.deviceType||"",brand:raw.brand||"",code:raw.code||"",
          title:raw.title||"",cause:raw.cause||"",fix:raw.fix||"",note:raw.note||"",
          addedBy:raw.addedBy||"",source:"imported",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
        });
        added++;
      });
      put(K.fc,existing);
      alert(`تم استيراد ${added} كود جديد.${skipped?` (اتجاهل ${skipped} كود مكرر موجود عندك بالفعل).`:""}`);
      renderFaultCodes?.();
    }catch(err){alert("⚠️ ملف غير صالح. تأكد إنه ملف أكواد أعطال مُصدَّر من نفس النظام.")}
    input.value="";
  };
  reader.readAsText(file);
}
