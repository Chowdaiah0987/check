const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=u=>esc(/^(https?:\/\/|\/uploads\/|\/files\/[a-f0-9]{24}$)/i.test(u||'')?u:'#');let me=null;const admin=()=>me&&me.role==='admin';
async function api(u,o={}){const b=o.body,h={};if(b&&!(b instanceof FormData))h['Content-Type']='application/json';
 const r=await fetch('/api'+u,{method:o.method||'GET',headers:h,credentials:'same-origin',body:b instanceof FormData?b:b?JSON.stringify(b):undefined});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Request failed ('+r.status+')');return j}
const toast=(m,e)=>{const t=$('#toast');t.textContent=m;t.className='show'+(e?' err':'');clearTimeout(toast.t);toast.t=setTimeout(()=>t.className='',3500)};
document.addEventListener('error',e=>{if(e.target.tagName==='IMG')e.target.remove()},true);
const F=(k,l,t,r)=>({k,l,t,r}),D=F('description','Short description','textarea'),LG=['python','java','c','cpp','javascript','r','sql','other'];
const lk=(l,u)=>u?`<a class="btn ghost sm" href="${safe(u)}" target="_blank" rel="noopener noreferrer">${l}</a>`:'';
const dl=u=>/^\/files\/[a-f0-9]{24}$/.test(u||'')?u+'?download=1':/^https:\/\/res\.cloudinary\.com\//i.test(u||'')?String(u).replace(/\/(image|raw|video)\/upload\//,'/$1/upload/fl_attachment/'):u;
<<<<<<< HEAD
const pdfView=(u,title)=>{if(!u)return'';const s=safe(u);return `<div class="pdfbox" data-pdf="${s}"><iframe class="pdf" src="${s}#toolbar=1&navpanes=0&view=FitH" title="${esc(title||'PDF document')}" loading="lazy"></iframe><div class="pdfbar"><a class="btn sm" href="${s}" target="_blank" rel="noopener noreferrer">Open PDF in new tab</a><a class="btn ghost sm" href="${safe(dl(u))}" download>Download</a><span class="meta">If the preview stays blank, use “Open PDF in new tab”.</span></div></div>`};
=======
const pdfView=(u,title)=>{if(!u)return'';const s=safe(u);return `<div class="pdfbox"><iframe class="pdf" src="${s}#toolbar=1&navpanes=0&view=FitH" title="${esc(title||'PDF document')}" loading="lazy"></iframe><div class="pdfbar"><a class="btn sm" href="${s}" target="_blank" rel="noopener noreferrer">Open PDF in new tab</a><a class="btn ghost sm" href="${safe(dl(u))}" download>Download</a><span class="meta">If the preview stays blank, use “Open PDF in new tab”.</span></div></div>`};
>>>>>>> b2873161d522dd96727cdbad94f38e7d98e21836
const ENT={
subjects:{t:'Subjects',n:'Subject',f:[F('name','Name','text',1),F('code','Subject code'),F('category','Category'),D,F('cover','Cover image (png/jpg/webp)','file')],
 card:x=>({t:x.name,s:x.description,m:[x.code,x.category],img:x.cover,href:'#/subjects/'+x._id})},
experiments:{t:'Experiments',n:'Experiment',f:[F('number','Experiment number','number',1),F('name','Name','text',1),D,F('objective','Objective','textarea'),F('cover','Cover image','file'),F('videoUrl','Video upload or URL','video'),F('github','GitHub repository URL','url'),F('notes','Notes','textarea')],
 card:x=>({t:`Experiment ${x.number}: ${x.name}`,s:x.description,img:x.cover,href:'#/experiments/'+x.number,
 chips:(x.subs||[]).map(s=>`<a href="#/experiments/${x.number}/sub-experiments/${s.label.toLowerCase()}">${esc(s.label)}</a>`).join('')})},
projects:{t:'Projects',n:'Project',f:[F('name','Title','text',1),D,F('details','Detailed description','textarea'),F('category','Category'),F('tags','Technologies (comma separated)','list'),F('status','Status'),F('cover','Cover image','file'),F('github','GitHub URL','url'),F('demoUrl','Live demo URL','url'),F('doc','Report / documentation (PDF)','file')],
 card:x=>({t:x.name,s:x.description,img:x.cover,m:[x.category,x.status],tags:x.tags,links:lk('GitHub',x.github)+lk('Live demo',x.demoUrl)+lk('Report',x.doc)})},
resources:{t:'Resources',n:'Resource',f:[F('name','Title','text',1),D,F('category','Category'),F('url','Resource URL','url'),F('videoUrl','Video URL','url'),F('doc','PDF / document','file'),F('tags','Tags (comma separated)','list'),F('relatedSubject','Related subject')],
 card:x=>({t:x.name,s:x.description,m:[x.category,x.relatedSubject,'Added '+new Date(x.createdAt).toLocaleDateString()],tags:x.tags,links:lk('Open',x.url)+lk('Watch video',x.videoUrl)+lk('View PDF',x.doc)})},
tools:{t:'Tools',n:'Tool',f:[F('name','Name','text',1),D,F('category','Category'),F('url','Official website','url'),F('docsUrl','Documentation URL','url'),F('videoUrl','Tutorial / video URL','url'),F('icon','Icon image','file'),F('tags','Tags (comma separated)','list')],
 card:x=>({t:x.name,s:x.description,img:x.icon,m:[x.category],tags:x.tags,links:lk('Website',x.url)+lk('Docs',x.docsUrl)+lk('Tutorial',x.videoUrl)})},
modules:{n:'Module',f:[F('name','Module name','text',1),D,F('pdf','PDF document','file'),F('videoUrl','Video URL','url'),F('topics','Important topics (comma separated)','list'),F('notes','Additional notes','textarea')]},
subs:{n:'Sub-experiment',f:[F('name','Name','text',1),D,F('language','Language',LG),F('videoUrl','Video URL','url'),F('notes','Notes','textarea')]},
profile:{n:'Profile',f:[F('name','Full name','text',1),F('rollNo','Roll number'),F('faculty','Faculty / mentor'),F('degree','Degree'),F('department','Department'),F('institution','Institution'),F('semester','Year / semester'),F('github','GitHub URL','url'),F('linkedin','LinkedIn URL','url'),F('skills','Skills (comma separated)','list'),F('bio','Biography','textarea'),F('photo','Profile photo','file')]}};
const upl=(file,prog)=>new Promise((ok,no)=>{const x=new XMLHttpRequest();x.open('POST','/api/upload');x.withCredentials=true;x.upload.onprogress=e=>e.lengthComputable&&prog&&prog(e.loaded/e.total);
 x.onload=()=>{let j={};try{j=JSON.parse(x.responseText)}catch{}x.status<300&&j.url?ok(j.url):no(new Error(j.error||'Upload failed ('+x.status+')'))};x.onerror=()=>no(new Error('Network error during upload. Nothing was saved.'));
 const fd=new FormData();fd.append('file',file);x.send(fd)});
async function upFile(file,fe,vid){if(!(vid?/\.(mp4|webm)$/i:/\.(png|jpe?g|webp|gif|pdf|mp4|webm)$/i).test(file.name))throw new Error('Unsupported file type: '+file.name);
 const mb=vid?100:file.type.startsWith('image/')?5:100;if(file.size>mb*1048576)throw new Error(`${file.name} is too large (max ${mb} MB)`);
 const pr=fe.closest('.up').querySelector('progress');pr.hidden=false;pr.value=0;return upl(file,p=>pr.value=p)}
document.addEventListener('change',e=>{const i=e.target,u=i.type==='file'&&i.closest('.up');if(u){const f=i.files[0];u.querySelector('.fn').textContent=f?`${f.name} (${(f.size/1048576).toFixed(1)} MB)`:'No file selected'}});
function ed(ta){ta.addEventListener('keydown',e=>{if(e.key==='Tab'&&!e.shiftKey){e.preventDefault();ta.setRangeText('    ',ta.selectionStart,ta.selectionEnd,'end')}
 else if(e.key==='Enter'){const v=ta.value,s=ta.selectionStart,ind=(v.slice(v.lastIndexOf('\n',s-1)+1,s).match(/^[ \t]*/)||[''])[0];e.preventDefault();ta.setRangeText('\n'+ind,s,ta.selectionEnd,'end')}})}
const LN={python:'Python',java:'Java',c:'C',cpp:'C++',javascript:'JavaScript',r:'R',sql:'SQL',other:'Other'};
const lopt=sel=>LG.map(o=>`<option value="${o}"${o===sel?' selected':''}>${LN[o]}</option>`).join('');
const ST={success:['Success','ok'],compile_error:['Compilation Error','bad'],runtime_error:['Runtime Error','bad'],timeout:['Timed Out','bad']};
const SUP=['python','javascript','java','c','cpp'],emsg=er=>er instanceof TypeError?'Could not reach the server. Check your connection and click Run Code to retry.':er.message;
const canRun=(x,lang,code)=>((x&&x.supported)||SUP).includes(lang)&&!!String(code||'').trim();
const runHint=(x,lang)=>{if(!x)return'Checking code runner…';const sup=x.supported||SUP,names=a=>a.map(o=>LN[o]).join(', ');
 return!sup.includes(lang)?`${LN[lang]} cannot be run in this app. Runnable languages: ${names(sup)}`:!x.available?'Code runner unavailable: '+x.message+' You can still click Run Code to retry.':x.languages.includes(lang)?'Runnable here: '+names(x.languages):`The ${LN[lang]} runtime is not installed on the execution server (runnable: ${names(x.languages)||'none'})`};
const busy=(b,on)=>{b.classList.toggle('busy',on);b.disabled=on;if(on){b._t=b._t||b.innerHTML;b.innerHTML='<span class="spin" aria-hidden="true"></span> Running…'}else if(b._t){b.innerHTML=b._t;b._t=null}};
async function runCode(lang,code,o,st,btn,stdin=''){if(btn.classList.contains('busy'))return false;busy(btn,true);o.classList.remove('err');o.textContent='';st.className='rs run';st.textContent='Running…';let ok=false;
 try{const r=await api('/execute',{method:'POST',body:{language:lang,code,stdin}}),[t,c]=ST[r.status]||['Finished','ok'];o.textContent=[r.stdout,r.stderr].filter(Boolean).join('\n')||'(program produced no output)';o.classList.toggle('err',r.status!=='success');
  st.className='rs '+c;st.textContent=t+' · '+r.ms+' ms';o.dataset.ran='1';ok=true}
 catch(er){o.textContent=emsg(er);o.classList.add('err');st.className='rs bad';st.textContent='Not run'}finally{busy(btn,false)}return ok}
const KW={python:'and as assert break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield print input range len',
 java:'abstract boolean break byte case catch char class continue default do double else enum extends final finally float for if implements import instanceof int interface long new package private protected public return short static super switch this throw throws try void while String null true false',
 c:'auto break case char const continue default do double else enum extern float for goto if include define int long register return short signed sizeof static struct switch typedef union unsigned void volatile while',
 cpp:'auto bool break case catch char class const continue default delete do double else enum false float for if include define int long namespace new nullptr private protected public return short static struct switch template this throw true try typedef typename unsigned using vector string void while cout cin endl std',
 javascript:'async await break case catch class const continue default else export false for function if import let new null return switch this throw true try typeof var while'};
const RE_PY=/(#.*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)/g,RE_C=/(\/\/.*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)/g;
function hl(code,lang){const re=lang==='python'?RE_PY:RE_C,kw=new Set((KW[lang]||KW.c).split(' '));re.lastIndex=0;let o='',i=0,m;
 while((m=re.exec(code))){o+=esc(code.slice(i,m.index));const t=m[1]?'c':m[2]?'s':m[3]?'n':kw.has(m[0])?'k':'';o+=t?`<span class="t${t}">${esc(m[0])}</span>`:esc(m[0]);i=re.lastIndex}
 return o+esc(code.slice(i))+'\n'}
function ide(ta,h,ln,lang){const up=()=>{h.innerHTML=hl(ta.value,lang());ln.textContent=Array.from({length:ta.value.split('\n').length},(_,i)=>i+1).join('\n');h.scrollTop=ta.scrollTop;ln.scrollTop=ta.scrollTop};
 ta.addEventListener('input',up);ta.addEventListener('scroll',()=>{h.scrollTop=ta.scrollTop;h.scrollLeft=ta.scrollLeft;ln.scrollTop=ta.scrollTop});ed(ta);up();return up}
function subDialog(title,v,save){const d=document.createElement('dialog');d.className='wide';let ran=false;
 d.innerHTML=`<form><h3>${esc(title)}</h3><label>Sub-experiment name<input name="name" required value="${esc(v.name)}"></label>
 <label>Aim / problem statement<textarea name="aim">${esc(v.aim)}</textarea></label><label>Description<textarea name="description">${esc(v.description)}</textarea></label><label>Procedure<textarea name="procedure">${esc(v.procedure)}</textarea></label>
 <div class="edhead"><label>Language<select name="language">${lopt(v.language||'python')}</select></label><span class="hint" id="exh">Checking code runner…</span></div>
 <textarea name="code" class="code" spellcheck="false" aria-label="Code editor" placeholder="Paste or write your code here">${esc(v.code)}</textarea>
 <div class="edbar"><button type="button" class="btn" id="run" disabled>&#9654; Run Code</button><button type="button" class="btn ghost" id="rc">Reset code</button><button type="button" class="btn ghost" id="co">Clear output</button><button type="button" class="btn ghost" id="ue">Use output as expected</button><span class="rs" id="rs">Not run yet</span></div>
 <label>Sample input (stdin, optional)<textarea name="sampleInput" class="mono">${esc(v.sampleInput)}</textarea></label>
 <pre class="console" id="oc" data-ph="Output will appear here." aria-live="polite" tabindex="0">${esc(v.output)}</pre>
 <label>Expected output (reference)<textarea name="expectedOutput" class="mono">${esc(v.expectedOutput)}</textarea></label>
 <div class="fld">Reference file (PDF, optional)<div class="up"><label class="filebtn">Choose file<input class="vh" type="file" name="refFile" accept="application/pdf"></label><span class="fn">${v.fileUrl?'Current file kept unless you choose a new one':'No file selected'}</span><progress hidden max="1"></progress></div></div>
 <label>Video URL (optional)<input name="videoUrl" type="url" value="${esc(v.videoUrl)}"></label><label>Notes<textarea name="notes">${esc(v.notes)}</textarea></label>
 <p class="ferr" id="fe" role="alert" hidden></p><div class="row"><button class="btn" id="ok">Save Sub-experiment</button><button type="button" class="btn ghost" id="no">Cancel</button></div></form>`;
 document.body.append(d);d.showModal();const q=s=>d.querySelector(s),F=q('form'),ta=F.elements.code,oc=q('#oc'),rs=q('#rs'),sel=F.elements.language,close=()=>{d.close();d.remove()};ed(ta);let st=null;
 const chk=()=>{const rb=q('#run');if(!rb.classList.contains('busy'))rb.disabled=!canRun(st,sel.value,ta.value);q('#exh').textContent=runHint(st,sel.value)};
 const ld=f=>api('/execute/status'+(f?'?fresh=1':'')).then(x=>{st=x;chk()}).catch(()=>{st=null;q('#exh').textContent='Could not check the code runner. You can still click Run Code to try.';chk()});
 ld();chk();sel.onchange=chk;ta.addEventListener('input',chk);
 q('#run').onclick=async()=>{const ok=await runCode(sel.value,ta.value,oc,rs,q('#run'),F.elements.sampleInput.value);ran=ok;if(ok)chk();else ld(true)};q('#rc').onclick=()=>{ta.value=v.code||'';chk()};
 q('#co').onclick=()=>{oc.textContent='';oc.classList.remove('err');rs.className='rs';rs.textContent='Not run yet';ran=true};q('#ue').onclick=()=>{F.elements.expectedOutput.value=oc.textContent};q('#no').onclick=close;
 F.onsubmit=async e=>{e.preventDefault();const b=q('#ok'),fe=q('#fe');b.disabled=true;fe.hidden=true;
  try{const rf=F.elements.refFile,f=rf.files[0],E=n=>F.elements[n].value;const fileUrl=f?await upFile(f,rf,false):(v.fileUrl||'');
   await save({name:E('name'),aim:E('aim'),description:E('description'),procedure:E('procedure'),language:sel.value,code:ta.value,sampleInput:E('sampleInput'),expectedOutput:E('expectedOutput'),output:ran?oc.textContent:(v.output||''),videoUrl:E('videoUrl'),fileUrl,notes:E('notes')});close();toast('Sub-experiment saved');route()}
  catch(er){fe.textContent=er.message;fe.hidden=false;toast(er.message,1);b.disabled=false}}}
const toList=v=>String(v).split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
function form(title,fields,vals,save,opts={}){const d=document.createElement('dialog');
 d.innerHTML=`<form><h3>${esc(title)}</h3>${fields.map(f=>{const v=vals[f.k]??'',r=f.r?'required':'',W=f.t==='file'||f.t==='video';return `<${W?'div class="fld"':'label'}>${esc(f.l)}${f.t==='textarea'?`<textarea name="${f.k}" ${r}>${esc(v)}</textarea>`:Array.isArray(f.t)?`<select name="${f.k}">${f.t.map(o=>`<option ${o===v?'selected':''}>${o}</option>`).join('')}</select>`:f.t==='video'?`<input name="${f.k}" type="url" value="${esc(v)}" placeholder="https://… or choose a file below"><div class="up"><label class="filebtn">Choose video file<input class="vh" type="file" name="${f.k}_f" accept="video/mp4,video/webm"></label><span class="fn">MP4 or WebM, up to 100 MB. A chosen file replaces the URL.</span><progress hidden max="1"></progress></div>`:f.t==='file'?`<div class="up"><label class="filebtn">Choose file<input class="vh" type="file" name="${f.k}"></label><span class="fn">${v?'Current file kept unless you choose a new one':'No file selected'}</span><progress hidden max="1"></progress></div>`:`<input name="${f.k}" type="${f.t==='list'?'text':f.t||'text'}" value="${esc(f.t==='list'?(v||[]).join(', '):v)}" ${r}>`}</${W?'div':'label'}>`}).join('')}
 ${opts.subs?'<fieldset class="sfs"><legend>Sub-experiments</legend><div id="sl"></div><button type="button" class="btn ghost sm" id="sa">+ Add sub-experiment</button></fieldset>':''}<p class="ferr" id="fe" role="alert" hidden></p><div class="row"><button class="btn" id="ok">Save changes</button><button type="button" class="btn ghost" id="no">Cancel</button></div></form>`;
 document.body.append(d);d.showModal();const close=()=>{d.close();d.remove()};d.querySelector('#no').onclick=close;
 if(opts.subs){const L=d.querySelector('#sl'),num=()=>[...L.children].forEach((e,i)=>e.querySelector('b').textContent='Sub-experiment '+String.fromCharCode(65+i));
  d.querySelector('#sa').onclick=()=>{const e=document.createElement('div');e.className='se';e.innerHTML=`<div class="seh"><b></b><button type="button" class="btn del sm">Remove</button></div><label>Name<input data-s="name" required></label><label>Description / instructions<textarea data-s="description"></textarea></label><label>Language<select data-s="language">${lopt('python')}</select></label><label>Code<textarea data-s="code" class="code smcode" spellcheck="false"></textarea></label><label>Sample input (stdin, optional)<textarea data-s="sampleInput" class="mono" placeholder="Values the program reads, one per line"></textarea></label><label>Expected output<textarea data-s="expectedOutput" class="mono" placeholder="Paste the output this code should produce (multiple lines are kept as typed)"></textarea></label>`;
   e.querySelector('button').onclick=()=>{e.remove();num()};L.append(e);num();e.querySelector('input').focus()}}
 d.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=d.querySelector('#ok');b.disabled=true;d.querySelector('#fe').hidden=true;
  try{const o={};for(const f of fields){const el=e.target.elements[f.k],fe=f.t==='video'?e.target.elements[f.k+'_f']:f.t==='file'?el:null;
   if(fe){const file=fe.files[0];o[f.k]=file?await upFile(file,fe,f.t==='video'):f.t==='video'?el.value:(vals[f.k]||'')}else o[f.k]=f.t==='list'?toList(el.value):el.value}
   if(opts.subs)o._subs=[...d.querySelectorAll('.se')].map(el=>Object.fromEntries([...el.querySelectorAll('[data-s]')].map(i=>[i.dataset.s,i.value])));await save(o);close();toast('Saved');route()}catch(er){toast(er.message,1);const fe=d.querySelector('#fe');fe.textContent=er.message;fe.hidden=false;b.disabled=false}}}
const ctl=(k,x,extra='')=>admin()?`<button class="btn ghost sm" data-act="edit" data-k="${k}" data-id="${x._id}">Edit</button>${extra}<button class="btn del sm" data-act="del" data-k="${k}" data-id="${x._id}">Delete</button>`:'';
async function saveExp(o,st){const subs=o._subs||[];delete o._subs;
 if(st.id)await api('/experiments/'+st.id,{method:'PUT',body:o});else st.id=(await api('/experiments',{method:'POST',body:o}))._id;
 for(let i=0;i<subs.length;i++){if(st.done.has(i))continue;try{await api(`/experiments/${st.id}/subs`,{method:'POST',body:subs[i]});st.done.add(i)}
  catch(er){throw new Error(`Experiment saved, but sub-experiment ${i+1} failed: ${er.message}. Your entries are kept; fix it and save again to retry (nothing is duplicated).`)}}}
const openE=new Set();document.addEventListener('click',e=>{const t=e.target.closest('[data-tg]');if(!t)return;const s=t.closest('.eg').nextElementSibling,o=s.hasAttribute('hidden');s.toggleAttribute('hidden',!o);t.setAttribute('aria-expanded',o);o?openE.add(t.dataset.tg):openE.delete(t.dataset.tg)});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const {act,k,id,post}=b.dataset;
 try{if(act==='add'&&k==='experiments'){const st={id:null,done:new Set()};form('Add Experiment',ENT.experiments.f,{},o=>saveExp(o,st),{subs:1})}
 else if(act==='add'&&k==='subs')subDialog('Add sub-experiment',{},o=>api(post,{method:'POST',body:o}))
 else if(act==='add')form('Add '+ENT[k].n,ENT[k].f,{},o=>api(post||'/'+k,{method:'POST',body:o}));
 else if(act==='edit'){const x=await api(`/${k}/${id}`);if(k==='subs')subDialog('Edit sub-experiment',x,o=>api('/subs/'+id,{method:'PUT',body:o}));else form('Edit '+ENT[k].n,ENT[k].f,x,o=>api(`/${k}/${id}`,{method:'PUT',body:o}))}
 else if(act==='del'){if(confirm('Delete this item permanently? This cannot be undone.')){await api(`/${k}/${id}`,{method:'DELETE'});toast('Deleted');if(b.dataset.back)location.hash=b.dataset.back;else route()}}
 else if(act==='editprofile')form('Edit profile',ENT.profile.f,await api('/profile'),o=>api('/profile',{method:'PUT',body:o}));
 else if(act==='logout'){await api('/auth/logout',{method:'POST'});me=null;location.hash='#/';await init()}
 else if(act==='savesub'){const o=$('#outv');await api('/subs/'+id,{method:'PUT',body:{code:$('#code').value,language:$('#lang').value,sampleInput:$('#stdin').value,...(o.dataset.ran?{output:o.textContent}:{})}});toast('Saved')}
 else if(act==='move'){const g=b.closest('.grid'),ids=[...g.querySelectorAll('[data-sid]')].map(e=>e.dataset.sid),i=ids.indexOf(id),j=i+Number(b.dataset.dir);if(j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];await api(`/experiments/${g.dataset.eid}/subs/reorder`,{method:'PUT',body:{ids}});toast('Order updated');route()}
 else if(act==='run')await runCode($('#lang').value,$('#code').value,$('#outv'),$('#runst'),b)
 }catch(er){toast(er.message,1)}});
