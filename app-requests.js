/* app-requests.js — قسم أوامر الشغل: النموذج، الحفظ، العرض، البروفايل، دورة الحالة والانتقالات، متابعة الورشة، قطع الغيار داخل الأمر. */
function initRequests(){let f=document.getElementById("requestForm");if(!f)return;let q=new URLSearchParams(location.search),editId=q.get("edit"),existing=editId?arr(K.r).find(x=>x.id===editId):null;if(existing?.closed){alert("أمر الشغل مغلق نهائيًا ولا يمكن تعديله.");location.href=`request.html?id=${existing.id}`;return}currentParts=existing?.parts?existing.parts.map(x=>({...x})):[];fillCustomerAutocomplete("rCustomer",existing?.customerId||q.get("customer")||"");fillAddress(rAddress,rCustomer.value,existing?.addressKey||"main");fillDevice(rDevice,rCustomer.value,existing?.deviceId||q.get("device")||"");let s=settings(),defPlace=existing?.executionPlace||(s.executionPlaces||[])[0]||"عند العميل",defWs=existing?.workshopStatus||(s.workshopStatuses||[])[0]||"غير مطلوب",defStatus=existing?.status||"جديد";fillList(rExecutionPlace,"executionPlaces",defPlace,"اختر مكان التنفيذ");fillList(rWorkshopStatus,"workshopStatuses",defWs,"اختر حالة الورشة");if(document.getElementById("rDepositWallet"))fillList(rDepositWallet,"wallets",existing?.depositWallet||s.defaultWallet||"","بدون تحديد");rStatus.innerHTML=nextStatusOptions(defStatus).map(x=>`<option ${x===defStatus?"selected":""}>${esc(x)}</option>`).join("");if(document.getElementById("rTag"))fillListSearch("rTag","orderTag",existing?.tag||"");rCustomer.onchange=()=>{fillAddress(rAddress,rCustomer.value,"main");fillDevice(rDevice,rCustomer.value,"")};rLabor.oninput=calc;rDeposit.oninput=calc;if(existing){rVisit.value=existing.visit||"";rFault.value=existing.fault||"";rWork.value=existing.work||"";rLabor.value=(+existing.labor||0).toFixed(2);rDeposit.value=existing.deposit||0;renderOrderParts();f.classList.remove("hidden");f.querySelector("#requestSubmitBtn").textContent="💾 حفظ التعديلات وفتح أمر الشغل"}else if(q.get("customer")||q.get("device")||q.get("add")){f.classList.remove("hidden")}f.onsubmit=e=>saveRequest(e,existing);renderRequests();calc()}
function fillDevice(el,cid,selected=""){el.innerHTML='<option value="">اختر الجهاز</option>'+arr(K.d).filter(d=>d.customerId===cid).map(d=>`<option value="${d.id}" ${d.id===selected?"selected":""}>${esc(d.type)} — ${esc(d.brand)}</option>`).join("")}
let currentParts=[];
function partsStockTotal(list){return (list||[]).reduce((a,x)=>a+(+x.qty||0)*(+x.sell||0),0)}
function partsStockCost(list){return (list||[]).reduce((a,x)=>a+(+x.qty||0)*(+x.cost||0),0)}
function filterOrderPartOptions(q){
  const box=document.getElementById("rPartResults");if(!box)return;
  const hidden=document.getElementById("rPart");
  if(hidden){hidden.value="";hidden.removeAttribute("data-qty")}
  q=String(q??document.getElementById("rPartSearch")?.value??"").trim();
  const list=arr(K.p).filter(p=>!p.archived);
  const qLower=q.toLowerCase();
  const matches=(q?list.filter(p=>(p.name||"").toLowerCase().includes(qLower)||(p.code||"").toLowerCase().includes(qLower)):list).slice(0,50);
  let html=matches.length?matches.map(p=>`<div class="part-ac-item" data-value="${esc(p.id)}"><b>${esc(p.name)}</b><span>${(+p.use||0).toFixed(2)} ج — ${+p.qty||0} متاح</span></div>`).join(""):'<div class="part-ac-empty">لا توجد أصناف مطابقة.</div>';
  if(q&&!list.some(p=>(p.name||"").toLowerCase()===qLower)){
    html+=`<div class="part-ac-item ac-add-new" data-addpart="${esc(q)}"><b>➕ إضافة "${esc(q)}" كقطعة جديدة للمخزن</b></div>`;
  }
  box.innerHTML=html;
  box.querySelectorAll("[data-value]").forEach(item=>{item.onmousedown=()=>selectOrderPart(item.dataset.value)});
  box.querySelectorAll("[data-addpart]").forEach(item=>{item.onmousedown=()=>{box.classList.add("hidden");openQuickAddPart(item.dataset.addpart,{anchor:"rPartResults",onCreated:p=>selectOrderPart(p.id)})}});
  box.classList.remove("hidden");
}
function selectOrderPart(pid){
  const p=arr(K.p).find(x=>x.id===pid);if(!p)return;
  const hidden=document.getElementById("rPart"),search=document.getElementById("rPartSearch"),box=document.getElementById("rPartResults");
  if(hidden){hidden.value=pid;hidden.dataset.qty=+p.qty||0}
  if(search)search.value=p.name;
  if(box)box.classList.add("hidden");
}
function hideOrderPartResults(){setTimeout(()=>document.getElementById("rPartResults")?.classList.add("hidden"),150)}
function addPartToOrder(){let hidden=document.getElementById("rPart"),pid=hidden?.value||"",q=+(document.getElementById("rPartQty")?.value||1),p=arr(K.p).find(x=>x.id===pid);if(!pid||!p)return alert("اكتب اسم القطعة واختر واحدة من نتائج البحث أولًا.");if(!Number.isFinite(q)||q<1)return alert("اكتب كمية صحيحة.");let existing=currentParts.find(x=>!x.external&&x.partId===pid&&+x.sell===+p.use&&+x.cost===+p.buy),already=existing?(+existing.qty||0):0,available=+(p.qty||0),editing=!!new URLSearchParams(location.search).get("edit"),required=editing?q:q+already;if(required>available)return alert(`الكمية المطلوبة ${required} أكبر من المتاح ${available}.`);if(existing)existing.qty=already+q;else currentParts.push({partId:pid,qty:q,sell:+p.use||0,cost:+p.buy||0});renderOrderParts();calc();if(hidden)hidden.value="";const search=document.getElementById("rPartSearch");if(search)search.value="";if(document.getElementById("rPartQty"))document.getElementById("rPartQty").value=1}
function addExternalPartToOrder(){let nameEl=document.getElementById("rExtName"),buyEl=document.getElementById("rExtBuy"),sellEl=document.getElementById("rExtSell"),qtyEl=document.getElementById("rExtQty");let name=(nameEl?.value||"").trim();if(!name)return alert("اكتب اسم القطعة.");let cost=+(buyEl?.value||0),sell=+(sellEl?.value||0),q=+(qtyEl?.value||1);if(!Number.isFinite(q)||q<1)q=1;if(!Number.isFinite(cost)||cost<0||!Number.isFinite(sell)||sell<0)return alert("اكتب أسعار صحيحة.");currentParts.push({external:true,name,qty:q,sell,cost});renderOrderParts();calc();if(nameEl)nameEl.value="";if(buyEl)buyEl.value="";if(sellEl)sellEl.value="";if(qtyEl)qtyEl.value=1}
function updateOrderPartQty(i,value){let q=+value;if(!Number.isFinite(q)||q<1)q=1;if(!currentParts[i])return;currentParts[i].qty=q;calc();renderOrderParts()}
function removeOrderPart(i){if(!currentParts[i])return;currentParts.splice(i,1);renderOrderParts();calc()}
function renderOrderParts(){let el=document.getElementById("orderParts");el.innerHTML=currentParts.map((x,i)=>{let p=x.external?null:arr(K.p).find(z=>z.id===x.partId);let nm=x.external?(x.name||"قطعة خارجية"):(p?.name||"قطعة محذوفة");let amount=x.qty*x.sell;let amountLabel=`${amount.toFixed(2)} ج`;return `<div class="part-row${x.external?" part-row-external":""}"><span>${x.external?"🧳 ":""}${esc(nm)}${x.external?` <small class="ext-badge">خارج المخزن</small>`:""}</span><input type="number" min="1" value="${x.qty}" data-wf-event="change" data-wf-code="updateOrderPartQty(${i},this.value)"><span title="${x.external?`سعر الشراء ${(+x.cost||0).toFixed(2)} ج`:""}">${amountLabel}</span><button type="button" class="secondary" data-wf-event="click" data-wf-code="removeOrderPart(${i})">🗑️</button></div>`}).join("")}
function calc(){let ps=partsStockTotal(currentParts),t=ps+(+rLabor.value||0),dep=+rDeposit.value||0;rPartsTotal.value=ps.toFixed(2);rTotal.value=t.toFixed(2);remainBox.classList.toggle("hidden",dep<=0);rRemain.value=Math.max(0,t-dep).toFixed(2)}
function adjustStockForOrder(oldParts,newParts,requestId,stock=arr(K.p),moves=arr(K.m)){let delta={};oldParts.filter(x=>x.partId&&!x.external).forEach(x=>delta[x.partId]=(delta[x.partId]||0)+x.qty);newParts.filter(x=>x.partId&&!x.external).forEach(x=>delta[x.partId]=(delta[x.partId]||0)-x.qty);for(let [pid,d] of Object.entries(delta)){if(!d)continue;let p=stock.find(z=>z.id===pid);if(!p)return false;if(d>0)p.qty=(+p.qty||0)+d;else{let need=-d;if(need>(+p.qty||0))return false;p.qty=(+p.qty||0)-need}moves.push({id:id(),partId:pid,type:d>0?"إرجاع بسبب تعديل أمر":"خروج بسبب تعديل أمر",qty:Math.abs(d),requestId,at:new Date().toISOString()})}return {stock,moves}}
// saveRequest() كانت بتخلط بين قراءة الفورم من الـ DOM ومنطق الحفظ والمخزون في
// دالة واحدة. اتقسمت لـ 3: قراءة الفورم (collectRequestFormData) — منطق الحفظ
// الصِرف اللي مبيلمسش DOM خالص (persistRequestRecord، ممكن يُختبر لوحده أو
// يُستخدم من مكان تاني زي استيراد جماعي) — ودالة تحكم رفيعة (saveRequest) بتربط
// بينهم. السلوك الفعلي (الحسابات، ترتيب العمليات، رسائل الخطأ) لم يتغيّر.
function collectRequestFormData(existing){let t=+rTotal.value||0,dep=+rDeposit.value||0,tag=document.getElementById("rTag")?rTag.value:(existing?.tag||""),depositWallet=document.getElementById("rDepositWallet")?.value||"";return{customerId:rCustomer.value,deviceId:rDevice.value,addressKey:rAddress.value,visit:rVisit.value,status:rStatus.value,executionPlace:rExecutionPlace.value,workshopStatus:rWorkshopStatus.value,partsWaiting:!!document.getElementById("rPartsWaiting")?.checked,tag,fault:rFault.value,work:rWork.value,labor:(+rLabor.value||0),parts:currentParts,partsTotal:+rPartsTotal.value||0,total:t,deposit:dep,depositWallet}}
function persistRequestRecord(formData,existing){
  // اللي كان قبل كده backup يدوي بـ JSON.stringify لمفتاح wf_p بس، دلوقتي
  // withRollback (shared-data.js) بيغطي wf_p وwf_m مع بعض، وبيرجعهم
  // تلقائيًا لو رجّعنا {ok:false} أو حصل استثناء — بدل ما نعمل الإرجاع يدوي.
  let partsCost=partsStockCost(formData.parts);
  return withRollback([K.p,K.m,K.r,K.wtx],()=>{
    if(existing){
      // الأمر الملغي لا تكون قطعه محجوزة من المخزن؛ نحسب فرق المخزون
      // بين الحالة السابقة والجديدة مرة واحدة فقط، حتى لا تتكرر الإعادة
      // أو الخصم عند تعديل أمر ملغي أو إعادة فتحه.
      let oldParts=existing.status==="ملغي"?[]:(existing.parts||[]);
      let newParts=formData.status==="ملغي"?[]:formData.parts;
      let stock=arr(K.p),moves=arr(K.m),adjusted=adjustStockForOrder(oldParts,newParts,existing.id,stock,moves);
      if(!adjusted){
        return{ok:false,error:"الكمية الجديدة غير متاحة في المخزن."}
      }
      let fromStatus=existing.status;
      if(fromStatus!==formData.status&&!canTransitionStatus(fromStatus,formData.status)){
        return{ok:false,error:`لا يمكن الانتقال من حالة «${fromStatus}» إلى «${formData.status}» مباشرة.`}
      }
      Object.assign(existing,{customerId:formData.customerId,deviceId:formData.deviceId,addressKey:formData.addressKey,visit:formData.visit,status:formData.status,executionPlace:formData.executionPlace,workshopStatus:formData.workshopStatus,partsWaiting:formData.partsWaiting,tag:formData.tag,fault:formData.fault,work:formData.work,labor:formData.labor,parts:formData.parts,partsTotal:formData.partsTotal,partsCost,total:formData.total,deposit:formData.deposit,depositWallet:formData.depositWallet,remain:Math.max(0,formData.total-formData.deposit)});
      applyStatusTimestamp(existing,existing.status);
      if(fromStatus!==existing.status){
        if(existing.status==="ملغي"){existing.cancelReason=formData.cancelReason||"";existing.cancelledAt=new Date().toISOString()}
        if(fromStatus==="ملغي"&&existing.status==="جديد"){existing.cancelReason="";existing.cancelledAt=null;existing.reopenedAt=new Date().toISOString()}
        recordStatusHistory(existing,fromStatus,existing.status);
      }
      let saved=commitStorage({[K.p]:stock,[K.m]:moves,[K.r]:arr(K.r).map(x=>x.id===existing.id?existing:x)});
      if(!saved)return{ok:false,error:"تعذر حفظ الأمر والمخزون. لم يتم تغيير البيانات."};
      syncTreasuryForOrderDeposit(existing);
      if(typeof syncWalletForOrderDeposit==="function"&&!syncWalletForOrderDeposit(existing))return{ok:false,error:"تعذر حفظ حركة العربون. تم التراجع عن العملية."};
      return{ok:true,request:existing}
    }
    let r={id:id(),no:orderNo(),customerId:formData.customerId,deviceId:formData.deviceId,addressKey:formData.addressKey,visit:formData.visit,status:formData.status,executionPlace:formData.executionPlace,workshopStatus:formData.workshopStatus,partsWaiting:formData.partsWaiting,tag:formData.tag,fault:formData.fault,work:formData.work,labor:formData.labor,parts:formData.parts,partsTotal:formData.partsTotal,partsCost,total:formData.total,deposit:formData.deposit,depositWallet:formData.depositWallet,remain:Math.max(0,formData.total-formData.deposit),closed:false,createdAt:new Date().toISOString()};
    applyStatusTimestamp(r,r.status);
    recordStatusHistory(r,"",r.status);
    let stock=arr(K.p),moves=arr(K.m);
    formData.parts.filter(x=>!x.external).forEach(x=>{let p=stock.find(z=>z.id===x.partId);if(p){p.qty=Math.max(0,(+p.qty||0)-x.qty);moves.push({id:id(),partId:p.id,type:"خروج",qty:x.qty,requestId:r.id,at:new Date().toISOString()})}});
    if(!commitStorage({[K.p]:stock,[K.m]:moves,[K.r]:arr(K.r).concat(r)}))return{ok:false,error:"تعذر حفظ الأمر والمخزون. لم يتم تغيير البيانات."};
    syncTreasuryForOrderDeposit(r);
    if(typeof syncWalletForOrderDeposit==="function"&&!syncWalletForOrderDeposit(r))return{ok:false,error:"تعذر حفظ حركة العربون. تم التراجع عن العملية."};
    return{ok:true,request:r}
  })
}
function saveRequest(e,existing=null){
  e.preventDefault();
  if(!document.getElementById("rCustomer")?.value)return alert("اختر العميل أولاً من نتائج البحث.");
  let formData=collectRequestFormData(existing);
  // نفس مشكلة تحصيل إقفال الأمر: لو فيه عربون بمبلغ فعلي من غير تحديد
  // محفظة، upsertWalletTxForRef مش هيسجل حركة أصلًا (ولو كانت حركة قديمة
  // موجودة من عربون سابق، هيمسحها) — المبلغ ساعتها بيفضل مسجل في أمر
  // الشغل نفسه بس من غير أي أثر في الحسابات/المحافظ. نحذّر المستخدم هنا
  // زي ما بالظبط بيحصل عند تقفيل الأمر (markPaidAndClose).
  if((+formData.deposit||0)>0&&!formData.depositWallet&&!confirm(`مفيش محفظة محددة للعربون (${(+formData.deposit).toFixed(2)} ج)، فمش هيتسجل كحركة في الحسابات.\n\nمتابعة الحفظ من غير تسجيله في محفظة؟`))return;
  if(existing&&existing.status!==formData.status){
    if(!canTransitionStatus(existing.status,formData.status)){alert(`لا يمكن الانتقال من حالة «${existing.status}» إلى «${formData.status}» مباشرة.`);return}
    if(formData.status==="ملغي"){
      let reason=prompt("سبب إلغاء أمر الشغل (مطلوب):","");
      if(reason===null)return;
      reason=reason.trim();
      if(!reason){alert("سبب الإلغاء مطلوب لإلغاء أمر الشغل.");return}
      formData.cancelReason=reason;
    }
    if(existing.status==="ملغي"&&formData.status==="جديد"&&!confirm("تأكيد إعادة فتح أمر الشغل الملغي؟"))return;
    if(existing.status==="مكتمل"&&formData.status==="جاري التنفيذ"&&!confirm("تأكيد إعادة فتح أمر الشغل المكتمل عند الحاجة؟"))return;
  }
  let result=persistRequestRecord(formData,existing);
  if(!result.ok)return alert(result.error);
  location.href=`request.html?id=${result.request.id}`
}
function workshopBadge(r){return r.workshopStatus&&r.workshopStatus!=="غير مطلوب"?`<span class="badge workshop-badge">🏭 ${esc(r.workshopStatus)}</span>`:""}
function requestBucketMatch(r,b){
  const today=dayKeyLocal(new Date()), visit=dayKeyLocal(r.visit);
  if(b==="completed") return !!r.closed || r.status==="مكتمل";
  if(b==="workshop") return r.executionPlace==="الورشة" || (r.workshopStatus&&r.workshopStatus!=="غير مطلوب");
  if(b==="today") return !!r.visit && visit===today;
  if(b==="parts") return r.partsWaiting===true || r.partsWaiting==="yes";
  if(b==="overdue") return !!r.visit && visit<today && !r.closed && r.status!=="مكتمل" && r.status!=="ملغي";
  return true;
}
function renderRequestFolders(){
  const el=document.getElementById("requestFolders"); if(!el)return;
  const all=arr(K.r), today=dayKeyLocal(new Date());
  const counts={completed:all.filter(r=>requestBucketMatch(r,"completed")).length,workshop:all.filter(r=>requestBucketMatch(r,"workshop")).length,today:all.filter(r=>requestBucketMatch(r,"today")).length,parts:all.filter(r=>requestBucketMatch(r,"parts")).length,overdue:all.filter(r=>requestBucketMatch(r,"overdue")).length};
  el.innerHTML=`<div class="request-folders-grid"><a class="request-folder" href="requests.html?bucket=completed"><span>✅</span><b>الأوامر المكتملة</b><small>${counts.completed} أمر</small></a><a class="request-folder" href="requests.html?bucket=workshop"><span>🏭</span><b>أوامر الورشة</b><small>${counts.workshop} أمر</small></a><a class="request-folder" href="requests.html?bucket=today"><span>📅</span><b>أوامر اليوم</b><small>${counts.today} موعد</small></a><a class="request-folder" href="requests.html?bucket=parts"><span>📦</span><b>انتظار قطع غيار</b><small>${counts.parts} أمر</small></a><a class="request-folder" href="requests.html?bucket=overdue"><span>⚠️</span><b>متأخر / لم يُنفذ</b><small>${counts.overdue} أمر</small></a></div>`;
}
// renderRequests: كانت هنا نسخة "أساسية" بتفلتر بعناصر statusFilter/workshopFilter
// اللي مش موجودة في requests.html أصلًا (البحث بقى عن طريق فولدرات/فلاتر تانية
// requestOpsStatus/requestOpsWorkshop)، والصفحة الوحيدة اللي فيها #requestList هي
// requests.html وهي دايمًا بتحمّل workshop-mini-simple-ui.js اللي بيستبدل الدالة دي
// (defineOverride) قبل أي استدعاء ليها فعليًا — يعني منطق العرض القديم هنا كان كود
// ميت تمامًا. لكن الدالة لازم تفضل معرّفة برضه: صفحات زي request.html (بروفايل أمر
// الشغل) بتنادي renderRequests() بشكل مباشر (من changeRequestStatus/changeRequestTag
// وغيرها) من غير ما تحمّل workshop-mini-simple-ui.js أصلًا، فلو مسحنا الدالة كليًا
// هيبقى فيه خطأ "renderRequests is not defined" في الصفحات دي. الحل: نسيبها موجودة
// بس بأقل شكل ممكن (تخرج فورًا لو #requestList مش موجود، وهو الحال دايمًا هنا).
function renderRequests(){if(!document.getElementById("requestList"))return}

