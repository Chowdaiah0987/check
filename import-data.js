// Imports root-level JSON snapshots into MongoDB (safe upsert by _id; never touches users/admin).
// Safe to re-run: documents are upserted by _id. The "users" collection is never touched (admin accounts stay intact).
require('dotenv').config();
const fs=require('fs'),path=require('path'),mongoose=require('mongoose'),{EJSON}=mongoose.mongo.BSON;
const NAMES=['subjects','modules','experiments','subexperiments','projects','resources','tools'];
(async()=>{
 if(!process.env.MONGODB_URI){console.error('Set MONGODB_URI in .env first.');process.exit(1)}
 await mongoose.connect(process.env.MONGODB_URI);const dir=__dirname;let found=0;
 for(const n of NAMES){const f=path.join(dir,n+'.json');if(!fs.existsSync(f))continue;const txt=fs.readFileSync(f,'utf8').trim();if(!txt)continue;found++;
  let docs;try{docs=txt[0]==='['?EJSON.parse(txt):txt.split(/\r?\n/).filter(Boolean).map(l=>EJSON.parse(l))}catch(e){console.error(`${n}: invalid JSON (${e.message}) - skipped`);continue}
  docs=docs.map(d=>({...d,_id:d._id||new mongoose.Types.ObjectId()}));if(!docs.length)continue;
  try{const r=await mongoose.connection.collection(n).bulkWrite(docs.map(d=>({replaceOne:{filter:{_id:d._id},replacement:d,upsert:true}})),{ordered:false});
   console.log(`${n}: ${docs.length} document(s) processed (${r.upsertedCount} new, ${r.modifiedCount} updated)`)}
  catch(e){console.error(`${n}: some documents failed - ${e.message}`)}}
 if(!found)console.log('No root-level JSON data files found. Expected files: '+NAMES.map(n=>n+'.json').join(', '));
 await mongoose.disconnect()})().catch(e=>{console.error(e.message);process.exit(1)});