function view(title,html,crumbs=[]){$('#app').innerHTML=html;$('#crumb').innerHTML=[...crumbs.map(([l,h])=>h?`<a href="${h}">${esc(l)}</a>`:esc(l))].join(' › ');document.title=title+' · Data Science Digital Library';$('#app').focus()}
const meta=a=>a.filter(Boolean).map(esc).join(' · ');
function cardHtml(k,x){const c=ENT[k].card(x),ed=ctl(k,x);return `<article class="card t-${k}"><div class="cover">${c.img?`<img src="${safe(c.img)}" alt="" loading="lazy">`:''}</div><div class="cb"><h3>${c.href?`<a href="${c.href}">${esc(c.t)}</a>`:esc(c.t)}</h3>
 <p>${esc(c.s)}</p><div class="meta">${meta(c.m||[])}</div>${c.tags&&c.tags.length?`<div class="chips">${c.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}${c.chips?`<div class="chips">${c.chips}</div>`:''}
 <div class="acts">${c.href?`<a class="btn sm" href="${c.href}">View</a>`:''}${c.links||''}${ed}</div></div></article>`}
async function listPage(k){const E=ENT[k];view(E.t,'<div class="skel"></div>',[[k==='subjects'?'Modules':E.t]]);const data=await api('/'+k);
 view(E.t,`<div class="bar"><h1>${E.t}</h1><input class="fi flt" id="flt" type="search" placeholder="Filter ${E.t.toLowerCase()}" aria-label="Filter"> ${admin()?`<button class="btn" data-act="add" data-k="${k}">Add ${E.n}</button>`:''}</div><div class="grid" id="g"></div>`,[[k==='subjects'?'Modules':E.t]]);
 const draw=()=>{const q=$('#flt').value.toLowerCase(),a=data.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
  $('#g').innerHTML=a.length?a.map(x=>cardHtml(k,x)).join(''):`<div class="empty span-all">${data.length?'No matches.':`No ${E.t.toLowerCase()} yet.${admin()?` Use “Add ${E.n}” to create the first one.`:''}`}</div>`};
 $('#flt').oninput=draw;draw()}
function video(u){if(!u)return'';const y=u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
 return y?`<iframe class="vid" src="https://www.youtube-nocookie.com/embed/${y[1]}" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="Video"></iframe>`:(u.startsWith('/uploads/')||/^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//i.test(u))?`<video class="vid" controls preload="metadata" src="${safe(u)}">Your browser cannot play this video. <a href="${safe(u)}">Download it</a>.</video>`:lk('Watch video',u)}
const empty=t=>`<div class="empty">${t}</div>`;
const ICO={m:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,e:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true"><path d="M10 2v7.5L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9.5V2"/><path d="M8.5 2h7"/></svg>`,p:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,r:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>`,t:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/></svg>`};
async function dash(){view('Home','<div class="skel"></div>');const [s,p,sub,ex]=await Promise.all([api('/stats'),api('/profile'),api('/subjects'),api('/experiments')]);
 const NC=[['m','Modules','#/subjects','Browse subjects and their study modules'],['e','Experiments','#/experiments','Lab experiments with code and outputs'],['p','Projects','#/projects','Academic and personal projects'],['r','Resources','#/resources','Curated learning materials'],['t','Tools','#/tools','Software and libraries you use']];
 view('Home',`<div class="dash"><section class="hero"><div><p class="eyebrow">Data Science Digital Library</p><h1>Welcome${p.name?', '+esc(p.name):''}</h1><p>Your academic knowledge. Organized, connected, accessible.</p>
 ${admin()?`<div class="acts top">${['subjects','experiments','projects','resources','tools'].map(k=>`<button class="btn light sm" data-act="add" data-k="${k}">Add ${ENT[k].n}</button>`).join('')}</div>`:''}</div>
 <div class="hs">${[['Subjects',s.subjects],['Experiments',s.experiments],['Projects',s.projects],['Resources',s.resources],['Tools',s.tools]].map(([l,n])=>`<div><b>${n}</b><span>${l}</span></div>`).join('')}</div></section><aside class="dside" aria-label="User profile">${profCard(p)}</aside></div>
 <div class="navc">${NC.map(([k,t,h,d])=>`<a class="nc" href="${h}"><span class="ic">${ICO[k]}</span><span><b>${t}</b><span>${d}</span></span></a>`).join('')}</div>
 <h2>Recently updated subjects</h2><div class="grid">${sub.slice(0,3).map(x=>cardHtml('subjects',x)).join('')||empty('No subjects yet.')}</div>
 <h2>Recently updated experiments</h2><div class="grid">${[...ex].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,3).map(x=>cardHtml('experiments',x)).join('')||empty('No experiments yet.')}</div>`)}
