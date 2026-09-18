const fs=require('fs'),path=require('path'),assert=require('assert');
const root=__dirname;
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const htmlFiles=fs.readdirSync(root).filter(n=>n.endsWith('.html'));
assert(fs.existsSync(path.join(root,'PROJECT_STRUCTURE.md')),'project structure document is required');
assert(htmlFiles.includes('compcodes.html'),'compressor page must exist');
for(const name of htmlFiles){const s=read(name);if(name!=='compcodes.html')assert(!s.includes('compressor-db.js'),'compressor database must not load on unrelated pages')}
const comp=read('app-compressor-codes.js');
assert(comp.includes('_modelNorm'),'search records must precompute normalized model');
assert(comp.includes('searchCache'),'search cache must remain enabled');
assert(comp.includes('compressor-index.js')&&comp.includes('loadAllCompressorBrands'),'compressor database must load through index and lazy brand chunks');
assert(comp.includes('window.CompressorRef')&&comp.includes('ensureAll')&&comp.includes('isReady'),'compressor module must expose a lean public API for global search reuse');
assert(comp.includes('function computeAlternatives'),'compressor page must offer cross-brand spec-matched alternatives');
assert(comp.includes('للاسترشاد فقط'),'alternatives list must keep the non-certified disclaimer');
assert(comp.includes('function exportCustomCompressors')&&comp.includes('function importCustomCompressorsFile'),'custom compressor additions must be shareable like fault codes');
const gs=read('global-search.js');
assert(gs.includes('compressor:')&&gs.includes('CompressorRef'),'global search must include a lazy-loaded compressor category');
for(const page of ['index.html','settings.html','request.html','customers.html'])assert(read(page).includes('app-compressor-codes.js'),`compressor search API must be available on ${page} for the global search widget`);
const compHtml0=read('compcodes.html');
assert(compHtml0.includes('id="compExportCustom"')&&compHtml0.includes('id="compImportCustom"'),'compressor page must offer export/import for manual additions');
assert(read('settings.html').includes('data-action="backup"')&&!read('settings.html').includes('onclick="backupAllData()"'),'settings static controls must use delegated actions');
assert(fs.existsSync(path.join(root,'browser-smoke.sh')),'browser smoke test is required');
assert(fs.existsSync(path.join(root,'compressor-index.js')),'compressor index is required');
assert(fs.readdirSync(root).filter(n=>/^brand-\d+\.js$/.test(n)).length>=50,'split compressor brand files are required');
const sw=read('service-worker.js');
const cached=new Set((sw.match(/["']\.\/([\w.\-]+\.(?:html|js|css))["']/g)||[]).map(s=>s.slice(3,-1)));
const referenced=new Set();
for(const name of htmlFiles){
  const s=read(name);
  for(const m of s.matchAll(/(?:src|href)="([\w.\-]+\.(?:js|css))(?:\?[^"]*)?"/g))referenced.add(m[1]);
}
const uncached=[...referenced].filter(f=>!cached.has(f));
assert.strictEqual(uncached.length,0,`file(s) loaded by an HTML page but missing from service-worker.js offline cache: ${uncached.join(', ')}`);
console.log(`project-quality-check: PASS (${htmlFiles.length} HTML pages; lazy compressor DB verified)`);
