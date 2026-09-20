/* app-shared.js — أدوات مشتركة عامة: مساعدات صور/تخزين/تاريخ، دورة حالات أمر الشغل المعتمدة، فتح/قفل صناديق الإضافة السريعة، تعبئة القوائم المنسدلة (مراكز/قرى/عملاء/عناوين/أنواع/ماركات). */
function imageToDataURL(file,max=720,quality=.62){return new Promise((resolve,reject)=>{if(!file){resolve("");return}try{let r=new FileReader();r.onload=()=>{let img=new Image();img.onload=()=>{let scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale)),c=document.createElement("canvas");c.width=w;c.height=h;let ctx=c.getContext("2d",{alpha:false});ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);resolve(c.toDataURL("image/jpeg",quality))};img.onerror=reject;img.src=r.result};r.onerror=reject;r.readAsDataURL(file)}catch(e){reject(e)}})}
// حفظ آمن: كانت هذه الدالة بها عطل جوهري — put(k,v);return true — بترجّع
// "نجح" دايمًا مهما كانت نتيجة put() الحقيقية، لأن put() بتمسك أي خطأ حفظ
// (امتلاء المساحة، تعطّل localStorage) جوّاها هي نفسها وترجع false من غير أي
// throw، فالـ catch هنا ما كانش بيتنفذ أبدًا وكل نداء لـ saveJSONSafe في
// النظام (أكتر من 40 مكان) كان بيكمل العملية وكأن الحفظ نجح حتى لو فشل
// فعليًا. التصحيح: إرجاع نتيجة put() الحقيقية بدل true ثابتة.
function saveJSONSafe(k,v){return put(k,v)===true}
async function showImagePreview(ref,title){
  if(!ref)return;
  const src=window.ImageStore?await window.ImageStore.resolveSrc(ref):ref;
  if(!src){alert("تعذر تحميل الصورة.");return}
  document.querySelectorAll(".img-preview-overlay").forEach(x=>x.remove());
  const ov=document.createElement("div");
  ov.className="img-preview-overlay";
  ov.innerHTML=`<div class="img-preview-box"><div class="img-preview-head"><b>${esc(title||"عرض الصورة")}</b><button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="this.closest('.img-preview-overlay').remove()">✖ إغلاق</button></div><img src="${src}"><p class="img-preview-zoom-hint">🤏 قرّبي بإصبعين أو دبل تاب للتكبير</p></div>`;
  ov.addEventListener("click",e=>{if(e.target===ov)ov.remove()});
  document.body.appendChild(ov);
  const img=ov.querySelector(".img-preview-box img");
  if(img&&typeof enablePinchZoomPan==="function")enablePinchZoomPan(img);
}
/* ---------------------------------------------------------------------
   تقريب وتحريك صورة بإصبعين (Pinch-to-zoom) داخل عارض الصور، بدون ما
   يكبّر الصفحة كلها زي ما بيحصل مع تقريب المتصفح العادي — التقريب بيتم
   بس على الصورة نفسها (transform: scale/translate)، وعند إبعاد
   الإصبعين تحت الحجم الطبيعي بيرجع تلقائيًا لوضعه الأصلي. دبل تاب على
   الصورة بيقرّب/يرجّع بسرعة كمان.
   --------------------------------------------------------------------- */