const initials=n=>esc((n||'?').trim()[0]||'?').toUpperCase();
function profCard(p,full){const rows=[['Roll number',p.rollNo],['Faculty',p.faculty],['Degree',p.degree&&p.department?p.degree+', '+p.department:p.degree||p.department],['Institution',p.institution],full&&['Year / semester',p.semester],full&&['Skills',(p.skills||[]).join(', ')]].filter(r=>r&&r[1]);
 return `<section class="prof">${p.photo?`<img class="ph" src="${safe(p.photo)}" alt="Profile photo">`:`<div class="ph">${initials(p.name)}</div>`}<div class="grow"><h2 class="pn">${esc(p.name||'Profile not set up')}</h2>
 <dl>${rows.map(r=>`<div class="pr"><dt>${r[0]}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl>${full&&p.bio?`<p>${esc(p.bio)}</p>`:''}<div class="acts top">${lk('GitHub',p.github)}${lk('LinkedIn',p.linkedin)}${full?'':'<a class="btn sm" href="#/profile">View Full Profile</a>'}${full&&admin()?'<button class="btn sm" data-act="editprofile">Edit profile</button>':''}</div></div></section>`}
async function subjectPage(id){const [s,m]=await Promise.all([api('/subjects/'+id),api(`/subjects/${id}/modules`)]);
 view(s.name,`<div class="bar"><h1>${esc(s.name)}</h1>${ctl('subjects',s).replace('data-act="del"','data-act="del" data-back="#/subjects"')}</div><div class="panel">${s.cover?`<img src="${safe(s.cover)}" alt="" class="pcover"><br>`:''}<p>${esc(s.description)}</p><div class="meta">${meta([s.code,s.category])}</div></div>
 <h2>Modules</h2><div class="grid">${m.map(x=>`<article class="card t-modules${x.name?'':' slot'}"><div class="cb"><div class="meta">Module ${x.number}</div><h3>${x.name?`<a href="#/modules/${x._id}">${esc(x.name)}</a>`:'Not added yet'}</h3><p>${esc(x.description)}</p>
 <div class="acts">${x.name?`<a class="btn sm" href="#/modules/${x._id}">Open</a>`:''}${admin()?`<button class="btn ghost sm" data-act="edit" data-k="modules" data-id="${x._id}">${x.name?'Edit':'Add content'}</button>`:''}</div></div></article>`).join('')}</div>`,[['Modules','#/subjects'],[s.name]])}
async function modulePage(id){const x=await api('/modules/'+id),sj=x.subjectDoc||{};
 view(x.name||'Module',`<div class="bar"><h1>Module ${x.number}: ${esc(x.name)||'Not added yet'}</h1>${admin()?`<button class="btn ghost sm" data-act="edit" data-k="modules" data-id="${x._id}">Edit module</button>`:''}</div><p class="meta">Subject: <a href="#/subjects/${x.subject}">${esc(sj.name)}</a></p>
 <div class="panel"><p>${esc(x.description)||'No description yet.'}</p></div><h2>Document</h2>${x.pdf?pdfView(x.pdf,x.name+' PDF'):empty('No PDF added yet.')}
 <h2>Video</h2>${video(x.videoUrl)||empty('No video added yet.')}<h2>Important topics</h2>${x.topics.length?`<ul>${x.topics.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:empty('No topics listed.')}
 ${x.notes?`<h2>Notes</h2><div class="panel">${esc(x.notes).replace(/\n/g,'<br>')}</div>`:''}`,[['Modules','#/subjects'],[sj.name||'Subject','#/subjects/'+x.subject],['Module '+x.number]])}
