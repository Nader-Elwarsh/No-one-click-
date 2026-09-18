/* =========================================================
   الورشة الفنية — الخزنة (treasury.js)
   =========================================================
   منقول من app.js زي ما هو بالظبط (بند 4 في خطة التحسينات: فصل app.js
   تدريجيًا بدل ما نعيد كتابته دفعة واحدة). قسم مستقل منطقيًا عن باقي
   الأقسام (عملاء/أجهزة/أوامر شغل)، وأي كود تاني بينادي عليه (زي
   persistRequestRecord وقت حفظ عربون) بيستخدمه كدالة عامة عادي زي ما
   كان قبل النقل — الترتيب في الصفحة (script tags) هو treasury.js قبل
   app.js، فمفيش أي فرق في السلوك.
   ========================================================= */

/* ---------------------------------------------------------------------
   💵 الخزنة المستقلة:
   الخزنة هنا = درج نقدي مستقل فقط.
   لا تُضاف تحصيلات أوامر الشغل ولا تُخصم مصاريف التشغيل من رصيدها تلقائيًا.
   يمكن عرض ملخص التشغيل للمتابعة فقط، لكنه لا يدخل في رصيد الخزنة.
--------------------------------------------------------------------- */
function treasuryEntries(){return arr(K.tr).filter(x=>!x.deleted)}
function treasuryBalance(){return treasuryEntries().reduce((a,x)=>a+(x.type==="in"?(+x.amount||0):-(+x.amount||0)),0)}
function syncTreasuryForOrderDeposit(order){return null}
function syncTreasuryForOrderClose(order,collected){return null}
function addTreasuryManual(type){
  let amountEl=document.getElementById("trAmount"),reasonEl=document.getElementById("trReason"),
      dateEl=document.getElementById("trDate"),timeEl=document.getElementById("trTime"),
      personEl=document.getElementById("trPerson"),placeEl=document.getElementById("trPlace"),
      categoryEl=document.getElementById("trCategory"),noteEl=document.getElementById("trNote");
  let amount=+amountEl.value||0,reason=(reasonEl.value||"").trim(),
      date=dateEl.value||localDateKey(new Date()),time=timeEl.value||new Date().toTimeString().slice(0,5);
  if(amount<=0)return alert("أدخل مبلغ صحيح.");
  if(!reason)return alert("اكتب سبب الحركة.");
  let entry={
    id:id(),refKey:null,manualOverride:true,deleted:false,type,amount,date,time,
    reason,counterparty:(personEl?.value||"").trim(),place:(placeEl?.value||"").trim(),
    category:categoryEl?.value||"أخرى",note:(noteEl?.value||"").trim(),
    source:"cash-drawer",createdAt:new Date().toISOString()
  };
  if(!saveJSONSafe(K.tr,arr(K.tr).concat(entry)))return;window.auditLog?.("إضافة حركة", "خزنة", entry.id, `${type} ${amount.toFixed(2)} ج`);renderTreasury();
}
function saveOpeningBalance(){
  let el=document.getElementById("trOpening"),amount=Math.abs(+el.value||0),
      dateEl=document.getElementById("trOpeningDate"),date=dateEl?.value||localDateKey(new Date());
  let a=arr(K.tr),existing=a.find(x=>x.refKey==="opening-balance"&&!x.deleted);
  if(existing){existing.amount=amount;existing.date=date;existing.type="in";existing.reason="رصيد افتتاحي";existing.source="cash-drawer"}
  else a.push({id:id(),refKey:"opening-balance",manualOverride:true,deleted:false,type:"in",amount,date,time:"00:00",reason:"رصيد افتتاحي",category:"رصيد افتتاحي",source:"cash-drawer",createdAt:new Date().toISOString()});
  if(!saveJSONSafe(K.tr,a))return;window.auditLog?.("تعديل رصيد افتتاحي", "خزنة", existing?.id||"opening-balance", `${amount.toFixed(2)} ج`);renderTreasury();
}
function editTreasuryEntry(entryId){
  let a=arr(K.tr),e=a.find(x=>x.id===entryId);if(!e)return;
  let newAmount=prompt("المبلغ:",e.amount);if(newAmount===null)return;
  let newReason=prompt("سبب الحركة:",e.reason);if(newReason===null)return;
  let newPerson=prompt("لمن / من؟:",e.counterparty||"");if(newPerson===null)return;
  let newPlace=prompt("فين / المكان؟:",e.place||"");if(newPlace===null)return;
  let oldAmount=+e.amount||0;
  e.amount=Math.abs(+newAmount)||0;e.reason=(newReason||"").trim()||e.reason;
  e.counterparty=(newPerson||"").trim();e.place=(newPlace||"").trim();e.manualOverride=true;
  if(!saveJSONSafe(K.tr,a))return;
  window.auditLog?.("تعديل حركة", "خزنة", e.id, `${oldAmount.toFixed(2)} ← ${e.amount.toFixed(2)} ج`);
  renderTreasury();
}
function deleteTreasuryEntry(entryId){
  let a0=arr(K.tr),e0=a0.find(x=>x.id===entryId);
  let isTransfer=e0&&e0.source==="transfer"&&e0.transferId;
  let msg=isTransfer?"هذه حركة تحويل مرتبطة بحركة مقابلة في المحفظة. حذف الحركتين معًا (من الخزنة والمحفظة)؟":"حذف هذه الحركة من كشف الخزنة؟";
  if(!confirm(msg))return;
  let a=arr(K.tr),idx=a.findIndex(x=>x.id===entryId);if(idx<0)return;
  if(a[idx].refKey==="opening-balance"){alert("رصيد الافتتاح يُعدل من قسم الرصيد الافتتاحي ولا يُحذف من هنا.");return}
  let transferId=a[idx].transferId;
  a.splice(idx,1);
  if(isTransfer&&transferId){
    let w=arr(K.wtx),widx=w.findIndex(x=>x.transferId===transferId&&x.source==="transfer"&&!x.deleted);
    if(widx>=0){w[widx].deleted=true;if(!commitStorage({[K.tr]:a,[K.wtx]:w}))return}else if(!saveJSONSafe(K.tr,a))return;
  }else if(!saveJSONSafe(K.tr,a))return;
  window.auditLog?.("حذف", "حركة خزنة", entryId, e0?.reason||"");renderTreasury();
  if(typeof renderWallets==="function")renderWallets();
  if(typeof renderWalletDetail==="function")renderWalletDetail();
}
function operationalTreasurySummary(){
  let deposits=arr(K.r).reduce((a,x)=>a+(+x.deposit||0),0);
  let finalCollections=arr(K.r).filter(x=>x.closed||x.paid).reduce((a,x)=>a+Math.max(0,(+x.total||0)-(+x.deposit||0)),0);
  let expenses=(typeof walletTxEntries==="function"?walletTxEntries():[]).filter(x=>x.category==="مصروف تشغيل").reduce((a,x)=>a+(x.type==="in"?-(+x.amount||0):(+x.amount||0)),0);
  return {deposits,finalCollections,orderCollections:deposits+finalCollections,expenses};
}
function renderTreasury(){
  let el=document.getElementById("treasuryPage");if(!el)return;
  let balance=treasuryBalance();
  let list=treasuryEntries().sort((a,b)=>new Date((b.date||"")+"T"+(b.time||"00:00"))-new Date((a.date||"")+"T"+(a.time||"00:00"))||new Date(b.createdAt)-new Date(a.createdAt));
  let opening=arr(K.tr).find(x=>x.refKey==="opening-balance"&&!x.deleted);
  let op=operationalTreasurySummary();
  let today=localDateKey(new Date());
  el.innerHTML=`
    <div class="treasury-balance ${balance<0?"negative":""}">
      <span>رصيد درج الخزنة الحالي</span><b>${balance.toFixed(2)} ج</b>
    </div>
    <div class="hint" style="margin:10px 0">🔒 هذا الرصيد مستقل تمامًا عن حسابات أوامر الشغل وقطع الغيار ومصاريف التشغيل. أي مبلغ هنا لا يتغير إلا بحركة خزنة يدوية أو الرصيد الافتتاحي أو تحويل من/إلى محفظة.</div>
    ${typeof walletTransferWidgetHtml==="function"?walletTransferWidgetHtml():""}
    <div class="treasury-actions">
      <div class="form-grid">
        <label>المبلغ<input id="trAmount" type="number" step="0.01" min="0" placeholder="0.00"></label>
        <label>التاريخ<input id="trDate" type="date" value="${today}"></label>
        <label>الوقت<input id="trTime" type="time" value="${new Date().toTimeString().slice(0,5)}"></label>
        <label>النوع<select id="trCategory"><option>شخصي</option><option>تشغيل</option><option>سلفة</option><option>تحويل</option><option>أخرى</option></select></label>
        <label>لمن / من؟<input id="trPerson" placeholder="مثال: أحمد، المورد، نفسي"></label>
        <label>فين / المكان؟<input id="trPlace" placeholder="مثال: البيت، الورشة، البنك"></label>
        <label class="wide">السبب<input id="trReason" placeholder="مثال: سحب شخصي، فلوس وصلت، دفعت لمحمد..."></label>
        <label class="wide">تفاصيل إضافية<input id="trNote" placeholder="اختياري"></label>
      </div>
      <div class="actions">
        <button type="button" class="primary" data-wf-event="click" data-wf-code="addTreasuryManual('in')">➕ وارد</button>
        <button type="button" class="secondary danger-btn" data-wf-event="click" data-wf-code="addTreasuryManual('out')">➖ صرف</button>
      </div>
    </div>
    <details class="expense-panel">
      <summary>⚙️ الرصيد الافتتاحي${opening?` (${(+opening.amount||0).toFixed(2)} ج)`: ""}</summary>
      <div class="form-grid">
        <label class="wide">الرصيد الافتتاحي (المبلغ الموجود فعليًا في الدرج عند بداية استخدام الحساب)
          <input id="trOpening" type="number" step="0.01" min="0" value="${opening?opening.amount:0}">
        </label>
        <label>تاريخ بداية الرصيد<input id="trOpeningDate" type="date" value="${opening?.date||today}"></label>
      </div>
      <button type="button" class="secondary" data-wf-event="click" data-wf-code="saveOpeningBalance()">💾 حفظ الرصيد الافتتاحي</button>
    </details>
    <details class="expense-panel">
      <summary>📊 عرض حسابات التشغيل (للاطلاع فقط — لا تدخل في رصيد الخزنة)</summary>
      <div class="profile-grid">
        <div class="kv"><b>💵 عربونات أوامر الشغل</b>${op.deposits.toFixed(2)} ج</div>
        <div class="kv"><b>💳 تحصيلات إغلاق الأوامر</b>${op.finalCollections.toFixed(2)} ج</div>
        <div class="kv"><b>🛠️ إجمالي تحصيلات الأوامر</b>${op.orderCollections.toFixed(2)} ج</div>
        <div class="kv"><b>🧯 مصاريف التشغيل</b>${op.expenses.toFixed(2)} ج</div>
      </div>
      <div class="hint">هذه الأرقام للعرض والمراجعة فقط. لا تُضاف ولا تُخصم من درج الخزنة.</div>
    </details>
    <h3 class="treasury-list-title">📋 كشف درج الخزنة</h3>
    ${list.length?list.map(x=>`<div class="treasury-row ${x.type}" id="tx-${x.id}">
      <div class="treasury-row-main">
        <b>${esc(x.reason||"—")}</b>
        <small>${esc(new Date((x.date||today)+"T"+(x.time||"00:00")).toLocaleString("ar-EG"))} • ${esc(x.category||"أخرى")}${x.counterparty?` • 👤 ${esc(x.counterparty)}`:""}${x.place?` • 📍 ${esc(x.place)}`:""}</small>
        ${x.note?`<small>📝 ${esc(x.note)}</small>`:""}
      </div>
      <div class="treasury-row-amount ${x.type}">${x.type==="in"?"+":"−"}${(+x.amount||0).toFixed(2)} ج</div>
      <div class="treasury-row-actions"><button type="button" class="mini-action" data-wf-event="click" data-wf-code="editTreasuryEntry('${x.id}')">✏️</button><button type="button" class="mini-action" data-wf-event="click" data-wf-code="deleteTreasuryEntry('${x.id}')">🗑️</button></div>
    </div>`).join(""):`<div class="hint">لا توجد حركات في درج الخزنة بعد.</div>`}
  `;
}
