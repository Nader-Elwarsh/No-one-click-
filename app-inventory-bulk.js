/* app-inventory-bulk.js — تعديل أسعار المخزن بالجملة (كل الأصناف مرة واحدة):
   1) زيادة/خفض سعر الشراء و/أو سعر الاستخدام بنسبة % أو مبلغ ثابت.
   2) توحيد نسبة الربح: ضبط سعر الاستخدام لكل الأصناف بحيث يكون أعلى من
      سعر الشراء بنسبة واحدة تُكتب مرة واحدة. */
function updateBulkOpUI(){
  const opEl=document.getElementById("bulkOp");if(!opEl)return;
  const isMargin=opEl.value==="margin";
  document.getElementById("bulkFieldWrap")?.classList.toggle("hidden",isMargin);
  document.getElementById("bulkDirWrap")?.classList.toggle("hidden",isMargin);
  document.getElementById("bulkTypeWrap")?.classList.toggle("hidden",isMargin);
  document.getElementById("bulkValueWrap")?.classList.toggle("hidden",isMargin);
  document.getElementById("bulkMarginWrap")?.classList.toggle("hidden",!isMargin);
}
function applyBulkPriceChange(){
  const scope=document.getElementById("bulkScope")?.value||"";
  const op=document.getElementById("bulkOp")?.value||"adjust";
  const all=arr(K.p);
  const targets=all.filter(p=>!p.archived&&(!scope||p.category===scope));
  if(!targets.length){alert("لا توجد أصناف مطابقة لهذا النطاق.");return}
  if(op==="margin"){
    const pctEl=document.getElementById("bulkMarginValue");
    const pct=+pctEl?.value;
    if(pctEl?.value===""||Number.isNaN(pct)){alert("من فضلك أدخل نسبة الربح المطلوبة.");return}
    if(!confirm(`سيتم ضبط سعر الاستخدام لكل ${targets.length} صنف${scope?` في تصنيف «${scope}»`:" (كل الأصناف)"} بحيث يكون الربح ${pct}% فوق سعر الشراء لكل صنف.\n\nملحوظة: الأصناف اللي سعر شرائها 0 هتفضل سعر استخدامها 0.\n\nمتابعة؟`))return;
    targets.forEach(p=>{p.use=Math.round((+p.buy||0)*(1+pct/100)*100)/100});
  }else{
    const field=document.getElementById("bulkField")?.value||"use";
    const dir=document.getElementById("bulkDir")?.value||"up";
    const type=document.getElementById("bulkType")?.value||"pct";
    const valEl=document.getElementById("bulkValue");
    const val=+valEl?.value;
    if(!valEl?.value||Number.isNaN(val)||val<=0){alert("من فضلك أدخل قيمة التعديل.");return}
    const sign=dir==="up"?1:-1;
    const fields=field==="both"?["buy","use"]:[field];
    const fieldLabel=field==="both"?"سعر الشراء والاستخدام معًا":(field==="buy"?"سعر الشراء":"سعر الاستخدام");
    if(!confirm(`سيتم ${dir==="up"?"زيادة":"خفض"} ${fieldLabel} بمقدار ${val}${type==="pct"?"%":" ج"} لكل ${targets.length} صنف${scope?` في تصنيف «${scope}»`:" (كل الأصناف)"}.\n\nمتابعة؟`))return;
    targets.forEach(p=>{
      fields.forEach(f=>{
        const cur=+p[f]||0;
        const delta=type==="pct"?(cur*val/100):val;
        let next=cur+sign*delta;
        if(next<0)next=0;
        p[f]=Math.round(next*100)/100;
      });
    });
  }
  const saved=withRollback([K.p],()=>put(K.p,all)?{ok:true}:{ok:false});
  if(!saved?.ok)return;
  renderParts?.();
  refreshAllScreens?.();
  alert(`✅ تم تعديل ${targets.length} صنف بنجاح.`);
  document.getElementById("bulkPriceBox")?.classList.add("hidden");
}
function initInventoryBulk(){
  const box=document.getElementById("bulkPriceBox");if(!box)return;
  const scopeEl=document.getElementById("bulkScope");
  if(scopeEl)scopeEl.innerHTML='<option value="">🗂️ كل الأصناف</option>'+(settings().partCats||[]).map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  document.getElementById("bulkOp")?.addEventListener("change",updateBulkOpUI);
  updateBulkOpUI();
}