async function expPage(n){const x=await api('/experiments/by-number/'+n);
 view('Experiment '+x.number,`<div class="bar"><h1>Experiment ${x.number}: ${esc(x.name)}</h1>${ctl('experiments',x).replace('data-act="del"','data-act="del" data-back="#/experiments"')}</div>
 <div class="panel">${x.cover?`<img src="${safe(x.cover)}" alt="" class="pcover"><br>`:''}<p>${esc(x.description)}</p>${x.objective?`<h3>Objective</h3><p class="pre">${esc(x.objective)}</p>`:''}${lk('GitHub repository',x.github)}${x.notes?`<p>${esc(x.notes)}</p>`:''}</div>${x.videoUrl?`<h2>Video</h2>${video(x.videoUrl)}`:''}
 <div class="bar"><h2 class="grow">Sub-experiments</h2>${admin()?`<button class="btn" data-act="add" data-k="subs" data-post="/experiments/${x._id}/subs">Add sub-experiment</button>`:''}</div>
 <div class="grid" data-eid="${x._id}">${x.subs.map(s=>`<article class="card t-subs" data-sid="${s._id}"><div class="cb"><div class="meta">${esc(s.label)} · ${esc(s.language)}</div><h3><a href="#/experiments/${x.number}/sub-experiments/${s.label.toLowerCase()}">${esc(s.name)}</a></h3><p>${esc(s.description)}</p>
 <div class="acts"><a class="btn sm" href="#/experiments/${x.number}/sub-experiments/${s.label.toLowerCase()}">Open</a>${admin()?`<button class="btn ghost sm" data-act="move" data-dir="-1" data-id="${s._id}" aria-label="Move up">&uarr;</button><button class="btn ghost sm" data-act="move" data-dir="1" data-id="${s._id}" aria-label="Move down">&darr;</button>`:''}${ctl('subs',s)}</div></div></article>`).join('')||`<div class="empty span-all">No sub-experiments yet.</div>`}</div>`,[['Experiments','#/experiments'],['Experiment '+x.number]])}
