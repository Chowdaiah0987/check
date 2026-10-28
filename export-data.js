// Exports MongoDB content to root-level JSON snapshots. Uploaded files live in uploads/.
// Users/passwords are NOT exported. Uploaded files live in ./uploads (copy that folder separately).
require('dotenv').config();
const fs=require('fs'),path=require('path'),mongoose=require('mongoose'),{EJSON}=mongoose.mongo.BSON;
const NAMES=['subjects','modules','experiments','subexperiments','projects','resources','tools'];
(async()=>{
 if(!process.env.MONGODB_URI){console.error('Set MONGODB_URI in .env first.');process.exit(1)}
 await mongoose.connect(process.env.MONGODB_URI);const dir=__dirname;fs.mkdirSync(dir,{recursive:true});
 for(const n of NAMES){const docs=await mongoose.connection.collection(n).find().toArray();fs.writeFileSync(path.join(dir,n+'.json'),EJSON.stringify(docs,undefined,2,{relaxed:false}));console.log(`${n}: ${docs.length} exported`)}
 await mongoose.disconnect()})().catch(e=>{console.error(e.message);process.exit(1)});
