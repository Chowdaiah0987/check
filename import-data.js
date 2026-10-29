// Imports root-level JSON snapshots into MongoDB. Never touches users/admin.
//
// SAFE BY DEFAULT: only documents that do NOT already exist (matched by _id) are added.
// Existing documents - including terms/topics you added or edited online - are left untouched.
//   npm run import              -> add missing documents only (safe)
//   npm run import -- --force   -> overwrite existing documents with the snapshot (DANGEROUS)
// Run `npm run export` first if you are unsure.
require('dotenv').config();
// Fix Node.js SRV DNS lookups on Windows (same workaround as server.js).
{
  const servers = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1').split(',').map(x => x.trim()).filter(Boolean);
  if (servers.length) require('node:dns').setServers(servers);
}

const fs=require('fs'),path=require('path'),mongoose=require('mongoose'),{EJSON}=mongoose.mongo.BSON;
const NAMES=['subjects','modules','experiments','subexperiments','projects','resources','tools'];
const FORCE=process.argv.includes('--force');
(async()=>{
 if(!process.env.MONGODB_URI){console.error('Set MONGODB_URI in .env first.');process.exit(1)}
 await mongoose.connect(process.env.MONGODB_URI,process.env.MONGODB_DB?{dbName:process.env.MONGODB_DB}:{});
 console.log('Importing into database "'+mongoose.connection.name+'" ('+(FORCE?'FORCE: overwrite existing':'safe: add missing only')+')');
 let found=0;
 for(const n of NAMES){
  const f=path.join(__dirname,n+'.json');if(!fs.existsSync(f))continue;
  const txt=fs.readFileSync(f,'utf8').trim();if(!txt)continue;found++;
  let docs;try{docs=txt[0]==='['?EJSON.parse(txt):txt.split(/\r?\n/).filter(Boolean).map(l=>EJSON.parse(l))}catch(e){console.error(`${n}: invalid JSON (${e.message}) - skipped`);continue}
  docs=docs.map(d=>({...d,_id:d._id||new mongoose.Types.ObjectId()}));if(!docs.length)continue;
  const ops=docs.map(d=>{
   if(FORCE)return{replaceOne:{filter:{_id:d._id},replacement:d,upsert:true}};
   const {_id,...rest}=d;return{updateOne:{filter:{_id},update:{$setOnInsert:rest},upsert:true}};
  });
  try{const r=await mongoose.connection.collection(n).bulkWrite(ops,{ordered:false});
   console.log(`${n}: ${docs.length} in snapshot (${r.upsertedCount} added, ${r.modifiedCount} overwritten, ${docs.length-r.upsertedCount-r.modifiedCount} left as-is)`)}
  catch(e){console.error(`${n}: some documents failed - ${e.message}`)}
 }
 if(!found)console.log('No root-level JSON data files found.');
 await mongoose.disconnect()})().catch(e=>{console.error(e.message);process.exit(1)});