async function subPage(n,l){const x=await api('/experiments/by-number/'+n),i=x.subs.findIndex(y=>y.label.toLowerCase()===l.toLowerCase());if(i<0)throw new Error('Sub-experiment not found');
 const s=x.subs[i],A=admin(),pv=x.subs[i-1],nx=x.subs[i+1],hr=t=>`#/experiments/${x.number}/sub-experiments/${t.label.toLowerCase()}`;
 const info=[['Aim',s.aim],['Description',s.description],['Procedure',s.procedure],['Notes',s.notes]].filter(r=>r[1]).map(([t,v])=>`<h3>${t}</h3><p class="pre">${esc(v)}</p>`).join('');
 const refs=(s.fileUrl?`<p>${lk('Open reference file',s.fileUrl)} <a class="btn ghost sm" href="${safe(dl(s.fileUrl))}" download>Download</a></p>`:'')+(s.videoUrl?video(s.videoUrl):'');
 view(s.label+' '+s.name,`<div class="bar"><div class="grow"><p class="meta">Experiment ${x.number}: ${esc(x.name)}</p><h1>${esc(s.label)} · ${esc(s.name)}</h1></div><a class="btn ghost" href="#/experiments/${x.number}">&larr; Back to experiment</a>${ctl('subs',s).replace('data-act="del"','data-act="del" data-back="#/experiments/'+x.number+'"')}</div>
 <div class="sxg"><section class="panel"><h2>Aim &amp; procedure</h2>${info||empty('No description has been added yet.')}</section><section class="panel"><h2>Reference materials</h2>${refs||empty('No reference file or video.')}</section></div>
 <section class="panel ws"><h2>Code workspace</h2><div class="edhead"><label>Language<select id="lang" class="fi auto">${lopt(s.language)}</select></label><span class="hint" id="exh">Checking code runner…</span></div>
 <div class="ce"><div class="ln" id="ln" aria-hidden="true"></div><div class="ew"><pre class="hl" id="hl" aria-hidden="true"></pre><textarea id="code" class="code" spellcheck="false" aria-label="Code editor">${esc(s.code)}</textarea></div></div>
 <div class="edbar"><button class="btn" id="runb">&#9654; Run Code</button><button class="btn ghost" id="rst">Reset Code</button><button class="btn ghost" id="clr">Clear</button>${A?`<button class="btn ghost" data-act="savesub" data-id="${s._id}">Save code &amp; input</button>`:''}<span class="rs" id="runst">Not run yet</span></div>
 <label class="fld">Input (stdin)<textarea id="stdin" class="fi mono" rows="3" placeholder="Values your program reads, one per line">${esc(s.sampleInput)}</textarea></label>
 <div class="io"><div><h3>Your Output</h3><pre class="console" id="outv" tabindex="0" data-ph="Run your code to see its output here."></pre></div><div><h3>Errors</h3><pre class="console err" id="errv" tabindex="0" data-ph="No errors."></pre></div></div></section>
 <section class="panel"><h2>Expected Output</h2><pre class="console exp" tabindex="0" data-ph="No expected output has been saved.">${esc(s.expectedOutput)}</pre></section>
 <nav class="subnav" aria-label="Sub-experiment navigation">${pv?`<a class="btn ghost" href="${hr(pv)}">&larr; ${esc(pv.label)}: ${esc(pv.name)}</a>`:'<span></span>'}${nx?`<a class="btn ghost" href="${hr(nx)}">${esc(nx.label)}: ${esc(nx.name)} &rarr;</a>`:'<span></span>'}</nav>`,
 [['Experiments','#/experiments'],['Experiment '+x.number,'#/experiments/'+x.number],['Sub-experiment '+s.label]]);
 const ta=$('#code'),sel=$('#lang'),outv=$('#outv'),errv=$('#errv'),st=$('#runst'),rb=$('#runb');let xs=null;const up=ide(ta,$('#hl'),$('#ln'),()=>sel.value);
 if(s.output){outv.textContent=s.output;st.textContent='Showing the last saved output (not run in this session)'}
 const sync=()=>{if(!rb.classList.contains('busy'))rb.disabled=!canRun(xs,sel.value,ta.value)},chk=()=>{$('#exh').textContent=runHint(xs,sel.value);sync()};
 const ld=f=>api('/execute/status'+(f?'?fresh=1':'')).then(v=>{xs=v;chk()}).catch(()=>{xs=null;$('#exh').textContent='Could not check the code runner. You can still click Run Code to try.';sync()});
 ld();chk();ta.addEventListener('input',sync);sel.onchange=()=>{up();chk()};$('#rst').onclick=()=>{ta.value=s.code||'';sel.value=s.language;up();chk()};
 $('#clr').onclick=()=>{if(ta.value&&!confirm('Clear the editor?'))return;ta.value='';up();sync()};
 rb.onclick=async()=>{if(rb.classList.contains('busy'))return;busy(rb,true);outv.textContent='';errv.textContent='';delete outv.dataset.ran;st.className='rs run';st.textContent='Running…';let ok=false;
  try{const r=await api('/execute',{method:'POST',body:{language:sel.value,code:ta.value,stdin:$('#stdin').value}}),[t,c]=ST[r.status]||['Finished','ok'];
   outv.textContent=r.stdout||'';errv.textContent=r.stderr||'';outv.dataset.ran='1';st.className='rs '+c;st.textContent=t+(r.status!=='success'&&r.exitCode!=null?` (exit ${r.exitCode})`:'')+' · '+r.ms+' ms';ok=true}
  catch(er){errv.textContent=emsg(er);st.className='rs bad';st.textContent='Not run - see Errors'}busy(rb,false);if(ok)chk();else ld(true)}}
