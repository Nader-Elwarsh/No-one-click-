(function(){
  // كانت الكلمة "الورشة الفنية" هنا مكتوبة حرفيًا (hardcoded) في 4 أماكن،
  // من غير أي علاقة باسم الورشة اللي المستخدم بيحدده في الإعدادات. الأثر
  // العملي: زرار "🖨️ طباعة الإيصال" بيعمل عنوان عام هنا (printTarget)
  // فوق محتوى الإيصال الحقيقي مباشرة — فكان بيظهر "الورشة الفنية —
  // إيصال ..." كأول سطر دايمًا مهما كان اسم الورشة المحفوظ في الإعدادات،
  // وده اللي كان بيدّي انطباع إن الاسم "مش بيتغيّر أبدًا" رغم إن محتوى
  // الإيصال نفسه (buildReceiptHtml) كان صحيح فعلًا تحته. هنا بنقرأ نفس
  // الاسم المحفوظ في settings().receiptInfo.name (بنفس منطق trim+الرجوع
  // للاسم الافتراضي المستخدم في كل مكان تاني بالنظام) بدل النص الثابت.
  function workshopBrandName(){
    try{
      const info=(typeof settings==="function"?settings():{}).receiptInfo||{};
      return (info.name||"").trim()||"الورشة الفنية";
    }catch(e){return "الورشة الفنية"}
  }
  function pageTitle(){return document.title.replace(/\s*\|.*$/,'').trim()||workshopBrandName()}
  function cleanClone(root){
    const clone=root.cloneNode(true);
    clone.querySelectorAll('button,input,select,textarea,form,.ps-inline-actions,.card-side-actions,.compact-actions,.actions,.section-actions,.quick-add,.no-print').forEach(x=>x.remove());
    return clone;
  }
  function cleanText(root,title){
    const clone=cleanClone(root||document.querySelector('main')||document.body);
    const text=(clone.innerText||clone.textContent||'').replace(/\n{3,}/g,'\n\n').trim();
    return title?`${workshopBrandName()} — ${title}\n\n${text}`:text;
  }
  function printTarget(btn){
    const target=btn?.closest('.ps-context-target')||document.querySelector('main');
    if(!target)return;
    const title=target.dataset.psTitle||pageTitle();
    const area=document.createElement('div');area.id='psPrintArea';area.className='ps-print-area';
    // الإيصال عنده رأسه الكامل الخاص بيه فعلًا (اسم الورشة + التليفون +
    // العنوان، جوه .receipt-head) — إضافة عنوان عام هنا فوقه كان بيكرر
    // اسم الورشة مرتين على الورقة، فبنتجاهل العنوان العام في الحالة دي بس.
    if(!target.querySelector('.receipt-head')){
      const h=document.createElement('div');h.className='ps-print-heading';h.textContent=workshopBrandName()+' — '+title;
      area.appendChild(h);
    }
    area.appendChild(cleanClone(target));
    document.body.appendChild(area);document.body.classList.add('ps-printing');
    const cleanup=()=>{document.body.classList.remove('ps-printing');area.remove();window.removeEventListener('afterprint',cleanup)};
    window.addEventListener('afterprint',cleanup);window.print();setTimeout(cleanup,1200);
  }
  async function shareTarget(btn){
    const target=btn?.closest('.ps-context-target')||document.querySelector('main');
    if(!target)return;
    const title=target.dataset.psTitle||pageTitle();
    let text=cleanText(target,title);if(text.length>7000)text=text.slice(0,7000)+'\n…';
    if(navigator.share){try{await navigator.share({title:workshopBrandName()+' — '+title,text})}catch(e){if(e?.name!=='AbortError')copyFallback(text)}}else copyFallback(text);
  }
  function copyFallback(text){
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>alert('تم نسخ المحتوى. يمكنك مشاركته من أي تطبيق.')).catch(()=>legacyCopy(text));
    else legacyCopy(text);
  }
  function legacyCopy(text){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();alert('تم نسخ المحتوى. يمكنك مشاركته من أي تطبيق.')}
  function makeActions(title){return `<span class="ps-inline-actions no-print" aria-label="إجراءات الطباعة والمشاركة"><button type="button" class="ps-icon-btn" title="طباعة" aria-label="طباعة" data-wf-event="click" data-wf-code="printWorkshopTarget(this)">🖨️</button><button type="button" class="ps-icon-btn" title="مشاركة" aria-label="مشاركة" data-wf-event="click" data-wf-code="shareWorkshopTarget(this)">↗️</button></span>`}
  // كانت الدالة دي متعرّفة من غير أي استدعاء فعلي؛ psActions (في
  // app-customers.js) عندها نسخة احتياطية inline من غير aria-label لو
  // window.psInlineActions مش موجودة. بربطها هنا، كل نداءات psActions
  // في النظام بتاخد نفس النسخة المتاحة لقارئ الشاشة بدل التكرار الناقص.
  window.psInlineActions=makeActions;
  window.psCopyFallback=copyFallback;
  window.printWorkshopTarget=printTarget;window.shareWorkshopTarget=shareTarget;
  window.printWorkshopPage=()=>window.print();window.shareWorkshopPage=()=>shareTarget({closest:()=>document.querySelector('main')});
})();
