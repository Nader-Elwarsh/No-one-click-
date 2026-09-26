/* app-settings.js — صفحة الإعدادات العامة: القوائم القابلة للتعديل والترتيب بالسحب، ثيم خط السير، المراكز/الأنواع/الماركات/تصنيفات القطع. */
// فتح وتمرير الصفحة لقسم إعدادات معيّن بناءً على location.hash (زي
// settings.html#brands)، مستخدم من نتيجة البحث الشامل (global-search.js)
// عشان تودّي المستخدم لنفس القسم بالظبط بدل ما يدوّر يدويًا وسط كل
// الإعدادات. بتشتغل مع أي section لها id سواء كانت ثابتة في settings.html
// أو متولّدة ديناميكيًا هنا (زي wa-templates-panel وsettings-list-*).
// إجبار التطبيق يجيب آخر نسخة فورًا: بيمسح كل الكاش القديم (Service
// Worker) ويسيب التسجيل يبني كاش جديد من الصفر على أول تحميل تاني، بدل
// ما ينتظر آلية التحديث الخلفية العادية (اللي بتاخد زيارتين لتظهر). ده
// الحل المضمون لما تعمل تعديل وميظهرش فورًا في التطبيق على الموبايل.
async function forceAppUpdate(){
  if(!confirm("هيتم تحديث التطبيق وإعادة تحميل الصفحة. متابعة؟"))return;
  try{
    if("serviceWorker" in navigator){
      let regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
    if("caches" in window){
      let keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
  }catch(e){console.warn("تعذر مسح الكاش بالكامل",e)}
  location.reload();
}
// صفحة الضمان المستقلة (warranty.html): قائمة العملاء اللي عليهم ضمان
// سارٍ دايمًا ظاهرة فوق (مش محتاجة تدوس على حاجة عشان تشوفها)، وإعدادات
// الضمان (تفعيل/مدة/شروط) موجودة تحتها في نفس الصفحة كقسم قابل للطي —
// وزرار ⚙️ في أعلى الصفحة بيوديك لنفس الإعدادات دي كمان لو حبيت من صفحة
// الإعدادات العامة.
function initWarrantyPage(){
  let listHost=document.getElementById("warrantyActiveList");
  if(!listHost)return;
  listHost.innerHTML=activeWarrantiesListHtml();
  let settingsHost=document.getElementById("warrantySettingsHost");
  if(settingsHost)settingsHost.innerHTML=warrantySettingHtml();
}
function openSettingsPanelFromHash(){
  let hash=(location.hash||"").replace(/^#/,"");
  if(!hash)return;
  let target=document.getElementById(hash);
  if(!target)return;
  // افتح details جوه الهدف نفسه (زي section#brands اللي فيها details
  // واحدة) وكمان كل details أعلى منه في الشجرة (زي صف داخل سلة المهملات
  // جوه قسم "سلة المهملات" نفسه) عشان العنصر يبان فعلاً مش يفضل مطوي
  // جوه accordion مقفول.
  let inner=target.querySelector("details");
  if(inner)inner.open=true;
  let el=target;
  while(el){ if(el.tagName==="DETAILS")el.open=true; el=el.parentElement; }
  requestAnimationFrame(()=>{
    target.scrollIntoView({behavior:"smooth",block:"center"});
    target.classList.add("hash-highlight");
    setTimeout(()=>target.classList.remove("hash-highlight"),2200);
  });
}
if(typeof window!=="undefined")window.addEventListener("hashchange",()=>openSettingsPanelFromHash());
function listEditorHtml(title,key,icon){
  let a=settings()[key]||[];
  return `<section class="panel setting-list-panel" id="settings-list-${esc(key)}"><details><summary>${icon} ${title}</summary><div class="panel-body"><div class="page-head-actions"><button class="secondary mini-action" data-wf-event="click" data-wf-code="addSettingItem('${key}')">➕ إضافة</button></div><div class="drag-hint">☷ اسحب أي عنصر وأفلته في المكان المطلوب</div><div id="list-${key}" class="sortable-list">${a.map((x,i)=>`<div class="setting-row drag-item" draggable="true" data-drag-kind="list" data-drag-key="${esc(key)}" data-drag-index="${i}"><span class="drag-handle" title="سحب للترتيب">☷</span><span class="setting-name"><b>${i+1}.</b> ${esc(x)}</span><span class="compact-actions"><input class="order-number" type="number" min="1" max="${a.length}" value="${i+1}" title="رقم الترتيب" data-wf-event="change" data-wf-code="setListPosition('${key}',${i},this.value)"><button class="secondary mini-action" data-wf-event="click" data-wf-code="renameSettingItem('${key}',${i})">✏️</button><button class="secondary mini-action" data-wf-event="click" data-wf-code="deleteSettingItem('${key}',${i})">🗑️</button></span></div>`).join("")}</div></div></details></section>`
}
function orderTagsSettingHtml(){
  let s=settings(),active=s.orderTags||[],disabled=s.orderTagsDisabled||[];
  let activeRows=active.map((x,i)=>`<div class="setting-row"><span class="setting-name"><b>${i+1}.</b> ${esc(x)}</span><span class="compact-actions"><button class="secondary mini-action" data-wf-event="click" data-wf-code="moveOrderTag(${i},-1)" title="لأعلى">⬆️</button><button class="secondary mini-action" data-wf-event="click" data-wf-code="moveOrderTag(${i},1)" title="لأسفل">⬇️</button><button class="secondary mini-action" data-wf-event="click" data-wf-code="renameOrderTag('${escAttr(x)}')">✏️</button><button class="secondary mini-action" data-wf-event="click" data-wf-code="disableOrderTag('${escAttr(x)}')" title="إيقاف الاستخدام مؤقتًا بدون حذف">⏸️</button><button class="secondary mini-action" data-wf-event="click" data-wf-code="deleteOrderTag('${escAttr(x)}')">🗑️</button></span></div>`).join("");
  let disabledRows=disabled.map(x=>`<div class="setting-row setting-row-disabled"><span class="setting-name">🚫 ${esc(x)} <small>(متوقف)</small></span><span class="compact-actions"><button class="secondary mini-action" data-wf-event="click" data-wf-code="enableOrderTag('${escAttr(x)}')" title="إعادة التفعيل">▶️ تفعيل</button><button class="secondary mini-action" data-wf-event="click" data-wf-code="deleteOrderTag('${escAttr(x)}')">🗑️</button></span></div>`).join("");
  return `<section class="panel setting-list-panel" id="order-tags-panel"><details><summary>🏷️ التصنيف اليدوي لأوامر الشغل</summary><div class="panel-body"><div class="page-head-actions"><button class="secondary mini-action" data-wf-event="click" data-wf-code="addOrderTag()">➕ إضافة</button></div><div class="hint">التصنيفات دي بتظهر كخيارات في "التصنيف اليدوي" جوه كل أمر شغل. أوقف أي تصنيف (⏸️) من غير ما تحذفه لو مش هتستخدمه دلوقتي بس عايز تحتفظ بيه — التصنيف الموقوف بيفضل ظاهر في أي أمر شغل قديم مستخدمه بالفعل، بس مش هيبقى خيار متاح لأمر جديد لحد ما ترجّعه (▶️). الحذف النهائي (🗑️) بيشيله من القايمة تمامًا.</div>${activeRows||"<div class='hint'>لا توجد تصنيفات مضافة بعد.</div>"}${disabled.length?`<div class="setting-subhead">⏸️ متوقفة مؤقتًا</div>${disabledRows}`:""}</div></details></section>`;
}
function reorderSetting(kind,key,from,to){
  let s=settings();
  if(from===to||from<0||to<0)return;
  if(kind==='types'){
    let entries=Object.entries(s.types||{});if(from>=entries.length||to>=entries.length)return;
    let item=entries.splice(from,1)[0];entries.splice(to,0,item);s.types=Object.fromEntries(entries);
  }else{
    let a=kind==='villages'?(s.villages[key]||[]):(s[kind]||[]);
    if(from>=a.length||to>=a.length)return;
    let item=a.splice(from,1)[0];a.splice(to,0,item);
    if(kind==='villages')s.villages[key]=a;else s[kind]=a;
  }
  put(K.s,s);settingsPage();
}
function setListPosition(key,i,pos){
  let s=settings(),a=[...(s[key]||[])],n=parseInt(pos,10);
  if(!Number.isFinite(n))return settingsPage();n=Math.max(1,Math.min(a.length,n));
  if(i<0||i>=a.length||i===n-1)return;
  let item=a.splice(i,1)[0];a.splice(n-1,0,item);s[key]=a;put(K.s,s);settingsPage();
}
function bindSortableSettings(){
  document.querySelectorAll('.drag-item[draggable="true"]').forEach(el=>{
    el.addEventListener('dragstart',e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',JSON.stringify({kind:el.dataset.dragKind,key:el.dataset.dragKey||'',index:+el.dataset.dragIndex}));el.classList.add('dragging')});
    el.addEventListener('dragend',()=>el.classList.remove('dragging'));
    el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drag-over');e.dataTransfer.dropEffect='move'});
    el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
    el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('drag-over');let raw=e.dataTransfer.getData('text/plain');if(!raw)return;try{let d=JSON.parse(raw);if(d.kind===el.dataset.dragKind&&(d.key||'')===(el.dataset.dragKey||''))reorderSetting(d.kind,d.kind==='villages'?d.key:(d.key||d.kind),d.index,+el.dataset.dragIndex)}catch(_){}});
  });
  // Touch/pointer fallback for phones where native HTML5 drag-and-drop is limited.
  document.querySelectorAll('.drag-handle').forEach(handle=>{
    let state=null;
    handle.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse')return;
      let row=handle.closest('.drag-item');if(!row)return;
      state={row,startX:e.clientX,startY:e.clientY,kind:row.dataset.dragKind,key:row.dataset.dragKey||'',index:+row.dataset.dragIndex,moved:false};
      handle.setPointerCapture?.(e.pointerId);row.classList.add('dragging');e.preventDefault();
    });
    handle.addEventListener('pointermove',e=>{
      if(!state)return;
      if(Math.abs(e.clientY-state.startY)>6)state.moved=true;
      if(!state.moved)return;
      let target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.drag-item');
      document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));
      if(target&&target!==state.row&&target.dataset.dragKind===state.kind&&(target.dataset.dragKey||'')===state.key)target.classList.add('drag-over');
      e.preventDefault();
    });
    handle.addEventListener('pointerup',e=>{
      if(!state)return;let target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.drag-item');
      let d=state;state=null;d.row.classList.remove('dragging');document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));
      if(target&&target!==d.row&&d.moved&&target.dataset.dragKind===d.kind&&(target.dataset.dragKey||'')===d.key)reorderSetting(d.kind,d.kind==='villages'?d.key:(d.key||d.kind),d.index,+target.dataset.dragIndex);
      e.preventDefault();
    });
    handle.addEventListener('pointercancel',()=>{if(state){state.row.classList.remove('dragging');state=null;document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'))}});
  });
}
function settingsPage(){
  if(!document.getElementById("centerSettings"))return;
  let s=settings();
  centerSettings.innerHTML=s.centers.map((c,i)=>`<div class="setting-row drag-item" draggable="true" data-drag-kind="centers" data-drag-index="${i}"><span class="drag-handle" title="سحب للترتيب">☷</span><span class="setting-name"><b>${i+1}. 📍 ${esc(c)}</b></span><span class="compact-actions"><input class="order-number" type="number" min="1" max="${s.centers.length}" value="${i+1}" title="رقم الترتيب" data-wf-event="change" data-wf-code="setListPosition('centers',${i},this.value)"><button class="secondary mini-action" data-wf-event="click" data-wf-code="renameCenter('${escAttr(c)}')">✏️</button><button class="secondary mini-action" data-wf-event="click" data-wf-code="deleteCenter('${escAttr(c)}')">🗑️</button></span></div><div class="village-box">${(s.villages[c]||[]).map((v,j)=>`<div class="village-row drag-item" draggable="true" data-drag-kind="villages" data-drag-key="${esc(c)}" data-drag-index="${j}"><span class="drag-handle" title="سحب للترتيب">☷</span><input class="order-number" type="number" min="1" max="${(s.villages[c]||[]).length}" value="${j+1}" title="رقم ترتيب القرية" data-wf-event="change" data-wf-code="setVillagePosition('${escAttr(c)}',${j},this.value)"><span class="village-name">${esc(v)}</span><span class="compact-actions"><button class="mini-action" title="تصنيف الخط: مدينة أو قرية — دوس للتبديل" data-wf-event="click" data-wf-code="toggleVillageGroup('${escAttr(c)}','${escAttr(v)}')">${villageGroupOf(c,v)==="city"?"🏙️":"🌾"}</button><button class="mini-action" title="تعديل الاسم" data-wf-event="click" data-wf-code="renameVillage('${escAttr(c)}','${escAttr(v)}')">✏️</button><button class="mini-action" title="حذف" data-wf-event="click" data-wf-code="deleteVillage('${escAttr(c)}','${escAttr(v)}')">🗑️</button></span></div>`).join("")}<button class="secondary mini-action" data-wf-event="click" data-wf-code="addVillage('${escAttr(c)}')">➕ قرية</button></div>`).join("");
  typeSettings.innerHTML=Object.entries(s.types).map(([t,c],i)=>`<div class="setting-row drag-item" draggable="true" data-drag-kind="types" data-drag-index="${i}"><span class="drag-handle" title="سحب للترتيب">☷</span><span class="setting-name"><b>${i+1}. ${esc(t)}</b></span><span class="compact-actions"><input class="order-number" type="number" min="1" max="${Object.keys(s.types).length}" value="${i+1}" title="رقم الترتيب" data-wf-event="change" data-wf-code="setTypePosition(${i},this.value)"><button class="secondary mini-action" data-wf-event="click" data-wf-code="renameType('${escAttr(t)}')">✏️</button><button class="secondary mini-action" data-wf-event="click" data-wf-code="deleteType('${escAttr(t)}')">🗑️</button></span></div><div class="hint type-options">${c.join("، ")||"لا توجد"} <button class="secondary mini-action" data-wf-event="click" data-wf-code="editTypeOptions('${escAttr(t)}')">✏️ تعديل التصنيفات</button></div>`).join("");
  brandSettings.innerHTML=s.brands.map((b,i)=>`<div class="setting-row drag-item" draggable="true" data-drag-kind="brands" data-drag-index="${i}"><span class="drag-handle" title="سحب للترتيب">☷</span><span class="setting-name"><b>${i+1}. ${esc(b)}</b></span><span class="compact-actions"><input class="order-number" type="number" min="1" max="${s.brands.length}" value="${i+1}" title="رقم الترتيب" data-wf-event="change" data-wf-code="setListPosition('brands',${i},this.value)"><button class="secondary mini-action" data-wf-event="click" data-wf-code="renameBrand('${escAttr(b)}')">✏️</button><button class="secondary mini-action" data-wf-event="click" data-wf-code="deleteBrand('${escAttr(b)}')">🗑️</button></span></div>`).join("");
  partCategorySettings.innerHTML=s.partCats.map((b,i)=>`<div class="setting-row drag-item" draggable="true" data-drag-kind="partCats" data-drag-index="${i}"><span class="drag-handle" title="سحب للترتيب">☷</span><span class="setting-name"><b>${i+1}. ${esc(b)}</b></span><span class="compact-actions"><input class="order-number" type="number" min="1" max="${s.partCats.length}" value="${i+1}" title="رقم الترتيب" data-wf-event="change" data-wf-code="setListPosition('partCats',${i},this.value)"><button class="secondary mini-action" data-wf-event="click" data-wf-code="renamePartCategory('${escAttr(b)}')">✏️</button><button class="secondary mini-action" data-wf-event="click" data-wf-code="deletePartCategory('${escAttr(b)}')">🗑️</button></span></div>`).join("");
  let host=document.getElementById("settingsDynamic");
  if(host)host.innerHTML=`<section class="panel setting-list-panel"><details><summary>🛠️ دورة حالات أمر الشغل</summary><div class="panel-body"><div class="hint">الحالات (جديد / جاري التنفيذ / مكتمل / ملغي) وحالات الورشة (غير مطلوب / تم السحب / تم التسليم) بقت دورة معتمدة وثابتة، ومش قابلة للتعديل من هنا. الأولوية اتشالت خالص من أوامر الشغل. راجع ملف WORK_ORDER_LIFECYCLE_APPROVED.md لتفاصيل الدورة والانتقالات المسموحة.</div></div></details></section>`+returnWindowSettingHtml()+overdueAlertSettingHtml()+orderTagsSettingHtml()+[["أماكن التنفيذ","executionPlaces","📍"],["حالات الدفع","paymentStatuses","💳"],["وحدات القياس","units","📏"],["أنواع العناوين","addressTypes","🏠"]].map(x=>listEditorHtml(...x)).join("")+waTemplatesSettingHtml()+warrantySettingHtml()+receiptSettingHtml();
  let walletHost=document.getElementById("walletSettingsDynamic");
  if(walletHost)walletHost.innerHTML=defaultWalletSettingHtml()+[["الحسابات (محفظتي الشخصية، فودافون كاش، أورنج كاش، إنستاباي... أضف أي حساب تحب)","wallets","💳"],["التصنيف (شخصي / تشغيل / تحصيل عميل / سلفة تحويل / أخرى...)","walletCategories","🏷️"]].map(x=>inlineListEditorHtml(...x)).join("")+[["نوع المصروف — لما التصنيف \"مصروف تشغيل\" (وقود، صيانة عدة...)","expenseCategories","🧯"],["نوع المصروف — لما التصنيف \"مصروف شخصي\" (مواصلات، أكل وشرب...)","personalExpenseCategories","🙋"]].map(x=>listEditorHtml(...x)).join("")+walletCapsSettingHtml();
  let pinHost=document.getElementById("pinLockSettings");
  if(pinHost)pinHost.innerHTML=pinLockSettingsHtml();
  bindSortableSettings();
}
function pinLockSettingsHtml(){
  let on=window.WFLock&&WFLock.isSet();
  if(on){
    let e=WFLock.entryLockEnabled(),d=WFLock.deleteLockEnabled(),idle=WFLock.idleMinutes(),leave=WFLock.lockOnLeave();
    return `<p class="hint">🔒 الحماية مفعّلة حاليًا. كل استخدام تقدر تشغّله أو تطفيه لوحده:</p>
    <div class="setting-row"><span class="setting-name">قفل الدخول للتطبيق</span><span class="compact-actions"><button type="button" class="secondary mini-action${e?" active-opt":""}" data-wf-click="togglePinEntryLock">${e?"✅ مفعّل":"⭘ متوقف"}</button></span></div>
    <div class="setting-row"><span class="setting-name">قفل عمليات الحذف الجماعي/إعادة التهيئة</span><span class="compact-actions"><button type="button" class="secondary mini-action${d?" active-opt":""}" data-wf-click="togglePinDeleteLock">${d?"✅ مفعّل":"⭘ متوقف"}</button></span></div>
    <div class="setting-row"><span class="setting-name">القفل التلقائي بعد عدم الاستخدام</span><span class="compact-actions"><input id="pinIdleMinutes" type="number" min="1" max="240" value="${idle}" style="max-width:90px" aria-label="دقائق القفل التلقائي"><button type="button" class="secondary mini-action" data-wf-click="savePinIdleMinutes">💾 حفظ</button></span></div>
    <div class="setting-row"><span class="setting-name">القفل عند ترك الصفحة أو إخفائها</span><span class="compact-actions"><button type="button" class="secondary mini-action${leave?" active-opt":""}" data-wf-click="togglePinLeaveLock">${leave?"✅ مفعّل":"⭘ متوقف"}</button></span></div>
    <div class="delete-actions"><button class="secondary mini-action" type="button" data-action="pin-change">✏️ تغيير الرقم السري</button><button class="danger-btn mini-action" type="button" data-action="pin-remove">🗑️ إلغاء الحماية نهائيًا</button></div>`;
  }
  return `<div class="delete-actions"><button class="primary mini-action" type="button" data-action="pin-set">🔒 تفعيل الحماية بالرقم السري</button></div>`;
}
function togglePinEntryLock(){if(!window.WFLock)return;WFLock.setEntryLockEnabled(!WFLock.entryLockEnabled());settingsPage()}
function togglePinDeleteLock(){if(!window.WFLock)return;WFLock.setDeleteLockEnabled(!WFLock.deleteLockEnabled());settingsPage()}
function savePinIdleMinutes(){let el=document.getElementById("pinIdleMinutes");if(!el||!window.WFLock)return;WFLock.setIdleMinutes(el.value);settingsPage()}
function togglePinLeaveLock(){if(!window.WFLock)return;WFLock.setLockOnLeave(!WFLock.lockOnLeave());settingsPage()}
function setAppPin(){
  if(!window.WFLock)return;
  let p1=prompt("اكتب رقم سري جديد (4 أرقام على الأقل):");
  if(p1===null)return;
  p1=p1.trim();
  if(p1.length<4){alert("الرقم لازم يكون 4 خانات على الأقل.");return}
  let p2=prompt("أكد الرقم السري تاني:");
  if(p2===null)return;
  if(p1!==p2.trim()){alert("الرقمين مش متطابقين.");return}
  WFLock.setPin(p1);
  WFLock.unlock();
  alert("تم تفعيل الحماية بالرقم السري.");
  settingsPage();
}
function changeAppPin(){
  if(!window.WFLock)return;
  let cur=prompt("اكتب الرقم السري الحالي:");
  if(cur===null)return;
  if(!WFLock.verify(cur)){alert("الرقم السري الحالي غير صحيح.");return}
  setAppPin();
}
function removeAppPin(){
  if(!window.WFLock)return;
  let cur=prompt("اكتب الرقم السري الحالي لإلغاء الحماية:");
  if(cur===null)return;
  if(!WFLock.verify(cur)){alert("الرقم السري غير صحيح.");return}
  if(!confirm("متأكد إنك عايز تلغي الحماية بالرقم السري؟"))return;
  WFLock.removePin();
  alert("تم إلغاء الحماية.");
  settingsPage();
}
function defaultWalletSettingHtml(){
  let s=settings(),wallets=s.wallets||[],cur=s.defaultWallet||"";
  return `<section class="panel setting-list-panel" id="default-wallet-panel"><details><summary>⭐ المحفظة الافتراضية</summary><div class="panel-body"><div class="hint">أي دفعة/عربون أو تقفيل أمر شغل هيتحدد له تلقائي المحفظة دي، إلا لو غيّرتها بنفسك وقت العملية.</div><select id="defaultWalletSelect" data-wf-event="change" data-wf-code="setDefaultWallet(this.value)"><option value="">بدون تحديد افتراضي</option>${wallets.map(w=>`<option ${cur===w?"selected":""}>${esc(w)}</option>`).join("")}</select></div></details></section>`;
}
function setDefaultWallet(v){let s=settings();s.defaultWallet=v||"";put(K.s,s);settingsPage()}
/* ---------------------------------------------------------------------
   حد أقصى اختياري لأي حساب (مثال شائع: إنستاباي — بدل ما يتسجل رصيد
   حسابك البنكي الشخصي بالكامل، تحط رقم تقريبي كحد أقصى، وأي رصيد فعلي
   أعلى منه بيتقف عنده في العرض والإجمالي فقط، من غير ما يأثر على كشف
   الحركات الفعلي نفسه).
--------------------------------------------------------------------- */
function walletCapsSettingHtml(){
  let s=settings(),wallets=s.wallets||[],caps=s.walletCaps||{};
  return `<section class="panel setting-list-panel" id="wallet-caps-panel">
    <details><summary>🔒 حد أقصى اختياري لبعض الحسابات</summary><div class="panel-body">
    <div class="hint">⚠️ الخانة دي مش "الرصيد الحالي/الافتتاحي" — لو حطيت فيها رقم، أي مبلغ يتسجل في الحساب ده بعد كده (عربون، تحصيل، أي حركة) هيفضل يتسجل عادي في كشف الحركات، لكن الرصيد والإجمالي المعروضين هيقفوا عند الرقم ده ومش هيزيدوا. سيبها فاضية لأي حساب تحب يتحسب برصيده الحقيقي الكامل من غير حد (ده الوضع الطبيعي للغالبية).</div>
    ${wallets.length?wallets.map(w=>{
      let capVal=caps[w]!==undefined&&caps[w]!==null&&caps[w]!==""?caps[w]:"";
      let raw=typeof walletRawBalance==="function"?walletRawBalance(w):0;
      let capNum=+capVal;
      let warn=capVal!==""&&Number.isFinite(capNum)&&capNum>=0&&raw>capNum?`<div class="hint" style="color:var(--danger,#c0392b)">⚠️ الرصيد الفعلي من الحركات المسجّلة ${raw.toFixed(2)} ج، لكن المعروض متوقف عند ${capNum.toFixed(2)} ج بسبب الحد ده.</div>`:"";
      return `<div class="setting-row inline-edit-row">
      <span class="setting-name">${esc(w)}</span>
      <input type="number" min="0" step="0.01" class="inline-edit-input" placeholder="بدون حد" value="${capVal!==""?esc(String(capVal)):""}" data-wf-event="change" data-wf-code="setWalletCap('${escAttr(w)}',this.value)">
      ${warn}
    </div>`}).join(""):`<div class="hint">أضف حسابات أولًا من قسم "الحسابات" فوق.</div>`}
  </div></details></section>`;
}
function setWalletCap(walletName,v){
  let s=settings();s.walletCaps=s.walletCaps||{};
  v=(v||"").trim();
  if(!v)delete s.walletCaps[walletName];
  else{let n=+v;if(!Number.isFinite(n)||n<0)return alert("اكتب رقم صحيح موجب، أو سيب الخانة فاضية لإلغاء الحد الأقصى.");s.walletCaps[walletName]=n;}
  put(K.s,s);settingsPage();
}
function returnWindowSettingHtml(){
  let s=settings(),days=+s.returnWindowDays||7;
  return `<section class="panel setting-list-panel" id="return-window-panel"><details><summary>🔄 مهلة المرتجع بعد إغلاق الأمر</summary><div class="panel-body"><div class="hint">أمر الشغل المكتمل وغير المغلق يفضل قابل للإرجاع/التعديل في أي وقت. أما بعد "تم الدفع بالكامل وإغلاق الأمر"، فبيبقى قابل للإرجاع فقط خلال عدد الأيام ده من تاريخ الإغلاق؛ بعدها مفيش مرتجع ولا تعديل.</div><div class="inline"><input id="returnWindowDaysInput" type="number" min="1" step="1" value="${days}" style="max-width:110px"><button class="secondary mini-action" data-wf-event="click" data-wf-code="setReturnWindowDays()">💾 حفظ المدة</button><span class="hint">حاليًا: ${days} يوم</span></div></div></details></section>`;
}
function setReturnWindowDays(){
  let el=document.getElementById("returnWindowDaysInput"),n=parseInt(el?.value,10);
  if(!Number.isFinite(n)||n<1){alert("اكتب عدد أيام صحيح (1 على الأقل).");return}
  let s=settings();s.returnWindowDays=n;put(K.s,s);settingsPage();
}
function overdueAlertSettingHtml(){
  let s=settings(),days=+s.overdueAlertDays||7,mid=Math.max(1,Math.floor(days/2));
  return `<section class="panel setting-list-panel" id="overdue-alert-panel"><details><summary>⏳ تنبيه الأوامر القديمة (لسه واقفة)</summary><div class="panel-body"><div class="hint">أي أمر شغل مفتوح (جديد أو جاري التنفيذ) لو فضل من غير ما يتقفل عدد الأيام ده أو أكتر من تاريخ تسجيله، هيتلوّن 🔴 أحمر في قايمة الأوامر ويظهر في تنبيه "🔥 يحتاج انتباه" بالشاشة الرئيسية. اللون بيتدرّج تلقائي: 🟢 أقل من ${mid} يوم، 🟡 من ${mid} لحد ${Math.max(mid,days-1)} يوم، 🔴 ${days} يوم فأكتر.</div><div class="inline"><input id="overdueAlertDaysInput" type="number" min="1" step="1" value="${days}" style="max-width:110px"><button class="secondary mini-action" data-wf-event="click" data-wf-code="setOverdueAlertDays()">💾 حفظ العدد</button><span class="hint">حاليًا: ${days} يوم</span></div></div></details></section>`;
}
function setOverdueAlertDays(){
  let el=document.getElementById("overdueAlertDaysInput"),n=parseInt(el?.value,10);
  if(!Number.isFinite(n)||n<1){alert("اكتب عدد أيام صحيح (1 على الأقل).");return}
  let s=settings();s.overdueAlertDays=n;put(K.s,s);settingsPage();
}
function setTypePosition(i,pos){let n=parseInt(pos,10),entries=Object.entries(settings().types||{});if(!Number.isFinite(n))return settingsPage();n=Math.max(1,Math.min(entries.length,n));if(i<0||i>=entries.length||i===n-1)return;let item=entries.splice(i,1)[0];entries.splice(n-1,0,item);let s=settings();s.types=Object.fromEntries(entries);put(K.s,s);settingsPage()}
function addCenter(){let el=document.getElementById("newCenter"),v=el&&el.value?el.value:prompt("اسم المركز الجديد");if(!v)return;v=v.trim();if(!v)return;let s=settings();if(!s.centers.includes(v)){s.centers.push(v);s.villages[v]=s.villages[v]||[]}put(K.s,s);if(el)el.value="";settingsPage()}
function renameCenter(c){let n=prompt("الاسم الجديد للمركز",c);if(!n||n===c)return;n=n.trim();if(!n)return;let s=settings(),i=s.centers.indexOf(c);if(i<0)return;s.centers[i]=n;s.villages[n]=s.villages[c]||[];if(n!==c)delete s.villages[c];put(K.s,s);settingsPage()}
function deleteCenter(c){if(!confirm(`حذف المركز «${c}» وكل قراه؟`))return;let s=settings();s.centers=s.centers.filter(x=>x!==c);delete s.villages[c];put(K.s,s);settingsPage()}
function addType(){let t=prompt("اسم نوع الجهاز الجديد");if(!t)return;t=t.trim();if(!t)return;let s=settings();if(!(t in s.types))s.types[t]=[];put(K.s,s);settingsPage()}
function renameType(t){let n=prompt("الاسم الجديد للنوع",t);if(!n||n===t)return;n=n.trim();if(!n)return;let s=settings();if(!(t in s.types))return;if(n in s.types&&n!==t){alert("هذا النوع موجود بالفعل");return}let entries=Object.entries(s.types).map(([k,v])=>[k===t?n:k,v]);s.types=Object.fromEntries(entries);put(K.s,s);settingsPage()}
function deleteType(t){if(!confirm(`حذف نوع الجهاز «${t}» وكل تصنيفاته؟`))return;let s=settings();delete s.types[t];put(K.s,s);settingsPage()}
function addBrand(){let v=prompt("اسم الماركة الجديدة");if(!v)return;v=v.trim();if(!v)return;let s=settings();if(!s.brands.includes(v))s.brands.push(v);put(K.s,s);settingsPage()}
function deleteBrand(b){if(!confirm(`حذف الماركة «${b}»؟`))return;let s=settings();s.brands=s.brands.filter(x=>x!==b);put(K.s,s);settingsPage()}
function addPartCategory(){let v=prompt("اسم تصنيف القطع الجديد");if(!v)return;v=v.trim();if(!v)return;let s=settings();if(!s.partCats.includes(v))s.partCats.push(v);put(K.s,s);settingsPage()}
function deletePartCategory(c){if(!confirm(`حذف تصنيف «${c}»؟`))return;let s=settings();s.partCats=s.partCats.filter(x=>x!==c);put(K.s,s);settingsPage()}
function addSettingItem(key){let v=prompt("أضف عنصر جديد");if(!v)return;v=v.trim();if(!v)return;let s=settings();s[key]=s[key]||[];if(!s[key].includes(v))s[key].push(v);put(K.s,s);settingsPage()}
function renameSettingItem(key,i){let s=settings(),a=s[key]||[];if(i<0||i>=a.length)return;let n=prompt("الاسم الجديد",a[i]);if(!n||n===a[i])return;n=n.trim();if(!n)return;a[i]=n;s[key]=a;put(K.s,s);settingsPage()}
function deleteSettingItem(key,i){let s=settings(),a=s[key]||[];if(i<0||i>=a.length)return;if(!confirm(`حذف «${a[i]}»؟`))return;a.splice(i,1);s[key]=a;put(K.s,s);settingsPage()}