async function profile(){const p=await api('/profile');
 view('Profile',profCard(p,1)+(admin()?`<section class="panel"><h2>Profile image</h2><div class="pi"><div id="pv">${p.photo?`<img class="ph" src="${safe(p.photo)}" alt="Current profile image">`:`<div class="ph">${initials(p.name)}</div>`}</div><div class="up"><label class="filebtn">Upload Profile Image<input class="vh" type="file" id="pif" accept="image/png,image/jpeg,image/webp,image/gif"></label><span class="fn">PNG, JPG, WebP or GIF, up to 5 MB</span>
 <div class="acts"><button class="btn" id="pis" disabled>Save profile image</button>${p.photo?'<button class="btn del" id="pir">Remove image</button>':''}</div><div id="crop" hidden><div class="cv" id="cv"><img id="ci" alt="Adjust profile image" draggable="false"></div><label class="fld">Zoom<input type="range" id="cz" min="1" max="3" step="0.01" value="1"></label><span class="fn">Drag the picture to position it, use Zoom to resize. The circle shows exactly what will be saved (GIFs are saved as a still picture).</span></div><progress id="pip" hidden max="1"></progress><p class="ferr" id="pie" role="alert" hidden></p></div></div></section>`:''),[['Profile']]);
 const f=$('#pif');if(!f)return;const er=m=>{const e=$('#pie');e.textContent=m;e.hidden=!m};
 const V=220;let im=null,S=1,Z=1,ox=0,oy=0;
 const clamp=()=>{const s=S*Z;ox=Math.min(0,Math.max(V-im.naturalWidth*s,ox));oy=Math.min(0,Math.max(V-im.naturalHeight*s,oy))},
 draw=()=>{clamp();$('#ci').style.transform=`translate(${ox}px,${oy}px) scale(${S*Z})`},
 out=()=>{const c=document.createElement('canvas'),s=S*Z;c.width=c.height=512;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,512,512);x.drawImage(im,-ox/s,-oy/s,V/s,V/s,0,0,512,512);return c},
 prev=()=>{$('#pv').innerHTML=`<img class="ph" alt="Preview of new profile image" src="${out().toDataURL('image/jpeg',.9)}">`};
 f.onchange=()=>{const x=f.files[0];er('');if(!x)return;if(!/^image\/(png|jpeg|webp|gif)$/.test(x.type)||x.size>5242880){er('Choose a PNG, JPG, WebP or GIF image up to 5 MB.');f.value='';$('#pis').disabled=true;$('#crop').hidden=true;return}
  const i=new Image();i.onload=()=>{im=i;S=Math.max(V/i.naturalWidth,V/i.naturalHeight);Z=1;$('#cz').value=1;ox=(V-i.naturalWidth*S)/2;oy=(V-i.naturalHeight*S)/2;$('#ci').src=i.src;$('#ci').style.width=i.naturalWidth+'px';$('#ci').style.height=i.naturalHeight+'px';$('#crop').hidden=false;draw();prev();$('#pis').disabled=false};
  i.onerror=()=>{er('This image could not be read. Try another file.');$('#pis').disabled=true};i.src=URL.createObjectURL(x)};
 const cv=$('#cv');let dr=null;cv.onpointerdown=e=>{if(!im)return;dr={x:e.clientX-ox,y:e.clientY-oy};cv.setPointerCapture(e.pointerId)};
 cv.onpointermove=e=>{if(!dr)return;ox=e.clientX-dr.x;oy=e.clientY-dr.y;draw()};cv.onpointerup=cv.onpointercancel=()=>{if(dr){dr=null;prev()}};
 $('#cz').oninput=e=>{if(!im)return;const o=S*Z,cx=(V/2-ox)/o,cy=(V/2-oy)/o;Z=+e.target.value;ox=V/2-cx*S*Z;oy=V/2-cy*S*Z;draw()};$('#cz').onchange=prev;
 $('#pis').onclick=async()=>{const b=$('#pis'),pg=$('#pip');b.disabled=true;f.disabled=true;er('');b.textContent='Uploading…';pg.hidden=false;pg.value=0;
  try{const blob=await new Promise(r=>out().toBlob(r,'image/jpeg',.9));if(!blob)throw new Error('Could not process the image.');const u=await upl(new File([blob],'profile.jpg',{type:'image/jpeg'}),p=>pg.value=p);b.textContent='Saving…';await api('/profile',{method:'PUT',body:{photo:u}});toast('Profile image updated');await init()}
  catch(e){er(e.message);b.disabled=false;f.disabled=false;b.textContent='Save profile image';pg.hidden=true}};
 const r=$('#pir');if(r)r.onclick=async()=>{if(!confirm('Remove the profile image?'))return;try{await api('/profile',{method:'PUT',body:{photo:''}});toast('Image removed');await init()}catch(e){er(e.message)}}}
