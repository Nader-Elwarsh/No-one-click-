/* app-quick-add.js — نماذج الإضافة السريعة (عميل/جهاز/أمر شغل) من داخل الصفحات الأخرى، وربطها بتهيئة أوامر الشغل والأجهزة. */
function toggleQuickOrderPanel(){
  let body=document.getElementById("quickOrderBody"),btn=document.getElementById("quickOrderToggleBtn");
  if(!body||!btn)return;
  let opening=body.classList.contains("hidden");
  body.classList.toggle("hidden");
  btn.textContent=opening?"⚡ أمر شغل سريع (دوس للإغلاق)":"⚡ أمر شغل سريع (دوس للفتح)";
  btn.classList.toggle("quick-order-open",opening);
  if(opening)setTimeout(()=>body.scrollIntoView({behavior:"smooth",block:"nearest"}),50);
}
function initQuickOrder(){
  let sel=document.getElementById("qoCustomer");if(!sel)return;
  fillCustomerAutocomplete("qoCustomer");
  fillDevice(document.getElementById("qoDevice"),"");
  sel.onchange=()=>fillDevice(document.getElementById("qoDevice"),sel.value);
  setupQuickForms();
}

/* حركة محفظة سريعة من الرئيسية — نفس فكرة "أمر شغل سريع" بالظبط بس للمحافظ. */
function toggleQuickWalletPanel(){
  let body=document.getElementById("quickWalletBody"),btn=document.getElementById("quickWalletToggleBtn");
  if(!body||!btn)return;
  let opening=body.classList.contains("hidden");
  body.classList.toggle("hidden");
  btn.textContent=opening?"💳 حركة محفظة سريعة (دوس للإغلاق)":"💳 حركة محفظة سريعة (دوس للفتح)";
  btn.classList.toggle("quick-order-open",opening);
  if(opening)setTimeout(()=>body.scrollIntoView({behavior:"smooth",block:"nearest"}),50);
}
function initQuickWallet(){
  let walletEl=document.getElementById("qwWallet"),catEl=document.getElementById("qwCategory");
  if(!walletEl)return;
  let s=settings();
  walletEl.innerHTML=(s.wallets||[]).map(w=>`<option>${esc(w)}</option>`).join("");
  catEl.innerHTML=(s.walletCategories||[]).map(c=>`<option>${esc(c)}</option>`).join("");
}
function quickAddWalletTx(type){
  if(typeof addWalletManual!=="function")return;
  let entry=addWalletManual(type,"qw");
  if(!entry)return;
  document.getElementById("qwAmount").value="";
  document.getElementById("qwReason").value="";
  if(typeof renderWallets==="function")renderWallets();
}
function saveQuickCustomerHome(){
  let name=document.getElementById('qoName')?.value.trim(),phone=document.getElementById('qoPhone')?.value.trim();
  if(!name||!phone)return alert('اكتب اسم العميل والتليفون أولاً.');
  let duplicate=duplicateCustomerByPhone(phone);
  if(duplicate&&!confirm(`⚠️ الرقم مسجل بالفعل للعميل: ${duplicate.name||'—'}.\n\nهل تريد إنشاء عميل آخر بنفس الرقم؟`))return;
  let c={id:id(),name,phone,mainAddress:{center:qoCenter.value,village:qoVillage.value,address:"",street:(qoStreet.value||"").trim()},extraAddress:{},createdAt:new Date().toISOString()};
  let a=arr(K.c);a.push(c);if(!saveJSONSafe(K.c,a))return;
  fillCustomerAutocomplete("qoCustomer",c.id);
  fillDevice(document.getElementById("qoDevice"),c.id,"");
  closeQuickAdd('qoCustomerBox');
  document.getElementById('qoCustomerBox').querySelectorAll('input').forEach(x=>x.value='');
}
function saveQuickDeviceHome(){
  let cid=document.getElementById("qoCustomer")?.value;
  if(!cid)return alert('اختر العميل أولاً أو أضفه من الزر بجواره.');
  let d={id:id(),customerId:cid,addressKey:'main',type:qoType.value,category:qoCategory.value,brand:qoBrand.value,model:(qoModel.value||"").trim(),desc:"",photo:"",createdAt:new Date().toISOString()};
  if(!d.type||!d.category||!d.brand)return alert('اختر نوع الجهاز والتصنيف والماركة.');
  let a=arr(K.d);a.push(d);if(!saveJSONSafe(K.d,a))return;
  fillDevice(document.getElementById("qoDevice"),cid,d.id);
  closeQuickAdd('qoDeviceBox');
}
function quickCreateRequest(){
  let cid=document.getElementById("qoCustomer")?.value,did=document.getElementById("qoDevice")?.value,fault=(document.getElementById("qoFault")?.value||"").trim();
  if(!cid)return alert("اختر العميل أولاً.");
  if(!did)return alert("اختر الجهاز أولاً.");
  if(!fault)return alert("اكتب وصف العطل.");
  let s=settings();
  let r={id:id(),no:orderNo(),customerId:cid,deviceId:did,addressKey:"main",visit:"",status:"جديد",executionPlace:(s.executionPlaces||[])[0]||"عند العميل",workshopStatus:(s.workshopStatuses||[])[0]||"غير مطلوب",partsWaiting:false,tag:"",fault,work:"",labor:0,parts:[],partsTotal:0,partsCost:0,total:0,deposit:0,remain:0,closed:false,createdAt:new Date().toISOString()};
  recordStatusHistory(r,"",r.status);
  applyStatusTimestamp(r,r.status);
  if(!saveJSONSafe(K.r,arr(K.r).concat(r)))return;
  location.href=`request.html?id=${r.id}`;
}

