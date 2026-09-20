/* app-route-followup.js — خط السير اليومي ومتابعة العملاء. */
// يحدّث أي عرض لخط السير موجود فعليًا في الصفحة الحالية: صفحة خط السير
// المستقلة (route.html) و/أو ودجت "خط سير اليوم" داخل صفحة الأوامر —
// كل دالة بترجع بهدوء لو مافيش عنصرها في الصفحة.
function refreshRouteViews(){
  if(typeof renderRouteDayStrip==="function")renderRouteDayStrip();
  if(typeof renderRoute==="function")renderRoute();
  if(typeof renderRequests==="function")renderRequests();
}
function toggleVisited(i){let a=arr(K.r),r=a.find(x=>x.id===i);if(!r)return;let today=dayKeyLocal(new Date());if(r.visitedAt&&dayKeyLocal(r.visitedAt)===today)r.visitedAt=null;else r.visitedAt=new Date().toISOString();if(!saveJSONSafe(K.r,a))return;refreshRouteViews()}
function setRouteContactStatus(i,status){
  const a=arr(K.r),r=a.find(x=>x.id===i);if(!r)return;
  r.contactStatus=status;
  r.contactStatusAt=new Date().toISOString();
  if(!saveJSONSafe(K.r,a))return;
  refreshRouteViews();
}
function clearRouteContactStatus(i){
  const a=arr(K.r),r=a.find(x=>x.id===i);if(!r)return;
  delete r.contactStatus;delete r.contactStatusAt;
  if(!saveJSONSafe(K.r,a))return;
  refreshRouteViews();
}
function retryRouteContact(i){clearRouteContactStatus(i);}
// حالة الصف المختصر لأي أمر شغل في خط السير: بيرجع {collapsed,cls,text,retry}
// لو الأمر لازم يتعرض مختصر (سطر واحد) بدل الكارت الكامل، وbtn "إعادة
// المحاولة" بيظهر بس للحالات اللي ممكن ترجعها (contactStatus).
function routeRowStatusInfo(x){
  if(x.closed)return{collapsed:true,cls:"route-badge-done",text:"✅ مُغلق",retry:false};
  if(x.status==="مكتمل")return{collapsed:true,cls:"route-badge-done",text:"✅ مكتمل",retry:false};
  if(x.status==="ملغي")return{collapsed:true,cls:"route-badge-cancelled",text:"🚫 ملغي",retry:false};
  if(x.workshopStatus&&x.workshopStatus!=="غير مطلوب")return{collapsed:true,cls:"route-badge-workshop",text:`🏭 ${x.workshopStatus}`,retry:false};
  if(x.partsWaiting)return{collapsed:true,cls:"route-badge-needspart",text:"📦 محتاج قطعة غيار",retry:false};
  if(x.contactStatus==="unavailable")return{collapsed:true,cls:"route-badge-unavailable",text:"📵 غير متاح",retry:true};
  if(x.contactStatus==="no-answer")return{collapsed:true,cls:"route-badge-noanswer",text:"📞 لم يرد",retry:true};
  if(x.contactStatus==="needs-part")return{collapsed:true,cls:"route-badge-needspart",text:"🔁 محتاج زيارة تانية / قطعة غيار",retry:true};
  return{collapsed:false};
}
function routeOrderForList(list){
  const s=settings(), ids=list.map(x=>x.id), saved=Array.isArray(s.routeOrder)?s.routeOrder:[];
  const valid=saved.filter(id=>ids.includes(id));
  const missing=ids.filter(id=>!valid.includes(id));
  return valid.concat(missing);
}
function saveRouteOrder(ids){
  const s=settings(), old=Array.isArray(s.routeOrder)?s.routeOrder:[];
  const keep=old.filter(id=>!ids.includes(id));
  s.routeOrder=keep.concat(ids);
  if(!saveJSONSafe(K.s,s))return;
}
function moveRouteItem(id,delta){
  // بيدور على بطاقات خط السير في أي مكان في الصفحة الحالية (routeList في
  // route.html، أو ودجت خط سير اليوم في صفحة الأوامر) بدل ما يتقيّد بعنصر
  // واحد بعينه بالـ id.
  const nodes=[...document.querySelectorAll("[data-route-id]")];if(!nodes.length)return;
  const ids=nodes.map(x=>x.dataset.routeId);
  const i=ids.indexOf(id),j=i+delta;if(i<0||j<0||j>=ids.length)return;
  [ids[i],ids[j]]=[ids[j],ids[i]];saveRouteOrder(ids);refreshRouteViews();
}