async function search(q){view('Search','<div class="skel"></div>',[['Search']]);const r=await api('/search?q='+encodeURIComponent(q));
 view('Search',`<h1>Results for “${esc(q)}”</h1><br>${r.length?r.map(x=>`<div class="panel"><div class="meta">${esc(x.type)}</div><a href="${esc(x.link)}"><b>${esc(x.title)}</b></a><div>${esc((x.desc||'').slice(0,160))}</div></div>`).join(''):empty('No results found.')}`,[['Search']])}
function login(){view('Admin login',`<form class="panel login" id="lf"><h1>Administrator login</h1><br><label for="em">Email</label><input id="em" type="email" required autocomplete="username"><label for="pw">Password</label><input id="pw" type="password" required autocomplete="current-password"><button class="btn">Log in</button></form>`,[['Login']]);
 $('#lf').onsubmit=async e=>{e.preventDefault();try{await api('/auth/login',{method:'POST',body:{email:$('#em').value,password:$('#pw').value}});await init();location.hash='#/'}catch(er){toast(er.message,1)}}}
const R=[[/^\/$/,dash],[/^\/subjects$/,()=>listPage('subjects')],[/^\/subjects\/(\w+)$/,subjectPage],[/^\/modules\/(\w+)$/,modulePage],[/^\/experiments$/,()=>listPage('experiments')],[/^\/experiments\/(\d+)$/,expPage],
 [/^\/experiments\/(\d+)\/sub-experiments\/(\w+)$/,subPage],[/^\/projects$/,()=>listPage('projects')],[/^\/resources$/,()=>listPage('resources')],[/^\/tools$/,()=>listPage('tools')],[/^\/profile$/,profile],[/^\/login$/,login],[/^\/search\/(.+)$/,q=>search(decodeURIComponent(q))]];
async function route(){const h=location.hash.slice(1)||'/';$('#side').classList.remove('open');document.querySelectorAll('#topnav a').forEach(a=>a.classList.toggle('on',a.dataset.p==='/'?h==='/':a.dataset.p.split('|').some(p=>h.startsWith(p))));side(h);
 for(const [re,fn] of R){const m=h.match(re);if(m)try{return await fn(...m.slice(1))}catch(e){return view('Error',`<div class="empty"><b>Something went wrong</b><p>${esc(e.message)}</p><a class="btn" href="#/">Go to Home</a></div>`)}}
 view('Not found',`<div class="empty"><b>Page not found</b><p><a href="#/">Go to Home</a></p></div>`)}
async function init(){try{me=(await api('/auth/me')).user}catch{me=null}let p={};try{p=await api('/profile')}catch{}
 const nm=me?.name||p.name;$('#who').innerHTML=me?`<details><summary>${p.photo?`<img class="av" src="${safe(p.photo)}" alt="">`:`<span class="av">${initials(nm)}</span>`}<span>${esc(nm)}</span></summary><div class="dd"><a href="#/profile">View profile</a>${admin()?'<a href="#/profile">Edit profile</a>':''}<button data-act="logout">Log out</button></div></details>`:`<a href="#/login">Admin login</a>`;route()}
