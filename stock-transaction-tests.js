const fs=require('fs'),vm=require('vm'),assert=require('assert');
const store={wf_p:JSON.stringify([{id:'old',qty:2}]),wf_m:JSON.stringify([])};let failKey='wf_m';
const localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{if(k===failKey){failKey=null;throw new Error('simulated quota failure')}store[k]=String(v)},removeItem:k=>delete store[k]};
const window={localStorage,crypto:{randomUUID:()=>"test"}};const context={window,localStorage,crypto:window.crypto,console,alert:()=>{}};const c=vm.createContext(context);
vm.runInContext(fs.readFileSync(`${__dirname}/shared-data.js`,'utf8'),c);
const result=window.withRollback([window.K.p,window.K.m],()=>{assert(window.put(window.K.p,[{id:'new',qty:3}]));if(!window.put(window.K.m,[{id:'move',partId:'new',qty:1}]))return{ok:false};return{ok:true}});
assert.strictEqual(result.ok,false);assert.deepStrictEqual(JSON.parse(store.wf_p),[{id:'old',qty:2}]);assert.deepStrictEqual(JSON.parse(store.wf_m),[]);
console.log('stock-transaction-rollback-test: PASS');