// روابط اتصال/واتساب موحدة لأي رقم تليفون في النظام.
function waNumber(phone){
  let d=String(phone||"").replace(/[^\d]/g,"");
  if(!d)return "";
  if(d.startsWith("0020"))d=d.slice(2);
  if(d.startsWith("00"))d=d.slice(2);
  if(d.startsWith("0"))d="20"+d.slice(1);
  else if(!d.startsWith("20"))d="20"+d;
  return d;
}
function contactLinksHtml(phone){
  if(!phone)return "—";
  let wa=waNumber(phone);
  // target="_blank" ضروري هنا: لما التطبيق يبقى مثبّت من كروم (PWA/WebAPK)،
  // فتح tel: في نفس نافذة التطبيق (زي ما كانت قبل كده) بيدي خطأ
  // ERR_UNKNOWN_URL_SCHEME لأن نافذة التطبيق المثبّتة ما بتقدرش تسلّم رابط
  // بروتوكول غير http/https لتطبيق الاتصال بنفسها؛ فتحه كـ"نافذة/تبويب
  // جديد" بيخلي المتصفح يسلّمه لنظام أندرويد بشكل صحيح، وده اللي بيخلي
  // رابط الواتساب (اللي أصلاً عنده target="_blank") شغال من غير مشاكل.
  // event.stopPropagation() ضروري هنا كمان: الرقم ده بيتعرض جوه كروت قابلة
  // للضغط بالكامل (زي كارت "الدور عليك دلوقتي" في خط السير) اللي عندها
  // onclick بيفتح صفحة الأمر. من غير stopPropagation، الضغط على الرقم كان
  // بيفتح تبويب اتصال/واتساب جديد وفي نفس الوقت يودّي التبويب الحالي لصفحة
  // الأمر (لأن الضغطة بتتصعّد لكارت الأب)، فيبقى عندك تنقل مش متوقع. دلوقتي
  // الضغط على الرقم بيعمل الاتصال/واتساب بس، من غير ما يفتح صفحة الأمر.
  return `<a class="tel-link" href="tel:${esc(phone)}" target="_blank" rel="noopener" data-wf-event="click" data-wf-code="event.stopPropagation()">📲 ${esc(phone)}</a>${wa?` <a class="wa-link" href="https://wa.me/${wa}" target="_blank" rel="noopener" data-wf-event="click" data-wf-code="event.stopPropagation()">💬 واتساب</a>`:""}`;
}

document.addEventListener("DOMContentLoaded",async()=>{
  // لازم الترحيل (migrations.js) يخلص قبل أول رندر بيقرأ حقل photo،
  // عشان ميحصلش سباق بين "لسه base64" و"بقى مرجع IndexedDB".
  if(window.runMigrations){try{await window.runMigrations()}catch(e){console.error("[app] فشل تشغيل الترحيلات",e)}}
  settings();normalizeOrderNumbers();renderDash();monthReport();document.getElementById("reportMonth")?.addEventListener("change",financeReport);document.getElementById("reportWeek")?.addEventListener("change",financeReport);initCustomers();customerProfile();initDevices();deviceProfile();initRequests();requestProfile();initParts();partProfile();(typeof initInventoryBulk==="function")&&initInventoryBulk();initTasks();settingsPage();renderTreasury();renderWallets();renderWalletDetail();initQuickOrder();initQuickWallet();initRoutePage();initFollowupPage();initFaultCodes();faultCodeProfile();initWarrantyPage?.();openSettingsPanelFromHash?.()
})

