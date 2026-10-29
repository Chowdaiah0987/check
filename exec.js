// Code execution engine. Two modes:
//  1) local Docker  - each run is a throw-away container (no network, read-only FS, non-root, CPU/mem/pid/time/output limits)
//  2) remote runner - set EXEC_RUNNER_URL (+ EXEC_RUNNER_TOKEN) to forward runs to runner.js on a Docker-capable host
// User code is NEVER executed inside the Express process.
const {spawn,execFile}=require('child_process'),os=require('os'),path=require('path'),fs=require('fs'),crypto=require('crypto');
const sh=(a,b)=>['sh','-c',`${a} || exit 97; exec ${b}`]; // exit 97 = compilation failed
const RT={python:{img:'python:3.12-slim',file:'main.py',cmd:['python','/work/main.py'],mem:'128m',ms:10000},
 javascript:{img:'node:20-alpine',file:'main.js',cmd:['node','/work/main.js'],mem:'192m',ms:10000},
 java:{img:'eclipse-temurin:21-jdk',file:'Main.java',cmd:sh('javac -d /tmp/o /work/Main.java','java -Xmx128m -cp /tmp/o Main'),mem:'384m',ms:25000},
 c:{img:'gcc:13',file:'main.c',cmd:sh('gcc -O1 -o /tmp/a.out /work/main.c -lm','/tmp/a.out'),mem:'256m',ms:20000},
 cpp:{img:'gcc:13',file:'main.cpp',cmd:sh('g++ -O1 -std=c++17 -o /tmp/a.out /work/main.cpp','/tmp/a.out'),mem:'256m',ms:20000}};
const SUPPORTED=Object.keys(RT),MAXOUT=64*1024,MAXIN=10*1024,MAXCODE=100000;
const RUNNER_URL=(process.env.EXEC_RUNNER_URL||'').replace(/\/+$/,''),RUNNER_TOKEN=process.env.EXEC_RUNNER_TOKEN||'';
const LOCAL=process.env.EXEC_LOCAL==='true'&&!RUNNER_URL,ENABLED=process.env.EXECUTION_ENABLED==='true'||!!RUNNER_URL||LOCAL,DOCKER=process.env.DOCKER_BIN||'docker';
const httpErr=(s,m)=>Object.assign(new Error(m),{status:s});

// docker CLI call that keeps stderr so failures can be explained instead of swallowed
const dk=(a,t=8000)=>new Promise(r=>execFile(DOCKER,a,{timeout:t},(e,o,se)=>r({ok:!e,out:String(o||''),err:String(se||''),code:e&&e.code,killed:!!(e&&e.killed)})));
function why(r){const t=r.err.trim().split('\n').filter(Boolean).slice(0,2).join(' ').slice(0,200);
 if(r.code==='ENOENT')return`the "${DOCKER}" command was not found on the server. Install Docker there, or set EXEC_RUNNER_URL to use a separate runner service`;
 if(r.killed)return'the Docker daemon did not answer within 8 seconds';
 if(/permission denied/i.test(r.err))return'Docker is installed but this server process may not use it (permission denied on the Docker socket; add the user to the "docker" group)';
 if(/cannot connect|is the docker daemon running|error during connect|pipe\/docker|no such file or directory/i.test(r.err))return'the Docker daemon is not running (start Docker Desktop, or run "sudo systemctl start docker")';
 return t||'unknown Docker error'}

let cache={at:0,v:null},lastMsg='';
async function dockerStatus(){const i=await dk(['info','--format','{{.ServerVersion}}']);
 if(!i.ok)return{available:false,languages:[],message:'Docker is not reachable from the server: '+why(i)};
 const l=[];for(const k of SUPPORTED)if((await dk(['image','inspect',RT[k].img,'--format','ok'])).ok)l.push(k);
 return{available:l.length>0,languages:l,message:l.length?'':'Docker is running but the runtime images are not pulled yet (see README: docker pull ...)'}}