/* =========================================================
   محرّر قوائم بديل — بدون prompt()/confirm() (مستخدم للمحافظ وتصنيفاتها)
   =========================================================
   السبب: addSettingItem/renameSettingItem/deleteSettingItem فوق دول
   بيعتمدوا بالكامل على window.prompt() و window.confirm(). بعض
   المتصفحات المدمجة (زي واجهة WebView جوه تطبيق مثبّت كـ PWA على بعض
   الأجهزة، أو المتصفح المصغّر جوه واتساب/فيسبوك) بتمنع الـ popup ده
   بصمت تام: بترجع null/false على طول من غير أي رسالة خطأ في الكونسول
   حتى، فبيبان الزرار "مش شغال" مع إنه فعليًا بينفذ لكن بياخد قيمة فاضية
   ويوقف بصمت. عشان كده قسم المحافظ تحديدًا بيستخدم حقول <input> مباشرة
   بدل الـ popup، فمفيش أي اعتماد على إذا كان المتصفح بيسمح بيه أو لأ.
   ========================================================= */
function inlineListEditorHtml(title,key,icon){
  let a=settings()[key]||[];
  return `<section class="panel setting-list-panel" id="settings-list-${esc(key)}">
    <details><summary>${icon} ${esc(title)}</summary><div class="panel-body">
    <div class="inline-add-row">
      <input type="text" id="newInlineItem-${esc(key)}" placeholder="اسم جديد" onkeydown="if(event.key==='Enter'){event.preventDefault();addInlineListItem('${escAttr(key)}')}">
      <button type="button" class="primary mini-action" data-wf-event="click" data-wf-code="addInlineListItem('${escAttr(key)}')">➕ إضافة</button>
    </div>
    <div class="sortable-list">
      ${a.length?a.map((x,i)=>`<div class="setting-row inline-edit-row">
        <span class="setting-name"><b>${i+1}.</b></span>
        <input type="text" class="inline-edit-input" value="${esc(x)}" data-wf-event="change" data-wf-code="renameInlineListItem('${escAttr(key)}',${i},this.value)">
        <span class="compact-actions">
          <button type="button" class="secondary mini-action" ${i===0?"disabled":""} data-wf-event="click" data-wf-code="moveInlineListItem('${escAttr(key)}',${i},-1)">⬆️</button>
          <button type="button" class="secondary mini-action" ${i===a.length-1?"disabled":""} data-wf-event="click" data-wf-code="moveInlineListItem('${escAttr(key)}',${i},1)">⬇️</button>
          <button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="confirmClick(this,()=>deleteInlineListItem('${escAttr(key)}',${i}))">🗑️</button>
        </span>
      </div>`).join(""):`<div class="hint">لا توجد عناصر بعد. أضف واحد من الحقل فوق.</div>`}
    </div>
  </div></details></section>`;
}
// تأكيد حذف بدون confirm(): أول ضغطة تحوّل الزرار لـ "تأكيد الحذف؟" لمدة
// 3 ثواني، وثاني ضغطة (في نفس المهلة) هي اللي فعليًا بتنفذ الحذف.
function confirmClick(btn,fn){
  if(btn.dataset.confirming==="1"){fn();return}
  btn.dataset.confirming="1";let orig=btn.textContent;btn.textContent="تأكيد الحذف؟";btn.classList.add("danger-btn");
  clearTimeout(btn._confirmTimer);
  btn._confirmTimer=setTimeout(()=>{btn.dataset.confirming="0";btn.textContent=orig;btn.classList.remove("danger-btn")},3000);
}
function addInlineListItem(key){
  let el=document.getElementById("newInlineItem-"+key);let v=(el?.value||"").trim();if(!v)return;
  let s=settings();s[key]=s[key]||[];if(!s[key].includes(v))s[key].push(v);put(K.s,s);
  settingsPage();
  let refocus=document.getElementById("newInlineItem-"+key);refocus?.focus();
}
function renameInlineListItem(key,i,v){
  v=(v||"").trim();let s=settings(),a=s[key]||[];if(i<0||i>=a.length)return;
  if(!v){settingsPage();return} // رجوع للاسم القديم لو مسحه فاضي بدل ما يحفظ قيمة فاضية
  let old=a[i];a[i]=v;s[key]=a;
  if(key==="wallets"&&old!==v){
    if(s.walletCaps&&old in s.walletCaps){s.walletCaps[v]=s.walletCaps[old];delete s.walletCaps[old]}
    if(s.defaultWallet===old)s.defaultWallet=v;
    // لازم نرحّل كل حركة محفظة (wf_wallet_tx) وأي أمر شغل عليه عربون/تحصيل
    // نهائي مسجّل باسم المحفظة القديم — من غير ده، الحركات القديمة بتفضل
    // محفوظة باسم مش موجود في قايمة المحافظ، فبتختفي من إجمالي المحفظة
    // (الاسم الجديد) وهي لسه موجودة فعليًا في البيانات؛ ده بالظبط سبب
    // ظهور المبلغ في كشف/سجل عام بس عدم تغيّر "المجموع" الخاص بالمحفظة.
    let wtx=arr(K.wtx),touchedWtx=false;
    wtx.forEach(x=>{if(x.wallet===old){x.wallet=v;touchedWtx=true}});
    let reqs=arr(K.r),touchedReq=false;
    reqs.forEach(r=>{
      if(r.depositWallet===old){r.depositWallet=v;touchedReq=true}
      if(r.closeWallet===old){r.closeWallet=v;touchedReq=true}
    });
    let payload={[K.s]:s};
    if(touchedWtx)payload[K.wtx]=wtx;
    if(touchedReq)payload[K.r]=reqs;
    if(!commitStorage(payload))return;
    settingsPage();
    return;
  }
  put(K.s,s);settingsPage();
}
function deleteInlineListItem(key,i){
  let s=settings(),a=s[key]||[];if(i<0||i>=a.length)return;
  let removed=a[i];
  // نفس مشكلة إعادة التسمية بالظبط: حذف محفظة من القايمة هنا بيشيلها من
  // walletsOverview()/الإجمالي، لكن حركاتها القديمة (wf_wallet_tx) بتفضل
  // موجودة في البيانات باسمها القديم من غير أي تنبيه — يعني رصيدها بيختفي
  // بصمت من "إجمالي أرصدة كل الحسابات" رغم إن الفلوس دي لسه مسجّلة فعليًا.
  if(key==="wallets"&&typeof walletRawBalance==="function"){
    let raw=walletRawBalance(removed);
    if(raw&&!confirm(`المحفظة "${removed}" لسه فيها حركات برصيد ${raw.toFixed(2)} ج. حذفها من القايمة هيشيلها من إجمالي المحافظ بالكامل، مع إن حركاتها القديمة هتفضل موجودة (تقدر تشوفها من كشف التصنيف لو محتاج). تأكيد الحذف؟`))return;
  }
  a.splice(i,1);s[key]=a;
  if(key==="wallets"&&s.walletCaps&&removed in s.walletCaps)delete s.walletCaps[removed];
  put(K.s,s);settingsPage();
}
function moveInlineListItem(key,i,dir){
  let s=settings(),a=s[key]||[],j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];s[key]=a;put(K.s,s);settingsPage();
}


