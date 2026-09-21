/* app-notifications-bootstrap.js — الإشعارات (الملخص والفحص والتفعيل) + تهيئة تحميل الصفحة الرئيسية (DOMContentLoaded) + دعم تثبيت PWA. */
/* ---------------------------------------------------------------------
   الإشعارات: نجهّز ملخص صغير (مواعيد اليوم / المتأخر / قطع منخفضة) ونحفظه
   في IndexedDB (notif-shared.js) عشان الـ Service Worker يقدر يقرأه وقت
   الفحص في الخلفية، ونعمل كمان فحص فوري كل ما التطبيق يتفتح.
--------------------------------------------------------------------- */
async function updateNotificationSnapshot(){
  if(typeof notifSet!=="function")return;
  let r=arr(K.r),p=arr(K.p);let today=dayKeyLocal(new Date());
  let openOrders=r.filter(x=>x.status!=="مكتمل"&&x.status!=="ملغي");
  let todayList=openOrders.filter(x=>x.visit&&dayKeyLocal(x.visit)===today).map(x=>x.id);
  let overdueList=openOrders.filter(x=>x.visit&&dayKeyLocal(x.visit)<today).map(x=>x.id);
  let lowStockList=p.filter(x=>+x.qty<=+x.min).map(x=>x.id);
  let backupOverdue=typeof daysSinceLastBackup==="function"&&(daysSinceLastBackup()===null||daysSinceLastBackup()>=14);
  await notifSet("snapshot",{generatedAt:new Date().toISOString(),today:todayList,overdue:overdueList,lowStock:lowStockList,backupOverdue});
}
async function checkNotificationsNow(){
  if(localStorage.getItem("wf_notif_enabled")!=="1")return;
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  if(!("serviceWorker" in navigator))return;
  let today=dayKeyLocal(new Date());
  let last=await notifGet("lastNotifiedDate");
  if(last===today)return;
  let snap=await notifGet("snapshot");if(!snap)return;
  let reg=await navigator.serviceWorker.ready;let shown=false;
  if(snap.today&&snap.today.length){reg.showNotification("📅 مواعيد اليوم",{body:`لديك ${snap.today.length} زيارة/زيارات اليوم.`,icon:"./icon-192-v11-47.png",tag:"wf-today",data:{url:"./requests.html?bucket=today"}});shown=true}
  if(snap.overdue&&snap.overdue.length){reg.showNotification("⚠️ أوامر متأخرة",{body:`يوجد ${snap.overdue.length} أمر متأخر يحتاج متابعة.`,icon:"./icon-192-v11-47.png",tag:"wf-overdue",data:{url:"./requests.html?bucket=overdue"}});shown=true}
  if(snap.lowStock&&snap.lowStock.length){reg.showNotification("📉 قطع منخفضة",{body:`يوجد ${snap.lowStock.length} صنف وصل إلى الحد الأدنى في المخزن.`,icon:"./icon-192-v11-47.png",tag:"wf-lowstock",data:{url:"./inventory.html?bucket=low"}});shown=true}
  if(snap.backupOverdue){reg.showNotification("💾 نسخة احتياطية",{body:"فات وقت طويل من غير نسخة احتياطية من بيانات الورشة.",icon:"./icon-192-v11-47.png",tag:"wf-backup",data:{url:"./settings.html#backup-restore"}});shown=true}
  if(shown)await notifSet("lastNotifiedDate",today);
}
async function enableNotifications(){
  if(!("Notification" in window)||!("serviceWorker" in navigator)){alert("هذا المتصفح لا يدعم الإشعارات، للأسف.");return renderNotifSettings()}
  let perm=await Notification.requestPermission();
  if(perm!=="granted"){alert("يلزم السماح بإذن الإشعارات من المتصفح حتى تعمل.");return renderNotifSettings()}
  localStorage.setItem("wf_notif_enabled","1");
  try{
    let reg=await navigator.serviceWorker.ready;
    if("periodicSync" in reg && "permissions" in navigator){
      try{let status=await navigator.permissions.query({name:"periodic-background-sync"});
        if(status.state==="granted")await reg.periodicSync.register("workshop-check",{minInterval:12*60*60*1000});
      }catch(e){}
    }
    await updateNotificationSnapshot();await checkNotificationsNow();
  }catch(e){}
  renderNotifSettings();
}
async function disableNotifications(){
  localStorage.setItem("wf_notif_enabled","0");
  try{let reg=await navigator.serviceWorker.ready;if(reg.periodicSync)await reg.periodicSync.unregister("workshop-check")}catch(e){}
  renderNotifSettings();
}
async function renderNotifSettings(){
  let el=document.getElementById("notifSettings");if(!el)return;
  let supported="Notification" in window && "serviceWorker" in navigator;
  let periodicSupported=false;
  if(supported){try{let reg=await navigator.serviceWorker.ready;periodicSupported="periodicSync" in reg}catch(e){}}
  let enabled=supported&&localStorage.getItem("wf_notif_enabled")==="1"&&Notification.permission==="granted";
  el.innerHTML=!supported
    ?`<p class="hint">⚠️ المتصفح أو الجهاز ده مش بيدعم الإشعارات (شائع على آيفون Safari). هيشتغل النظام عادي من غيرها.</p>`
    :`<p class="hint">${enabled?"🔔 الإشعارات مفعّلة على هذا الجهاز.":"🔕 الإشعارات غير مفعّلة حاليًا."}</p>
      <p class="hint">${periodicSupported?"✅ هيحاول يبعتلك تنبيه حتى لو التطبيق مقفول (بشرط يكون مثبت على الشاشة الرئيسية)، بس التوقيت مش مضمون بالظبط — المتصفح هو اللي بيحدد الموعد المناسب حسب استخدامك للتطبيق.":"ℹ️ هيشتغل بس وانت فاتح التطبيق (هيبقى فيه تنبيه فوري أول ما تفتحه لو فيه مواعيد اليوم أو أوامر متأخرة أو قطع منخفضة)."}</p>
      <button type="button" class="${enabled?"secondary":"primary"}" data-wf-event="click" data-wf-code="${enabled?"disableNotifications()":"enableNotifications()"}">${enabled?"🔕 إيقاف الإشعارات":"🔔 تفعيل الإشعارات"}</button>`;
}
if("serviceWorker" in navigator){
  navigator.serviceWorker.addEventListener("message",e=>{
    if(e.data&&e.data.type==="GO_TO"&&e.data.url)location.href=e.data.url;
  });
}
document.addEventListener("DOMContentLoaded",()=>{updateNotificationSnapshot().then(checkNotificationsNow);renderNotifSettings()});
document.addEventListener('DOMContentLoaded',()=>setTimeout(setupQuickForms,0));


