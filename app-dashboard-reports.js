/* app-dashboard-reports.js — لوحة التحكم الرئيسية + التقرير المالي الشهري/الأسبوعي والمصاريف. */
function renderDash(){let el=document.getElementById("dashboard");if(!el)return;let c=arrCached(K.c),d=arrCached(K.d),r=arrCached(K.r),p=arrCached(K.p);let today=dayKeyLocal(new Date());let openOrders=r.filter(x=>x.status!=="مكتمل"&&x.status!=="ملغي");let todayOrders=openOrders.filter(x=>x.visit&&dayKeyLocal(x.visit)===today);let overdue=openOrders.filter(x=>x.visit&&dayKeyLocal(x.visit)<today&&x.status!=="مجمد");let staleOrders=openOrders.filter(x=>typeof requestIsStale==="function"&&requestIsStale(x));let overdueAlertDays=+settings().overdueAlertDays||7;let waitingParts=openOrders.filter(x=>x.partsWaiting);let inWorkshop=openOrders.filter(x=>x.executionPlace==="الورشة"||(x.workshopStatus&&x.workshopStatus!=="غير مطلوب"&&x.workshopStatus!=="تم التسليم"));let low=p.filter(x=>+x.qty<=+x.min).length;let ym=monthKeyLocal(new Date());let monthOrders=r.filter(x=>monthKeyLocal(x.closedAt||x.createdAt)===ym);let monthClosed=monthOrders.filter(x=>x.closed);let monthLabor=monthClosed.reduce((a,x)=>a+(+x.labor||0),0);let monthRevenue=monthLabor+monthClosed.reduce((a,x)=>a+(+x.partsTotal||0),0);let unpaidRemain=r.filter(x=>!x.closed).reduce((a,x)=>a+Math.max(0,(+x.total||0)-(+x.deposit||0)),0);let newCustomers=c.filter(x=>monthKeyLocal(x.createdAt)===ym).length;let tasksToday=taskRows().filter(x=>!x.completed&&x.date===today).length;let pendingCallsCount=arrCached(K.pc).length;let needsAttention=overdue.length+staleOrders.length+waitingParts.length+low+pendingCallsCount;el.innerHTML=`
${needsAttention>0?`<div class="dash-group"><div class="dash-group-title">🔥 يحتاج انتباه</div><div class="compact-stats">
${overdue.length>0?`<a class="stat stat-urgent" href="requests.html?bucket=overdue">⚠️ <b>${overdue.length}</b><span>متأخرة</span></a>`:""}
${staleOrders.length>0?`<a class="stat stat-urgent" href="requests.html?bucket=stale">⏳ <b>${staleOrders.length}</b><span>قديمة (${overdueAlertDays}+ يوم)</span></a>`:""}
${waitingParts.length>0?`<a class="stat" href="requests.html?bucket=parts">📦 <b>${waitingParts.length}</b><span>انتظار قطع</span></a>`:""}
${low>0?`<a class="stat" href="inventory.html?bucket=low">📉 <b>${low}</b><span>قطع منخفضة</span></a>`:""}
${pendingCallsCount>0?`<a class="stat" href="pending-calls.html">📞 <b>${pendingCallsCount}</b><span>مكالمات معلّقة</span></a>`:""}
</div></div>`:""}
<div class="dash-group"><div class="dash-group-title">📅 اليوم</div><div class="compact-stats">
<a class="stat" href="requests.html?bucket=today">📅 <b>${todayOrders.length}</b><span>أوامر اليوم</span></a>
<a class="stat" href="tasks.html?filter=today">📋 <b>${tasksToday}</b><span>مهام اليوم</span></a>
<a class="stat" href="requests.html?bucket=workshop">🏭 <b>${inWorkshop.length}</b><span>في الورشة</span></a>
<a class="stat" href="requests.html?bucket=open">🛠️ <b>${openOrders.length}</b><span>أوامر مفتوحة</span></a>
</div></div>
<div class="dash-group"><div class="dash-group-title">💰 المالية</div><div class="compact-stats">
<a class="stat stat-accent" href="wallets.html#reportSection">💰 <b>${monthRevenue.toFixed(0)} ج</b><span>إيراد الشهر</span></a>
<a class="stat" href="treasury.html">💵 <b>${treasuryBalance().toFixed(0)} ج</b><span>رصيد الخزنة</span></a>
<a class="stat" href="requests.html?bucket=unpaid">🧾 <b>${unpaidRemain.toFixed(0)} ج</b><span>متبقي غير محصل</span></a>
</div></div>
<div class="dash-group"><div class="dash-group-title">👥 عام</div><div class="compact-stats">
<a class="stat" href="customers.html?bucket=all">👤 <b>${c.length}</b><span>عملاء (+${newCustomers})</span></a>
<a class="stat" href="devices.html?bucket=all">🔧 <b>${d.length}</b><span>أجهزة</span></a>
</div></div>`}
function isoWeekMonday(y,w){let jan4=new Date(y,0,4);let jan4Day=jan4.getDay()||7;let week1Monday=new Date(jan4);week1Monday.setDate(jan4.getDate()-jan4Day+1);let monday=new Date(week1Monday);monday.setDate(week1Monday.getDate()+(w-1)*7);return monday}
function inRange(dateStr,start,end){if(!dateStr)return false;let d=typeof parseLocalDateValue==="function"?parseLocalDateValue(dateStr):new Date(dateStr);if(Number.isNaN(d.getTime()))return false;return d>=start&&d<=end}
function getReportRange(){let mode=(document.getElementById("reportMode")||{}).value||"month";if(mode==="week"){let wEl=document.getElementById("reportWeek"),val=wEl&&wEl.value,start;if(val){let[y,w]=val.split("-W").map(Number);start=isoWeekMonday(y,w)}else{let now=new Date(),dow=now.getDay()||7;start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(dow-1))}let startClean=new Date(start.getFullYear(),start.getMonth(),start.getDate(),0,0,0,0);let end=new Date(start.getFullYear(),start.getMonth(),start.getDate()+5,23,59,59,999);return{start:startClean,end,label:`الأسبوع: ${startClean.toLocaleDateString("ar-EG",{day:"2-digit",month:"2-digit"})} (الاثنين) ← ${end.toLocaleDateString("ar-EG",{day:"2-digit",month:"2-digit"})} (السبت)`}}let mEl=document.getElementById("reportMonth"),ym=mEl&&mEl.value?mEl.value:monthKeyLocal(new Date()),parts=ym.split("-").map(Number),y=parts[0],m=parts[1];let start=new Date(y,m-1,1,0,0,0,0),end=new Date(y,m,0,23,59,59,999);return{start,end,label:`شهر ${ym}`}}
function setReportMode(mode){let hidden=document.getElementById("reportMode");if(!hidden){hidden=document.createElement("input");hidden.type="hidden";hidden.id="reportMode";document.querySelector(".report")?.appendChild(hidden)}hidden.value=mode;document.getElementById("reportMonth")?.classList.toggle("hidden",mode!=="month");document.getElementById("reportWeek")?.classList.toggle("hidden",mode!=="week");document.getElementById("modeMonthBtn")?.classList.toggle("active-track",mode==="month");document.getElementById("modeWeekBtn")?.classList.toggle("active-track",mode==="week");financeReport()}
function financeReport(){let el=document.getElementById("monthlyReport");if(!el)return;let m=document.getElementById("reportMonth");if(m&&!m.value)m.value=monthKeyLocal(new Date());let{start,end,label}=getReportRange();let r=arrCached(K.r).filter(x=>inRange(x.closedAt,start,end)||inRange(x.createdAt,start,end));let laborOrders=r.filter(x=>x.closed);let labor=laborOrders.reduce((a,x)=>a+(+x.labor||0),0),partsSell=laborOrders.reduce((a,x)=>a+(+x.partsTotal||0),0),partsCost=laborOrders.reduce((a,x)=>a+(+x.partsCost||0),0),revenue=labor+partsSell,grossProfit=revenue-partsCost,partsProfit=partsSell-partsCost,partsProfitPct=partsSell>0?(partsProfit/partsSell*100):0,deposits=r.reduce((a,x)=>a+(+x.deposit||0),0),remain=r.reduce((a,x)=>a+(x.closed?0:Math.max(0,(+x.total||0)-(+x.deposit||0))),0),completedList=r.filter(x=>x.status==="مكتمل"||x.closed),completedCount=completedList.length,avgTicket=completedList.length?completedList.reduce((a,x)=>a+(x.closed?(+x.labor||0):0),0)/completedList.length:0;let exp=operatingExpensesInRange(start,end),totalExpenses=exp.reduce((a,x)=>a+(x.type==="in"?-(+x.amount||0):(+x.amount||0)),0),netProfit=grossProfit-totalExpenses;el.innerHTML=`<div class="hint report-range">${label} • ${r.length} أمر</div><div class="hint report-click-hint">💡 اضغط على أي بند لعرض تفاصيله ومصدره</div><table class="month-table report-table">
<tr class="report-row-clickable" data-wf-event="click" data-wf-code="showReportDetail('labor')"><td>🔨 المصنعية</td><td>${labor.toFixed(2)} ج</td></tr>
<tr class="report-row-clickable" data-wf-event="click" data-wf-code="showReportDetail('partsSell')"><td>🔧 قطع الغيار المحصلة</td><td>${partsSell.toFixed(2)} ج</td></tr>
<tr class="report-row-clickable" data-wf-event="click" data-wf-code="showReportDetail('partsCost')"><td>📦 تكلفة القطع</td><td>${partsCost.toFixed(2)} ج</td></tr>
<tr class="report-row-clickable" data-wf-event="click" data-wf-code="showReportDetail('partsProfitPct')"><td>📈 نسبة ربح قطع الغيار</td><td>${partsProfitPct.toFixed(1)}%</td></tr>
<tr class="report-row-clickable" data-wf-event="click" data-wf-code="showReportDetail('revenue')"><td>💰 الإيراد</td><td>${revenue.toFixed(2)} ج</td></tr>
<tr class="report-row-clickable" data-wf-event="click" data-wf-code="showReportDetail('grossProfit')"><td>📈 مكسب قبل المصاريف</td><td>${grossProfit.toFixed(2)} ج</td></tr>
<tr class="report-row-clickable" data-wf-event="click" data-wf-code="showReportDetail('expenses')"><td>🧯 مصاريف التشغيل</td><td>${totalExpenses.toFixed(2)} ج</td></tr>
<tr class="total-row report-row-clickable" data-wf-event="click" data-wf-code="showReportDetail('netProfit')"><td>✅ صافي المكسب</td><td>${netProfit.toFixed(2)} ج</td></tr>
<tr class="report-row-clickable" data-wf-event="click" data-wf-code="showReportDetail('deposits')"><td>💵 العربون المحصّل</td><td>${deposits.toFixed(2)} ج</td></tr>
<tr class="report-row-clickable" data-wf-event="click" data-wf-code="showReportDetail('remain')"><td>🧾 المتبقي على العملاء</td><td>${remain.toFixed(2)} ج</td></tr>
<tr class="report-row-clickable" data-wf-event="click" data-wf-code="showReportDetail('count')"><td>🛠️ عدد الأوامر</td><td>${r.length}</td></tr>
<tr class="report-row-clickable" data-wf-event="click" data-wf-code="showReportDetail('completed')"><td>✅ أوامر مكتملة</td><td>${completedCount}</td></tr>
<tr class="report-row-clickable" data-wf-event="click" data-wf-code="showReportDetail('avgTicket')"><td>📊 متوسط قيمة الأمر (المصنعية فقط)</td><td>${avgTicket.toFixed(2)} ج</td></tr>
</table><div id="reportDetail" class="report-detail hidden"></div>`;renderExpenseList()}
function reportOrders(){let{start,end}=getReportRange();return arrCached(K.r).filter(x=>inRange(x.closedAt,start,end)||inRange(x.createdAt,start,end))}
function operatingExpensesInRange(start,end){return walletTxEntries().filter(x=>x.category==="مصروف تشغيل"&&inRange(x.date,start,end))}
function reportExpensesInRange(){let{start,end}=getReportRange();return operatingExpensesInRange(start,end)}
// كل المصاريف "المُصنّفة فرعيًا" (تشغيل + شخصي) في فترة معينة — مستخدمة في
// إحصائيات "الأكتر صرفًا" بصفحة الحسابات فقط، ومش بتأثر على حساب صافي
// المكسب (اللي بيفضل معتمد على operatingExpensesInRange التشغيل فقط، لأن
// المصروف الشخصي مش تكلفة تشغيل للورشة).
function allTrackedExpensesInRange(start,end){
  return walletTxEntries().filter(x=>x.type==="out"&&(x.category==="مصروف تشغيل"||x.category==="مصروف شخصي")&&inRange(x.date,start,end));
}
// تجميع مصاريف فترة معينة حسب (النوع الفرعي + التصنيف الأصلي) مرتبة تنازليًا
// — الأساس لعرض "أكتر حاجة بيتصرف فيها" في صفحة الحسابات.
function spendingBreakdownInRange(start,end){
  let map={};
  allTrackedExpensesInRange(start,end).forEach(x=>{
    let sub=x.subCategory||"غير مصنف",catShort=x.category==="مصروف شخصي"?"شخصي":"تشغيل";
    let key=sub+"|"+catShort;
    map[key]=map[key]||{label:sub,catShort,amount:0,count:0};
    map[key].amount+=(+x.amount||0);map[key].count++;
  });
  return Object.values(map).sort((a,b)=>b.amount-a.amount);
}
// إحصائية سريعة لكل الشهر التقويمي الحالي (مستقلة عن فلتر التقرير
// شهري/أسبوعي تحت)، عشان "أكتر حاجة بيتصرف فيها" يبان أول ما تفتح صفحة
// الحسابات من غير ما تحتاج تفتح التقرير المفصّل.
function currentMonthSpendingStats(){
  let now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1,0,0,0,0),end=new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59,999);
  let breakdown=spendingBreakdownInRange(start,end);
  let total=breakdown.reduce((a,x)=>a+x.amount,0);
  return {breakdown,total,top:breakdown[0]||null};
}
// كارت سريع أعلى صفحة الحسابات: إجمالي المصروف هذا الشهر + أكتر 3 حاجات
// بيتصرف عليها — منفصل عن قسم "كشف الحساب" المفصّل تحت (اللي بيدّي اختيار
// شهر/أسبوع بعينه). ده دايمًا عن الشهر التقويمي الحالي بالظبط.
function renderSpendingStatsHtml(){
  let stats=currentMonthSpendingStats();
  if(!stats.breakdown.length)return `<div class="hint" style="margin:10px 0">📊 لا توجد مصاريف مسجلة هذا الشهر بعد لعرض إحصائيات الصرف.</div>`;
  let monthLabel=new Date().toLocaleDateString("ar-EG",{month:"long",year:"numeric"});
  return `<section class="panel" style="margin:10px 0">
    <div class="page-head"><h2>📊 إحصائيات الصرف — ${esc(monthLabel)}</h2></div>
    <div class="treasury-balance"><span>إجمالي المصروف (تشغيل + شخصي) هذا الشهر</span><b>${stats.total.toFixed(2)} ج</b></div>
    <div class="hint" style="margin:6px 0">🏆 الأكتر صرفًا عليه: <b>${esc(stats.top.label)}</b> (${stats.top.catShort}) — ${stats.top.amount.toFixed(2)} ج</div>
    <div class="profile-grid">
      ${stats.breakdown.slice(0,5).map((x,i)=>`<div class="kv"><b>${i+1}. ${esc(x.label)} <small>(${x.catShort})</small></b>${x.amount.toFixed(2)} ج · ${x.count} حركة</div>`).join("")}
    </div>
    <div class="hint">تقدر تشوف تفصيل أي شهر أو أسبوع سابق كمان من "📈 كشف الحساب" تحت. الأنواع الفرعية (وقود، مواصلات، أكل...) قابلة للتعديل من ⚙️ الإعدادات ← الحسابات.</div>
  </section>`;
}
function reportOrderLine(o,val){return `<a class="report-detail-row" href="request.html?id=${o.id}"><span>${esc(o.no||"—")} • ${esc(customerName(o.customerId))}${o.closed?" 🔒":""}</span><b>${(+val||0).toFixed(2)} ج</b></a>`}
function reportRowMeta(key){let r=reportOrders();
if(key==="labor"){let list=r.filter(x=>x.closed&&(+x.labor||0)>0);return{title:"🔨 تفاصيل المصنعية",note:"المصنعية تدخل هذا البند فقط بعد إغلاق أمر الشغل نهائيًا.",rows:list.map(x=>reportOrderLine(x,x.labor)),empty:"لا توجد مصنعية محسوبة بعد؛ ستظهر هنا الأوامر بعد إغلاقها نهائيًا."}}
if(key==="partsSell"){let list=r.filter(x=>x.closed&&(+x.partsTotal||0)>0);return{title:"🔧 تفاصيل قطع الغيار المحصلة",note:"قطع الغيار تدخل هذا البند فقط بعد إغلاق أمر الشغل نهائيًا، زي المصنعية بالظبط.",rows:list.map(x=>reportOrderLine(x,x.partsTotal)),empty:"لا توجد قطع غيار محصلة بعد؛ ستظهر هنا الأوامر بعد إغلاقها نهائيًا."}}
if(key==="partsCost"){let list=r.filter(x=>x.closed&&(+x.partsCost||0)>0);return{title:"📦 تفاصيل تكلفة القطع",note:"تكلفة القطع تدخل هذا البند فقط بعد إغلاق أمر الشغل نهائيًا.",rows:list.map(x=>reportOrderLine(x,x.partsCost)),empty:"لا توجد تكلفة قطع مسجلة بعد؛ ستظهر هنا الأوامر بعد إغلاقها نهائيًا."}}
if(key==="deposits"){let list=r.filter(x=>(+x.deposit||0)>0);return{title:"💵 تفاصيل العربون المحصّل",rows:list.map(x=>reportOrderLine(x,x.deposit)),empty:"لا يوجد عربون محصل في هذه الفترة."}}
if(key==="remain"){let list=r.filter(x=>!x.closed&&Math.max(0,(+x.total||0)-(+x.deposit||0))>0);return{title:"🧾 تفاصيل المتبقي على العملاء",note:"الأوامر المقفولة نهائيًا لا تُحتسب هنا حتى لو كان إجماليها أكبر من العربون وقت الفتح.",rows:list.map(x=>reportOrderLine(x,Math.max(0,(+x.total||0)-(+x.deposit||0)))),empty:"لا يوجد متبقي على العملاء."}}
if(key==="count"){return{title:"🛠️ كل أوامر الفترة",rows:r.map(x=>reportOrderLine(x,x.total)),empty:"لا توجد أوامر في هذه الفترة."}}
if(key==="completed"){let list=r.filter(x=>x.status==="مكتمل"||x.closed);return{title:"✅ الأوامر المكتملة / المغلقة",rows:list.map(x=>reportOrderLine(x,x.total)),empty:"لا توجد أوامر مكتملة أو مغلقة في هذه الفترة."}}
if(key==="expenses"){let list=reportExpensesInRange();return{title:"🧯 تفاصيل مصاريف التشغيل",rows:list.map(x=>`<div class="report-detail-row"><span>${esc(new Date(x.date).toLocaleDateString("ar-EG"))} • ${esc(x.subCategory||"غير مصنف")} • ${esc(x.reason||"")} • 💳 ${esc(x.wallet||"—")}${x.note?" — "+esc(x.note):""}</span><b>${x.type==="in"?"+":"−"}${(+x.amount||0).toFixed(2)} ج</b></div>`),empty:"لا توجد مصاريف مسجلة في هذه الفترة."}}
if(key==="revenue"){let closedOrders=r.filter(x=>x.closed),labor=closedOrders.reduce((a,x)=>a+(+x.labor||0),0),partsSell=closedOrders.reduce((a,x)=>a+(+x.partsTotal||0),0);return{title:"💰 مكوّنات الإيراد",rows:[`<div class="report-detail-row"><span>🔨 المصنعية (الأوامر المقفولة)</span><b>${labor.toFixed(2)} ج</b></div>`,`<div class="report-detail-row"><span>🔧 قطع الغيار المحصلة (الأوامر المقفولة)</span><b>${partsSell.toFixed(2)} ج</b></div>`,`<div class="report-detail-row total-row"><span>= الإيراد</span><b>${(labor+partsSell).toFixed(2)} ج</b></div>`],empty:""}}
if(key==="grossProfit"){let closedOrders=r.filter(x=>x.closed),labor=closedOrders.reduce((a,x)=>a+(+x.labor||0),0),partsSell=closedOrders.reduce((a,x)=>a+(+x.partsTotal||0),0),partsCost=closedOrders.reduce((a,x)=>a+(+x.partsCost||0),0),revenue=labor+partsSell;return{title:"📈 مكوّنات المكسب قبل المصاريف",rows:[`<div class="report-detail-row"><span>💰 الإيراد</span><b>${revenue.toFixed(2)} ج</b></div>`,`<div class="report-detail-row"><span>− 📦 تكلفة القطع</span><b>${partsCost.toFixed(2)} ج</b></div>`,`<div class="report-detail-row total-row"><span>= المكسب قبل المصاريف</span><b>${(revenue-partsCost).toFixed(2)} ج</b></div>`],empty:""}}
if(key==="netProfit"){let closedOrders=r.filter(x=>x.closed),labor=closedOrders.reduce((a,x)=>a+(+x.labor||0),0),partsSell=closedOrders.reduce((a,x)=>a+(+x.partsTotal||0),0),partsCost=closedOrders.reduce((a,x)=>a+(+x.partsCost||0),0),grossProfit=labor+partsSell-partsCost,exp=reportExpensesInRange(),totalExpenses=exp.reduce((a,x)=>a+(x.type==="in"?-(+x.amount||0):(+x.amount||0)),0);return{title:"✅ مكوّنات صافي المكسب",rows:[`<div class="report-detail-row"><span>📈 مكسب قبل المصاريف</span><b>${grossProfit.toFixed(2)} ج</b></div>`,`<div class="report-detail-row"><span>− 🧯 مصاريف التشغيل</span><b>${totalExpenses.toFixed(2)} ج</b></div>`,`<div class="report-detail-row total-row"><span>= صافي المكسب</span><b>${(grossProfit-totalExpenses).toFixed(2)} ج</b></div>`],empty:""}}
if(key==="avgTicket"){let completedList=r.filter(x=>x.status==="مكتمل"||x.closed),completedLabor=completedList.reduce((a,x)=>a+(x.closed?(+x.labor||0):0),0);return{title:"📊 متوسط قيمة الأمر (المصنعية فقط)",note:"يُحسب من المصنعية (للأوامر المقفولة) فقط ÷ عدد الأوامر المنتهية — قطع الغيار مش داخلة في الحساب ده لأنها منفصلة تمامًا عن أجر الفني.",rows:[`<div class="report-detail-row"><span>🔨 إجمالي المصنعية (المقفولة)</span><b>${completedLabor.toFixed(2)} ج</b></div>`,`<div class="report-detail-row"><span>÷ ✅ عدد الأوامر المنتهية</span><b>${completedList.length}</b></div>`,`<div class="report-detail-row total-row"><span>= متوسط قيمة الأمر</span><b>${(completedList.length?completedLabor/completedList.length:0).toFixed(2)} ج</b></div>`],empty:""}}
if(key==="partsProfitPct"){let closedOrders=r.filter(x=>x.closed),partsSell=closedOrders.reduce((a,x)=>a+(+x.partsTotal||0),0),partsCost=closedOrders.reduce((a,x)=>a+(+x.partsCost||0),0),profit=partsSell-partsCost,pct=partsSell>0?(profit/partsSell*100):0;return{title:"📈 نسبة ربح قطع الغيار",note:"النسبة = (قطع الغيار المحصلة − تكلفة القطع) ÷ قطع الغيار المحصلة × 100، لأوامر الشغل المقفولة فقط.",rows:[`<div class="report-detail-row"><span>🔧 قطع الغيار المحصلة</span><b>${partsSell.toFixed(2)} ج</b></div>`,`<div class="report-detail-row"><span>− 📦 تكلفة القطع</span><b>${partsCost.toFixed(2)} ج</b></div>`,`<div class="report-detail-row"><span>= مكسب قطع الغيار</span><b>${profit.toFixed(2)} ج</b></div>`,`<div class="report-detail-row total-row"><span>= نسبة الربح</span><b>${pct.toFixed(1)}%</b></div>`],empty:partsSell>0?"":"لا توجد مبيعات قطع غيار في هذه الفترة لحساب النسبة."}}
return null}
function showReportDetail(key){let el=document.getElementById("reportDetail");if(!el)return;let meta=reportRowMeta(key);if(!meta)return;el.innerHTML=`<div class="report-detail-head"><b>${meta.title}</b><button type="button" class="secondary small-btn" data-wf-event="click" data-wf-code="closeReportDetail()">✖ إغلاق</button></div>${meta.note?`<div class="hint report-detail-note">${meta.note}</div>`:""}<div class="report-detail-list">${meta.rows&&meta.rows.length?meta.rows.join(""):`<div class="hint">${meta.empty||""}</div>`}</div>`;el.classList.remove("hidden");el.scrollIntoView({behavior:"smooth",block:"nearest"})}
function closeReportDetail(){document.getElementById("reportDetail")?.classList.add("hidden")}
function deleteExpense(i){deleteWalletTx(i);financeReport()}
function renderExpenseList(){
  let el=document.getElementById("expenseList");if(!el)return;
  let{start,end}=getReportRange();
  let exp=allTrackedExpensesInRange(start,end).sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(!exp.length){el.innerHTML=`<div class="hint">لا توجد مصاريف مسجلة في هذه الفترة.</div>`;return}
  let breakdown=spendingBreakdownInRange(start,end),total=breakdown.reduce((a,x)=>a+x.amount,0),top=breakdown[0];
  let topHtml=top?`<div class="wallet-icon-card" style="display:flex;margin-bottom:10px"><i>🏆</i><b>الأكتر صرفًا في الفترة: ${esc(top.label)} (${top.catShort})</b><span>${top.amount.toFixed(2)} ج</span></div>`:"";
  let summaryHtml=`${topHtml}<h3 class="expense-subtitle">🧯 تفاصيل المصاريف حسب النوع — تشغيل وشخصي (${exp.length} حركة، إجمالي ${total.toFixed(2)} ج)</h3><table class="month-table">${breakdown.map(x=>`<tr><td>${esc(x.label)} <small>(${x.catShort})</small></td><td>${x.amount.toFixed(2)} ج <small>(${x.count})</small></td></tr>`).join("")}</table>`;
  let rowsHtml=exp.map(x=>`<div class="expense-row"><span>${esc(new Date(x.date).toLocaleDateString("ar-EG"))}</span><span>${esc(x.subCategory||"غير مصنف")} • ${esc(x.category==="مصروف شخصي"?"🙋 شخصي":"🔧 تشغيل")} • ${esc(x.reason||"")}</span><b>${x.type==="in"?"+":"−"}${(+x.amount||0).toFixed(2)} ج</b><span class="expense-note">💳 ${esc(x.wallet||"—")}${x.note?" • "+esc(x.note):""}</span><button type="button" class="mini-action" data-wf-event="click" data-wf-code="deleteExpense('${x.id}')">🗑️</button></div>`).join("");
  el.innerHTML=summaryHtml+rowsHtml;
}
function monthReport(){if(!document.getElementById("monthlyReport"))return;if(!document.getElementById("reportMode"))setReportMode("month");else financeReport()}// نفس مبدأ فصل قراءة الفورم عن منطق الحفظ اللي اتطبّق على أمر الشغل،
// اتطبّق هنا على حفظ العميل. تأكيد رقم الهاتف المكرر فضل في onsubmit
// لأنه فعليًا تفاعل مع المستخدم (confirm) مش منطق حفظ بيانات.