async function requestProfile(){let el=document.getElementById("requestProfile");if(!el)return;let r=arr(K.r).find(x=>x.id===new URLSearchParams(location.search).get("id"));if(!r){el.innerHTML="<div class='item'>الأمر غير موجود.</div>";return}let parts=(r.parts||[]).map(x=>{let p=x.external?null:arr(K.p).find(z=>z.id===x.partId);let nm=x.external?(x.name||"قطعة خارجية"):(p?.name||"قطعة محذوفة");let amount=(x.qty||0)*(x.sell||0);let amountLabel=`${amount.toFixed(2)} ج`;let extCost=x.external?`<div class="ext-cost-note">💵 سعر الشراء: ${(+x.cost||0).toFixed(2)} ج × ${x.qty} = ${((+x.cost||0)*(x.qty||0)).toFixed(2)} ج</div>`:"";return `<div class="part-row compact-part${x.external?" part-row-external":""}"><span>${x.external?"🧳":"🔧"} ${esc(nm)}${x.external?' <small class="ext-badge">خارج المخزن</small>':""}${extCost}</span><span>× ${x.qty}</span><strong>${amountLabel}</strong></div>`}).join("");let canEdit=!r.closed&&!r.paid;let cust=arr(K.c).find(c=>c.id===r.customerId)||{};let custPhone=(cust.phone||"").trim();let paid=!!r.paid;let ws=r.workshopStatus||"غير مطلوب";let workshopTrack=ws!=="غير مطلوب"?`<div class="workshop-track"><h3>🏭 متابعة الجهاز داخل الورشة</h3><div class="workshop-state"><b>${esc(ws)}</b>${r.workshopAt?`<small>آخر تحديث: ${new Date(r.workshopAt).toLocaleString("ar-EG")}</small>`:""}${r.pulledAt?`<small>📦 تم سحب الجهاز: ${new Date(r.pulledAt).toLocaleString("ar-EG")}</small>`:""}</div><div class="workshop-actions">${["تم السحب","تم التسليم"].map(x=>`<button type="button" class="secondary mini-action ${ws===x?"active-track":""}" data-wf-event="click" data-wf-code="setWorkshopStatus('${r.id}','${x}')">${x}</button>`).join("")}</div></div>`:`<div class="workshop-track"><h3>🏭 سحب الجهاز للورشة</h3><div class="hint">لو الجهاز يحتاج إصلاح داخل الورشة، سجّل سحبه هنا وسيظهر في أوامر الورشة ويمكن متابعة حالته حتى التسليم.</div><button type="button" class="secondary mini-action workshop-pull" data-wf-event="click" data-wf-code="requestWorkshopPull('${r.id}')">📦 سحب الجهاز للورشة</button></div>`;el.innerHTML=`<div class="profile request-one-page ps-context-target" data-ps-title="أمر الشغل ${esc(r.no)}"><div class="request-top"><div><h1 class="profile-title request-title">🛠️ ${esc(r.no)}</h1>${psActions("أمر الشغل "+r.no)}<span class="badge">${paid?"مدفوع بالكامل":esc(r.status)}${r.closed?" 🔒":""}</span>${canReturnRequest(r)?`<button type="button" class="secondary mini-action return-btn" data-wf-event="click" data-wf-code="markRequestReturned('${r.id}')">🔄 مرتجع${r.closed?` (متبقي ${Math.max(0,returnWindowDaysLeft(r))} يوم)`:""}</button>`:(r.closed&&r.status==="مكتمل"?`<span class="badge">⏹️ انتهت مهلة المرتجع</span>`:"")}</div><div class="compact-actions">${canEdit?`<button class='secondary mini-action' data-wf-event="click" data-wf-code="editRequest('${r.id}')">✏️ تعديل</button>`:""}<button class='danger-btn mini-action' data-wf-event="click" data-wf-code="deleteRequestRecord('${r.id}')">🗑️ حذف</button></div></div>${requestCommActionsHtml(r,custPhone)}<div class="request-grid"><div class="kv"><b>👤 العميل</b><a href="customer.html?id=${r.customerId}">${esc(customerName(r.customerId))}</a></div><div class="kv"><b>📞 التليفون</b>${contactLinksHtml(custPhone)}</div><div class="kv"><b>🔧 الجهاز</b><a href="device.html?id=${r.deviceId}">${esc(deviceName(r.deviceId))}</a></div><div class="kv"><b>📍 العنوان</b>${esc(addressText((arr(K.c).find(c=>c.id===r.customerId)||{}).mainAddress||{}))}</div><div class="kv"><b>🏷️ التصنيف اليدوي</b>${canEdit?`<select class="inline-status" data-wf-event="change" data-wf-code="changeRequestTag('${r.id}',this.value)"><option value="" ${!r.tag?"selected":""}>بدون تصنيف</option>${(settings().orderTags||[]).concat(r.tag&&!(settings().orderTags||[]).includes(r.tag)?[r.tag]:[]).map(x=>`<option value="${esc(x)}" ${r.tag===x?"selected":""}>${esc(x)}${r.tag===x&&!(settings().orderTags||[]).includes(x)?" (قديم/متوقف)":""}</option>`).join("")}<option value="__add__">➕ إضافة تصنيف جديد…</option></select>`:(esc(r.tag)||"بدون تصنيف")}</div><div class="kv"><b>📅 موعد الزيارة</b>${canEdit?`<input type="datetime-local" class="inline-status" value="${r.visit||""}" data-wf-event="change" data-wf-code="changeRequestVisit('${r.id}',this.value)">`:(r.visit?esc(new Date(r.visit).toLocaleString("ar-EG")) : "—")}</div><div class="kv"><b>🏠 التنفيذ</b>${r.executionPlace==="الورشة"?"🏭 الورشة":"🏠 عند العميل"}</div><div class="kv"><b>🧾 الحالة</b>${canEdit?`<select class="inline-status" data-wf-event="change" data-wf-code="changeRequestStatus('${r.id}',this.value)">${nextStatusOptions(r.status).map(x=>`<option ${r.status===x?"selected":""}>${esc(x)}</option>`).join("")}</select>`:esc(r.status)}</div>${r.status==="ملغي"&&r.cancelReason?`<div class="kv request-wide"><b>❌ سبب الإلغاء</b>${esc(r.cancelReason)}</div>`:""}${r.status==="مجمد"?`<div class="kv request-wide"><b>❄️ ملاحظة التجميد</b>${esc(r.freezeNote)||"—"}</div>`:""}<div class="kv"><b>🕐 تسجيل البلاغ</b>${requestCreatedDate(r)?esc(requestCreatedDate(r).toLocaleString("ar-EG")):"—"}</div><div class="kv"><b>▶️ بدء التنفيذ</b>${requestStartedDate(r)?esc(requestStartedDate(r).toLocaleString("ar-EG")):"—"}</div><div class="kv"><b>✅ تاريخ الوصول لمكتمل</b>${requestCompletedDate(r)?esc(requestCompletedDate(r).toLocaleString("ar-EG")):"—"}</div><div class="kv"><b>⏱️ مدة الإكمال</b>${formatDuration(requestTotalCompletionMs(r))}</div><div class="kv"><b>🏭 مدة تنفيذ الورشة</b>${r.executionPlace==="الورشة"?formatDuration(requestWorkshopExecutionMs(r)):"غير منطبق"}</div><div class="kv"><b>🏭 مدة بقاء الجهاز بالورشة</b>${r.executionPlace==="الورشة"?formatDuration(requestWorkshopStayMs(r)):"غير منطبق"}</div><div class="kv"><b>🏭 حالة الورشة</b>${esc(ws)}</div><div class="kv request-wide"><b>📝 العطل</b>${esc(r.fault)||"—"}</div><div class="kv request-wide"><b>🔨 الأعمال</b>${esc(r.work)||"—"}</div><div class="request-account"><h3>💰 الحساب</h3><table class="month-table compact-money"><tr><td>🔨 المصنعية</td><td>${(+r.labor||0).toFixed(2)} ج</td></tr><tr><td>🔧 قطع الغيار</td><td>${(+r.partsTotal||0).toFixed(2)} ج</td></tr><tr class="total-row"><td>💰 الإجمالي</td><td>${(+r.total||0).toFixed(2)} ج</td></tr><tr><td>💵 العربون</td><td>${(+r.deposit||0).toFixed(2)} ج${r.depositWallet?` <small>(💳 ${esc(r.depositWallet)})</small>`:""}</td></tr><tr><td>💳 حالة الدفع</td><td>${paid?"تم الدفع بالكامل":"غير مكتمل"}${paid&&r.closeWallet?` <small>(💳 ${esc(r.closeWallet)})</small>`:""}</td></tr></table>${!r.closed&&r.status==="مكتمل"&&!paid?`<div class="form-grid"><label class="wide">💳 المتبقي هيتحصل في محفظة إيه؟ <small>اختياري — لو سايبها فاضية، المبلغ مش هيتسجل في أي محفظة</small><select id="rCloseWallet"><option value="">بدون تحديد</option>${(settings().wallets||[]).map(w=>`<option ${(settings().defaultWallet||"")===w?"selected":""}>${esc(w)}</option>`).join("")}</select></label></div><button type="button" class="primary pay-close-btn" data-wf-event="click" data-wf-code="markPaidAndClose('${r.id}')">💳 تم الدفع بالكامل وإغلاق الأمر</button>`:""}</div><div class="request-parts"><h3>🔧 قطع الغيار المستخدمة</h3>${parts||"<div class='empty-inline'>لا توجد قطع غيار مضافة.</div>"}${canEdit?`<div class="part-add request-part-add part-autocomplete-row"><div class="part-autocomplete"><input type="text" id="rpPartSearch" class="part-autocomplete-input" placeholder="🔍 اكتب اسم القطعة (مثال: ثرموستات)..." autocomplete="off" data-wf-event="input" data-wf-code="filterRequestPartOptions(this.value)" data-wf-refocus-code="filterRequestPartOptions(this.value)" data-wf-blur="hideRequestPartResults"><input type="hidden" id="rpPart"><div id="rpPartResults" class="part-autocomplete-results hidden"></div></div><input id="rpQty" type="number" min="1" value="1" inputmode="numeric"><button type="button" class="primary mini-action" data-wf-event="click" data-wf-code="confirmAddPartToRequest('${r.id}')">➕ إضافة من المخزن</button></div><div id="rpStockHint" class="hint">اختر قطعة لمعرفة الكمية المتاحة.</div><div class="part-add request-part-add part-add-external"><input id="rpExtName" type="text" placeholder="اسم القطعة (خارج المخزن)"><input id="rpExtBuy" type="number" min="0" step=".01" placeholder="سعر الشراء"><input id="rpExtSell" type="number" min="0" step=".01" placeholder="سعر البيع"><input id="rpExtQty" type="number" min="1" value="1" inputmode="numeric"><button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="confirmAddExternalPartToRequest('${r.id}')">🧳 إضافة قطعة خارج المخزن</button></div><div class="hint">قطعة خارج المخزن: بتتسجل بسعر البيع بالكامل ضمن "قطع الغيار" واحتساب الإجمالي زي أي قطعة عادية بالظبط، وسعر الشراء بيظهر كملاحظة بس للمرجعية. مالهاش أي علاقة بكمية المخزن أو رصيده أو بند "المصنعية".</div>`:""}</div><div id="requestProfileRecordings"></div>${workshopTrack}${statusHistoryHtml(r)}</div></div>`;
  // تسجيلات مكالمات مرفقة (لو الأمر اتعمل أو اتضاف له تسجيل من صفحة
  // مشاركة مكالمة — راجع share-target.html). كل عنصر بيتخزن في
  // IndexedDB بنفس طريقة الصور بالظبط (ImageStore بيتعامل مع أي
  // dataURL، مش بس الصور). الأمر ممكن ياخد أكتر من تسجيل (لو العميل
  // اتصل أكتر من مرة على نفس العطل).
  let recs=Array.isArray(r.callRecordings)?r.callRecordings:[];
  let box=document.getElementById("requestProfileRecordings");
  if(box&&recs.length){
    let items=await Promise.all(recs.map(async(cr,i)=>{
      let src=window.ImageStore?await window.ImageStore.resolveSrc(cr.ref):"";
      if(!src)return "";
      let when=cr.at?new Date(cr.at).toLocaleString("ar-EG"):"";
      return `<div class="kv"><b>🎙️ تسجيل ${i+1}${recs.length>1?` من ${recs.length}`:""}</b>${when?`<small>${esc(when)}</small>`:""}<audio controls src="${esc(src)}" style="width:100%"></audio></div>`;
    }));
    let html=items.join("");
    if(html)box.innerHTML=`<div class="workshop-track"><h3>🎙️ تسجيلات المكالمات (${recs.length})</h3>${html}</div>`;
  }
}
function requestWorkshopPull(i){let a=arr(K.r),r=a.find(x=>x.id===i);if(!r||r.closed||r.paid)return;if(r.workshopStatus&&r.workshopStatus!=="غير مطلوب")return;if(!confirm("تأكيد سحب الجهاز إلى الورشة؟"))return;let now=new Date().toISOString();r.executionPlace="الورشة";r.workshopStatus="تم السحب";r.workshopAt=now;r.pulledAt=now;if(!r.workshopEnteredAt)r.workshopEnteredAt=now;if(r.status==="جاري التنفيذ"&&!r.workshopStartedAt)r.workshopStartedAt=r.startedAt||now;if(!saveJSONSafe(K.r,a))return;requestProfile()}
function setWorkshopStatus(i,status){let a=arr(K.r),r=a.find(x=>x.id===i);if(!r||r.closed||r.paid)return;let now=new Date().toISOString();r.executionPlace="الورشة";r.workshopStatus=status;r.workshopAt=now;if(status==="تم السحب"&&!r.workshopEnteredAt)r.workshopEnteredAt=now;if(r.status==="جاري التنفيذ"&&!r.workshopStartedAt)r.workshopStartedAt=r.startedAt||now;if(!saveJSONSafe(K.r,a))return;requestProfile()}