async function remoteStatus(){try{const r=await fetch(RUNNER_URL+'/status',{headers:{Authorization:'Bearer '+RUNNER_TOKEN},signal:AbortSignal.timeout(6000)});
  const j=await r.json().catch(()=>({}));
  if(r.status===401||r.status===403)return{available:false,languages:[],message:'The execution service rejected the access token (check EXEC_RUNNER_TOKEN)'};
  if(!r.ok)return{available:false,languages:[],message:'The execution service answered HTTP '+r.status};
  return{available:!!j.available,languages:Array.isArray(j.languages)?j.languages.filter(x=>RT[x]):[],message:j.message||''}}
 catch(e){return{available:false,languages:[],message:'The execution service at '+RUNNER_URL+' is not reachable ('+(e.name==='TimeoutError'?'timed out':e.cause&&e.cause.code||e.message)+')'}}}
// status(force): healthy answers are cached 30 s; failures only 3 s so a retry after starting Docker works at once
async function status(force){const base={supported:SUPPORTED,mode:RUNNER_URL?'runner':LOCAL?'local':'docker'};
 if(!ENABLED)return{...base,mode:'disabled',available:false,languages:[],message:'Code execution is switched off on this server (set EXECUTION_ENABLED=true and install Docker, or set EXEC_RUNNER_URL)'};
 const ttl=cache.v&&cache.v.available?30000:3000;if(!force&&cache.v&&Date.now()-cache.at<ttl)return cache.v;
 const v={...base,...await(RUNNER_URL?remoteStatus():LOCAL?localStatus():dockerStatus())};cache={at:Date.now(),v};
 if(!v.available&&v.message!==lastMsg)console.warn('[exec] '+v.message);lastMsg=v.available?'':v.message;return v}

let running=0;

// ---- LOCAL mode (EXEC_LOCAL=true): runs programs with the compilers/interpreters installed on this computer, NO Docker. ----
// NOT a sandbox: the program runs as the same OS user as the server (no filesystem/network isolation, no memory cap).
// Still enforced: separate child process (never inside Express), time limit, output cap, empty environment (no DB passwords), temp folder.
const isWin=process.platform==='win32',EXE=isWin?'.exe':'';
const LR={python:{cands:[['python3'],['python'],['py','-3']],file:'main.py',ms:10000},javascript:{cands:[[process.execPath]],file:'main.js',ms:10000},
 java:{cands:[['javac']],run:['java'],file:'Main.java',ms:25000},c:{cands:[['gcc']],file:'main.c',ms:20000},cpp:{cands:[['g++']],file:'main.cpp',ms:20000}};
const lenv=d=>({PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:d,TMP:d,TMPDIR:d,HOME:d,USERPROFILE:d,LANG:'C.UTF-8',PYTHONIOENCODING:'utf-8',PYTHONDONTWRITEBYTECODE:'1'});
function sp(cmd,args,{cwd,stdin='',ms}){return new Promise(res=>{let out='',err='',tout=false,trunc=false,done=false;
 const p=spawn(cmd,args,{cwd,env:lenv(cwd),stdio:['pipe','pipe','pipe'],detached:!isWin,windowsHide:true});
 const kill=()=>{try{isWin?execFile('taskkill',['/pid',String(p.pid),'/T','/F'],()=>{}):process.kill(-p.pid,'SIGKILL')}catch{try{p.kill('SIGKILL')}catch{}}};
 const timer=setTimeout(()=>{tout=true;kill()},ms),fin=c=>{if(done)return;done=true;clearTimeout(timer);res({out,err,code:c,tout,trunc})};
 const add=k=>d=>{if(out.length+err.length<MAXOUT){k?out+=d.toString():err+=d.toString()}else if(!trunc){trunc=true;kill()}};
 p.stdout.on('data',add(1));p.stderr.on('data',add(0));p.stdin.on('error',()=>{});p.on('error',e=>{err+=e.code==='ENOENT'?'Program not found: '+cmd:e.message;fin(-1)});p.on('close',c=>fin(c));p.stdin.end(stdin)})}