const mob=()=>matchMedia('(max-width:800px)').matches,SB=$('#side');
try{if(localStorage.getItem('sbc')==='1')document.body.classList.add('sb-c')}catch{}
function sbState(){const c=document.body.classList.contains('sb-c');$('#sbt').setAttribute('aria-expanded',String(!c));$('#sbt').setAttribute('aria-label',c?'Expand sidebar':'Collapse sidebar')}
$('#sbt').onclick=()=>{if(mob())return SB.classList.remove('open');const c=document.body.classList.toggle('sb-c');try{localStorage.setItem('sbc',c?'1':'0')}catch{}sbState()};
$('#sbo').onclick=()=>SB.classList.add('open');sbState();
async function side(h){let kind=/^\/(subjects|modules)/.test(h)?'m':/^\/experiments/.test(h)?'e':null;document.body.classList.toggle('has-side',!!kind);if(!kind)return;
 const none=t=>`<div class="meta snone">${t}</div>`;let html='',m;
 try{if(kind==='m'){const subs=await api('/subjects');let sid=null,mid=null;
  if(m=h.match(/^\/subjects\/(\w+)/))sid=m[1];else if(m=h.match(/^\/modules\/(\w+)/)){mid=m[1];sid=(await api('/modules/'+mid)).subject}
  const mods=sid?await api(`/subjects/${sid}/modules`):[];
  html=subs.map(s=>`<a class="si${s._id===sid?' on':''}" href="#/subjects/${s._id}">${esc(s.name)}</a>${s._id===sid?`<div class="sub">${mods.filter(x=>x.name).map(x=>`<a class="${x._id===mid?'on':''}" href="#/modules/${x._id}">Module ${x.number}: ${esc(x.name)}</a>`).join('')||none('No modules added yet.')}</div>`:''}`).join('')||none('No subjects yet.');$('#sttl').textContent='Subjects'}
 else{const ex=await api('/experiments'),en=(h.match(/^\/experiments\/(\d+)/)||[])[1],sl=(h.match(/sub-experiments\/(\w+)/)||[])[1];
  if(en)openE.add(en);
  html=ex.map(x=>{const on=String(x.number)===en,open=on||openE.has(String(x.number)),has=x.subs.length>0;
   return `<div class="eg"><a class="si${on&&!sl?' on':''}" href="#/experiments/${x.number}">Experiment ${x.number}: ${esc(x.name)}</a>${has?`<button class="tg" data-tg="${x.number}" aria-expanded="${open}" aria-label="Show or hide sub-experiments of experiment ${x.number}"></button>`:''}</div>${has?`<div class="sub"${open?'':' hidden'}>${x.subs.map(s=>`<a class="${sl&&s.label.toLowerCase()===sl.toLowerCase()?'on':''}" href="#/experiments/${x.number}/sub-experiments/${s.label.toLowerCase()}">Sub-experiment ${esc(s.label)}</a>`).join('')}</div>`:on?`<div class="sub">${none('No sub-experiments yet.')}</div>`:''}`}).join('')||none('No experiments yet.');$('#sttl').textContent='Experiments'}
 $('#sn').innerHTML=html}catch{$('#sn').innerHTML=none('Could not load navigation.')}}
window.onhashchange=route;
$('#sf').onsubmit=e=>{e.preventDefault();const q=$('#q').value.trim();if(q)location.hash='#/search/'+encodeURIComponent(q)};init();
<<<<<<< HEAD

/* ---- Mobile PDF viewer (PDF.js, self-hosted). Phones cannot show PDFs inside an iframe. ---- */
(()=>{
 const isMobile=()=>matchMedia('(max-width:800px)').matches||matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
 const local=u=>/^\/(files\/[a-f0-9]{24}|uploads\/[\w.-]+\.pdf)$/i.test(u||'');
 let lib;const load=()=>lib||(lib=import('/vendor/pdfjs/pdf.min.mjs').then(m=>{m.GlobalWorkerOptions.workerSrc='/vendor/pdfjs/pdf.worker.min.mjs';return m}));
 async function init(box){
  const url=box.dataset.pdf;box.dataset.init='1';
  if(!isMobile()||!local(url))return;
  const frame=box.querySelector('iframe.pdf');
  const wrap=document.createElement('div');wrap.className='pdfpages';wrap.innerHTML='<p class="pdfmsg">Loading PDF…</p>';
  frame.replaceWith(wrap);
  try{
   const pdfjs=await load(),doc=await pdfjs.getDocument({url,withCredentials:true}).promise;
   wrap.innerHTML='';
   const bar=box.querySelector('.pdfbar'),info=document.createElement('span');info.className='pdfpg';info.textContent=doc.numPages+(doc.numPages===1?' page':' pages');bar.prepend(info);
   let zoom=1;const slots=[];
   const draw=async(slot,n)=>{
    if(slot.dataset.zoom===String(zoom)&&slot.dataset.done)return;slot.dataset.done='';
    const page=await doc.getPage(n),w=Math.max(wrap.clientWidth-2,200)*zoom,base=page.getViewport({scale:1}),sc=w/base.width,dpr=Math.min(window.devicePixelRatio||1,2.5),vp=page.getViewport({scale:sc*dpr});
    const c=document.createElement('canvas');c.width=Math.floor(vp.width);c.height=Math.floor(vp.height);c.style.width=Math.floor(vp.width/dpr)+'px';c.style.height=Math.floor(vp.height/dpr)+'px';
    await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
    slot.replaceChildren(c);slot.dataset.zoom=String(zoom);slot.dataset.done='1';
   };
   const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)draw(e.target,+e.target.dataset.n).catch(()=>{})}),{rootMargin:'600px 0px'});
   const first=await doc.getPage(1),fv=first.getViewport({scale:1});
   for(let n=1;n<=doc.numPages;n++){const s=document.createElement('div');s.className='pdfslot';s.dataset.n=n;s.style.aspectRatio=fv.width+'/'+fv.height;wrap.appendChild(s);slots.push(s);io.observe(s)}
   const zb=(t,d)=>{const b=document.createElement('button');b.type='button';b.className='btn ghost sm';b.textContent=t;b.setAttribute('aria-label',d);return b};
   const zo=zb('−','Zoom out'),zi=zb('+','Zoom in');
   const apply=()=>{wrap.classList.toggle('zoomed',zoom>1);slots.forEach(s=>{s.dataset.done='';s.style.aspectRatio=fv.width+'/'+fv.height;s.style.width=(zoom*100)+'%'});io.disconnect();slots.forEach(s=>io.observe(s))};
   zo.onclick=()=>{zoom=Math.max(1,+(zoom-.5).toFixed(1));apply()};zi.onclick=()=>{zoom=Math.min(3,+(zoom+.5).toFixed(1));apply()};
   bar.prepend(zi);bar.prepend(zo);
   const hint=bar.querySelector('.meta');if(hint)hint.textContent='Scroll to read. Use + / − to zoom.';
  }catch(e){
   wrap.innerHTML='<p class="pdfmsg">The preview could not be shown on this device. Use “Open PDF in new tab” or “Download” below.</p>';
  }
 }
 const scan=()=>document.querySelectorAll('.pdfbox[data-pdf]:not([data-init])').forEach(init);
 new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});scan();
})();
=======
>>>>>>> b2873161d522dd96727cdbad94f38e7d98e21836