// ===== رسائل واتساب جاهزة للعملاء =====
// كل رسالة نص حر فيه كلمات بين قوسين معقوفين بتتبدل تلقائيًا وقت الإرسال
// من بيانات أمر الشغل نفسه (fillWaTemplate في app-requests.js هي اللي
// بتعمل الاستبدال ده). التفعيل/التعطيل هنا بيتحكم في ظهور زرار الإرسال في
// صفحة أمر الشغل، من غير ما يمسح الرسالة نفسها.
function waTemplatesSettingHtml(){
  let list=settings().waTemplates||[];
  return `<section class="panel setting-list-panel" id="wa-templates-panel"><details><summary>📨 رسائل واتساب للعملاء</summary><div class="panel-body">
    <div class="hint">اكتب أي عدد من الرسائل، واستخدم أي من الكلمات دي وهتتبدل تلقائيًا وقت الإرسال ببيانات أمر الشغل: {اسم_العميل} {اسم_الجهاز} {رقم_الأمر} {الحالة} {العطل} {الإجمالي} {المتبقي} {اسم_الورشة} {التوقيع} {شروط_الضمان}. الرسائل المفعّلة بس هي اللي هتظهر كأزرار إرسال جوه صفحة أمر الشغل.</div>
    <div class="page-head-actions"><button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="addWaTemplate()">➕ إضافة رسالة</button></div>
    <div id="waTemplatesList">${waTemplatesRowsHtml(list)}</div>
  </div></details></section>`;
}
function waTemplatesRowsHtml(list){
  if(!list.length)return `<div class="hint">لا توجد رسائل مضافة بعد.</div>`;
  return list.map((t,i)=>`<div class="wa-template-row">
    <div class="wa-template-head">
      <label class="toggle-inline"><input type="checkbox" ${t.enabled!==false?"checked":""} data-wf-event="change" data-wf-code="setWaTemplateEnabled(${i},this.checked)"> مفعّلة</label>
      <input type="text" class="inline-edit-input wa-template-name" value="${esc(t.name||"")}" placeholder="اسم الرسالة (للتعرّف عليها بس)" data-wf-event="change" data-wf-code="renameWaTemplate(${i},this.value)">
      <button type="button" class="danger-btn mini-action" data-wf-event="click" data-wf-code="confirmClick(this,()=>deleteWaTemplate(${i}))">🗑️</button>
    </div>
    <textarea rows="4" class="wa-template-text" placeholder="نص الرسالة" data-wf-event="change" data-wf-code="setWaTemplateText(${i},this.value)">${esc(t.text||"")}</textarea>
  </div>`).join("");
}
function refreshWaTemplatesList(){let h=document.getElementById("waTemplatesList");if(h)h.innerHTML=waTemplatesRowsHtml(settings().waTemplates||[])}
function addWaTemplate(){
  let s=settings();s.waTemplates=s.waTemplates||[];
  s.waTemplates.push({id:id(),name:"رسالة جديدة",text:"مرحباً {اسم_العميل}، بخصوص أمر رقم {رقم_الأمر} ({اسم_الجهاز})...",enabled:true});
  if(!saveJSONSafe(K.s,s))return;refreshWaTemplatesList();
}
function renameWaTemplate(i,val){let s=settings();if(!s.waTemplates?.[i])return;s.waTemplates[i].name=val;saveJSONSafe(K.s,s)}
function setWaTemplateText(i,val){let s=settings();if(!s.waTemplates?.[i])return;s.waTemplates[i].text=val;saveJSONSafe(K.s,s)}
function setWaTemplateEnabled(i,val){let s=settings();if(!s.waTemplates?.[i])return;s.waTemplates[i].enabled=!!val;saveJSONSafe(K.s,s)}
function deleteWaTemplate(i){let s=settings();if(!s.waTemplates)return;s.waTemplates.splice(i,1);if(!saveJSONSafe(K.s,s))return;refreshWaTemplatesList()}