function enablePinchZoomPan(img){
  let scale=1,startScale=1,panX=0,panY=0,startPanX=0,startPanY=0,pinchStartDist=0,lastTapAt=0;
  function apply(withTransition){
    img.style.transition=withTransition?"transform .15s":"none";
    img.style.transform=`translate(${panX}px,${panY}px) scale(${scale})`;
  }
  function reset(){scale=1;panX=0;panY=0;apply(true)}
  img.addEventListener("touchstart",e=>{
    if(e.touches.length===2){
      const [a,b]=e.touches;
      pinchStartDist=Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY)||1;
      startScale=scale;
    } else if(e.touches.length===1&&scale>1){
      startPanX=e.touches[0].clientX-panX;startPanY=e.touches[0].clientY-panY;
    }
  },{passive:true});
  img.addEventListener("touchmove",e=>{
    if(e.touches.length===2){
      e.preventDefault();
      const [a,b]=e.touches;
      const dist=Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY);
      scale=Math.min(4,Math.max(1,startScale*(dist/pinchStartDist)));
      apply(false);
    } else if(e.touches.length===1&&scale>1){
      e.preventDefault();
      panX=e.touches[0].clientX-startPanX;panY=e.touches[0].clientY-startPanY;
      apply(false);
    }
  },{passive:false});
  img.addEventListener("touchend",()=>{ if(scale<=1)reset(); });
  img.addEventListener("dblclick",()=>{ if(scale>1)reset(); else {scale=2.2;apply(true)} });
}
/* ---------------------------------------------------------------------
   معاينة صورة كبيرة وفورية بعد اختيارها (فاتورة/صورة قطعة/صورة جهاز)،
   مستخدمة في أي حقل رفع صورة في التطبيق: بتاخد حجم قريب من الشاشة (زي
   معرض الصور) وبتدعم التقريب والتحريك بإصبعين في مكانها هي نفسها (شوف
   enablePinchZoomPan فوق) بدل ما تحتاج المستخدمة تدخل لعارض منفصل.
   hostId: id العنصر (div فاضي) اللي هتتحط الصورة جواه. dataURL: فاضي
   يعني نمسح المعاينة (زي وقت إلغاء اختيار الصورة).
   --------------------------------------------------------------------- */
