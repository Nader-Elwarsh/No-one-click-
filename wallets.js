/* =========================================================
   الورشة الفنية — المحافظ (wallets.js)
   =========================================================
   ده قسم منفصل عن "الخزنة" (treasury.js) بالكامل ومختلف عنه في الغرض:
   - الخزنة (treasury.js) = درج نقدي واحد مستقل، لا يتأثر تلقائيًا بأي حاجة.
   - المحافظ (هنا) = كذا "مكان" فلوس فعلي (محفظتي الشخصية، محافظ موبايل،
     إنستاباي...) مربوطة فعليًا بأوامر الشغل: لما عميل يدفع عربون أو
     تحصيل نهائي، بيتحدد دفع في أنهي محفظة، وده بيتسجل هنا تلقائيًا.
     وبرضو تقدر تسجل منها مصاريفك الشخصية ومصاريف التشغيل يدويًا،
     فتعرف بالظبط "الفلوس اللي في المحفظة دي جايه منين ورايحة فين".

   أسماء المحافظ نفسها وتصنيفات الحركة (شخصي/تشغيل/تحصيل عميل...) قوايم
   قابلة للتعديل بالكامل (إضافة/تعديل/حذف/ترتيب) من صفحة الإعدادات، بنفس
   آلية باقي القوايم في النظام (settings().wallets / settings().walletCategories).
   ========================================================= */

/* ---------------------------------------------------------------------
   قراءة وحساب الأرصدة
--------------------------------------------------------------------- */
function walletTxEntries(){return (typeof arrCached==="function"?arrCached(K.wtx):arr(K.wtx)).filter(x=>!x.deleted)}
function walletTxFor(walletName){return walletTxEntries().filter(x=>x.wallet===walletName)}
function walletRawBalance(walletName){return walletTxFor(walletName).reduce((a,x)=>a+(x.type==="in"?(+x.amount||0):-(+x.amount||0)),0)}
// حد أقصى اختياري لمحفظة معينة (زي إنستاباي) — لو موجود، الرصيد المعروض/المحسوب
// في الإجمالي بيتوقف عنده حتى لو الحركات الفعلية جمعت لرقم أعلى. راجع
// s.walletCaps في shared-data.js وقسم الحسابات في الإعدادات لتعديله.
function walletCapOf(walletName){
  let cap=(settings().walletCaps||{})[walletName];
  cap=+cap;
  return Number.isFinite(cap)&&cap>0?cap:null;
}
function walletBalance(walletName){
  let raw=walletRawBalance(walletName),cap=walletCapOf(walletName);
  return cap!==null&&raw>cap?cap:raw;
}
function walletsOverview(){return (settings().wallets||[]).map(w=>({name:w,balance:walletBalance(w),raw:walletRawBalance(w),cap:walletCapOf(w)}))}
// إجمالي الرصيد الكلي عبر كل المحافظ مع بعض، للعرض السريع فوق الصفحة.
function walletsTotalBalance(){return walletsOverview().reduce((a,w)=>a+w.balance,0)}
// ملخص حسب تصنيف الحركة (شخصي/تشغيل/تحصيل عميل...): إجمالي وارد وصادر لكل تصنيف،
// عشان "أنا بصرف إيه شخصيًا وإيه مصاريف تشغيل" يبقى رقم واحد واضح.
function walletCategoryTotals(){
  let map={};
  walletTxEntries().forEach(x=>{
    let c=x.category||"أخرى";
    map[c]=map[c]||{in:0,out:0};
    if(x.type==="in")map[c].in+=(+x.amount||0);else map[c].out+=(+x.amount||0);
  });
  return Object.entries(map).map(([category,v])=>({category,...v}));
}
// حساب "مصاريفي الشخصية" و"مصاريف الورشة (تشغيل)" كرقمين ثابتين وواضحين
// فوق الصفحة على طول، بدل ما يكونوا مدفونين جوه تفصيل قابل للطي.
// بيعتمدوا على تصنيف الحركة نفسه ("مصروف شخصي" / "مصروف تشغيل")، فأي
// حركة (يدوية أو مربوطة بأمر شغل) بنفس التصنيف بتتحسب هنا تلقائيًا.
function personalVsWorkshopTotals(){
  let cat=walletCategoryTotals();
  let personal=cat.find(c=>c.category==="مصروف شخصي")||{in:0,out:0};
  let workshop=cat.find(c=>c.category==="مصروف تشغيل")||{in:0,out:0};
  return {personal:personal.out||0, workshop:workshop.out||0};
}