const probe=(c,a=['--version'])=>new Promise(r=>execFile(c,a,{timeout:5000,windowsHide:true},e=>r(!e)));
let found=null;
async function localTools(){if(found)return found;const f={};
 for(const [k,x] of Object.entries(LR)){for(const c of x.cands){if(await probe(c[0],k==='java'?['-version']:c[0]===process.execPath?['-v']:[...c.slice(1),'--version'])){f[k]=c;break}}
  if(f[k]&&k==='java'&&!await probe('java',['-version']))delete f[k]}
 return found=f}
async function localStatus(){const f=await localTools(),l=Object.keys(f);
 return{available:l.length>0,languages:l,message:l.length?'':'No supported compiler/interpreter (python, node, gcc, g++, javac+java) was found on this computer. Install one and restart the server'}}
async function runLocalProc(lang,code,stdin){const x=LR[lang],t=(await localTools())[lang];
 if(running>=2)throw httpErr(429,'Execution is busy. Try again in a moment.');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dsdl-')),t0=Date.now();running++;
 try{fs.writeFileSync(path.join(dir,x.file),code);const o={cwd:dir,stdin,ms:x.ms};let r,cmp=null;
  if(lang==='python')r=await sp(t[0],[...t.slice(1),x.file],o);
  else if(lang==='javascript')r=await sp(t[0],[x.file],o);
  else{const bin=lang==='java'?null:'a'+EXE;cmp=await sp(t[0],lang==='java'?[x.file]:[x.file,'-O1','-o',bin,...(lang==='cpp'?['-std=c++17']:['-lm'])],{cwd:dir,ms:x.ms});
   if(cmp.code!==0&&!cmp.tout)return{status:'compile_error',stdout:'',stderr:(cmp.out+cmp.err).slice(0,MAXOUT),exitCode:cmp.code,timedOut:false,ms:Date.now()-t0};
   r=cmp.tout?cmp:await sp(...(lang==='java'?['java',['-Xmx256m','-cp','.','Main'],o]:[path.join(dir,bin),[],o]))}
  const status=r.tout?'timeout':r.code===0?'success':(lang==='python'&&/SyntaxError|IndentationError|TabError/.test(r.err))?'compile_error':'runtime_error';
  return{status,stdout:r.out.slice(0,MAXOUT),stderr:r.err.slice(0,MAXOUT)+(r.tout?`\n[Stopped: exceeded ${x.ms/1000}s time limit]`:'')+(r.trunc?'\n[Output truncated at 64 KB]':''),exitCode:r.tout?124:r.code,timedOut:r.tout,ms:Date.now()-t0}}
 finally{running--;fs.rmSync(dir,{recursive:true,force:true})}}
async function runLocal(lang,code,stdin){const rt=RT[lang];
 if(running>=2)throw httpErr(429,'Execution is busy. Try again in a moment.');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dsdl-')),name='dsdl-'+crypto.randomUUID(),fp=path.join(dir,rt.file);fs.writeFileSync(fp,code);fs.chmodSync(dir,0o755);fs.chmodSync(fp,0o644);
 running++;const t0=Date.now();let out='',err='',trunc=false,tout=false;
 try{const p=spawn(DOCKER,['run','-i','--rm','--name',name,'--network','none','--memory',rt.mem,'--memory-swap',rt.mem,'--cpus','0.5','--pids-limit','64','--read-only','--tmpfs','/tmp:rw,exec,size=64m','--cap-drop','ALL','--security-opt','no-new-privileges','--user','65534:65534','--pull','never','-v',dir+':/work:ro','-w','/tmp',rt.img,...rt.cmd],{stdio:['pipe','pipe','pipe']});
  const kill=()=>{execFile(DOCKER,['kill',name],()=>{});p.kill('SIGKILL')},timer=setTimeout(()=>{tout=true;kill()},rt.ms);
  const add=k=>d=>{if(out.length+err.length<MAXOUT){k?out+=d.toString():err+=d.toString()}else if(!trunc){trunc=true;kill()}};
  p.stdout.on('data',add(1));p.stderr.on('data',add(0));p.stdin.on('error',()=>{});p.stdin.end(stdin);
  let spawnFail=false;const exit=await new Promise(res=>{p.on('close',c=>res(c));p.on('error',e=>{spawnFail=true;err+=e.code==='ENOENT'?'Docker command not found on the server.':e.message;res(-1)})});
  clearTimeout(timer);
  if(spawnFail||/Cannot connect to the Docker daemon|error during connect/i.test(err)){cache={at:0,v:null};throw httpErr(503,'Docker stopped responding while starting the run: '+err.trim().slice(0,200))}
  const status=tout?'timeout':exit===0?'success':(exit===97||(lang==='python'&&/SyntaxError|IndentationError|TabError/.test(err)))?'compile_error':'runtime_error';
  return{status,stdout:out.slice(0,MAXOUT),stderr:err.slice(0,MAXOUT)+(tout?`\n[Stopped: exceeded ${rt.ms/1000}s time limit]`:'')+(trunc?'\n[Output truncated at 64 KB]':''),exitCode:tout?124:exit,timedOut:tout,ms:Date.now()-t0}}
 finally{running--;fs.rmSync(dir,{recursive:true,force:true})}}