function renderLivePhotoPreview(hostId, dataURL) {
  const host = document.getElementById(hostId); if (!host) return;
  if (!dataURL) { host.innerHTML = ""; return; }
  host.innerHTML = `<img class="live-photo-preview" src="${dataURL}"><p class="live-photo-preview-hint">🤏 قرّبي بإصبعين أو دبل تاب على الصورة نفسها للتكبير والتحرك فيها في مكانها</p>`;
  const img = host.querySelector(".live-photo-preview");
  if (img) enablePinchZoomPan(img);
}
function localDateKey(date){return dayKeyLocal(date)}
function parseLocalDateValue(value){if(typeof value==="string"){let m=value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return new Date(+m[1],+m[2]-1,+m[3]);}return new Date(value)}
function monthKeyLocal(value){let d=parseLocalDateValue(value);if(Number.isNaN(d.getTime()))return"";return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function orderNo(date=new Date()){let y=String(date.getFullYear()).slice(-2),m=date.getMonth()+1,d=date.getDate(),prefix=`W${y}-${m}-${d}-`,ymd=localDateKey(date);let n=arr(K.r).filter(x=>x.createdAt&&localDateKey(new Date(x.createdAt))===ymd).length+1;while(arr(K.r).some(x=>x.no===prefix+n))n++;return prefix+n}
function normalizeOrderNumbers(){let rs=arr(K.r),used=new Set(),groups={};rs.forEach(r=>{let dt=r.createdAt?new Date(r.createdAt):new Date(),ymd=localDateKey(dt);(groups[ymd]??=[]).push(r)});Object.entries(groups).forEach(([ymd,list])=>{let [yy,mm,dd]=ymd.split("-").map(Number),prefix=`W${String(yy).slice(-2)}-${mm}-${dd}-`;list.forEach((r,i)=>{let n=prefix+(i+1);while(used.has(n))n=prefix+(++i+1);r.no=n;used.add(n)})});put(K.r,rs)}

/* =========================================================
   دورة حالات أمر الشغل المعتمدة (راجع WORK_ORDER_LIFECYCLE_APPROVED.md)
   =========================================================
   الحالات: جديد / جاري التنفيذ / مكتمل / ملغي — ثابتة، مش قابلة للتعديل.
   الانتقالات المسموحة فقط:
     جديد → جاري التنفيذ | ملغي
     جاري التنفيذ → مكتمل | ملغي
     ملغي → جديد (إعادة فتح)
     مكتمل → جاري التنفيذ (إعادة فتح عند الحاجة)
   كل تغيير حالة بيتسجل بتاريخه ووقته في r.statusHistory. الإلغاء لازم
   له سبب (r.cancelReason). الأولوية اتشالت خالص من دورة أمر الشغل.
   ========================================================= */
const WORK_ORDER_STATUSES=["جديد","جاري التنفيذ","مجمد","مكتمل","ملغي"];
const WORK_ORDER_TRANSITIONS={"جديد":["جاري التنفيذ","مجمد","ملغي"],"جاري التنفيذ":["مكتمل","مجمد","ملغي"],"مجمد":["جاري التنفيذ","ملغي"],"مكتمل":["جاري التنفيذ"],"ملغي":["جديد"]};
function canTransitionStatus(from,to){if(!from)return true;if(from===to)return true;return (WORK_ORDER_TRANSITIONS[from]||[]).includes(to)}
function nextStatusOptions(status){let opts=[status,...(WORK_ORDER_TRANSITIONS[status]||[])];return [...new Set(opts)]}
function recordStatusHistory(r,from,to,note){r.statusHistory=Array.isArray(r.statusHistory)?r.statusHistory:[];r.statusHistory.push({from:from||"",to,at:new Date().toISOString(),note:note||""})}

/* =========================================================
   مهلة "المرتجع" لأوامر الشغل المكتملة والمغلقة (settings().returnWindowDays)
   =========================================================
   أمر الشغل المكتمل وغير المغلق: يفضل ممكن إرجاعه في أي وقت (زي ما كان).
   أمر الشغل المكتمل والمغلق (بعد "تم الدفع بالكامل وإغلاق الأمر"): بيبقى
   ليه مهلة محددة بالأيام (افتراضيًا 7، قابلة للتعديل من الإعدادات) تُحسب
   من تاريخ الإغلاق (closedAt). بعد انتهاء المهلة مفيش مرتجع خالص.
   ========================================================= */
function returnWindowDeadline(r){
  if(!r||!r.closedAt)return null;
  let days=+(settings().returnWindowDays);
  if(!Number.isFinite(days)||days<=0)days=7;
  return new Date(new Date(r.closedAt).getTime()+days*86400000);
}
function returnWindowDaysLeft(r){
  let dl=returnWindowDeadline(r);
  if(!dl)return null;
  return Math.ceil((dl.getTime()-Date.now())/86400000);
}
function canReturnRequest(r){
  if(!r)return false;
  if(r.status!=="مكتمل")return false;
  if(!r.closed)return true;
  let dl=returnWindowDeadline(r);
  return !!dl&&Date.now()<=dl.getTime();
}
function statusHistoryHtml(r){let h=Array.isArray(r.statusHistory)?r.statusHistory:[];if(!h.length)return"";return `<div class="status-history"><h3>🕓 سجل تغييرات الحالة</h3>${h.slice().reverse().map(x=>`<div class="status-history-row"><div class="status-history-line"><span>${x.from?`${esc(x.from)} ← `:""}<b>${esc(x.to)}</b></span><small>${new Date(x.at).toLocaleString("ar-EG")}</small></div>${x.note?`<div class="status-history-note">📝 ${esc(x.note)}</div>`:""}</div>`).join("")}</div>`}

/* =========================================================
   markPaidAndClose / closeOrder — نسخة واحدة موحّدة (دُمجت هنا 2026-08-28)
   =========================================================
   قبل كده كانت نفس الدالة معرّفة مرتين بنفس المنطق بالظبط:
   نسخة "أساسية" في app-requests.js (شغالة في request.html، route.html،
   customer.html، device.html، part.html، index.html، tasks.html،
   treasury.html، settings.html، reports.html)، ونسخة بتستبدلها في
   workshop-mini-simple-ui.js (شغالة في customers.html، devices.html،
   inventory.html، requests.html). الاختلاف الوحيد بينهم كان تفاصيل تنفيذ
   ما بتأثرش على السلوك (arr(K.r) و requestRows() نفس الحاجة بالظبط،
   وكذلك put(K.r,..) و save("wf_r",..))، لكن التكرار نفسه كان مصدر باگ
   فعلي قبل كده (حقل r.closedStatus كان بيتسجل في نسخة وينتسى في التانية،
   راجع CHANGELOG v11-31). دلوقتي نسخة واحدة بس هنا، بتحمّل في كل صفحة
   قبل app-requests.js وقبل workshop-mini-simple-ui.js، وأي صفحتين
   بيشتغلوا بنفس الدالة بالظبط.
   ========================================================= */

/* =========================================================
   ⏱️ قياس دورة أمر الشغل
   - createdAt: وقت تسجيل البلاغ
   - startedAt: أول انتقال إلى "جاري التنفيذ"
   - completedAt: آخر وصول إلى "مكتمل"
   - workshopStartedAt: بداية التنفيذ داخل الورشة عند توفرها
   التوقيتات لا تضيف حالات جديدة، وتظل متوافقة مع دورة الحالات المعتمدة.
   ========================================================= */
function requestTimingDate(r,field,fallbackToHistory){
  if(!r)return null;
  if(r[field]){let d=new Date(r[field]);if(!Number.isNaN(d.getTime()))return d;}
  if(fallbackToHistory&&Array.isArray(r.statusHistory)){
    let wanted=field==="startedAt"?"جاري التنفيذ":field==="completedAt"?"مكتمل":"";
    if(wanted){
      let rows=r.statusHistory.filter(x=>x.to===wanted&&x.at).sort((a,b)=>new Date(a.at)-new Date(b.at));
      if(rows.length){let d=new Date(field==="completedAt"?rows[rows.length-1].at:rows[0].at);if(!Number.isNaN(d.getTime()))return d;}
    }
  }
  return null;
}
function requestCreatedDate(r){
  if(!r)return null;
  let d=r.createdAt?new Date(r.createdAt):null;
  if(d&&!Number.isNaN(d.getTime()))return d;
  if(Array.isArray(r.statusHistory)&&r.statusHistory.length){
    let rows=r.statusHistory.filter(x=>x.at).sort((a,b)=>new Date(a.at)-new Date(b.at));
    if(rows.length){d=new Date(rows[0].at);if(!Number.isNaN(d.getTime()))return d;}
  }
  return null;
}
/* V11.54: ترميز لوني حسب عمر أمر الشغل (منذ تاريخ التسجيل)، عشان لو الأوامر
   المفتوحة (جديد / جاري التنفيذ) كتير مع بعض في القايمة يبقى سهل تفرّق
   بصريًا مين أحدث ومين قاعد بقاله وقت أطول محتاج ينفّذ الأول.
   الأولوية اليدوية لسه مش موجودة (متوافق مع WORK_ORDER_LIFECYCLE_APPROVED.md) —
   ده مجرد لون إرشادي بيتغير أوتوماتيك حسب الوقت، مش حقل بيتعدّل يدويًا. */
/* V11.54: ترميز لوني حسب عمر أمر الشغل (منذ تاريخ التسجيل)، عشان لو الأوامر
   المفتوحة (جديد / جاري التنفيذ) كتير مع بعض في القايمة يبقى سهل تفرّق
   بصريًا مين أحدث ومين قاعد بقاله وقت أطول محتاج ينفّذ الأول.
   الأولوية اليدوية لسه مش موجودة (متوافق مع WORK_ORDER_LIFECYCLE_APPROVED.md) —
   ده مجرد لون إرشادي بيتغير أوتوماتيك حسب الوقت، مش حقل بيتعدّل يدويًا.
   3 ألوان بس (مش 6) بناءً على طلب المستخدم، ومرتبطة بنفس رقم "تنبيه
   الأوامر القديمة" اللي المستخدم بيتحكم فيه من الإعدادات (s.overdueAlertDays):
   لو الأمر وصل لعدد الأيام ده أو أكتر يبقى أحمر (ونفسه اللي بيدخل عداد
   التنبيه في الداشبورد)، ونصّه تقريبًا يبقى أصفر، وأقل من كده أخضر. */
function requestAgeDays(r){
  let ms=requestAgeMs(r);
  return ms===null?null:Math.floor(ms/86400000)
}
function requestAgeInfo(r){
  if(!r||r.status==="مكتمل"||r.status==="ملغي")return null;
  let days=requestAgeDays(r);
  if(days===null)return null;
  if(r.status==="مجمد")return{days,cls:"age-frozen",dot:"❄️",range:"مجمّد (العداد متوقف)",label:days===0?"مجمّد اليوم":(days===1?"مجمّد من يوم":`مجمّد من ${days} يوم`)};
  let threshold=Number.isFinite(+settings().overdueAlertDays)&&+settings().overdueAlertDays>0?+settings().overdueAlertDays:7;
  let mid=Math.max(1,Math.floor(threshold/2));
  let cls,dot,range;
  if(days<mid){cls="age-b0";dot="🟢";range=`أقل من ${mid} يوم`}
  else if(days<threshold){cls="age-b1";dot="🟡";range=`من ${mid} لحد ${threshold-1} يوم`}
  else{cls="age-b2";dot="🔴";range=`${threshold} يوم فأكتر`}
  return{days,cls,dot,range,label:days===0?"جديد اليوم":(days===1?"من يوم":`من ${days} يوم`)}
}
function requestAgeLegendHtml(){
  let threshold=Number.isFinite(+settings().overdueAlertDays)&&+settings().overdueAlertDays>0?+settings().overdueAlertDays:7;
  let mid=Math.max(1,Math.floor(threshold/2));
  let items=[
    {cls:"age-b0",dot:"🟢",range:`أقل من ${mid} يوم`},
    {cls:"age-b1",dot:"🟡",range:`من ${mid} لحد ${threshold-1} يوم`},
    {cls:"age-b2",dot:"🔴",range:`${threshold} يوم فأكتر (بيدخل تنبيه الداشبورد)`}
  ];
  return `<div class="age-legend">${items.map(b=>`<span class="age-legend-item ${b.cls}">${b.dot} ${esc(b.range)}</span>`).join("")}</div>`
}
function requestIsStale(r){
  if(!r||r.status==="مكتمل"||r.status==="ملغي"||r.status==="مجمد"||r.closed)return false;
  let days=requestAgeDays(r);
  if(days===null)return false;
  let threshold=Number.isFinite(+settings().overdueAlertDays)&&+settings().overdueAlertDays>0?+settings().overdueAlertDays:7;
  return days>=threshold
}
/* V11.56: نفس ترميز عمر الأمر، لكن معمَّم على أي قايمة أوامر (عميل/جهاز/خط
   سير) بحيث ياخد لون أسوأ (أقدم) أمر مفتوح فيها — نفس فكرة "افتح عليه
   أمر ومحتاج تتابعه" بس على مستوى العميل/الجهاز مش الأمر بس. */
function worstRequestAgeInfo(list){
  let best=null;
  (list||[]).forEach(r=>{
    let info=requestAgeInfo(r);
    if(info&&(!best||info.days>best.days))best=info;
  });
  return best;
}
/* V11.57: لون ثابت لكل تصنيف قطع غيار (غسالات/تلاجات/تكييفات...) عشان
   يبقى سهل تفرّق بينهم بصريًا في المخزن، بنفس فكرة تلوين عمر الأمر بس
   هنا اللون ثابت حسب التصنيف نفسه مش حسب الوقت. بيتحسب من هاش بسيط
   لاسم التصنيف، فأي تصنيف (حتى لو المستخدم ضاف واحد جديد من الإعدادات)
   ياخد لون ثابت تلقائي من غير أي إعداد إضافي.  */
var PART_CATEGORY_PALETTE=["cat-c0","cat-c1","cat-c2","cat-c3","cat-c4","cat-c5","cat-c6","cat-c7"];
function categoryColorClass(cat){
  let s=String(cat||"").trim();
  if(!s)return "";
  let h=0;
  for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))>>>0}
  return PART_CATEGORY_PALETTE[h%PART_CATEGORY_PALETTE.length];
}
function requestStartedDate(r){return requestTimingDate(r,"startedAt",true)}
function requestCompletedDate(r){return requestTimingDate(r,"completedAt",true)}
function requestWorkshopStartedDate(r){
  if(!r)return null;
  if(r.workshopStartedAt){let d=new Date(r.workshopStartedAt);if(!Number.isNaN(d.getTime()))return d;}
  if(r.executionPlace==="الورشة")return requestStartedDate(r);
  return null;
}
function durationMs(start,end){
  if(!start||!end)return null;
  let n=new Date(end).getTime()-new Date(start).getTime();
  return Number.isFinite(n)&&n>=0?n:null;
}
function formatDuration(ms){
  if(ms===null||ms===undefined||!Number.isFinite(ms)||ms<0)return "—";
  let totalMin=Math.round(ms/60000),days=Math.floor(totalMin/1440),hours=Math.floor((totalMin%1440)/60),mins=totalMin%60;
  if(days)return `${days} يوم${days===1?"":""}${hours?` و ${hours} س`:""}`;
  if(hours)return `${hours} س${mins?` و ${mins} د`:""}`;
  return `${Math.max(0,mins)} د`;
}
function requestTotalCompletionMs(r){
  let s=requestCreatedDate(r),e=requestCompletedDate(r);
  return durationMs(s,e);
}
function requestWorkshopExecutionMs(r){
  let s=requestWorkshopStartedDate(r),e=requestCompletedDate(r);
  return durationMs(s,e);
}
function requestWorkshopEnteredDate(r){
  if(!r)return null;
  const value=r.workshopEnteredAt||r.pulledAt||r.workshopAt;
  if(value){let d=new Date(value);if(!Number.isNaN(d.getTime()))return d;}
  return r.executionPlace==="الورشة"?requestWorkshopStartedDate(r):null;
}
function requestWorkshopStayMs(r){
  let s=requestWorkshopEnteredDate(r),e=requestCompletedDate(r);
  return durationMs(s,e);
}
function requestAgeMs(r){
  let s=requestCreatedDate(r);if(!s)return null;
  let e=r?.status==="مكتمل"?requestCompletedDate(r):null;
  // أمر مجمد: العداد بيتوقف عند لحظة التجميد، فمش بيزيد وهو واقف منتظر رد
  // العميل. frozenMs بيجمع كل فترات التجميد السابقة (لو اتفك وتجمد أكتر من مرة).
  let frozenRef=(r?.status==="مجمد"&&r.frozenAt)?new Date(r.frozenAt):null;
  let raw=durationMs(s,e||frozenRef||new Date());
  let frozenMs=+r?.frozenMs||0;
  return Math.max(0,raw-frozenMs);
}