/* ---------------------------------------------------------------------
   حركة يدوية (من صفحة المحافظ نفسها أو من زر الإدخال السريع بالرئيسية)
--------------------------------------------------------------------- */
function addWalletManual(type,prefix="wt"){
  let amountEl=document.getElementById(prefix+"Amount"),walletEl=document.getElementById(prefix+"Wallet"),
      categoryEl=document.getElementById(prefix+"Category"),subCategoryEl=document.getElementById(prefix+"SubCategory"),
      reasonEl=document.getElementById(prefix+"Reason"),
      dateEl=document.getElementById(prefix+"Date"),timeEl=document.getElementById(prefix+"Time"),
      noteEl=document.getElementById(prefix+"Note");
  let amount=+amountEl?.value||0,wallet=(walletEl?.value||"").trim(),
      category=categoryEl?.value||"أخرى",reason=(reasonEl?.value||"").trim(),
      date=dateEl?.value||localDateKey(new Date()),time=timeEl?.value||new Date().toTimeString().slice(0,5);
  if(amount<=0)return alert("أدخل مبلغ صحيح.");
  if(!wallet)return alert("اختر المحفظة.");
  if(!reason)return alert("اكتب سبب الحركة.");
  // نوع المصروف الفرعي (وقود، صيانة، إيجار... أو مواصلات، أكل، متفرقات لو
  // شخصي) بيتسجل لو التصنيف "مصروف تشغيل" أو "مصروف شخصي"، عشان تبويب
  // إحصائيات الصرف ("أكتر حاجة بيتصرف فيها") يشمل النوعين مش تشغيل بس.
  let subCategory=subCategoryKeyFor(category)?(subCategoryEl?.value||""):"";
  let entry={
    id:id(),refKey:null,manualOverride:true,deleted:false,type,amount,wallet,category,subCategory,
    date,time,reason,note:(noteEl?.value||"").trim(),source:"manual",createdAt:new Date().toISOString()
  };
  if(!saveJSONSafe(K.wtx,arr(K.wtx).concat(entry)))return null;
  window.auditLog?.(type==="in"?"إضافة وارد":"إضافة صرف", "محفظة", entry.id, `${wallet} ${amount.toFixed(2)} ج - ${reason}`);
  return entry;
}
function walletManualFromPage(type){
  addWalletManual(type,"wt");
  renderWallets();
}
// أي تصنيف حركة له قايمة "نوع فرعي" مرتبطة به (لأغراض إحصائيات الصرف)،
// وأي قايمة قابلة للتعديل بالكامل من ⚙️ الإعدادات ← الحسابات.
function subCategoryKeyFor(category){
  if(category==="مصروف تشغيل")return "expenseCategories";
  if(category==="مصروف شخصي")return "personalExpenseCategories";
  return null;
}
function subCategoryLabelFor(category){
  return category==="مصروف تشغيل"?"نوع مصروف التشغيل":"نوع المصروف الشخصي";
}
// إظهار/إخفاء خانة "النوع الفرعي" وتحديث قايمتها حسب التصنيف المختار —
// بتتنادى من onchange خانة التصنيف في أي فورم (صفحة الحسابات الرئيسية
// "wt" أو صفحة محفظة بعينها "wd").
function toggleExpenseSubCategory(prefix){
  let catEl=document.getElementById(prefix+"Category"),wrap=document.getElementById(prefix+"SubCatWrap"),
      sel=document.getElementById(prefix+"SubCategory"),labelEl=wrap?.querySelector("span")||wrap?.firstChild;
  if(!catEl||!wrap)return;
  let key=subCategoryKeyFor(catEl.value);
  wrap.classList.toggle("hidden",!key);
  if(key&&sel){
    let list=settings()[key]||[];
    sel.innerHTML=list.map(c=>`<option>${esc(c)}</option>`).join("");
  }
  let labelNode=wrap.querySelector(".subcat-label");
  if(labelNode)labelNode.textContent=subCategoryLabelFor(catEl.value);
}
function editWalletTx(txId){
  let a=arr(K.wtx),e=a.find(x=>x.id===txId);if(!e)return;
  let newAmount=prompt("المبلغ:",e.amount);if(newAmount===null)return;
  let newReason=prompt("سبب الحركة:",e.reason||"");if(newReason===null)return;
  let newNote=prompt("تفاصيل إضافية:",e.note||"");if(newNote===null)return;
  let oldAmount=+e.amount||0;
  e.amount=Math.abs(+newAmount)||0;e.reason=(newReason||"").trim()||e.reason;e.note=(newNote||"").trim();
  if(e.refKey)e.manualOverride=true;
  if(!saveJSONSafe(K.wtx,a))return;
  window.auditLog?.("تعديل حركة", "محفظة", e.id, `${oldAmount.toFixed(2)} ← ${e.amount.toFixed(2)} ج`);
  renderWallets();renderWalletDetail();
}
function deleteWalletTx(txId){
  let a=arr(K.wtx),e=a.find(x=>x.id===txId);if(!e)return;
  let isTransfer=e.source==="transfer"&&e.transferId;
  let msg=isTransfer?"هذه حركة تحويل مرتبطة بحركة مقابلة في الخزنة. حذف الحركتين معًا (من المحفظة والخزنة)؟":(e.refKey?"هذه الحركة مرتبطة بأمر شغل. حذفها من هنا لن يعدّل أمر الشغل نفسه، بس هتختفي من كشف المحفظة. تأكيد الحذف؟":"حذف هذه الحركة من كشف المحفظة؟");
  if(!confirm(msg))return;
  e.deleted=true;
  if(isTransfer){
    let t=arr(K.tr),tidx=t.findIndex(x=>x.transferId===e.transferId&&x.source==="transfer");
    if(tidx>=0){t.splice(tidx,1);if(!commitStorage({[K.wtx]:a,[K.tr]:t}))return}else if(!saveJSONSafe(K.wtx,a))return;
  }else if(!saveJSONSafe(K.wtx,a))return;
  window.auditLog?.("حذف", "حركة محفظة", txId, e.reason||"");
  renderWallets();renderWalletDetail();
  if(typeof renderTreasury==="function")renderTreasury();
}

