const fs=require('fs'),vm=require('vm'),assert=require('assert');
function freshStore(seed){const store=Object.assign({},seed);
  const localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>delete store[k]};
  const document={addEventListener:()=>{},getElementById:()=>null};
  const window={localStorage,document,crypto:{randomUUID:()=>"id-"+Math.random()},ImageStore:null};
  const ctx={window,localStorage,document,crypto:window.crypto,console,alert:()=>{},confirm:()=>true};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(`${__dirname}/shared-data.js`,'utf8'),ctx,{filename:'shared-data.js'});
  ['K','arr','get','put','commitStorage','esc','id','defineOverride','refreshAllScreens','settings'].forEach(k=>ctx[k]=window[k]);
  vm.runInContext(fs.readFileSync(`${__dirname}/app-delete-tools.js`,'utf8'),ctx,{filename:'app-delete-tools.js'});
  vm.runInContext(fs.readFileSync(`${__dirname}/workshop-mini-enhancements.js`,'utf8'),ctx,{filename:'workshop-mini-enhancements.js'});
  return {store,ctx,window};
}

// حذف عميل (وبالتبعية جهازه وأمر شغله) لازم يمسح/يشيل حركات المحفظة
// المرتبطة بالأمر المحذوف (عربون/تحصيل نهائي)، وإلا تفضل ظاهرة في المحفظة
// كدخل حقيقي لأمر شغل بقى غير موجود أصلًا في النظام.
{
  const {store,ctx,window}=freshStore({});
  store[ctx.K.c]=JSON.stringify([{id:'c1',name:'Test Customer'}]);
  store[ctx.K.d]=JSON.stringify([{id:'d1',customerId:'c1',type:'AC'}]);
  store[ctx.K.r]=JSON.stringify([{id:'r1',customerId:'c1',deviceId:'d1',no:'W-1',parts:[]}]);
  store[ctx.K.wtx]=JSON.stringify([{id:'w1',refKey:'order-deposit-r1',deleted:false,amount:100,wallet:'كاش'}]);
  store[ctx.K.m]=JSON.stringify([]);store[ctx.K.p]=JSON.stringify([]);
  window.deleteCustomerRecord('c1');
  const wtx=JSON.parse(store[ctx.K.wtx]);
  assert.strictEqual(wtx[0].deleted,true,'deleting a customer must soft-delete wallet tx linked to its cascaded orders');
  assert.deepStrictEqual(JSON.parse(store[ctx.K.c]),[],'customer removed');
  assert.deepStrictEqual(JSON.parse(store[ctx.K.r]),[],'order removed');
  assert.deepStrictEqual(JSON.parse(store[ctx.K.d]),[],'device removed');
}

// نفس المبدأ لحذف جهاز لوحده (بدون حذف العميل).
{
  const {store,ctx,window}=freshStore({});
  store[ctx.K.c]=JSON.stringify([{id:'c1',name:'Test Customer'}]);
  store[ctx.K.d]=JSON.stringify([{id:'d1',customerId:'c1',type:'AC'}]);
  store[ctx.K.r]=JSON.stringify([{id:'r1',customerId:'c1',deviceId:'d1',no:'W-1',parts:[]}]);
  store[ctx.K.wtx]=JSON.stringify([{id:'w1',refKey:'order-final-r1',deleted:false,amount:50,wallet:'كاش'}]);
  store[ctx.K.m]=JSON.stringify([]);store[ctx.K.p]=JSON.stringify([]);
  window.deleteDeviceRecord('d1');
  const wtx=JSON.parse(store[ctx.K.wtx]);
  assert.strictEqual(wtx[0].deleted,true,'deleting a device must soft-delete wallet tx linked to its cascaded orders');
  assert.deepStrictEqual(JSON.parse(store[ctx.K.r]),[],'order removed');
  assert.deepStrictEqual(JSON.parse(store[ctx.K.d]),[],'device removed');
  assert.strictEqual(JSON.parse(store[ctx.K.c]).length,1,'customer itself stays');
}

// الحذف لازم يكون ذرّي: لو أي مفتاح فشل في الكتابة، مفيش تغيير يتنفذ خالص
// (مش نتيجة نص متسقة).
{
  const {store,ctx,window}=freshStore({});
  store[ctx.K.c]=JSON.stringify([{id:'c1',name:'Test Customer'}]);
  store[ctx.K.d]=JSON.stringify([{id:'d1',customerId:'c1',type:'AC'}]);
  store[ctx.K.r]=JSON.stringify([{id:'r1',customerId:'c1',deviceId:'d1',no:'W-1',parts:[]}]);
  store[ctx.K.wtx]=JSON.stringify([]);store[ctx.K.m]=JSON.stringify([]);store[ctx.K.p]=JSON.stringify([]);
  const originalSetItem=ctx.localStorage.setItem;
  let failNext=ctx.K.d;
  ctx.localStorage.setItem=(k,v)=>{if(k===failNext){failNext=null;throw new Error('simulated failure')}return originalSetItem(k,v)};
  window.deleteCustomerRecord('c1');
  assert.strictEqual(JSON.parse(store[ctx.K.c]).length,1,'customer must remain if the atomic commit failed partway');
  assert.strictEqual(JSON.parse(store[ctx.K.r]).length,1,'order must remain too — no partial cascade');
}

console.log('cascade-delete-wallet-cleanup-tests: PASS');