function markPaidAndClose(i){
  let a=arr(K.r),r=a.find(x=>x.id===i);
  if(!r||r.closed||r.paid)return;
  if(r.status!=="مكتمل"){alert("اجعل حالة أمر الشغل «مكتمل» أولًا.");return}
  if(!confirm("تأكيد استلام كامل قيمة الأمر وإغلاقه نهائيًا؟ بعد التأكيد لن يمكن التعديل."))return;
  let wallet=document.getElementById("rCloseWallet")?.value||"";
  let now=new Date().toISOString();
  let collected=Math.max(0,(+r.total||0)-(+r.deposit||0));
  r.paid=true;
  r.remain=0;
  r.paidAt=now;
  r.closed=true;
  r.closedAt=now;
  r.closeWallet=wallet;
  const saved=withRollback([K.r,K.wtx],()=>{
    if(!put(K.r,a))return{ok:false};
    if(typeof syncTreasuryForOrderClose==="function")syncTreasuryForOrderClose(r,collected);
    if(typeof syncWalletForOrderClose==="function"&&!syncWalletForOrderClose(r,collected,wallet))return{ok:false};
    return{ok:true};
  });
  if(!saved?.ok){alert("تعذر حفظ الإغلاق والحركة المالية معًا؛ لم يتم إغلاق أمر الشغل.");return}
  window.auditLog?.("تحصيل وإغلاق", "أمر شغل", r.id, `المبلغ المحصل ${collected.toFixed(2)} ج`);
  location.reload();
}
function closeOrder(i){markPaidAndClose(i)}