// Quick-create relations: create the missing entity without leaving the current workflow.
function setupQuickLocation(prefix){
  let center=document.getElementById(prefix+'Center'), village=document.getElementById(prefix+'Village');
  if(!center||!village)return;
  fillListSearch(prefix+'Center','center'); fillListSearch(prefix+'Village','village','',prefix+'Center');
  center.onchange=()=>fillListSearch(prefix+'Village','village','',prefix+'Center');
}

function saveQuickCustomer(){
  let name=document.getElementById('qcName')?.value.trim(),phone=document.getElementById('qcPhone')?.value.trim();
  if(!name||!phone)return alert('اكتب اسم العميل والتليفون أولاً.');
  let duplicate=duplicateCustomerByPhone(phone);if(duplicate&&!confirm(`⚠️ الرقم مسجل بالفعل للعميل: ${duplicate.name||'—'}.\n\nهل تريد إنشاء عميل آخر بنفس الرقم؟`))return;
  let c={id:id(),name,phone,mainAddress:{center:qcCenter.value,village:qcVillage.value,address:"",street:qcStreet.value.trim()},extraAddress:{},createdAt:new Date().toISOString()};
  let a=arr(K.c);a.push(c);if(!saveJSONSafe(K.c,a))return;
  fillCustomerAutocomplete("rCustomer",c.id);fillAddress(rAddress,c.id,'main');
  closeQuickAdd('quickCustomerBox');
  document.getElementById('quickCustomerBox').querySelectorAll('input').forEach(x=>x.value='');
  fillDevice(rDevice,c.id,'');
}
function saveQuickDevice(){
  let cid=rCustomer.value;if(!cid)return alert('اختر العميل أولاً أو أضفه من الزر بجواره.');
  let d={id:id(),customerId:cid,addressKey:rAddress.value||'main',type:qdType.value,category:qdCategory.value,brand:qdBrand.value,model:qdModel.value.trim(),desc:qdDesc.value.trim(),photo:"",createdAt:new Date().toISOString()};
  if(!d.type||!d.category||!d.brand)return alert('اختر نوع الجهاز والتصنيف والماركة.');
  let a=arr(K.d);a.push(d);if(!saveJSONSafe(K.d,a))return;
  fillDevice(rDevice,cid,d.id);closeQuickAdd('quickDeviceBox');
}
function saveDeviceCustomer(){
  let name=dcName.value.trim(),phone=dcPhone.value.trim();if(!name||!phone)return alert('اكتب اسم العميل والتليفون أولاً.');
  let duplicate=duplicateCustomerByPhone(phone);if(duplicate&&!confirm(`⚠️ الرقم مسجل بالفعل للعميل: ${duplicate.name||'—'}.\n\nهل تريد إنشاء عميل آخر بنفس الرقم؟`))return;
  let c={id:id(),name,phone,mainAddress:{center:dcCenter.value,village:dcVillage.value,address:"",street:dcStreet.value.trim()},extraAddress:{},createdAt:new Date().toISOString()};
  let a=arr(K.c);a.push(c);if(!saveJSONSafe(K.c,a))return;fillCustomerAutocomplete("dCustomer",c.id);fillAddress(dAddress,c.id,'main');closeQuickAdd('quickDeviceCustomerBox');
}
function setupQuickForms(){
  if(document.getElementById('quickCustomerBox'))setupQuickLocation('qc');
  if(document.getElementById('quickDeviceCustomerBox'))setupQuickLocation('dc');
  if(document.getElementById('qdType')){fillListSearch('qdType','type');fillListSearch('qdBrand','brand');qdType.onchange=()=>fillListSearch('qdCategory','category','','qdType');fillListSearch('qdCategory','category','','qdType')}
  if(document.getElementById('qoCustomerBox'))setupQuickLocation('qo');
  if(document.getElementById('qoType')){fillListSearch('qoType','type');fillListSearch('qoBrand','brand');qoType.onchange=()=>fillListSearch('qoCategory','category','','qoType');fillListSearch('qoCategory','category','','qoType')}
}
const _oldInitRequests=initRequests;
initRequests=function(){_oldInitRequests();setupQuickForms()}
const _oldInitDevices=initDevices;
initDevices=function(){_oldInitDevices();setupQuickForms()}