/* ---------------------------------------------------------------------
   الربط التلقائي بأوامر الشغل: كل ما تتغيّر قيمة العربون أو يتحصّل
   المبلغ النهائي مع تحديد محفظة، بتتسجل/تتحدّث حركة واحدة مرتبطة
   بنفس refKey (بدل ما تتكرر الحركة في كل مرة يتعدل فيها الأمر).
--------------------------------------------------------------------- */
function upsertWalletTxForRef(refKey,data){
  let a=arr(K.wtx),idx=a.findIndex(x=>x.refKey===refKey&&!x.deleted);
  // لو المستخدم عدّل الحركة دي يدويًا من صفحة المحفظة (editWalletTx بيحط
  // manualOverride:true)، معناها بقى بيديرها بنفسه — فمينفعش أي حفظ تاني
  // للأمر المرتبط بيها (حتى لغرض تاني تمامًا زي إضافة قطعة) يدوس على تعديله
  // ويرجّعها للمبلغ التلقائي القديم بصمت. قبل الإصلاح ده، manualOverride
  // كان بيتسجّل بس من غير ما حد يتحقق منه في أي مكان.
  if(idx>=0&&a[idx].manualOverride)return true;
  let amount=+data.amount||0,wallet=(data.wallet||"").trim();
  if(!wallet||amount<=0){
    if(idx>=0)return put(K.wtx,a.map((x,i)=>i===idx?{...x,deleted:true}:x));
    return true;
  }
  if(idx>=0){
    Object.assign(a[idx],{amount,wallet,category:data.category||a[idx].category,reason:data.reason||a[idx].reason,date:data.date||a[idx].date});
  }else{
    a.push({
      id:id(),refKey,manualOverride:false,deleted:false,type:"in",amount,wallet,
      category:data.category||"تحصيل عميل",reason:data.reason||"",note:data.note||"",
      date:data.date||localDateKey(new Date()),time:new Date().toTimeString().slice(0,5),
      source:"order-link",createdAt:new Date().toISOString()
    });
  }
  return put(K.wtx,a);
}
// بيتنادى بعد حفظ أمر الشغل (جديد أو تعديل)؛ لو مفيش محفظة متحددة أو
// العربون صفر، الحركة (لو كانت موجودة من قبل) بتتشال تلقائيًا.
function syncWalletForOrderDeposit(order){
  return upsertWalletTxForRef("order-deposit-"+order.id,{
    amount:order.deposit,wallet:order.depositWallet,category:"تحصيل عميل",
    reason:`💵 عربون أمر الشغل ${order.no}`
  });
}
// بيتنادى وقت "تم الدفع بالكامل وإغلاق الأمر" مع تحديد المحفظة اللي
// اتحصل فيها المبلغ المتبقي.
function syncWalletForOrderClose(order,collected,wallet){
  return upsertWalletTxForRef("order-final-"+order.id,{
    amount:collected,wallet,category:"تحصيل عميل",
    reason:`💳 تحصيل نهائي أمر الشغل ${order.no}`
  });
}

