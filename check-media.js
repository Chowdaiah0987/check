// Check local /uploads references in root-level JSON snapshots against the bundled uploads directory.
const fs=require('fs'),path=require('path');
const root=__dirname, dir=path.join(root,'uploads');
const names=['subjects','modules','experiments','subexperiments','projects','resources','tools'];
const refs=new Set();
function walk(x){if(Array.isArray(x))return x.forEach(walk);if(x&&typeof x==='object')return Object.values(x).forEach(walk);if(typeof x==='string'){for(const m of x.matchAll(/\/uploads\/([\w.-]+)/g))refs.add(m[1])}}
for(const n of names){const f=path.join(root,n+'.json');if(!fs.existsSync(f))continue;try{walk(JSON.parse(fs.readFileSync(f,'utf8')))}catch(e){console.error(`${n}.json: invalid JSON: ${e.message}`);process.exitCode=1}}
const missing=[...refs].filter(n=>!fs.existsSync(path.join(dir,n)));
console.log(`Checked ${refs.size} unique local media reference(s).`);
if(missing.length){console.error('Missing files:');missing.forEach(n=>console.error(' - '+n));process.exitCode=1}else console.log('All local media references in JSON snapshots exist.');