/* K, get, put, arr, esc, id, settings, duplicateCustomerByPhone: منقولة لملف
   shared-data.js (لازم يتحمّل قبل app.js في كل صفحة) عشان تبقى نسخة واحدة
   يستخدمها كل الملفات بدل ما تتكرر في أكتر من مكان. */
function toggle(x){document.getElementById(x)?.classList.toggle("hidden")}
/* ---------------------------------------------------------------------
   اختيار صورة بزرارين منفصلين (📷 كاميرا / 🖼️ من الصور) بدل حقل واحد
   accept="image/*" عادي:
   المتصفحات بتتعامل مع حقل الصور الواحد بشكل مختلف خالص — سامسونج
   إنترنت (وغيره) بيفتح قائمة اختيار النظام العادية (فيها الكاميرا
   والمعرض والملفات مع بعض)، لكن كروم على أندرويد بقى بيفتح "منتقي
   الصور" الخاص بيه هو (Photo Picker، شكله زي جوجل فوتوز) واللي مفيهوش
   خيار كاميرا خالص. عشان نضمن إن خيار الكاميرا يفضل متاح مهما كان
   المتصفح، بنستخدم زرارين منفصلين: كل واحد بيفتح حقل ملف مؤقت خاص بيه
   (بكاميرا أو من غيرها)، وبعد الاختيار بننقل الملف لنفس حقل الفورم
   الأصلي (نفس الـid اللي باقي الكود بيقرأ منه/يفضّيه، من غير ما يتغيّر
   فيه أي حاجة) عن طريق DataTransfer، وبنطلق عليه حدث change عادي عشان
   أي كود تاني مربوط بالحقل الأصلي (زي معاينة الصورة) يشتغل زي ما هو.
   الاستخدام في الـHTML: الحقل الأصلي بيتحط hidden، وجنبه
   <div class="dual-photo-picker" data-target="id-الحقل"> فيها الزرارين
   دول + <span class="dual-photo-filename"> بيعرض اسم الملف المختار.
   --------------------------------------------------------------------- */
