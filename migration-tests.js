const fs=require('fs'),vm=require('vm'),assert=require('assert');
const data={};const localStorage={getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)},removeItem:k=>delete data[k]};
const window={localStorage,crypto:{randomUUID:()=>"test"}};const context={window,localStorage,crypto:window.crypto,console,alert:()=>{}};const c=vm.createContext(context);
vm.runInContext(fs.readFileSync(`${__dirname}/shared-data.js`,'utf8'),c);
context.K=window.K;context.arr=window.arr;context.get=window.get;context.put=window.put;context.id=window.id;vm.runInContext(fs.readFileSync(`${__dirname}/image-store.js`,'utf8'),c);vm.runInContext(fs.readFileSync(`${__dirname}/migrations.js`,'utf8'),c);
assert.strictEqual(window.runMigrations(),window.runMigrations(),'migrations must share one promise');
Promise.resolve(window.workshopReady).then(ok=>{assert.strictEqual(ok,true);console.log('migration-single-flight-test: PASS')}).catch(e=>{console.error(e);process.exit(1)});