// ===== رسائل واتساب جاهزة لمتابعة العملاء (صفحة "متابعة العملاء") =====
// نفس الفكرة بالظبط بتاعة رسائل أوامر الشغل فوق، لكن قايمة منفصلة لأن
// السياق مختلف: هنا مفيش أمر شغل محدد، بس عميل + تاريخ آخر تعامل، فالكلمات
// المتاحة للاستبدال مختلفة.
function followupWaTemplatesSettingHtml(){
  let list=settings().followupWaTemplates||[];
  return `<section class="panel setting-list-panel" id="followup-wa-templates-panel"><details><summary>📨 رسائل واتساب لمتابعة العملاء</summary><div class="panel-body">
    <div class="hint">اكتب أي عدد من الرسائل لتذكير العملاء اللي ساكتين من فترة، واستخدم أي من الكلمات دي وهتتبدل تلقائيًا وقت الإرسال: {اسم_العميل} {عدد_الأيام} {عدد_الأوامر} {تاريخ_آخر_أمر} {اسم_الورشة} {التوقيع}. الرسائل المفعّلة بس هي اللي هتظهر كأزرار إرسال جوه صفحة متابعة العملاء.</div>
    <div class="page-head-actions"><button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="addFollowupWaTemplate()">➕ إضافة رسالة</button></div>
    <div id="followupWaTemplatesList">${followupWaTemplatesRowsHtml(list)}</div>
  </div></details></section>`;
}
function followupWaTemplatesRowsHtml(list){
  if(!list.length)return `<div class="hint">لا توجد رسائل مضافة بعد.</div>`;
  return list.map((t,i)=>`<div class="wa-template-row">
    <div class="wa-template-head">
      <label class="toggle-inline"><input type="checkbox" ${t.enabled!==false?"checked":""} data-wf-event="change" data-wf-code="setFollowupWaTemplateEnabled(${i},this.checked)"> مفعّلة</label>
      <input type="text" class="inline-edit-input wa-template-name" value="${esc(t.name||"")}" placeholder="اسم الرسالة (للتعرّف عليها بس)" data-wf-event="change" data-wf-code="renameFollowupWaTemplate(${i},this.value)">
      <button type="button" class="danger-btn mini-action" data-wf-event="click" data-wf-code="confirmClick(this,()=>deleteFollowupWaTemplate(${i}))">🗑️</button>
    </div>
    <textarea rows="4" class="wa-template-text" placeholder="نص الرسالة" data-wf-event="change" data-wf-code="setFollowupWaTemplateText(${i},this.value)">${esc(t.text||"")}</textarea>
  </div>`).join("");
}
function refreshFollowupWaTemplatesList(){let h=document.getElementById("followupWaTemplatesList");if(h)h.innerHTML=followupWaTemplatesRowsHtml(settings().followupWaTemplates||[])}
function addFollowupWaTemplate(){
  let s=settings();s.followupWaTemplates=s.followupWaTemplates||[];
  s.followupWaTemplates.push({id:id(),name:"رسالة جديدة",text:"مرحباً {اسم_العميل}، بنشتاق نطمن عليك وعلى الجهاز، من زمان معملناش صيانة من {عدد_الأيام} يوم. لو محتاج أي حاجة إحنا موجودين. {التوقيع}",enabled:true});
  if(!saveJSONSafe(K.s,s))return;refreshFollowupWaTemplatesList();
}
function renameFollowupWaTemplate(i,val){let s=settings();if(!s.followupWaTemplates?.[i])return;s.followupWaTemplates[i].name=val;saveJSONSafe(K.s,s)}
function setFollowupWaTemplateText(i,val){let s=settings();if(!s.followupWaTemplates?.[i])return;s.followupWaTemplates[i].text=val;saveJSONSafe(K.s,s)}
function setFollowupWaTemplateEnabled(i,val){let s=settings();if(!s.followupWaTemplates?.[i])return;s.followupWaTemplates[i].enabled=!!val;saveJSONSafe(K.s,s)}
function deleteFollowupWaTemplate(i){let s=settings();if(!s.followupWaTemplates)return;s.followupWaTemplates.splice(i,1);if(!saveJSONSafe(K.s,s))return;refreshFollowupWaTemplatesList()}

