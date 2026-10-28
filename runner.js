// Standalone code-execution service. Run it on a machine that has Docker (see README), then point the main app at it:
//   EXEC_RUNNER_URL=https://runner.example.com   EXEC_RUNNER_TOKEN=<same secret>
// Needs only: RUNNER_TOKEN (shared secret). Optional: RUNNER_PORT (4000), RUNNER_HOST (127.0.0.1; use 0.0.0.0 behind HTTPS/firewall).
require('dotenv').config();
process.env.EXECUTION_ENABLED='true';delete process.env.EXEC_RUNNER_URL; // the runner always executes locally
const express=require('express'),crypto=require('crypto'),engine=require('./exec');
const TOKEN=process.env.RUNNER_TOKEN||'';if(TOKEN.length<16){console.error('Set RUNNER_TOKEN to a random string of at least 16 characters');process.exit(1)}
const same=(a,b)=>{const x=crypto.createHash('sha256').update(String(a)).digest(),y=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(x,y)};
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'256kb'}));
app.use((q,r,n)=>same((q.get('authorization')||'').replace(/^Bearer /,''),TOKEN)?n():r.status(401).json({error:'Unauthorized'}));
const wrap=f=>(q,r,n)=>f(q,r,n).catch(n);
app.get('/status',wrap(async(q,r)=>r.json(await engine.status(q.query.fresh==='1'))));
app.post('/run',wrap(async(q,r)=>{const b=q.body||{};r.json(await engine.run(b.language,b.code,b.stdin))}));
app.use((e,q,r,n)=>{const s=e.status||500;if(s===500)console.error(e);r.status(s).json({error:s===500?'Internal runner error':e.message})});
const port=+process.env.RUNNER_PORT||4000,host=process.env.RUNNER_HOST||'127.0.0.1';
app.listen(port,host,()=>console.log(`Runner listening on ${host}:${port}`));