async function runRemote(lang,code,stdin){try{const r=await fetch(RUNNER_URL+'/run',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+RUNNER_TOKEN},body:JSON.stringify({language:lang,code,stdin}),signal:AbortSignal.timeout(RT[lang].ms+15000)});
  const j=await r.json().catch(()=>({}));if(!r.ok){cache={at:0,v:null};throw httpErr(r.status===401||r.status===403?503:r.status,r.status===401||r.status===403?'The execution service rejected the access token (check EXEC_RUNNER_TOKEN)':j.error||'The execution service failed (HTTP '+r.status+')')}return j}
 catch(e){if(e.status)throw e;cache={at:0,v:null};throw httpErr(503,'The execution service is not reachable ('+(e.name==='TimeoutError'?'timed out':e.cause&&e.cause.code||e.message)+')')}}

// validate + run. Throws errors carrying .status for the HTTP layer.
async function run(lang,code,stdin){lang=String(lang||'');code=String(code??'');stdin=String(stdin??'');
 if(!RT[lang])throw httpErr(400,'Execution is supported for: '+SUPPORTED.join(', '));if(!code.trim())throw httpErr(400,'No code to run');
 if(code.length>MAXCODE)throw httpErr(400,'Code too large (max 100 KB)');if(stdin.length>MAXIN)throw httpErr(400,'Input too large (max 10 KB)');
 let st=await status(false);if(!st.available)st=await status(true); // never trust a cached failure: re-check on every retry
 if(!st.available)throw httpErr(503,'Code execution is unavailable: '+st.message);
 if(!st.languages.includes(lang))throw httpErr(503,'The '+lang+' runtime is not installed on the execution server (install it, or see README)');
 return RUNNER_URL?runRemote(lang,code,stdin):LOCAL?runLocalProc(lang,code,stdin):runLocal(lang,code,stdin)}

// Express wiring (shared by server.js)
function mount(api,{wrap,requireAdmin}){const PERMIN=+process.env.EXEC_PER_MIN||12,hits=new Map();
 setInterval(()=>{for(const [k,v] of hits)if(!v.some(t=>Date.now()-t<60000))hits.delete(k)},60000).unref();
 const tooMany=ip=>{const n=Date.now(),a=(hits.get(ip)||[]).filter(t=>n-t<60000);a.push(n);hits.set(ip,a);return a.length>PERMIN};
 const gate=process.env.EXEC_ADMIN_ONLY==='true'?requireAdmin:(q,r,n)=>n();
 api.get('/execute/status',wrap(async(q,r)=>r.json(await status(q.query.fresh==='1'))));
 api.post('/execute',gate,wrap(async(q,r)=>{const b=q.body||{};
  if(tooMany(q.ip))return r.status(429).json({error:`Rate limit reached (${PERMIN} runs per minute). Please wait a moment.`});
  r.json(await run(b.language,b.code,b.stdin))}))}
module.exports={mount,run,status,SUPPORTED,RT};
