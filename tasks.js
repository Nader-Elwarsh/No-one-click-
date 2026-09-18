/* =========================================================
   الورشة الفنية — المهام والمتابعة (tasks.js)
   =========================================================
   منقول من app.js زي ما هو بالظبط (بند 4: فصل app.js تدريجيًا). قسم
   مستقل منطقيًا عن الدورة الأساسية (عملاء/أجهزة/أوامر شغل)، بيستخدم بس
   customerName/fillCustomer (من shared-data.js/app.js) وK/arr/put/esc/id
   العامة. الترتيب في الصفحة: tasks.js قبل app.js.
   ========================================================= */

/* ---------------------------------------------------------------------
   📋 المهام والمتابعة: قسم مستقل عن الدورة الأساسية.
--------------------------------------------------------------------- */
function taskRows(){return arr(K.tasks).filter(x=>!x.deleted)}
function taskPriorityClass(p){return p==="عاجلة"?"negative":p==="عالية"?"high":""}
function saveTask(){
  let title=(document.getElementById("taskTitle")?.value||"").trim();
  if(!title)return alert("اكتب عنوان المهمة.");
  let t={
    id:id(),title,
    note:(document.getElementById("taskNote")?.value||"").trim(),
    date:document.getElementById("taskDate")?.value||localDateKey(new Date()),
    time:document.getElementById("taskTime")?.value||"",
    priority:document.getElementById("taskPriority")?.value||"عادية",
    customerId:document.getElementById("taskCustomer")?.value||"",
    requestId:document.getElementById("taskRequest")?.value||"",
    completed:false,createdAt:new Date().toISOString()
  };
  put(K.tasks,taskRows().concat(t));clearTaskForm();renderTasks();
}
function clearTaskForm(){
  ["taskTitle","taskNote","taskTime","taskCustomer","taskRequest"].forEach(idv=>{let e=document.getElementById(idv);if(e)e.value=""});
  let d=document.getElementById("taskDate");if(d)d.value=localDateKey(new Date());
  let p=document.getElementById("taskPriority");if(p)p.value="عادية";
}
function toggleTask(idv){
  let a=arr(K.tasks),t=a.find(x=>x.id===idv);if(!t)return;t.completed=!t.completed;t.completedAt=t.completed?new Date().toISOString():"";put(K.tasks,a);renderTasks();
}
function deleteTask(idv){
  let a=arr(K.tasks),t=a.find(x=>x.id===idv);if(!t)return;
  if(!confirm(`حذف المهمة «${t.title||""}»؟`))return;
  put(K.tasks,a.filter(x=>x.id!==idv));renderTasks();
}
function editTask(idv){
  let a=arr(K.tasks),t=a.find(x=>x.id===idv);if(!t)return;
  let title=prompt("عنوان المهمة:",t.title);if(title===null)return;
  let note=prompt("التفاصيل:",t.note||"");if(note===null)return;
  let date=prompt("التاريخ YYYY-MM-DD:",t.date||localDateKey(new Date()));if(date===null)return;
  let time=prompt("الوقت HH:MM (اختياري):",t.time||"");if(time===null)return;
  let priority=prompt("الأولوية (عادية / عالية / عاجلة):",t.priority||"عادية");if(priority===null)return;
  t.title=title.trim()||t.title;t.note=note.trim();t.date=date.trim()||t.date;t.time=time.trim();t.priority=priority.trim()||t.priority;
  put(K.tasks,a);renderTasks();
}
function renderTasks(){
  let el=document.getElementById("taskList");if(!el)return;
  let q=(document.getElementById("taskSearch")?.value||"").toLowerCase().trim(),
      filter=document.getElementById("taskFilter")?.value||"open",
      today=localDateKey(new Date());
  let rows=taskRows().filter(t=>{
    let text=(t.title+" "+t.note+" "+customerName(t.customerId)).toLowerCase();
    if(q&&!text.includes(q))return false;
    if(filter==="open"&&t.completed)return false;
    if(filter==="done"&&!t.completed)return false;
    if(filter==="today"&&t.date!==today)return false;
    if(filter==="overdue"&&(t.completed||!t.date||t.date>=today))return false;
    return true;
  }).sort((a,b)=>Number(a.completed)-Number(b.completed)||String(a.date||"").localeCompare(String(b.date||""))||String(a.time||"").localeCompare(String(b.time||"")));
  let open=taskRows().filter(x=>!x.completed).length,done=taskRows().filter(x=>x.completed).length;
  let stats=document.getElementById("taskStats");if(stats)stats.innerHTML=`<div class="compact-stats"><div class="stat"><b>${open}</b><span>مفتوحة</span></div><div class="stat"><b>${done}</b><span>مكتملة</span></div><div class="stat"><b>${taskRows().filter(x=>!x.completed&&x.date===today).length}</b><span>مهام اليوم</span></div><div class="stat"><b>${taskRows().filter(x=>!x.completed&&x.date&&x.date<today).length}</b><span>متأخرة</span></div></div>`;
  el.innerHTML=rows.length?rows.map(t=>{
    let c=t.customerId?customerName(t.customerId):"";
    let r=t.requestId?arr(K.r).find(x=>x.id===t.requestId):null;
    return `<div class="item record-card ${t.completed?"task-done":""}">
      <div class="card-side-actions">
        <button class="primary small-btn" type="button" data-wf-event="click" data-wf-code="toggleTask('${t.id}')">${t.completed?"↩️ إعادة فتح":"✅ مكتملة"}</button>
        <button class="secondary small-btn" type="button" data-wf-event="click" data-wf-code="editTask('${t.id}')">✏️ تعديل</button>
        <button class="danger-btn small-btn" type="button" data-wf-event="click" data-wf-code="deleteTask('${t.id}')">🗑️ حذف</button>
      </div>
      <div class="record-main">
        <div class="item-head"><b>${t.completed?"✅":"📋"} ${esc(t.title)}</b><span class="badge ${taskPriorityClass(t.priority)}">${esc(t.priority||"عادية")}</span></div>
        <div>📅 ${esc(t.date||"بدون تاريخ")}${t.time?" • ⏰ "+esc(t.time):""}${t.date&&t.date<today&&!t.completed?" • ⚠️ متأخرة":""}</div>
        ${c?`<div>👤 <a href="customer.html?id=${t.customerId}">${esc(c)}</a></div>`:""}
        ${r?`<div>🛠️ <a href="request.html?id=${r.id}">${esc(r.no)}</a></div>`:""}
        ${t.note?`<div>📝 ${esc(t.note)}</div>`:""}
      </div>
    </div>`;
  }).join(""):'<div class="item">لا توجد مهام بهذا الفلتر.</div>';
}
function initTasks(){
  if(!document.getElementById("taskList"))return;
  let d=document.getElementById("taskDate");if(d&&!d.value)d.value=localDateKey(new Date());
  let c=document.getElementById("taskCustomer"),r=document.getElementById("taskRequest");
  if(c){fillCustomer(c);c.onchange=()=>{if(r)fillTaskRequests(r,c.value)}}
  if(r)fillTaskRequests(r,c?.value||"");
  document.getElementById("taskSearch")?.addEventListener("input",renderTasks);
  document.getElementById("taskFilter")?.addEventListener("change",renderTasks);
  let qsf=new URLSearchParams(location.search).get("filter");if(qsf&&document.getElementById("taskFilter"))document.getElementById("taskFilter").value=qsf;
  renderTasks();
}
function fillTaskRequests(el,cid){
  if(!el)return;
  let rows=arr(K.r).filter(x=>!cid||x.customerId===cid);
  el.innerHTML='<option value="">بدون ربط بأمر شغل</option>'+rows.map(x=>`<option value="${x.id}">${esc(x.no)} — ${esc(customerName(x.customerId))}</option>`).join("");
}