/* ---------------------------------------------------------------------
   التحويل بين المحافظ والخزنة (الدرج)
   =========================================================
   الخزنة (treasury.js) والمحافظ (هنا) حسابان مستقلان تمامًا في حساباتهم
   (رصيد كل واحد منهم بيتحسب من حركاته هو بس). التحويل هنا مجرد وسيلة
   لنقل مبلغ من حساب لحساب: بيسجل حركة "صادر" في المصدر وحركة "وارد" في
   الوجهة في نفس اللحظة، بدون ما يدمج الحسابين أو يخليهم يتأثروا ببعض
   تلقائيًا بأي شكل تاني. الحركتان مربوطتان ببعض بس بـ transferId
   للعرض/المرجعية فقط.
--------------------------------------------------------------------- */
function transferBetweenWalletAndTreasury(direction,walletName,amount,date,time,reason,note){
  amount=Math.abs(+amount)||0;
  if(amount<=0)return alert("أدخل مبلغ صحيح.");
  if(!walletName)return alert("اختر المحفظة.");
  date=date||localDateKey(new Date());time=time||new Date().toTimeString().slice(0,5);
  let transferId=id();
  let baseReason=(reason||"").trim()||(direction==="toTreasury"?`🔁 تحويل من ${walletName} إلى الخزنة`:`🔁 تحويل من الخزنة إلى ${walletName}`);
  let noteVal=(note||"").trim();
  const now=new Date().toISOString();
  const walletTx={id:id(),refKey:null,manualOverride:true,deleted:false,type:direction==="toTreasury"?"out":"in",amount,wallet:walletName,category:"سلفة / تحويل",date,time,reason:baseReason,note:noteVal,source:"transfer",transferId,createdAt:now};
  const treasuryTx={id:id(),refKey:null,manualOverride:true,deleted:false,type:direction==="toTreasury"?"in":"out",amount,date,time,reason:baseReason,counterparty:walletName,place:"",category:"تحويل",note:noteVal,source:"transfer",transferId,createdAt:now};
  const result=withRollback([K.wtx,K.tr],()=>{
    if(!put(K.wtx,arr(K.wtx).concat(walletTx)))return{ok:false};
    if(!put(K.tr,arr(K.tr).concat(treasuryTx)))return{ok:false};
    return{ok:true};
  });
  if(!result?.ok)return alert("تعذر حفظ التحويل كاملًا؛ لم يتم تسجيل أي من طرفيه.");
  window.auditLog?.("تحويل", "محفظة/خزنة", transferId, `${direction==="toTreasury"?walletName+" ← الخزنة":"الخزنة ← "+walletName} ${amount.toFixed(2)} ج`);
  renderWallets();renderTreasury();renderWalletDetail();
  return result;
}
function toggleWalletTransferPanel(){
  let body=document.getElementById("walletTransferBody"),btn=document.getElementById("walletTransferToggleBtn");
  if(!body||!btn)return;
  let opening=body.classList.contains("hidden");
  body.classList.toggle("hidden");
  btn.textContent=opening?"🔁 تحويل بين المحافظ والخزنة (دوس للإغلاق)":"🔁 تحويل بين المحافظ والخزنة (دوس للفتح)";
  btn.classList.toggle("quick-order-open",opening);
  if(opening)setTimeout(()=>body.scrollIntoView({behavior:"smooth",block:"nearest"}),50);
}
function walletTransferWidgetHtml(){
  let wallets=settings().wallets||[],today=localDateKey(new Date());
  return `<section class="panel" id="walletTransferPanel" style="margin-bottom:14px">
    <button type="button" id="walletTransferToggleBtn" class="quick-order-toggle" data-wf-event="click" data-wf-code="toggleWalletTransferPanel()">🔁 تحويل بين المحافظ والخزنة (دوس للفتح)</button>
    <div id="walletTransferBody" class="hidden">
      <div class="hint" style="margin-top:10px">كل حساب بيفضل مستقل في حساباته؛ التحويل بيسجل حركة صادر من المصدر ووارد في الوجهة بس، من غير ما يدمج الحسابين.</div>
      <div class="form-grid" style="margin-top:8px">
        <label>الاتجاه<select id="wtrDirection">
          <option value="toTreasury">من محفظة ← إلى الخزنة</option>
          <option value="toWallet">من الخزنة ← إلى محفظة</option>
        </select></label>
        <label>المحفظة<select id="wtrWallet">${wallets.length?wallets.map(w=>`<option>${esc(w)}</option>`).join(""):`<option value="">لا توجد محافظ</option>`}</select></label>
        <label>المبلغ<input id="wtrAmount" type="number" step="0.01" min="0" placeholder="0.00"></label>
        <label>التاريخ<input id="wtrDate" type="date" value="${today}"></label>
        <label>الوقت<input id="wtrTime" type="time" value="${new Date().toTimeString().slice(0,5)}"></label>
        <label class="wide">السبب (اختياري)<input id="wtrReason" placeholder="مثال: سحب من المحفظة للخزنة"></label>
        <label class="wide">تفاصيل إضافية<input id="wtrNote" placeholder="اختياري"></label>
      </div>
      <div class="actions">
        <button type="button" class="primary" data-wf-event="click" data-wf-code="executeWalletTreasuryTransfer()">🔁 نفّذ التحويل</button>
      </div>
    </div>
  </section>`;
}
function executeWalletTreasuryTransfer(){
  let dir=document.getElementById("wtrDirection")?.value||"toTreasury",
      wallet=document.getElementById("wtrWallet")?.value||"",
      amount=+document.getElementById("wtrAmount")?.value||0,
      date=document.getElementById("wtrDate")?.value,
      time=document.getElementById("wtrTime")?.value,
      reason=document.getElementById("wtrReason")?.value||"",
      note=document.getElementById("wtrNote")?.value||"";
  transferBetweenWalletAndTreasury(dir,wallet,amount,date,time,reason,note);
}
/* ---------------------------------------------------------------------
   العرض: صفحة تفاصيل محفظة واحدة (أو تصنيف حركة واحد كحساب تجميعي)
   =========================================================
   بتتفتح من الكارت/الأيقونة في صفحة المحافظ الرئيسية:
   wallet.html?type=wallet&name=... لمحفظة فعلية (بها إضافة حركة مباشرة)
   wallet.html?type=category&name=... لحساب تجميعي حسب تصنيف الحركة
   (زي "مصروف شخصي")، وده عرض فقط لأنه بيجمع من كذا محفظة.
--------------------------------------------------------------------- */
function walletDetailParams(){
  let q=new URLSearchParams(location.search);
  return {type:q.get("type")==="category"?"category":"wallet",name:q.get("name")||""};
}
function walletDetailEntries(type,name){
  return type==="category"?walletTxEntries().filter(x=>(x.category||"أخرى")===name):walletTxFor(name);
}
function walletDetailBalance(type,name){
  if(type==="wallet")return walletBalance(name); // بيحترم الحد الأقصى لو متحدد للمحفظة دي
  return walletDetailEntries(type,name).reduce((a,x)=>a+(x.type==="in"?(+x.amount||0):-(+x.amount||0)),0);
}
function walletManualFromDetail(type,walletName){
  let amountEl=document.getElementById("wdAmount"),categoryEl=document.getElementById("wdCategory"),
      subCategoryEl=document.getElementById("wdSubCategory"),
      reasonEl=document.getElementById("wdReason"),dateEl=document.getElementById("wdDate"),
      timeEl=document.getElementById("wdTime"),noteEl=document.getElementById("wdNote");
  let amount=+amountEl?.value||0,category=categoryEl?.value||"أخرى",reason=(reasonEl?.value||"").trim(),
      date=dateEl?.value||localDateKey(new Date()),time=timeEl?.value||new Date().toTimeString().slice(0,5);
  if(amount<=0)return alert("أدخل مبلغ صحيح.");
  if(!reason)return alert("اكتب سبب الحركة.");
  let subCategory=subCategoryKeyFor(category)?(subCategoryEl?.value||""):"";
  let entry={id:id(),refKey:null,manualOverride:true,deleted:false,type,amount,wallet:walletName,category,subCategory,
    date,time,reason,note:(noteEl?.value||"").trim(),source:"manual",createdAt:new Date().toISOString()};
  if(!saveJSONSafe(K.wtx,arr(K.wtx).concat(entry)))return;
  window.auditLog?.(type==="in"?"إضافة وارد":"إضافة صرف", "محفظة", entry.id, `${walletName} ${amount.toFixed(2)} ج - ${reason}`);
  renderWalletDetail();
}
function renderWalletDetail(){
  let el=document.getElementById("walletDetailPage");if(!el)return;
  let {type,name}=walletDetailParams();
  if(!name){el.innerHTML="<div class='item'>الحساب غير محدد.</div>";return}
  let categories=settings().walletCategories||[];
  let isWallet=type==="wallet";
  let filterCategory=document.getElementById("wdFilterCategory")?.value||"";
  let today=localDateKey(new Date());
  let entries=walletDetailEntries(type,name)
    .filter(x=>!filterCategory||x.category===filterCategory)
    .sort((a,b)=>new Date((b.date||"")+"T"+(b.time||"00:00"))-new Date((a.date||"")+"T"+(a.time||"00:00"))||new Date(b.createdAt)-new Date(a.createdAt));
  let balance=walletDetailBalance(type,name);
  let rawBalance=isWallet?walletRawBalance(name):balance,cap=isWallet?walletCapOf(name):null;
  let icon=isWallet?"💳":(name==="مصروف شخصي"?"🙋":name==="مصروف تشغيل"?"🔧":"🏷️");
  el.classList.add("ps-context-target");el.setAttribute("data-ps-title",`حساب ${name}`);
  el.innerHTML=`
    <div class="page-head"><h1 class="profile-title">${icon} ${esc(name)}</h1><span class="ps-inline-actions no-print" aria-label="إجراءات الطباعة والمشاركة"><button type="button" class="ps-icon-btn" title="طباعة" aria-label="طباعة" data-wf-event="click" data-wf-code="printWorkshopTarget(this)">🖨️</button><button type="button" class="ps-icon-btn" title="مشاركة" aria-label="مشاركة" data-wf-event="click" data-wf-code="shareWorkshopTarget(this)">↗️</button></span></div>
    <div class="treasury-balance ${balance<0?"negative":""}">
      <span>${isWallet?"رصيد المحفظة الحالي":"إجمالي حركات هذا التصنيف عبر كل المحافظ"}</span><b>${balance.toFixed(2)} ج</b>
    </div>
    ${cap!==null?`<div class="hint">🔒 هذا الحساب له حد أقصى مضبوط من ⚙️ الإعدادات: ${cap.toFixed(2)} ج${rawBalance>cap?` (الرصيد الفعلي من الحركات المسجّلة هنا ${rawBalance.toFixed(2)} ج، لكن المعروض والمحسوب في الإجمالي متوقف عند الحد الأقصى).`:"."}</div>`:""}
    ${isWallet?`
    <div class="treasury-actions">
      <div class="form-grid">
        <label>المبلغ<input id="wdAmount" type="number" step="0.01" min="0" placeholder="0.00"></label>
        <label>التصنيف <a class="mini-action" href="settings.html#wallet-settings-panel" title="تعديل التصنيف/النوع من الإعدادات">⚙️</a><select id="wdCategory" data-wf-event="change" data-wf-code="toggleExpenseSubCategory('wd')">${categories.map(c=>`<option>${esc(c)}</option>`).join("")}</select></label>
        <label id="wdSubCatWrap" class="${subCategoryKeyFor(categories[0])?"":"hidden"}"><span class="subcat-label">${subCategoryLabelFor(categories[0])}</span><a class="mini-action" href="settings.html#wallet-settings-panel" title="تعديل التصنيف/النوع من الإعدادات">⚙️</a><select id="wdSubCategory">${(settings()[subCategoryKeyFor(categories[0])||"expenseCategories"]||[]).map(c=>`<option>${esc(c)}</option>`).join("")}</select></label>
        <label>التاريخ<input id="wdDate" type="date" value="${today}"></label>
        <label>الوقت<input id="wdTime" type="time" value="${new Date().toTimeString().slice(0,5)}"></label>
        <label class="wide">السبب<input id="wdReason" placeholder="مثال: سحب شخصي، بنزين..."></label>
        <label class="wide">تفاصيل إضافية<input id="wdNote" placeholder="اختياري"></label>
      </div>
      <div class="actions">
        <button type="button" class="primary" data-wf-event="click" data-wf-code="walletManualFromDetail('in','${escAttr(name)}')">➕ وارد</button>
        <button type="button" class="secondary danger-btn" data-wf-event="click" data-wf-code="walletManualFromDetail('out','${escAttr(name)}')">➖ صرف</button>
      </div>
    </div>
    ${walletTransferWidgetHtml()}`:`<div class="hint">ده حساب تجميعي حسب تصنيف الحركة "${esc(name)}" عبر كل المحافظ مع بعض، مش محفظة فعلية بذاتها. لتسجيل حركة جديدة بنفس التصنيف، من صفحة أي حساب أو من صفحة الحسابات الرئيسية.</div>`}
    <div class="filters">
      <select id="wdFilterCategory" data-wf-event="change" data-wf-code="renderWalletDetail()"><option value="">كل التصنيفات</option>${categories.map(c=>`<option ${c===filterCategory?"selected":""}>${esc(c)}</option>`).join("")}</select>
    </div>
    <h3 class="treasury-list-title">📋 كشف حركات ${isWallet?"المحفظة":"التصنيف"}</h3>
    ${entries.length?entries.map(x=>`<div class="treasury-row ${x.type}" id="tx-${x.id}">
      <div class="treasury-row-main">
        <b>${esc(x.reason||"—")}</b>
        <small>${esc(new Date((x.date||today)+"T"+(x.time||"00:00")).toLocaleString("ar-EG"))}${!isWallet?` • 💳 ${esc(x.wallet||"—")}`:""} • 🏷️ ${esc(x.category||"أخرى")}${x.subCategory?` • 📂 ${esc(x.subCategory)}`:""}${x.source==="order-link"?" • 🔗 أمر شغل":""}${x.source==="transfer"?" • 🔁 تحويل":""}${x.source==="migrated-expense"?" • ↩️ مرحّل من كشف الحساب القديم":""}</small>
        ${x.note?`<small>📝 ${esc(x.note)}</small>`:""}
      </div>
      <div class="treasury-row-amount ${x.type}">${x.type==="in"?"+":"−"}${(+x.amount||0).toFixed(2)} ج</div>
      <div class="treasury-row-actions"><button type="button" class="mini-action" data-wf-event="click" data-wf-code="editWalletTx('${x.id}')">✏️</button><button type="button" class="mini-action" data-wf-event="click" data-wf-code="deleteWalletTx('${x.id}')">🗑️</button></div>
    </div>`).join(""):`<div class="hint">لا توجد حركات بعد.</div>`}
  `;
}

