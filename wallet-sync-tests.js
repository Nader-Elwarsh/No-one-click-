const fs=require('fs'),vm=require('vm'),assert=require('assert');
const store={};
const localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>delete store[k]};
const document={addEventListener:()=>{},getElementById:()=>null};
const window={localStorage,document,crypto:{randomUUID:()=>"id-"+Math.random()}};
const context={window,localStorage,document,crypto:window.crypto,console,alert:()=>{},confirm:()=>true};
const c=vm.createContext(context);
vm.runInContext(fs.readFileSync(`${__dirname}/shared-data.js`,'utf8'),c,{filename:'shared-data.js'});
context.K=window.K;context.arr=window.arr;context.get=window.get;context.put=window.put;context.esc=window.esc;
context.id=window.id||(()=>'id-'+Math.random());
vm.runInContext(fs.readFileSync(`${__dirname}/app-shared.js`,'utf8'),c,{filename:'app-shared.js'});
vm.runInContext(fs.readFileSync(`${__dirname}/wallets.js`,'utf8'),c,{filename:'wallets.js'});

// عربون أمر شغل جديد بيتسجل كحركة محفظة مربوطة بالأمر.
context.syncWalletForOrderDeposit({id:'r1',no:'W-1',deposit:100,depositWallet:'فودافون كاش'});
let list=JSON.parse(store[context.K.wtx]);
assert.strictEqual(list.length,1,'deposit sync creates one linked wallet tx');
assert.strictEqual(list[0].amount,100,'linked wallet tx starts with the order deposit amount');

// المستخدم يعدّل الحركة يدويًا من صفحة المحفظة (زي editWalletTx بالظبط:
// بيحط manualOverride:true لإن refKey موجود).
list[0].amount=130;list[0].manualOverride=true;
store[context.K.wtx]=JSON.stringify(list);

// حفظ تاني للأمر بنفس قيمة العربون الأصلية (100) - زي ما بيحصل لما تتعدل
// حاجة تانية في الأمر (قطعة غيار مثلًا) وتتسجل نفس بيانات العربون تاني.
context.syncWalletForOrderDeposit({id:'r1',no:'W-1',deposit:100,depositWallet:'فودافون كاش'});
list=JSON.parse(store[context.K.wtx]);
assert.strictEqual(list.length,1,'still exactly one wallet tx for this ref');
assert.strictEqual(list[0].amount,130,'manual correction must survive a later order resave, not get reverted to 100');

console.log('wallet-sync-tests: PASS');
