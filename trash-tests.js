const fs=require('fs'),vm=require('vm'),assert=require('assert');
function freshStore(){const store={};
  const localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>delete store[k]};
  const document={addEventListener:()=>{},getElementById:()=>null};
  const window={localStorage,document,crypto:{randomUUID:()=>"id-"+Math.random()},ImageStore:null};
  const ctx={window,localStorage,document,crypto:window.crypto,console,alert:()=>{},confirm:()=>true};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(`${__dirname}/shared-data.js`,'utf8'),ctx,{filename:'shared-data.js'});
  ['K','arr','get','put','commitStorage','esc','id','defineOverride','refreshAllScreens','settings'].forEach(k=>ctx[k]=window[k]);
  vm.runInContext(fs.readFileSync(`${__dirname}/app-trash.js`,'utf8'),ctx,{filename:'app-trash.js'});
  ctx.renderRequests=()=>{};ctx.document.getElementById=()=>null;
  ['pushToTrash','restoreFromTrash','permanentlyDeleteTrash','renderTrash','walletRefKeysForOrders','trashEntries'].forEach(k=>window[k]=ctx[k]);
  vm.runInContext(fs.readFileSync(`${__dirname}/app-delete-tools.js`,'utf8'),ctx,{filename:'app-delete-tools.js'});
  window.deleteRequestRecord=ctx.deleteRequestRecord;
  vm.runInContext(fs.readFileSync(`${__dirname}/workshop-mini-enhancements.js`,'utf8'),ctx,{filename:'workshop-mini-enhancements.js'});
  return {store,ctx,window};
}

// حذف أمر شغل واحد لازم يظهر في سلة المهملات، والاسترجاع لازم يرجّع الأمر
// وحركة القطعة وحركة المحفظة المرتبطة بيه بالظبط زي ما كانوا.
{
  const {store,ctx,window}=freshStore();
  store[ctx.K.r]=JSON.stringify([{id:'r1',no:'W-1',parts:[{partId:'p1',qty:2,external:false}]}]);
  store[ctx.K.p]=JSON.stringify([{id:'p1',name:'ثرموستات',qty:3}]);
  store[ctx.K.m]=JSON.stringify([{id:'mv1',requestId:'r1',type:'out',partId:'p1',qty:2}]);
  store[ctx.K.wtx]=JSON.stringify([{id:'w1',refKey:'order-deposit-r1',deleted:false,amount:80,wallet:'كاش'}]);
  window.deleteRequestRecord('r1');
  assert.deepStrictEqual(JSON.parse(store[ctx.K.r]),[],'order removed from live data');
  assert.strictEqual(JSON.parse(store[ctx.K.p])[0].qty,5,'part qty restocked (3+2)');
  assert.strictEqual(JSON.parse(store[ctx.K.wtx])[0].deleted,true,'linked wallet tx soft-deleted');
  let trash=window.trashEntries();
  assert.strictEqual(trash.length,1,'one trash entry created');
  assert.strictEqual(trash[0].type,'request');

  window.restoreFromTrash(trash[0].id);
  assert.strictEqual(JSON.parse(store[ctx.K.r]).length,1,'order restored');
  assert.strictEqual(JSON.parse(store[ctx.K.r])[0].id,'r1');
  assert.strictEqual(JSON.parse(store[ctx.K.p])[0].qty,3,'part qty correctly subtracted back (5-2)');
  assert.strictEqual(JSON.parse(store[ctx.K.wtx])[0].deleted,false,'linked wallet tx un-deleted');
  assert.strictEqual(JSON.parse(store[ctx.K.m]).length,1,'stock move restored');
  assert.strictEqual(window.trashEntries().length,0,'trash entry consumed after restore');
}

// نفس المبدأ لحذف/استرجاع عميل كامل (بتبعية جهاز وأمر شغل).
{
  const {store,ctx,window}=freshStore();
  store[ctx.K.c]=JSON.stringify([{id:'c1',name:'أحمد'}]);
  store[ctx.K.d]=JSON.stringify([{id:'d1',customerId:'c1',type:'AC'}]);
  store[ctx.K.r]=JSON.stringify([{id:'r1',customerId:'c1',deviceId:'d1',no:'W-1',parts:[]}]);
  store[ctx.K.wtx]=JSON.stringify([{id:'w1',refKey:'order-final-r1',deleted:false,amount:200,wallet:'كاش'}]);
  store[ctx.K.m]=JSON.stringify([]);store[ctx.K.p]=JSON.stringify([]);
  window.deleteCustomerRecord('c1');
  assert.strictEqual(window.trashEntries().length,1);
  assert.strictEqual(window.trashEntries()[0].type,'customer');

  window.restoreFromTrash(window.trashEntries()[0].id);
  assert.strictEqual(JSON.parse(store[ctx.K.c]).length,1,'customer restored');
  assert.strictEqual(JSON.parse(store[ctx.K.d]).length,1,'device restored');
  assert.strictEqual(JSON.parse(store[ctx.K.r]).length,1,'order restored');
  assert.strictEqual(JSON.parse(store[ctx.K.wtx])[0].deleted,false,'wallet tx un-deleted');
}

// حذف نهائي من سلة المهملات لازم يشيل السجل من غير ما يلمس أي بيانات حية.
{
  const {store,ctx,window}=freshStore();
  store[ctx.K.r]=JSON.stringify([{id:'r1',no:'W-1',parts:[]}]);
  store[ctx.K.p]=JSON.stringify([]);store[ctx.K.m]=JSON.stringify([]);store[ctx.K.wtx]=JSON.stringify([]);
  window.deleteRequestRecord('r1');
  const tid=window.trashEntries()[0].id;
  window.permanentlyDeleteTrash(tid);
  assert.strictEqual(window.trashEntries().length,0,'trash entry permanently removed');
}

console.log('trash-tests: PASS');
