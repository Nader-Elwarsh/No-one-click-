/* app-delete-tools.js — أدوات حذف فردي/جماعي للعملاء والأجهزة وأوامر الشغل. */
function cleanupRequestRecordings(requests){if(!window.ImageStore?.delete)return;(requests||[]).forEach(r=>(r.callRecordings||[]).forEach(cr=>{if(cr?.ref)window.ImageStore.delete(cr.ref)}))}
function cleanupDevicePhotos(devices){if(!window.ImageStore?.delete)return;(devices||[]).forEach(d=>{if(d.photo)window.ImageStore.delete(d.photo)})}
function requestPartsToRestore(requests){return(requests||[]).filter(r=>r.status!=="ملغي")}
function walletEntriesAfterRemovingRequests(requestIds){
  const ids=new Set((requestIds||[]).map(String));
  return arr(K.wtx).map(x=>{
    const ref=String(x.refKey||"");
    return (ref.startsWith("order-deposit-")||ref.startsWith("order-final-"))&&ids.has(ref.replace(/^order-(?:deposit|final)-/,""))?{...x,deleted:true}:x;
  });
}
function restorePartsIntoStock(stock,requests){
  requestPartsToRestore(requests).forEach(r=>(r.parts||[]).forEach(x=>{
    const p=stock.find(z=>z.id===x.partId);if(p)p.qty=(+p.qty||0)+(+x.qty||0);
  }));
}
function deleteCustomerRecord(cid){
  const c=arr(K.c).find(x=>x.id===cid);if(!c)return;
  if(arr(K.d).some(d=>d.customerId===cid)||arr(K.r).some(r=>r.customerId===cid)){alert("لا يمكن حذف العميل الآن لأن له أجهزة أو أوامر شغل مرتبطة به. احذف البيانات المرتبطة أولاً أو استخدم الحذف العام.");return}
  if(!confirm(`حذف العميل «${c.name||""}» نهائيًا؟`))return;
  if(!commitStorage({[K.c]:arr(K.c).filter(x=>x.id!==cid)}))return;
  window.auditLog?.("حذف", "عميل", cid, c.name||"");
  renderCustomers();
}
function deleteDeviceRecord(did){
  const d=arr(K.d).find(x=>x.id===did);if(!d)return;
  if(arr(K.r).some(r=>r.deviceId===did)){alert("لا يمكن حذف الجهاز لأنه مرتبط بأمر شغل. احذف أمر الشغل المرتبط أولًا أو استخدم الحذف العام.");return}
  if(!confirm("حذف الجهاز نهائيًا؟"))return;
  if(!commitStorage({[K.d]:arr(K.d).filter(x=>x.id!==did)}))return;
  if(window.ImageStore?.delete&&d.photo)window.ImageStore.delete(d.photo);window.auditLog?.("حذف", "جهاز", did, `${d.type||""} ${d.brand||""}`);renderDevices();
}
function deleteRequestRecord(rid){
  const r=arr(K.r).find(x=>x.id===rid);if(!r)return;
  if(r.closed||r.paid){
    if(!confirm(`⚠️ أمر الشغل ${r.no||""} مغلق أو مدفوع بالكامل. حذفه هيشيله نهائيًا هو وأي حركة حسابات أو مخزون مرتبطة بيه من التقارير. متأكد إنك عايز تحذفه؟`))return;
  }
  if(!confirm(`حذف أمر الشغل ${r.no||""} نهائيًا؟`))return;
  const stock=arr(K.p),requests=arr(K.r);
  const partsDelta=(r.parts||[]).filter(x=>!x.external&&x.partId).map(x=>({partId:x.partId,qty:+x.qty||0}));
  restorePartsIntoStock(stock,[r]);
  const removedMoves=arr(K.m).filter(x=>x.requestId===rid);
  const ok=commitStorage({[K.p]:stock,[K.m]:arr(K.m).filter(x=>x.requestId!==rid),[K.r]:requests.filter(x=>x.id!==rid),[K.wtx]:walletEntriesAfterRemovingRequests([rid])});
  if(!ok)return;
  cleanupRequestRecordings([r]);window.auditLog?.("حذف", "أمر شغل", rid, r.no||"");
  pushToTrash("request",`أمر شغل ${r.no||""}`,{request:r,moves:removedMoves,partsDelta,walletRefKeys:walletRefKeysForOrders([rid])});
  renderRequests();
  if(document.getElementById("requestProfile"))location.href="requests.html";
}
function deleteAllCustomers(){
  const c=arr(K.c);if(!c.length)return alert("لا توجد بيانات عملاء للحذف.");
  if(!confirm(`حذف جميع العملاء (${c.length}) وما يرتبط بهم من أجهزة وأوامر شغل؟`))return;
  if(!confirm("تأكيد نهائي: لا يمكن التراجع عن الحذف."))return;
  const devices=arr(K.d),requests=arr(K.r),stock=arr(K.p);restorePartsIntoStock(stock,requests);
  const ok=commitStorage({[K.p]:stock,[K.c]:[],[K.d]:[],[K.r]:[],[K.m]:[],[K.wtx]:walletEntriesAfterRemovingRequests(requests.map(r=>r.id))});
  if(!ok)return;
  cleanupDevicePhotos(devices);cleanupRequestRecordings(requests);renderCustomers?.();renderDevices?.();renderRequests?.();alert("تم حذف جميع العملاء والبيانات المرتبطة بهم.");
}
function deleteAllDevices(){
  const d=arr(K.d);if(!d.length)return alert("لا توجد بيانات أجهزة للحذف.");
  if(!confirm(`حذف جميع الأجهزة (${d.length}) وأوامر الشغل المرتبطة بها؟`))return;
  if(!confirm("تأكيد نهائي: لا يمكن التراجع عن الحذف."))return;
  const requests=arr(K.r),stock=arr(K.p);restorePartsIntoStock(stock,requests);
  const ok=commitStorage({[K.p]:stock,[K.d]:[],[K.r]:[],[K.m]:[],[K.wtx]:walletEntriesAfterRemovingRequests(requests.map(r=>r.id))});
  if(!ok)return;
  cleanupDevicePhotos(d);cleanupRequestRecordings(requests);renderDevices?.();renderRequests?.();alert("تم حذف جميع الأجهزة وأوامر الشغل المرتبطة بها.");
}
function deleteAllRequests(){
  const r=arr(K.r);if(!r.length)return alert("لا توجد أوامر شغل للحذف.");
  if(!confirm(`حذف جميع أوامر الشغل (${r.length}) وإرجاع قطع الغيار المصروفة للمخزن؟`))return;
  if(!confirm("تأكيد نهائي: لا يمكن التراجع عن الحذف."))return;
  const stock=arr(K.p);restorePartsIntoStock(stock,r);
  const ok=commitStorage({[K.p]:stock,[K.r]:[],[K.m]:[],[K.wtx]:walletEntriesAfterRemovingRequests(r.map(x=>x.id))});
  if(!ok)return;
  cleanupRequestRecordings(r);renderRequests?.();renderDash?.();monthReport?.();alert("تم حذف جميع أوامر الشغل وإرجاع القطع للمخزن.");
}
function resolveRequestAddress(r){const c=arr(K.c).find(x=>x.id===r.customerId);if(!c)return{};const list=addresses(c);return list.find(a=>a.key===r.addressKey)||list[0]||{}}

// خط سير اليوم: تجميع أوامر الشغل التي لها موعد زيارة حسب المركز والقرية.
function requestRouteAddress(r){return resolveRequestAddress(r)}