// ===== إعدادات الإيصال القابل للطباعة/المشاركة =====
const RECEIPT_BUILTIN_FIELDS=[["orderNo","🧾 رقم الأمر"],["orderDate","📅 التاريخ"],["customerName","👤 اسم العميل"],["customerPhone","📞 رقم الهاتف"],["deviceInfo","🔧 الجهاز"],["fault","📝 العطل"],["work","🔨 الأعمال المنفذة"],["partsList","🧰 قطع الغيار"],["labor","🔨 المصنعية"],["partsTotal","🔧 إجمالي قطع الغيار"],["total","💰 الإجمالي"],["deposit","💵 العربون"],["remaining","💳 المتبقي"],["paymentStatus","💳 حالة الدفع"],["warranty","🛡️ الضمان"],["warrantyTerms","📋 شروط الضمان"]];
function defaultReceiptFields(){return RECEIPT_BUILTIN_FIELDS.map(([fid,label])=>({id:fid,label,enabled:true,builtin:true}))}
// لو المستخدم خصّص قايمة بنود الإيصال بالفعل قبل إضافة بند builtin جديد
// (زي الضمان دلوقتي)، مكانش هيظهر ليه أبدًا لأن الشرط التحت ده بيتفعّل
// بس لو القايمة فاضية بالكامل. هنا بنضيف أي بند builtin ناقص في الآخر
// تلقائيًا (من غير ما نلمس ترتيب أو تخصيصات المستخدم الحالية) عشان يقدر
// يفعّله/يرتبه زي ما يحب.
function ensureReceiptFields(s){
  if(!s.receiptFields||!s.receiptFields.length){s.receiptFields=defaultReceiptFields();return s.receiptFields}
  let have=new Set(s.receiptFields.map(f=>f.id));
  RECEIPT_BUILTIN_FIELDS.forEach(([fid,label])=>{if(!have.has(fid))s.receiptFields.push({id:fid,label,enabled:true,builtin:true})});
  return s.receiptFields;
}
// ===== إعدادات الضمان: تحكم كامل — تفعيل/تعطيل، مدة افتراضية، وشروط ضمان
// (نص حر متاح كـ {شروط_الضمان} في أي رسالة واتساب، وكبند "📋 شروط الضمان"
// قابل للتفعيل في الإيصال زي أي بند تاني) =====
function activeWarrantiesListHtml(){
  let now=new Date();
  let list=arr(K.r).filter(r=>r.closed&&r.warrantyUntil&&new Date(r.warrantyUntil)>=now);
  list.sort((a,b)=>new Date(a.warrantyUntil)-new Date(b.warrantyUntil));
  if(!list.length)return `<div class="hint">لا يوجد حاليًا أي عميل عليه ضمان سارٍ.</div>`;
  return `<div class="setting-subhead">📋 عملاء عليهم ضمان سارٍ دلوقتي (${list.length})</div>${list.map(r=>{
    let daysLeft=Math.ceil((new Date(r.warrantyUntil)-now)/86400000);
    return `<div class="setting-row"><span>👤 <a href="request.html?id=${r.id}">${esc(customerName(r.customerId))}</a> — 🔧 ${esc(deviceName(r.deviceId))} <small class="hint">باقي ${daysLeft} يوم (حتى ${esc(new Date(r.warrantyUntil).toLocaleDateString("ar-EG"))})</small></span></div>`;
  }).join("")}`;
}
function warrantySettingHtml(){
  let w=settings().warranty||{};
  return `<section class="panel setting-list-panel" id="warranty-settings-panel"><details><summary>🛡️ الضمان</summary><div class="panel-body">
    <label class="toggle-inline"><input type="checkbox" ${w.enabled!==false?"checked":""} data-wf-event="change" data-wf-code="setWarrantyEnabled(this.checked)"> تفعيل متابعة الضمان</label>
    <div class="hint">لما مفعّل: أي أمر شغل بيتقفل (تحصيل وإغلاق) بياخد تاريخ انتهاء ضمان تلقائي بالمدة اللي تحددها تحت. تقدر تعدّل مدة الضمان لأي أمر بذاته من صفحته في أي وقت. ولو نفس الجهاز رجع بأمر جديد وهو لسه في الضمان، هتتنبّه وقت الحفظ وفي صفحة الجهاز.</div>
    <div class="form-grid">
      <label>المدة الافتراضية (بالأيام)<input type="number" min="0" value="${+w.days||90}" data-wf-event="change" data-wf-code="setWarrantyDays(this.value)"></label>
    </div>
    <label class="wide">شروط الضمان (نص حر — متاح كـ {شروط_الضمان} في أي رسالة واتساب، وكبند "📋 شروط الضمان" تقدر تفعّله في إعدادات الإيصال تحت)<textarea rows="3" data-wf-event="change" data-wf-code="setWarrantyTerms(this.value)">${esc(w.terms||"")}</textarea></label>
    ${location.pathname.indexOf("warranty.html")===-1?`<div class="hint">قائمة العملاء اللي عليهم ضمان سارٍ دلوقتي بقت في صفحتها المستقلة: <a href="warranty.html">🛡️ الضمان</a>.</div>`:""}
  </div></details></section>`;
}
function setWarrantyEnabled(val){let s=settings();s.warranty=s.warranty||{};s.warranty.enabled=!!val;saveJSONSafe(K.s,s)}
function setWarrantyDays(val){let s=settings();s.warranty=s.warranty||{};let days=+val;s.warranty.days=Number.isFinite(days)&&days>0?days:90;saveJSONSafe(K.s,s)}
function setWarrantyTerms(val){let s=settings();s.warranty=s.warranty||{};s.warranty.terms=String(val??"").trim();saveJSONSafe(K.s,s)}
// معاينة حيّة تحت خانة "اسم الورشة" في الإعدادات — بتتحدّث مع كل حرف تكتبه
// (مش بس بعد الحفظ)، بنفس منطق العرض في الإيصال بالظبط (trim + رجوع
// للاسم الافتراضي لو فاضي). الهدف إثبات الشكل النهائي فورًا وبشكل مباشر،
// من غير أي احتمال لبس بسبب كاش أو صفحة تانية.
function previewReceiptWorkshopName(){
  let out=document.getElementById("receiptWorkshopNamePreview");
  if(!out)return;
  out.textContent=(this.value||"").trim()||"الورشة الفنية";
}
function receiptSettingHtml(){
  let s=settings();
  let info=s.receiptInfo||{};
  let fields=ensureReceiptFields(s);
  return `<section class="panel setting-list-panel" id="receipt-settings-panel"><details><summary>🧾 إعدادات الإيصال</summary><div class="panel-body">
    <div class="hint">البيانات دي بتظهر أعلى وأسفل أي إيصال تطبعه أو تشاركه من صفحة أمر الشغل.</div>
    <div class="form-grid">
      <label>اسم الورشة<input type="text" id="receiptInfoNameInput" value="${esc(info.name||"")}" data-wf-event="change" data-wf-code="setReceiptInfo('name',this.value)" data-wf-input="previewReceiptWorkshopName"></label>
      <label>رقم الهاتف<input type="text" value="${esc(info.phone||"")}" data-wf-event="change" data-wf-code="setReceiptInfo('phone',this.value)"></label>
      <label class="wide">العنوان<input type="text" value="${esc(info.address||"")}" data-wf-event="change" data-wf-code="setReceiptInfo('address',this.value)"></label>
      <label class="wide">نص ثابت / توقيع (يُستخدم أسفل الإيصال، ومتاح كمان كـ {التوقيع} في أي رسالة واتساب)<input type="text" value="${esc(info.footer||"")}" data-wf-event="change" data-wf-code="setReceiptInfo('footer',this.value)"></label>
    </div>
    <div class="hint">هيظهر في رأس أي إيصال بالظبط كده: <b id="receiptWorkshopNamePreview">${esc((info.name||"").trim()||"الورشة الفنية")}</b></div>
    <div class="hint">فعّل/عطّل أي بند، رتّبه بالأسهم، وعدّل تسميته زي ما تحب. تقدر كمان تضيف بنود مخصصة (نص ثابت بيظهر في كل إيصال، زي "الضمان 3 شهور").</div>
    <div class="page-head-actions"><button type="button" class="secondary mini-action" data-wf-event="click" data-wf-code="addReceiptCustomField()">➕ إضافة بند مخصص</button></div>
    <div id="receiptFieldsList">${receiptFieldsRowsHtml(fields)}</div>
  </div></details></section>`;
}
function receiptFieldsRowsHtml(fields){
  return fields.map((f,i)=>`<div class="setting-row inline-edit-row">
    <label class="toggle-inline"><input type="checkbox" ${f.enabled!==false?"checked":""} title="إظهار/إخفاء البند ده في الإيصال" data-wf-event="change" data-wf-code="setReceiptFieldEnabled(${i},this.checked)"></label>
    <input type="text" class="inline-edit-input" value="${esc(f.label||"")}" data-wf-event="change" data-wf-code="renameReceiptField(${i},this.value)">
    ${!f.builtin?`<input type="text" class="inline-edit-input" placeholder="النص الثابت اللي هيظهر" value="${esc(f.staticText||"")}" data-wf-event="change" data-wf-code="setReceiptFieldText(${i},this.value)">`:""}
    <span class="compact-actions">
      <button type="button" class="secondary mini-action" ${i===0?"disabled":""} data-wf-event="click" data-wf-code="moveReceiptField(${i},-1)">⬆️</button>
      <button type="button" class="secondary mini-action" ${i===fields.length-1?"disabled":""} data-wf-event="click" data-wf-code="moveReceiptField(${i},1)">⬇️</button>
      ${!f.builtin?`<button type="button" class="danger-btn mini-action" data-wf-event="click" data-wf-code="confirmClick(this,()=>deleteReceiptField(${i}))">🗑️</button>`:""}
    </span>
  </div>`).join("");
}
function refreshReceiptFieldsList(){let h=document.getElementById("receiptFieldsList");if(h)h.innerHTML=receiptFieldsRowsHtml(ensureReceiptFields(settings()))}
// كانت بتتحفظ زي ما هي من غير trim: لوحة مفاتيح الموبايل (خصوصًا مع
// اقتراحات الكتابة بالعربي) بتضيف مسافة فاضية بعد الكلمة أحيانًا. لو
// المستخدم كتب حرف واتمسح وفضلت مسافة لوحدها، أو حتى مسافة بعد الاسم،
// كانت القيمة المخزنة تبقى مثلاً " " — وده نص "موجود" (truthy) لكن مفيش
// فيه حروف تتشاف، فكان بيظهر في الإيصال كعنوان فاضي بدل ما يرجع
// للاسم الافتراضي "الورشة الفنية" (لأن الشرط `info.name||"..."` بيشتغل
// بس لو القيمة "" بالظبط). هنا بنعمل trim وقت الحفظ نفسه عشان القيمة
// المخزنة تبقى نضيفة من الأساس.
function setReceiptInfo(key,val){let s=settings();s.receiptInfo=s.receiptInfo||{};s.receiptInfo[key]=String(val??"").trim();saveJSONSafe(K.s,s)}
function setReceiptFieldEnabled(i,val){let s=settings(),f=ensureReceiptFields(s);if(!f[i])return;f[i].enabled=!!val;saveJSONSafe(K.s,s)}
function renameReceiptField(i,val){let s=settings(),f=ensureReceiptFields(s);if(!f[i])return;f[i].label=val;saveJSONSafe(K.s,s)}
function setReceiptFieldText(i,val){let s=settings(),f=ensureReceiptFields(s);if(!f[i])return;f[i].staticText=val;saveJSONSafe(K.s,s)}
function moveReceiptField(i,dir){let s=settings(),f=ensureReceiptFields(s),j=i+dir;if(j<0||j>=f.length)return;[f[i],f[j]]=[f[j],f[i]];if(!saveJSONSafe(K.s,s))return;refreshReceiptFieldsList()}
function deleteReceiptField(i){let s=settings(),f=ensureReceiptFields(s);if(f[i]?.builtin)return;f.splice(i,1);if(!saveJSONSafe(K.s,s))return;refreshReceiptFieldsList()}
function addReceiptCustomField(){let s=settings(),f=ensureReceiptFields(s);f.push({id:"custom-"+id(),label:"بند جديد",enabled:true,builtin:false,staticText:""});if(!saveJSONSafe(K.s,s))return;refreshReceiptFieldsList()}