/* ---------------------------------------------------------------------
   العرض: صفحة المحافظ الكاملة
--------------------------------------------------------------------- */
function renderWallets(){
  let el=document.getElementById("walletsPage");if(!el)return;
  let wallets=settings().wallets||[],categories=settings().walletCategories||[];
  let overview=walletsOverview(),catTotals=walletCategoryTotals(),pvw=personalVsWorkshopTotals();
  let today=localDateKey(new Date());
  el.innerHTML=`
    <div class="treasury-balance">
      <span>إجمالي أرصدة كل الحسابات</span><b>${walletsTotalBalance().toFixed(2)} ج</b>
    </div>
    <a class="wallet-icon-card treasury-peek" href="treasury.html" style="display:flex;margin:10px 0"><i>🏦</i><b>رصيد الخزنة (درج نقدي مستقل)</b><span>${(typeof treasuryBalance==="function"?treasuryBalance():0).toFixed(2)} ج</span></a>
    <div class="hint" style="margin:-4px 0 10px">🏦 الخزنة حساب مستقل تمامًا ومش داخلة في الإجمالي اللي فوق.</div>
    <div class="wallet-icon-grid">
      <a class="wallet-icon-card" href="wallet.html?type=category&name=${encodeURIComponent("مصروف شخصي")}"><i>🙋</i><b>حساب مصاريفي الشخصية</b><span>${pvw.personal.toFixed(2)} ج</span></a>
      <a class="wallet-icon-card" href="wallet.html?type=category&name=${encodeURIComponent("مصروف تشغيل")}"><i>🔧</i><b>حساب مصاريف الورشة (تشغيل)</b><span>${pvw.workshop.toFixed(2)} ج</span></a>
      ${overview.map(w=>`<a class="wallet-icon-card" href="wallet.html?type=wallet&name=${encodeURIComponent(w.name)}"><i>💳</i><b>${esc(w.name)}${w.cap!==null?" 🔒":""}</b><span>${w.balance.toFixed(2)} ج${w.cap!==null&&w.raw>w.cap?` <small>(الفعلي ${w.raw.toFixed(2)})</small>`:""}</span></a>`).join("")}
    </div>
    <div class="hint" style="margin-top:6px">ملحوظة: "مصاريفي الشخصية" و"مصاريف الورشة" مش رصيد فلوس منفصل، هما تجميع للحركات اللي جوه المحافظ فوق أصلاً — عشان كده مش بيتحسبوا في الإجمالي، ولو جمعتهم هيبقى فيه تكرار. 🔒 بجانب اسم المحفظة معناه إن لها حد أقصى مضبوط من ⚙️ الإعدادات (زي إنستاباي عادةً) — راجع صفحتها لتفاصيل أكتر.</div>
    ${overview.length?"":`<div class="hint">لا توجد حسابات بعد. أضفها من ⚙️ الإعدادات ← الحسابات.</div>`}
    ${renderSpendingStatsHtml()}
    ${walletTransferWidgetHtml()}
    <details class="expense-panel">
      <summary>📊 ملخص كل تصنيف حركة على حدة (شخصي / تشغيل / تحصيل عميل...)</summary>
      <div class="profile-grid">
        ${catTotals.length?catTotals.map(c=>`<div class="kv"><b>${esc(c.category)}</b>وارد ${c.in.toFixed(2)} ج · صادر ${c.out.toFixed(2)} ج</div>`).join(""):`<div class="hint">لا توجد حركات بعد.</div>`}
      </div>
    </details>
    <div class="treasury-actions">
      <div class="form-grid">
        <label>المبلغ<input id="wtAmount" type="number" step="0.01" min="0" placeholder="0.00"></label>
        <label>المحفظة<select id="wtWallet">${wallets.map(w=>`<option>${esc(w)}</option>`).join("")}</select></label>
        <label>التصنيف <a class="mini-action" href="settings.html#wallet-settings-panel" title="تعديل التصنيف/النوع من الإعدادات">⚙️</a><select id="wtCategory" data-wf-event="change" data-wf-code="toggleExpenseSubCategory('wt')">${categories.map(c=>`<option>${esc(c)}</option>`).join("")}</select></label>
        <label id="wtSubCatWrap" class="${subCategoryKeyFor(categories[0])?"":"hidden"}"><span class="subcat-label">${subCategoryLabelFor(categories[0])}</span><a class="mini-action" href="settings.html#wallet-settings-panel" title="تعديل التصنيف/النوع من الإعدادات">⚙️</a><select id="wtSubCategory">${(settings()[subCategoryKeyFor(categories[0])||"expenseCategories"]||[]).map(c=>`<option>${esc(c)}</option>`).join("")}</select></label>
        <label>التاريخ<input id="wtDate" type="date" value="${today}"></label>
        <label>الوقت<input id="wtTime" type="time" value="${new Date().toTimeString().slice(0,5)}"></label>
        <label class="wide">السبب<input id="wtReason" placeholder="مثال: عربون، سحب شخصي، بنزين..."></label>
        <label class="wide">تفاصيل إضافية<input id="wtNote" placeholder="اختياري"></label>
      </div>
      <div class="actions">
        <button type="button" class="primary" data-wf-event="click" data-wf-code="walletManualFromPage('in')">➕ وارد</button>
        <button type="button" class="secondary danger-btn" data-wf-event="click" data-wf-code="walletManualFromPage('out')">➖ صرف</button>
      </div>
    </div>
    <div class="hint">📋 كشف الحركات التفصيلي لكل حساب بقى جوه صفحته الخاصة — دوس على أي أيقونة فوق لعرضه وإضافة حركات ليه.</div>
  `;
}