function filterRequestPartOptions(q){
  const box=document.getElementById("rpPartResults");if(!box)return;
  const hidden=document.getElementById("rpPart");
  if(hidden)hidden.value="";
  syncRequestPartQty();
  q=String(q??document.getElementById("rpPartSearch")?.value??"").trim();
  const list=arr(K.p).filter(p=>!p.archived);
  const qLower=q.toLowerCase();
  const matches=(q?list.filter(p=>(p.name||"").toLowerCase().includes(qLower)||(p.code||"").toLowerCase().includes(qLower)):list).slice(0,50);
  let html=matches.length?matches.map(p=>`<div class="part-ac-item" data-value="${esc(p.id)}"><b>${esc(p.name)}</b><span>${(+p.use||0).toFixed(2)} ج — ${+p.qty||0} متاح</span></div>`).join(""):'<div class="part-ac-empty">لا توجد أصناف مطابقة.</div>';
  if(q&&!list.some(p=>(p.name||"").toLowerCase()===qLower)){
    html+=`<div class="part-ac-item ac-add-new" data-addpart="${esc(q)}"><b>➕ إضافة "${esc(q)}" كقطعة جديدة للمخزن</b></div>`;
  }
  box.innerHTML=html;
  box.querySelectorAll("[data-value]").forEach(item=>{item.onmousedown=()=>selectRequestPart(item.dataset.value)});
  box.querySelectorAll("[data-addpart]").forEach(item=>{item.onmousedown=()=>{box.classList.add("hidden");openQuickAddPart(item.dataset.addpart,{anchor:"rpPartResults",onCreated:p=>selectRequestPart(p.id)})}});
  box.classList.remove("hidden");
}
function selectRequestPart(pid){
  const p=arr(K.p).find(x=>x.id===pid);if(!p)return;
  const hidden=document.getElementById("rpPart"),search=document.getElementById("rpPartSearch"),box=document.getElementById("rpPartResults");
  if(hidden)hidden.value=pid;
  if(search)search.value=p.name;
  if(box)box.classList.add("hidden");
  syncRequestPartQty();
}
function hideRequestPartResults(){setTimeout(()=>document.getElementById("rpPartResults")?.classList.add("hidden"),150)}
function syncRequestPartQty(){let hiddenEl=document.getElementById("rpPart"),q=document.getElementById("rpQty"),h=document.getElementById("rpStockHint"),selectedId=hiddenEl?.value||"",available=+(arr(K.p).find(x=>x.id===selectedId)?.qty||0);if(q&&selectedId){q.max=Math.max(1,available);q.value=Math.min(Math.max(1,+q.value||1),Math.max(1,available));if(available<1)q.value=0}if(h)h.textContent=selectedId?`المتاح في المخزن: ${available} قطعة — سيتم استخدام الكمية المكتوبة فقط.`:"اكتب اسم القطعة واختر من نتائج البحث لمعرفة الكمية المتاحة."}
function confirmAddPartToRequest(requestId){let rs=arr(K.r),r=rs.find(x=>x.id===requestId);if(!r)return alert("أمر الشغل غير موجود.");if(r.closed||r.paid)return alert("الأمر مغلق أو مدفوع بالكامل ولا يمكن إضافة قطع غيار.");let pid=document.getElementById("rpPart")?.value||"";if(!pid)return alert("اكتب اسم القطعة واختر واحدة من نتائج البحث أولًا ثم اضغط تأكيد إضافة القطعة.");let q=+(document.getElementById("rpQty")?.value||1),stock=arr(K.p),p=stock.find(x=>x.id===pid),available=+(p?.qty||0);if(!p)return alert("قطعة الغيار المختارة غير موجودة في المخزن.");if(!Number.isFinite(q)||q<1)return alert("اكتب كمية صحيحة.");let updatedParts=(r.parts||[]).map(x=>({...x})),existing=updatedParts.find(x=>!x.external&&x.partId===pid&&+x.sell===+p.use&&+x.cost===+p.buy),already=existing?(+existing.qty||0):0;if(available<q)return alert(`الكمية المطلوبة ${q} أكبر من المتاح ${available}.`);if(existing)existing.qty=already+q;else updatedParts.push({partId:pid,qty:q,sell:+p.use||0,cost:+p.buy||0});let partsTotal=partsStockTotal(updatedParts),partsCost=partsStockCost(updatedParts),total=(+r.labor||0)+partsTotal;let newStock=stock.map(x=>x.id===pid?{...x,qty:(+x.qty||0)-q}:x),moves=arr(K.m);moves.push({id:id(),partId:pid,type:"خروج بسبب إضافة قطعة لأمر شغل",qty:q,requestId:r.id,at:new Date().toISOString()});let updated={...r,parts:updatedParts,partsTotal,partsCost,total,remain:Math.max(0,total-(+r.deposit||0))};if(!commitStorage({[K.p]:newStock,[K.m]:moves,[K.r]:rs.map(x=>x.id===r.id?updated:x)}))return;requestProfile()}
function confirmAddExternalPartToRequest(requestId){let rs=arr(K.r),r=rs.find(x=>x.id===requestId);if(!r)return alert("أمر الشغل غير موجود.");if(r.closed||r.paid)return alert("الأمر مغلق أو مدفوع بالكامل ولا يمكن إضافة قطع غيار.");let nameEl=document.getElementById("rpExtName"),buyEl=document.getElementById("rpExtBuy"),sellEl=document.getElementById("rpExtSell"),qtyEl=document.getElementById("rpExtQty");let name=(nameEl?.value||"").trim();if(!name)return alert("اكتب اسم القطعة.");let cost=+(buyEl?.value||0),sell=+(sellEl?.value||0),q=+(qtyEl?.value||1);if(!Number.isFinite(q)||q<1)q=1;if(!Number.isFinite(cost)||cost<0||!Number.isFinite(sell)||sell<0)return alert("اكتب أسعار صحيحة.");let updatedParts=(r.parts||[]).map(x=>({...x}));updatedParts.push({external:true,name,qty:q,sell,cost});let partsTotal=partsStockTotal(updatedParts),partsCost=partsStockCost(updatedParts),total=(+r.labor||0)+partsTotal;let updated={...r,parts:updatedParts,partsTotal,partsCost,total,remain:Math.max(0,total-(+r.deposit||0))};const saved=withRollback([K.r],()=>put(K.r,rs.map(x=>x.id===r.id?updated:x))?{ok:true}:{ok:false});if(!saved?.ok){alert("تعذر حفظ إضافة القطعة. لم يتم تغيير أمر الشغل.");return}if(nameEl)nameEl.value="";if(buyEl)buyEl.value="";if(sellEl)sellEl.value="";if(qtyEl)qtyEl.value=1;requestProfile()}
// markPaidAndClose / closeOrder: اتنقلوا لنسخة واحدة موحّدة في app-shared.js
// (بيتحمّل قبل الملف ده في كل صفحة) بدل ما يتكرروا هنا وفي
// workshop-mini-simple-ui.js بنفس المنطق بالظبط.
function editCustomer(i){location.href="customers.html?edit="+encodeURIComponent(i)}
function editDevice(i){location.href="devices.html?edit="+encodeURIComponent(i)}
function editPart(i){location.href="inventory.html?edit="+encodeURIComponent(i)}
function applyStatusTimestamp(r,newStatus){
  const now=new Date().toISOString();
  r.statusHistory=Array.isArray(r.statusHistory)?r.statusHistory:[];
  if(newStatus==="جاري التنفيذ"){
    if(!r.startedAt)r.startedAt=now;
    if(r.executionPlace==="الورشة"&&!r.workshopStartedAt)r.workshopStartedAt=now;
  }
  if(newStatus==="مكتمل"){
    r.completedAt=now;
    if(r.executionPlace==="الورشة"&&!r.workshopStartedAt){
      r.workshopStartedAt=r.startedAt||now;
    }
  }
  // عند إعادة فتح الأمر لا نمسح التوقيتات القديمة؛ آخر تاريخ مكتمل يظل
  // متاحًا للتحليل، وسجل الحالة يحتفظ بكل دورة انتقال.
}
function changeRequestStatus(i,status){
  let a=arr(K.r),r=a.find(x=>x.id===i);
  if(!r||r.closed||r.paid)return;
  if(status===r.status)return;
  if(!canTransitionStatus(r.status,status)){alert(`لا يمكن الانتقال من حالة «${r.status}» إلى «${status}» مباشرة.`);renderRequests();requestProfile();return}
  let from=r.status,reason="",freezeNote="";
  if(status==="ملغي"){
    reason=prompt("سبب إلغاء أمر الشغل (مطلوب):","");
    if(reason===null){renderRequests();requestProfile();return}
    reason=reason.trim();
    if(!reason){alert("سبب الإلغاء مطلوب لإلغاء أمر الشغل.");renderRequests();requestProfile();return}
  }
  if(status==="مجمد"){
    freezeNote=prompt("ملاحظة التجميد (اختياري) — مثلاً: العميل مش بيرد بعد وصول القطعة:","");
    if(freezeNote===null){renderRequests();requestProfile();return}
    freezeNote=freezeNote.trim();
  }
  if(from==="ملغي"&&status==="جديد"&&!confirm("تأكيد إعادة فتح أمر الشغل الملغي؟")){renderRequests();requestProfile();return}
  if(from==="مكتمل"&&status==="جاري التنفيذ"&&!confirm("تأكيد إعادة فتح أمر الشغل المكتمل عند الحاجة؟")){renderRequests();requestProfile();return}
  // إلغاء الأمر يرجّع قطعه المستخدمة للمخزن (الشغل ماتمش فعليًا)، وإعادة
  // فتحه من إلغاء بترجع تخصمها تاني لو لسه متاحة بنفس الكمية.
  const stock=arr(K.p),moves=arr(K.m);
  let stockResult=withRollback([K.p,K.m],()=>{
    let touched=status==="ملغي"||(from==="ملغي"&&status==="جديد");
    if(!touched)return{ok:true};
    let adjusted=status==="ملغي"?adjustStockForOrder(r.parts||[],[],r.id,stock,moves):adjustStockForOrder([],r.parts||[],r.id,stock,moves);
    if(!adjusted)return{ok:false};
    if(!put(K.p,stock)||!put(K.m,moves))return{ok:false};
    return{ok:true};
  });
  if(!stockResult.ok){
    alert("تعذر إعادة فتح الأمر: قطع الغيار المستخدمة فيه لم تعد متاحة بنفس الكمية في المخزن.");
    renderRequests();requestProfile();return;
  }
  r.status=status;
  applyStatusTimestamp(r,status);
  if(from==="مجمد"&&status!=="مجمد"){
    r.frozenMs=(+r.frozenMs||0)+(r.frozenAt?Math.max(0,Date.now()-new Date(r.frozenAt).getTime()):0);
    r.frozenAt=null;
  }
  if(status==="مجمد"){r.frozenAt=new Date().toISOString();r.freezeNote=freezeNote}
  if(status==="ملغي"){r.cancelReason=reason;r.cancelledAt=new Date().toISOString()}
  if(from==="ملغي"&&status==="جديد"){r.cancelReason="";r.cancelledAt=null;r.reopenedAt=new Date().toISOString()}
  recordStatusHistory(r,from,status,status==="مجمد"?freezeNote:(status==="ملغي"?reason:""));
  if(!saveJSONSafe(K.r,a))return;window.auditLog?.("تغيير حالة", "أمر شغل", r.id, `${from} ← ${status}`);renderRequests();renderDash();requestProfile()
}
// إعادة فتح أمر شغل "مكتمل" كمرتجع: بيرجّعه لحالة "جاري التنفيذ" (نفس الانتقال
// المعتمد في دورة الحالة) عشان تقدر تفعّله أو تعدّل عليه، مع تسجيل سبب/ملاحظة
// المرتجع في سجل تغييرات الحالة. مفيش حالة جديدة اتضافت والدورة المعتمدة
// (WORK_ORDER_LIFECYCLE_APPROVED.md) متغيّرتش.
function markRequestReturned(i){
  let a=arr(K.r),r=a.find(x=>x.id===i);
  if(!r)return;
  if(r.status!=="مكتمل")return;
  if(!canReturnRequest(r)){
    if(r.closed){let d=settings().returnWindowDays||7;alert(`انتهت مهلة المرتجع (${d} يوم من تاريخ الإغلاق) لهذا الأمر — لم يعد يمكن إرجاعه أو التعديل عليه.`)}
    return;
  }
  if(!canTransitionStatus(r.status,"جاري التنفيذ")){alert(`لا يمكن الانتقال من حالة «${r.status}» إلى «جاري التنفيذ» مباشرة.`);return}
  let reason=prompt("سبب/ملاحظة المرتجع (مطلوب):","");
  if(reason===null)return;
  reason=reason.trim();
  if(!reason){alert("سبب/ملاحظة المرتجع مطلوبة.");return}
  let from=r.status,wasClosed=!!r.closed;
  r.status="جاري التنفيذ";
  if(wasClosed){r.closed=false;r.paid=false;r.remain=Math.max(0,(+r.total||0)-(+r.deposit||0));r.reopenedAt=new Date().toISOString()}
  applyStatusTimestamp(r,r.status);
  recordStatusHistory(r,from,r.status,`مرتجع${wasClosed?" (كان مغلقًا)":""}: ${reason}`);
  if(!saveJSONSafe(K.r,a))return;
  window.auditLog?.("إرجاع أمر", "أمر شغل", r.id, reason);renderRequests();renderDash();requestProfile();
}
function changeRequestVisit(i,val){let a=arr(K.r),r=a.find(x=>x.id===i);if(!r||r.closed||r.paid)return;r.visit=val;if(!saveJSONSafe(K.r,a))return;requestProfile();renderRequests()}
function changeRequestTag(i,val){if(val==="__add__"){let s=settings(),v=prompt("اكتب اسم التصنيف الجديد:");if(!v||!v.trim()){requestProfile();return}v=v.trim();s.orderTags=s.orderTags||[];if(!s.orderTags.includes(v))s.orderTags.push(v);if(!saveJSONSafe(K.s,s))return;val=v}let a=arr(K.r),r=a.find(x=>x.id===i);if(!r||r.closed||r.paid)return;r.tag=val;if(!saveJSONSafe(K.r,a))return;requestProfile();renderRequests()}
function editRequest(i){location.href="requests.html?edit="+encodeURIComponent(i)}