// ---- خط سير الورشة: كل الأيام مش بس اليوم ----
// حالة الصفحة (اليوم المختار / وضع "كل المتأخر") محفوظة في متغيّر بسيط بدل
// localStorage عشان بتتصفّر كل ما تفتح الصفحة من جديد على اليوم الحالي.
const routeViewState={day:null,overdueView:false,quickCloseId:null,quickCloseDraft:null,lastTurnId:undefined};
function routeDaysWithData(){
  const set=new Set();
  arr(K.r).forEach(x=>{
    if(x.visit){let k=dayKeyLocal(x.visit);if(k)set.add(k)}
    if(x.closed&&x.closedAt){let k=dayKeyLocal(x.closedAt);if(k)set.add(k)}
  });
  set.add(dayKeyLocal(new Date()));
  return[...set].sort();
}
function routeDayLabel(day){
  const d=new Date(day+"T00:00:00");
  if(Number.isNaN(d.getTime()))return day;
  return d.toLocaleDateString("ar-EG",{weekday:"long"})+" "+d.toLocaleDateString("ar-EG",{day:"2-digit",month:"2-digit"});
}
function routeDayShort(day){
  const d=new Date(day+"T00:00:00");
  if(Number.isNaN(d.getTime()))return day;
  return{label:d.toLocaleDateString("ar-EG",{weekday:"short"}),date:d.toLocaleDateString("ar-EG",{day:"2-digit",month:"2-digit"})};
}
function ordersForRouteDay(day){
  const customers=arr(K.c);
  return arr(K.r).filter(x=>{
    if(x.visit&&dayKeyLocal(x.visit)===day)return true;
    if(x.closed&&x.closedAt&&dayKeyLocal(x.closedAt)===day&&dayKeyLocal(x.visit)!==day)return true;
    return false;
  }).map(x=>({...x,_c:customers.find(z=>z.id===x.customerId)||{},_addr:resolveRequestAddress(x),_viaClosedOffSchedule:!!(x.closed&&x.closedAt&&dayKeyLocal(x.closedAt)===day&&dayKeyLocal(x.visit)!==day)}));
}
function jumpRouteToday(){
  routeViewState.overdueView=false;
  routeViewState.day=dayKeyLocal(new Date());
  routeViewState.quickCloseId=null;
  routeViewState.quickCloseDraft=null;
  routeViewState.lastTurnId=undefined;
  renderRouteDayStrip();renderRoute();
}
function selectRouteDay(day){
  routeViewState.overdueView=false;
  routeViewState.day=day;
  routeViewState.quickCloseId=null;
  routeViewState.quickCloseDraft=null;
  routeViewState.lastTurnId=undefined;
  renderRouteDayStrip();renderRoute();
}
function toggleRouteOverdueView(){
  routeViewState.overdueView=!routeViewState.overdueView;
  routeViewState.quickCloseId=null;
  routeViewState.quickCloseDraft=null;
  routeViewState.lastTurnId=undefined;
  renderRouteDayStrip();renderRoute();
}
let routeDayStripScrolledOnce=false;
function renderRouteDayStrip(){
  const el=document.getElementById("routeDayStrip");if(!el)return;
  const today=dayKeyLocal(new Date());
  if(!routeViewState.day)routeViewState.day=today;
  const days=routeDaysWithData();
  const counts={};arr(K.r).forEach(x=>{if(x.visit){let k=dayKeyLocal(x.visit);if(k)counts[k]=(counts[k]||0)+1}if(x.closed&&x.closedAt){let k=dayKeyLocal(x.closedAt);if(k&&k!==dayKeyLocal(x.visit))counts[k]=(counts[k]||0)+1}});
  el.innerHTML=days.map(d=>{
    const s=routeDayShort(d),n=counts[d]||0,isToday=d===today,active=!routeViewState.overdueView&&d===routeViewState.day;
    return `<button type="button" class="route-day-cell${active?" active":""}${isToday?" is-today":""}" data-wf-event="click" data-wf-code="selectRouteDay('${d}')"><small>${s.label}</small><b>${s.date}</b>${n?`<span class="badge">${n}</span>`:""}</button>`;
  }).join("");
  const overdueBtn=document.getElementById("routeOverdueToggle");
  if(overdueBtn)overdueBtn.classList.toggle("active",routeViewState.overdueView);
  // أول ما الصفحة تتفتح، نعمل سكرول لخانة النهارده (أو الخانة النشطة) على
  // طول عشان محتاجش تسحبي يمينًا/شمالًا عشان توصلي للأيام الحديثة. بعد
  // كده منعملهاش تاني تلقائي عشان منلغيش تنقل المستخدم اليدوي بين الأيام.
  if(!routeDayStripScrolledOnce){
    routeDayStripScrolledOnce=true;
    const activeCell=el.querySelector(".route-day-cell.active")||el.querySelector(".route-day-cell.is-today");
    if(activeCell)setTimeout(()=>activeCell.scrollIntoView({behavior:"instant",inline:"center",block:"nearest"}),0);
  }
}
function renderRoute(){
  let el=document.getElementById("routeList");if(!el)return;
  let today=dayKeyLocal(new Date()), cf=document.getElementById("routeCenterFilter")?.value||"", summaryEl=document.getElementById("routeSummary");
  let sq=(document.getElementById("routeSearch")?.value||"").trim().toLowerCase();
  if(!routeViewState.day)routeViewState.day=today;
  const allRequests=arr(K.r), customers=arr(K.c);
  let list,headTitle;
  if(routeViewState.overdueView){
    list=allRequests.filter(x=>x.visit&&dayKeyLocal(x.visit)<today&&x.status!=="ملغي"&&!x.closed).map(x=>({...x,_c:customers.find(z=>z.id===x.customerId)||{},_addr:resolveRequestAddress(x),_viaClosedOffSchedule:false}));
    headTitle="⚠️ كل الطلبات المتأخرة من كل الأيام";
  }else{
    list=ordersForRouteDay(routeViewState.day);
    headTitle=`🗓️ خط سير يوم ${routeDayLabel(routeViewState.day)}`;
  }
  if(summaryEl){
    let scheduledOnly=list;
    let closedToday=scheduledOnly.filter(x=>x.closed),visitedNotClosed=scheduledOnly.filter(x=>!x.closed&&!x.contactStatus&&x.status!=="ملغي"&&x.visitedAt&&dayKeyLocal(x.visitedAt)===routeViewState.day),notVisited=scheduledOnly.filter(x=>!x.closed&&!x.contactStatus&&x.status!=="ملغي"&&!(x.visitedAt&&dayKeyLocal(x.visitedAt)===routeViewState.day)),collected=closedToday.reduce((a,x)=>a+Math.max(0,(+x.total||0)-(+x.deposit||0)),0),offSchedule=scheduledOnly.filter(x=>x._viaClosedOffSchedule).length;
    // شريط تقدم اليوم + تفصيله: نقسّم كل أمر لحالة واحدة بس (بنفس أولوية
    // routeRowStatusInfo) عشان العدّ يبقى صحيح من غير تكرار.
    let buckets={done:0,cancelled:0,workshop:0,needspart:0,contact:0,pending:0,late:0};
    scheduledOnly.forEach(x=>{
      let info=routeRowStatusInfo(x);
      if(!info.collapsed)buckets.pending++;
      else if(info.cls==="route-badge-done")buckets.done++;
      else if(info.cls==="route-badge-cancelled")buckets.cancelled++;
      else if(info.cls==="route-badge-workshop")buckets.workshop++;
      else if(info.cls==="route-badge-needspart")buckets.needspart++;
      else buckets.contact++;
      if(!x.closed&&x.status!=="ملغي"&&x.visit&&dayKeyLocal(x.visit)<today)buckets.late++;
    });
    let handled=scheduledOnly.length-buckets.pending, total=scheduledOnly.length, pct=total?Math.round(handled/total*100):0;
    let bd=[];
    if(buckets.done)bd.push(`✅ ${buckets.done} خلص`);
    if(buckets.pending)bd.push(`⏳ ${buckets.pending} لسه`);
    if(buckets.workshop)bd.push(`🏭 ${buckets.workshop} ورشة`);
    if(buckets.needspart)bd.push(`📦 ${buckets.needspart} قطعة غيار`);
    if(buckets.contact)bd.push(`📵 ${buckets.contact} تعليق تواصل`);
    if(buckets.cancelled)bd.push(`🚫 ${buckets.cancelled} ملغي`);
    if(buckets.late)bd.push(`⚠️ ${buckets.late} متأخر`);
    let progressHtml=!routeViewState.overdueView&&total?`<div class="route-progress"><div class="route-progress-bar"><div class="route-progress-fill" style="width:${pct}%"></div></div><div class="route-progress-label"><b>${handled}</b> من <b>${total}</b> خلصوا اليوم (${pct}%)</div>${bd.length?`<div class="route-progress-breakdown">${bd.join(" • ")}</div>`:""}</div>`:"";
    summaryEl.innerHTML=`<div class="route-summary"><div class="stat"><b>${headTitle}</b><span>&nbsp;</span></div><div class="stat"><b>${scheduledOnly.length}</b><span>📋 إجمالي اليوم</span></div><div class="stat"><b>${closedToday.length}</b><span>✅ أُغلق وتم التحصيل</span></div><div class="stat"><b>${visitedNotClosed.length}</b><span>🚶 العمل جارٍ</span></div><div class="stat"><b>${notVisited.length}</b><span>⏳ لم تتم الزيارة بعد</span></div><div class="stat"><b>${collected.toFixed(2)} ج</b><span>💰 المُحصَّل</span></div>${offSchedule?`<div class="stat"><b>${offSchedule}</b><span>📦 اتقفل بدون جدولة مسبقة</span></div>`:""}</div>${progressHtml}`;
  }
  if(cf)list=list.filter(x=>x._addr.center===cf);
  if(sq)list=list.filter(x=>(x._c.name||"").toLowerCase().includes(sq)||(x._c.phone||"").toLowerCase().includes(sq)||(x.no||"").toLowerCase().includes(sq)||addressText(x._addr).toLowerCase().includes(sq)||deviceName(x.deviceId).toLowerCase().includes(sq)||(x.fault||"").toLowerCase().includes(sq));
  const orderIds=routeOrderForList(list), byId=new Map(list.map(x=>[x.id,x]));
  list=orderIds.map(id=>byId.get(id)).filter(Boolean);
  if(!list.length){el.innerHTML=`<div class="item">لا يوجد مواعيد ضمن الاختيار الحالي.</div>`;return}
  // "اللي عليه الدور": أول أمر شغل في ترتيب اليوم لسه نشط (مش مكتمل/مغلق/ملغي/
  // في الورشة/محتاج قطعة غيار/عليه حالة تواصل) هو الوحيد اللي بيتفتح كارت كامل.
  // أي حاجة تانية — سواء خلصت أو لسه ماجاش دورها — بتترجع سطر واحد مختصر.
  const currentTurnId=(list.find(x=>!routeRowStatusInfo(x).collapsed)||{}).id;
  // نعمل auto-scroll للكارت المميز بس لما "الدور" يتغيّر فعلًا (مش كل مرة
  // بيتعمل فيها renderRoute، وده بيحصل كتير)، ومش وإحنا بندوّر (sq) عشان
  // منقطعش على المستخدم وهو بيكتب.
  const prevTurnId=routeViewState.lastTurnId;
  routeViewState.lastTurnId=currentTurnId;
  const shouldAutoScroll=!sq&&prevTurnId!==undefined&&prevTurnId!==currentTurnId&&currentTurnId;
  let groups={};
  list.forEach(x=>{let k=x._addr.center||"بدون مركز";(groups[k]=groups[k]||[]).push(x)});
  let html="";
  Object.keys(groups).forEach(center=>{
    html+=`<h3 class="route-group-title">🗺️ ${esc(center)} <span class="badge">${groups[center].length}</span></h3>`;
    html+=groups[center].map(x=>{
      let visitedToday=!!(x.visitedAt&&dayKeyLocal(x.visitedAt)===today);
      let info=routeRowStatusInfo(x), isTurn=x.id===currentTurnId;
      let age=requestAgeInfo(x);
      let ageBadgeHtml=age?`<span class="badge age-badge ${age.cls}" title="⏱️ عمر الأمر: ${esc(age.range)}">${age.dot} ${esc(age.label)}</span>`:"";
      if(info.collapsed || !isTurn){
        // سطر مختصر: إما لأن الأمر وصل لحالة نهائية/معلّقة (مكتمل، مغلق، ملغي،
        // في الورشة، محتاج قطعة غيار، تعليق تواصل)، أو لأنه لسه في الطابور
        // ومستنّي دوره.
        let badges=[];
        if(info.collapsed){
          badges.push(`<span class="badge ${info.cls}">${info.text}</span>`);
          if(x._viaClosedOffSchedule)badges.push(`<span class="badge route-badge-offsched" title="اتقفل هذا اليوم بدون ما يكون مجدول له أصلًا">📦 بدون جدولة</span>`);
        }else{
          badges.push(visitedToday?`<span class="badge route-badge-visited">🚶 العمل جارٍ</span>`:`<span class="badge route-badge-pending">⏳ قيد الانتظار</span>`);
          if(dayKeyLocal(x.visit)<today)badges.push(`<span class="badge">⚠️ متأخر</span>`);
        }
        if(ageBadgeHtml)badges.push(ageBadgeHtml);
        const retryBtn=info.retry?`<button type="button" class="route-retry-btn mini-action" data-wf-event="click" data-wf-code="event.stopPropagation();retryRouteContact('${x.id}')" title="إرجاع الطلب إلى الحالة النشطة لإعادة المحاولة">🔄 إعادة المحاولة</button>`:'';
        return `<div class="route-completed-row${age?" "+age.cls:""}" data-route-id="${x.id}" data-wf-event="click" data-wf-code="location.href='request.html?id=${x.id}'" title="اضغط لفتح أمر الشغل"><b>👤 ${esc(x._c.name||"بدون اسم")}</b><span class="route-row-badges">${badges.join("")}</span><span class="route-row-arrows">${retryBtn}<button type="button" class="route-up-btn mini-action" data-wf-event="click" data-wf-code="event.stopPropagation();moveRouteItem('${x.id}',-1)" title="تحريك لأعلى">⬆️</button><button type="button" class="route-down-btn mini-action" data-wf-event="click" data-wf-code="event.stopPropagation();moveRouteItem('${x.id}',1)" title="تحريك لأسفل">⬇️</button></span></div>`;
      }
      // الأمر اللي عليه الدور فقط: كارت كامل بكل التفاصيل، متميّز بصريًا،
      // وبأزرار مجمّعة في صفين بس + فورم تقفيل سريع.
      let stateBadge=visitedToday?'<span class="badge route-badge-visited">🚶 تمت الزيارة</span>':'<span class="badge route-badge-pending">⏳ قيد الانتظار</span>',lateBadge=dayKeyLocal(x.visit)<today?'<span class="badge">⚠️ متأخر</span>':"";
      let toggleBtn=`<button type="button" class="primary mini-action" data-wf-event="click" data-wf-code="event.preventDefault();event.stopPropagation();toggleVisited('${x.id}')">${visitedToday?"↩️ إلغاء تسجيل الزيارة":"✅ تسجيل الزيارة"}</button>`;
      let quickCloseBtn=`<button type="button" class="route-quickclose-btn mini-action" data-wf-event="click" data-wf-code="event.preventDefault();event.stopPropagation();toggleQuickClose('${x.id}')">🏁 تقفيل سريع</button>`;
      let tagBtns=`<button type="button" class="route-contact-unavailable mini-action" data-wf-event="click" data-wf-code="event.preventDefault();event.stopPropagation();setRouteContactStatus('${x.id}','unavailable')">📵 غير متاح</button><button type="button" class="route-contact-noanswer mini-action" data-wf-event="click" data-wf-code="event.preventDefault();event.stopPropagation();setRouteContactStatus('${x.id}','no-answer')">📞 لم يرد</button><button type="button" class="route-contact-needspart mini-action" data-wf-event="click" data-wf-code="event.preventDefault();event.stopPropagation();setRouteContactStatus('${x.id}','needs-part')">🔁 زيارة تانية/قطعة</button><button type="button" class="route-up-btn mini-action" data-wf-event="click" data-wf-code="event.preventDefault();event.stopPropagation();moveRouteItem('${x.id}',-1)" title="تحريك لأعلى">⬆️</button><button type="button" class="route-down-btn mini-action" data-wf-event="click" data-wf-code="event.preventDefault();event.stopPropagation();moveRouteItem('${x.id}',1)" title="تحريك لأسفل">⬇️</button>`;
      const quickCloseOpen=routeViewState.quickCloseId===x.id;
      const quickCloseForm=quickCloseOpen?routeQuickCloseFormHtml(x):"";
      return `<div class="item route-order-card route-order-card-active${age?" "+age.cls:""}" data-route-id="${x.id}" data-wf-event="click" data-wf-code="location.href='request.html?id=${x.id}'" title="اضغط لعرض تفاصيل أمر الشغل"><div class="route-turn-flag">🔵 الدور عليك دلوقتي</div><div class="route-order-head"><a href="request.html?id=${x.id}" data-wf-event="click" data-wf-code="event.stopPropagation()"><b>🛠️ ${esc(x.no)}</b></a><span class="route-order-name">👤 ${esc(x._c.name||"")}</span><span class="route-head-status">${stateBadge}${lateBadge}${ageBadgeHtml}</span></div><div class="route-order-data"><div class="route-data-cell">📍 <span>${esc(addressText(x._addr))}</span></div><div class="route-data-cell">📞 <span>${contactLinksHtml(x._c.phone)}</span></div><div class="route-data-cell">🔧 <span>${esc(deviceName(x.deviceId))}</span></div><div class="route-data-cell">📝 <span>${esc(x.fault||"")}</span></div><div class="route-data-cell">⏰ <span>${x.visit?new Date(x.visit).toLocaleString("ar-EG",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):""}</span></div></div><div class="route-order-actions"><div class="route-primary-row">${toggleBtn}${quickCloseBtn}</div><div class="route-actions-compact">${tagBtns}</div>${quickCloseForm}</div></div>`;
    }).join("");
  });
  el.innerHTML=html;
  if(shouldAutoScroll){
    const activeEl=el.querySelector(".route-order-card-active");
    if(activeEl)setTimeout(()=>activeEl.scrollIntoView({behavior:"smooth",block:"center"}),60);
  }
}
function clearRouteSearch(){
  const elS=document.getElementById("routeSearch");
  if(elS){elS.value="";renderRoute();}
}
// فورم التقفيل السريع: بيظهر جوه كارت الأمر اللي عليه الدور نفسه من غير ما
// تسيبي صفحة خط السير خالص. فيه: (1) إضافة قطع غيار من المخزن أو خارجه لو
// اكتشفتي إنه محتاج قطعة وانتي واقفة قدام العميل، (2) تسجيل دفعة/عربون
// دلوقتي من غير ما تقفلي الأمر (لو التحصيل جزئي)، (3) تقفيل نهائي بيحصّل
// كل المتبقي ويقفل الأمر (وده بيتجاهل خانة "دفعة جديدة الآن" عشان بيحصّل
// كل حاجة فعليًا في نفس اللحظة).
function routeQuickCloseFormHtml(x){
  const partsTotal=+x.partsTotal||0, deposit=+x.deposit||0;
  const draft=(routeViewState.quickCloseDraft&&routeViewState.quickCloseDraft.id===x.id)?routeViewState.quickCloseDraft:null;
  const labor=draft?draft.labor:(+x.labor||0), newDeposit=draft?draft.newDeposit:0;
  const wallets=settings().wallets||[], defaultWallet=settings().defaultWallet||"";
  const partsRows=(x.parts||[]).map(p=>{
    const stockPart=p.external?null:arr(K.p).find(z=>z.id===p.partId);
    const nm=p.external?(p.name||"قطعة خارجية"):(stockPart?.name||"قطعة محذوفة");
    const amount=(p.qty||0)*(p.sell||0);
    return `<div class="part-row compact-part${p.external?" part-row-external":""}"><span>${p.external?"🧳":"🔧"} ${esc(nm)}</span><span>× ${p.qty}</span><strong>${amount.toFixed(2)} ج</strong></div>`;
  }).join("");
  return `<div class="route-quickclose-form" data-wf-event="click" data-wf-code="event.stopPropagation()">
    <div class="route-quickclose-parts">
      <b>🔧 قطع الغيار المضافة</b>
      ${partsRows||'<div class="hint">لا توجد قطع غيار مضافة.</div>'}
      <div class="part-add request-part-add part-autocomplete-row"><div class="part-autocomplete"><input type="text" id="rpPartSearch" class="part-autocomplete-input" placeholder="🔍 اكتب اسم القطعة..." autocomplete="off" data-wf-event="input" data-wf-code="filterRequestPartOptions(this.value)" data-wf-refocus-code="filterRequestPartOptions(this.value)" data-wf-blur="hideRequestPartResults"><input type="hidden" id="rpPart"><div id="rpPartResults" class="part-autocomplete-results hidden"></div></div><input id="rpQty" type="number" min="1" value="1" inputmode="numeric"><button type="button" class="primary mini-action" data-wf-event="click" data-wf-code="routeConfirmAddPart('${x.id}')">➕ من المخزن</button></div>
      <div id="rpStockHint" class="hint">اختر قطعة لمعرفة الكمية المتاحة.</div>
      <div class="part-add request-part-add part-add-external"><input id="rpExtName" type="text" placeholder="اسم القطعة (خارج المخزن)"><input id="rpExtBuy" type="number" min="0" step=".01" placeholder="سعر الشراء"><input id="rpExtSell" type="number" min="0" step=".01" placeholder="سعر البيع"><input id="rpExtQty" type="number" min="1" value="1" inputmode="numeric"><button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="routeConfirmAddExternalPart('${x.id}')">🧳 قطعة خارج المخزن</button></div>
    </div>
    <div class="route-quickclose-row"><label>🔨 المصنعية<input type="number" min="0" step=".01" id="qcLabor-${x.id}" value="${labor.toFixed(2)}" data-wf-event="input" data-wf-code="updateQuickCloseTotal('${x.id}')"></label><label>🔧 قطع الغيار<input type="text" value="${partsTotal.toFixed(2)} ج" disabled></label></div>
    <div class="route-quickclose-row"><label>💰 الإجمالي<input type="text" id="qcTotal-${x.id}" value="${(partsTotal+labor).toFixed(2)} ج" disabled></label><label>💵 العربون المسجّل قبل كده<input type="text" value="${deposit.toFixed(2)} ج" disabled></label></div>
    <div class="route-quickclose-row"><label>➕ دفعة جديدة استلمتها الآن <small>لو التحصيل جزئي بس</small><input type="number" min="0" step=".01" id="qcNewDeposit-${x.id}" value="${newDeposit.toFixed(2)}" data-wf-event="input" data-wf-code="updateQuickCloseTotal('${x.id}')"></label><label>💵 المتبقي المتوقع بعدها<input type="text" id="qcRemain-${x.id}" value="${Math.max(0,partsTotal+labor-deposit-newDeposit).toFixed(2)} ج" disabled></label></div>
    <label>💳 هتتحصل في محفظة إيه؟ <small>اختياري</small><select id="qcWallet-${x.id}"><option value="">بدون تحديد</option>${wallets.map(w=>`<option ${defaultWallet===w?"selected":""}>${esc(w)}</option>`).join("")}</select></label>
    <div class="route-quickclose-actions"><button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="confirmQuickPartialPayment('${x.id}')">💰 تسجيل دفعة الآن (من غير تقفيل)</button></div>
    <div class="route-quickclose-actions"><button type="button" class="primary mini-action" data-wf-event="click" data-wf-code="confirmQuickClose('${x.id}')">✅ تحصيل الباقي بالكامل وتقفيل الأمر</button><button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="toggleQuickClose('${x.id}')">إلغاء</button></div>
  </div>`;
}
function updateQuickCloseTotal(i){
  const r=arr(K.r).find(x=>x.id===i);if(!r)return;
  const labor=+(document.getElementById(`qcLabor-${i}`)?.value||0), newDeposit=+(document.getElementById(`qcNewDeposit-${i}`)?.value||0);
  routeViewState.quickCloseDraft={id:i,labor,newDeposit};
  const partsTotal=+r.partsTotal||0, deposit=+r.deposit||0;
  const total=partsTotal+labor;
  const totalEl=document.getElementById(`qcTotal-${i}`),remainEl=document.getElementById(`qcRemain-${i}`);
  if(totalEl)totalEl.value=total.toFixed(2)+" ج";
  if(remainEl)remainEl.value=Math.max(0,total-deposit-newDeposit).toFixed(2)+" ج";
}
function toggleQuickClose(i){
  routeViewState.quickCloseId=routeViewState.quickCloseId===i?null:i;
  routeViewState.quickCloseDraft=null;
  renderRoute();
}
// إضافة قطعة غيار من المخزن/خارجه من نفس فورم التقفيل السريع، من غير ما
// تسيبي خط السير — بنحفظ المصنعية المكتوبة أولًا عشان ما تضيعش لما الفورم
// يتجدد بعد إضافة القطعة.
function routeSaveDraftLabor(i){
  const a=arr(K.r),r=a.find(x=>x.id===i);
  if(!r)return;
  const labor=+(document.getElementById(`qcLabor-${i}`)?.value);
  if(Number.isFinite(labor)&&labor>=0){r.labor=labor;r.total=(+r.partsTotal||0)+labor;r.remain=Math.max(0,r.total-(+r.deposit||0));if(!saveJSONSafe(K.r,a))return;}
}
function routeConfirmAddPart(requestId){
  routeSaveDraftLabor(requestId);
  confirmAddPartToRequest(requestId);
  renderRoute();
}
function routeConfirmAddExternalPart(requestId){
  routeSaveDraftLabor(requestId);
  confirmAddExternalPartToRequest(requestId);
  renderRoute();
}
// تسجيل دفعة/عربون جزئي دلوقتي من غير تقفيل الأمر — للحالة اللي العميل
// بيدفع جزء بس دلوقتي وهيكمل الباقي بعدين.
function confirmQuickPartialPayment(i){
  const a=arr(K.r),r=a.find(x=>x.id===i);
  if(!r||r.closed||r.paid)return;
  const labor=+(document.getElementById(`qcLabor-${i}`)?.value||0);
  const newDeposit=+(document.getElementById(`qcNewDeposit-${i}`)?.value||0);
  if(!Number.isFinite(labor)||labor<0){alert("اكتب قيمة مصنعية صحيحة.");return}
  if(!Number.isFinite(newDeposit)||newDeposit<=0){alert("اكتب قيمة الدفعة الجديدة أولًا.");return}
  const wallet=document.getElementById(`qcWallet-${i}`)?.value||"";
  if(!wallet&&!confirm("مفيش محفظة محددة للدفعة، فمش هتتسجل كحركة في الحسابات — تكمل بدون تحديد محفظة؟"))return;
  r.labor=labor;
  r.partsTotal=+r.partsTotal||0;
  r.total=r.partsTotal+labor;
  r.deposit=(+r.deposit||0)+newDeposit;
  if(wallet)r.depositWallet=wallet;
  r.remain=Math.max(0,r.total-r.deposit);
  const saved=withRollback([K.r,K.wtx],()=>{
    if(!put(K.r,a))return{ok:false};
    if(typeof syncWalletForOrderDeposit==="function"&&!syncWalletForOrderDeposit(r))return{ok:false};
    return{ok:true};
  });
  if(!saved?.ok){alert("تعذر حفظ الدفعة والحركة المالية معًا؛ لم يتم تسجيل الدفعة.");return}
  routeViewState.quickCloseId=null;
  routeViewState.quickCloseDraft=null;
  refreshRouteViews();
}
function confirmQuickClose(i){
  const a=arr(K.r),r=a.find(x=>x.id===i);
  if(!r||r.closed||r.paid)return;
  const labor=+(document.getElementById(`qcLabor-${i}`)?.value||0);
  if(!Number.isFinite(labor)||labor<0){alert("اكتب قيمة مصنعية صحيحة.");return}
  const wallet=document.getElementById(`qcWallet-${i}`)?.value||"";
  const collectedPreview=Math.max(0,(+r.partsTotal||0)+labor-(+r.deposit||0));
  if(collectedPreview>0&&!wallet&&!confirm(`مفيش محفظة محددة للمبلغ المتبقي المُحصّل (${collectedPreview.toFixed(2)} ج)، فمش هتتسجل كحركة في الحسابات.\n\nمتابعة القفل من غير تسجيله في محفظة؟`))return;
  if(!confirm("تأكيد إن الزيارة خلصت، الأمر مكتمل، واستلام كامل قيمته وإغلاقه نهائيًا؟ بعد التأكيد لن يمكن التعديل."))return;
  r.labor=labor;
  r.partsTotal=+r.partsTotal||0;
  r.total=r.partsTotal+labor;
  r.deposit=+r.deposit||0;
  // نمشي الحالة خطوة خطوة زي دورة الأمر المعتمدة (جديد→جاري التنفيذ→مكتمل)
  // بدل ما نقفز عليها، عشان سجل الحالات يفضل صحيح.
  let from=r.status;
  if(r.status==="جديد"){r.status="جاري التنفيذ";applyStatusTimestamp(r,r.status);recordStatusHistory(r,from,r.status);from=r.status;}
  if(r.status==="جاري التنفيذ"){r.status="مكتمل";applyStatusTimestamp(r,r.status);recordStatusHistory(r,from,r.status);}
  const now=new Date().toISOString();
  const collected=Math.max(0,(+r.total||0)-(+r.deposit||0));
  r.paid=true;r.remain=0;r.paidAt=now;r.closed=true;r.closedAt=now;r.closeWallet=wallet;
  const saved=withRollback([K.r,K.wtx],()=>{
    if(!put(K.r,a))return{ok:false};
    if(typeof syncTreasuryForOrderClose==="function")syncTreasuryForOrderClose(r,collected);
    if(typeof syncWalletForOrderClose==="function"&&!syncWalletForOrderClose(r,collected,wallet))return{ok:false};
    return{ok:true};
  });
  if(!saved?.ok){alert("تعذر حفظ الإغلاق والحركة المالية معًا؛ لم يتم إغلاق أمر الشغل.");return}
  routeViewState.quickCloseId=null;
  routeViewState.quickCloseDraft=null;
  if(typeof renderDash==="function")renderDash();
  refreshRouteViews();
}
function initRoutePage(){
  let cfEl=document.getElementById("routeCenterFilter");if(!cfEl)return;
  cfEl.innerHTML='<option value="">🗺️ كل المراكز</option>'+(settings().centers||[]).map(x=>`<option>${esc(x)}</option>`).join("");
  cfEl.onchange=renderRoute;
  routeViewState.day=dayKeyLocal(new Date());
  routeViewState.overdueView=false;
  renderRouteDayStrip();
  renderRoute();
}