function refreshDualPhotoName(targetId){
  const target=document.getElementById(targetId);if(!target)return;
  const box=document.querySelector(`.dual-photo-picker[data-target="${targetId}"]`);
  const nameEl=box?.querySelector(".dual-photo-filename");
  if(nameEl)nameEl.textContent=target.files&&target.files[0]?target.files[0].name:"لم يتم اختيار ملف";
}
function initDualImagePickers(){
  document.querySelectorAll(".dual-photo-picker[data-target]").forEach(box=>{
    if(box.dataset.wired)return;box.dataset.wired="1";
    const targetId=box.dataset.target,target=document.getElementById(targetId);
    if(!target)return;
    refreshDualPhotoName(targetId);
    box.querySelectorAll(".dual-photo-btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const temp=document.createElement("input");
        temp.type="file";temp.accept="image/*";
        if(btn.dataset.mode==="camera")temp.capture="environment";
        temp.addEventListener("change",()=>{
          if(temp.files&&temp.files[0]){
            try{const dt=new DataTransfer();dt.items.add(temp.files[0]);target.files=dt.files}catch(e){}
            target.dispatchEvent(new Event("change",{bubbles:true}));
            refreshDualPhotoName(targetId);
          }
        });
        temp.click();
      });
    });
    target.addEventListener("change",()=>refreshDualPhotoName(targetId));
  });
}
document.addEventListener("DOMContentLoaded",()=>setTimeout(initDualImagePickers,0));
const QUICK_ADD_LABELS={quickCustomerBox:"➕ عميل",quickDeviceBox:"➕ جهاز",quickDeviceCustomerBox:"➕ عميل",qoCustomerBox:"➕ عميل",qoDeviceBox:"➕ جهاز"};
function toggleQuickAdd(boxId){let box=document.getElementById(boxId);if(!box)return;let btn=document.querySelector(`[data-opens="${boxId}"]`);let opening=box.classList.contains("hidden");box.classList.toggle("hidden");if(btn){btn.textContent=opening?"➖ إلغاء الإضافة":(QUICK_ADD_LABELS[boxId]||"➕ إضافة");btn.classList.toggle("quick-add-open",opening)}if(opening)setTimeout(()=>box.scrollIntoView({behavior:"smooth",block:"nearest"}),50)}
function closeQuickAdd(boxId){let box=document.getElementById(boxId);if(!box)return;box.classList.add("hidden");let btn=document.querySelector(`[data-opens="${boxId}"]`);if(btn){btn.textContent=QUICK_ADD_LABELS[boxId]||"➕ إضافة";btn.classList.remove("quick-add-open")}}

