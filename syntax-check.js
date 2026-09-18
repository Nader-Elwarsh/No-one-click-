const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=__dirname;
const files=[];
function walk(dir){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name),st=fs.statSync(p);if(st.isDirectory()&&name!=='node_modules')walk(p);else if(st.isFile()&&p.endsWith('.js'))files.push(p)}}
walk(root);
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0){process.stderr.write(r.stderr||`Syntax error: ${file}\n`);process.exit(r.status||1)}}
console.log(`syntax-check: PASS (${files.length} JavaScript files)`);