// ===== رسائل واتساب جاهزة من صفحة أمر الشغل =====
function fillWaTemplate(text,r){
  let cust=arr(K.c).find(c=>c.id===r.customerId)||{};
  let map={
    "اسم_العميل": customerName(r.customerId),
    "اسم_الجهاز": deviceName(r.deviceId),
    "رقم_الأمر": r.no||"",
    "الحالة": r.paid?"مدفوع بالكامل":(r.status||""),
    "العطل": r.fault||"",
    "الإجمالي": (+r.total||0).toFixed(2)+" ج",
    "المتبقي": Math.max(0,(+r.total||0)-(+r.deposit||0)).toFixed(2)+" ج",
    "اسم_الورشة": (settings().receiptInfo||{}).name||"الورشة الفنية"
  };
  return String(text||"").replace(/\{([^}]+)\}/g,(m,k)=>map[k]!==undefined?map[k]:m);
}
function sendWaTemplate(requestId,tplIndex){
  let r=arr(K.r).find(x=>x.id===requestId);if(!r)return;
  let cust=arr(K.c).find(c=>c.id===r.customerId)||{};
  let wa=typeof waNumber==="function"?waNumber(cust.phone):"";
  if(!wa)return alert("لا يوجد رقم هاتف مسجل لهذا العميل.");
  let tpl=(settings().waTemplates||[])[tplIndex];if(!tpl)return;
  let msg=fillWaTemplate(tpl.text,r);
  window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`,"_blank","noopener");
}

// ===== الإيصال القابل للطباعة/المشاركة =====
function buildReceiptHtml(r){
  let s=settings();
  let info=s.receiptInfo||{};
  let fields=(s.receiptFields&&s.receiptFields.length?s.receiptFields:defaultReceiptFields()).filter(f=>f.enabled!==false);
  let cust=arr(K.c).find(c=>c.id===r.customerId)||{};
  let partsListText=(r.parts||[]).map(x=>{
    let p=x.external?null:arr(K.p).find(z=>z.id===x.partId);
    let nm=x.external?(x.name||"قطعة خارجية"):(p?.name||"قطعة محذوفة");
    let amount=(x.qty||0)*(x.sell||0);
    return `${esc(nm)} × ${x.qty} = ${amount.toFixed(2)} ج`;
  }).join("<br>")||"—";
  const valueFor={
    orderNo: esc(r.no||"—"),
    orderDate: requestCreatedDate(r)?esc(requestCreatedDate(r).toLocaleString("ar-EG")):"—",
    customerName: esc(customerName(r.customerId)),
    customerPhone: esc(cust.phone||"—"),
    deviceInfo: esc(deviceName(r.deviceId)),
    fault: esc(r.fault||"—"),
    work: esc(r.work||"—"),
    partsList: partsListText,
    labor: (+r.labor||0).toFixed(2)+" ج",
    partsTotal: (+r.partsTotal||0).toFixed(2)+" ج",
    total: (+r.total||0).toFixed(2)+" ج",
    deposit: (+r.deposit||0).toFixed(2)+" ج",
    remaining: Math.max(0,(+r.total||0)-(+r.deposit||0)).toFixed(2)+" ج",
    paymentStatus: r.paid?"مدفوع بالكامل":"غير مكتمل"
  };
  let rows=fields.map(f=>{
    let val=f.builtin?valueFor[f.id]:esc(f.staticText||"");
    if(val===undefined||val==="")return "";
    return `<tr><td class="receipt-label">${esc(f.label||"")}</td><td class="receipt-value">${val}</td></tr>`;
  }).join("");
  return `<div class="receipt-doc"><div class="receipt-head"><h2>${esc(info.name||"الورشة الفنية")}</h2>${info.phone?`<div>📞 ${esc(info.phone)}</div>`:""}${info.address?`<div>📍 ${esc(info.address)}</div>`:""}</div><table class="receipt-table">${rows}</table>${info.footer?`<div class="receipt-footer">${esc(info.footer)}</div>`:""}</div>`;
}
function ensureReceiptPrintHost(r){
  let host=document.getElementById("receiptPrintArea");
  if(!host){host=document.createElement("div");host.id="receiptPrintArea";host.className="hidden";document.body.appendChild(host)}
  host.innerHTML=`<div class="ps-context-target" data-ps-title="إيصال ${esc(r.no)}">${buildReceiptHtml(r)}</div>`;
  return host.querySelector(".ps-context-target");
}
function printReceiptView(requestId){
  let r=arr(K.r).find(x=>x.id===requestId);if(!r)return;
  let target=ensureReceiptPrintHost(r);
  if(typeof window.printWorkshopTarget==="function")window.printWorkshopTarget({closest:()=>target});
}
function shareReceiptView(requestId){
  let r=arr(K.r).find(x=>x.id===requestId);if(!r)return;
  let target=ensureReceiptPrintHost(r);
  if(typeof window.shareWorkshopTarget==="function")window.shareWorkshopTarget({closest:()=>target});
}
function requestCommActionsHtml(r,custPhone){
  let templates=(settings().waTemplates||[]).map((t,i)=>({...t,i})).filter(t=>t.enabled!==false);
  let waRow=(templates.length&&custPhone)?`<div class="wa-send-row">${templates.map(t=>`<button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="sendWaTemplate('${r.id}',${t.i})">💬 ${esc(t.name||"رسالة")}</button>`).join("")}</div>`:"";
  return `<div class="request-comm-actions no-print">${waRow}<div class="receipt-actions-row"><button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="printReceiptView('${r.id}')">🖨️ طباعة الإيصال</button><button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="shareReceiptView('${r.id}')">↗️ مشاركة الإيصال</button></div></div>`;
}