/* قسم الخزنة اتنقل لملف treasury.js (راجع الملف ده لو محتاج تعدل فيه). */

/* قسم المهام والمتابعة اتنقل لملف tasks.js (راجع الملف ده لو محتاج تعدل فيه). */
/* customerName, deviceName, addresses, addressText: منقولة لملف shared-data.js */
function fillCustomer(el,selected=""){if(!el)return;el.innerHTML='<option value="">اختر العميل</option>'+arr(K.c).map(x=>`<option value="${x.id}" ${x.id===selected?"selected":""}>${esc(x.name)} - ${esc(x.phone)}</option>`).join("")}
function fillAddress(el,cid,selected=""){let c=arr(K.c).find(x=>x.id===cid);if(!el){return}el.innerHTML='<option value="">اختر العنوان</option>'+(c?addresses(c).map(a=>`<option value="${a.key}" ${a.key===selected?"selected":""}>${esc(a.label)} — ${esc(addressText(a))}</option>`).join(""):"")}
function fillList(el,key,selected="",placeholder="اختر"){if(!el)return;let a=settings()[key]||[];let extra=selected&&!a.includes(selected)?[selected]:[];el.innerHTML=`<option value="">${placeholder}</option>`+a.concat(extra).map(x=>`<option value="${esc(x)}" ${x===selected?"selected":""}>${esc(x)}${extra.includes(x)?" (قديم/متوقف)":""}</option>`).join("")}
function dayKeyLocal(v){let d=parseLocalDateValue(v);return Number.isNaN(d.getTime())?"":`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