// متابعة العملاء الساكتين: عملاء عندهم أمر شغل سابق ومفيش أمر جديد من مدة معينة.
function renderFollowup(){
  let el=document.getElementById("followupList");if(!el)return;
  let days=+(document.getElementById("followupDays")?.value||60);
  let now=new Date();
  let rows=arr(K.c).map(cu=>{
    let orders=arr(K.r).filter(x=>x.customerId===cu.id);
    let last=orders.reduce((a,x)=>{let d=x.createdAt||"";return d>a?d:a},"");
    let daysSince=last?Math.floor((now-new Date(last))/86400000):null;
    return {c:cu,ordersCount:orders.length,last,daysSince};
  }).filter(x=>x.ordersCount>0&&x.daysSince!==null&&x.daysSince>=days);
  rows.sort((a,b)=>b.daysSince-a.daysSince);
  el.innerHTML=rows.length?rows.map(x=>`<div class="item record-card"><div class="item-head"><a href="customer.html?id=${x.c.id}"><b>👤 ${esc(x.c.name)}</b></a><span class="badge">⏳ ${x.daysSince} يوم</span></div><div>${contactLinksHtml(x.c.phone)}</div><div>📍 ${esc(addressText(x.c.mainAddress||{}))}</div><div>🛠️ ${x.ordersCount} أمر سابق • آخر أمر ${new Date(x.last).toLocaleDateString("ar-EG")}</div><div class="actions"><a class="primary small-btn" href="requests.html?customer=${x.c.id}&add=1">➕ أمر شغل جديد</a></div></div>`).join(""):'<div class="item">لا يوجد عملاء ساكتين ضمن المدة المختارة 🎉</div>';
}
function initFollowupPage(){
  let dEl=document.getElementById("followupDays");if(!dEl)return;
  dEl.onchange=renderFollowup;
  renderFollowup();
}