// V11.1 PWA: install support + offline registration. This does not touch localStorage data.
(function setupPWA(){
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferredPrompt=e;
    const btn=document.getElementById('installAppBtn');
    if(btn) btn.classList.remove('hidden');
  });
  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    const btn=document.getElementById('installAppBtn');
    if(btn){btn.textContent='✅ تم التثبيت';btn.disabled=true;}
  });
  window.installWorkshopApp=async function(){
    if(!deferredPrompt){alert('التثبيت متاح من قائمة المتصفح إذا لم يظهر زر التثبيت تلقائيًا.');return;}
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt=null;
  };
  if('serviceWorker' in navigator){
    // شريط تنبيه بسيط لما يبقى فيه تحديث جديد للنظام جاهز ومستني بس التبويب/التطبيق
    // يتقفل ويتفتح تاني — من غير التنبيه ده، أي تعديل في الكود (زي إصلاحات
    // النسخة الاحتياطية التلقائية) ممكن يفضل "مش ظاهر" عند المستخدم لحد ما
    // يعمل إغلاق كامل للتطبيق بنفسه من غير ما يعرف إنه محتاج كده أصلًا.
    function announceWorkshopUpdate(){
      if(document.getElementById('wf-update-banner'))return;
      const bar=document.createElement('div');
      bar.id='wf-update-banner';
      bar.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:999999;background:#0b3d91;color:#fff;padding:10px 14px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;font:600 14px system-ui;box-shadow:0 -2px 10px rgba(0,0,0,.25)';
      bar.innerHTML='<span>🔄 فيه تحديث جديد للنظام جاهز.</span><button type="button" style="background:#fff;color:#0b3d91;border:0;border-radius:6px;padding:6px 14px;font-weight:700;cursor:pointer">تحديث الآن</button>';
      bar.querySelector('button').addEventListener('click',()=>location.reload());
      (document.body||document.documentElement).appendChild(bar);
    }
    window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=11.70', {updateViaCache: 'none'}).then(reg=>{
      if(reg.waiting&&navigator.serviceWorker.controller)announceWorkshopUpdate();
      reg.addEventListener('updatefound',()=>{
        const nw=reg.installing;if(!nw)return;
        nw.addEventListener('statechange',()=>{if(nw.state==='installed'&&navigator.serviceWorker.controller)announceWorkshopUpdate()});
      });
    }).catch(err=>console.warn('PWA service worker:',err)));
  }
  window.addEventListener('online',()=>document.documentElement.dataset.network='online');
  window.addEventListener('offline',()=>document.documentElement.dataset.network='offline');
  document.documentElement.dataset.network=navigator.onLine?'online':'offline';
})();
