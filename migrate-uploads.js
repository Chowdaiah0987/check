// One-time helper: moves files referenced as "/uploads/<file>" in MongoDB to Cloudinary
// and rewrites those references to permanent https URLs.
//   npm run migrate-uploads -- --dry-run   -> only report what would happen
//   npm run migrate-uploads                -> upload + update database
// Requires MONGODB_URI and CLOUDINARY_URL in .env, and the files present in ./uploads.
// References to files that no longer exist are listed (they must be re-uploaded from the admin panel).
require('dotenv').config();
// Fix Node.js SRV DNS lookups on Windows (same workaround as server.js).
{
  const servers = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1').split(',').map(x => x.trim()).filter(Boolean);
  if (servers.length) require('node:dns').setServers(servers);
}

const fs=require('fs'),path=require('path'),mongoose=require('mongoose');
const DRY=process.argv.includes('--dry-run');
const NAMES=['subjects','modules','experiments','subexperiments','projects','resources','tools'];
const DIR=path.join(__dirname,'uploads');
const RE=/^\/uploads\/([\w.-]+)$/;
(async()=>{
 if(!process.env.MONGODB_URI){console.error('Set MONGODB_URI in .env first.');process.exit(1)}
 if(!DRY&&!process.env.CLOUDINARY_URL){console.error('Set CLOUDINARY_URL in .env first (or use --dry-run).');process.exit(1)}
 const cloudinary=DRY?null:require('cloudinary').v2; if(cloudinary)cloudinary.config({secure:true});
 await mongoose.connect(process.env.MONGODB_URI,process.env.MONGODB_DB?{dbName:process.env.MONGODB_DB}:{});
 console.log('Database "'+mongoose.connection.name+'"'+(DRY?' (dry run)':''));
 const cache=new Map(),missing=new Set();let updated=0,uploaded=0;
 async function toCloud(file){
  if(cache.has(file))return cache.get(file);
  const full=path.join(DIR,file);
  if(!fs.existsSync(full)){missing.add(file);cache.set(file,null);return null}
  if(DRY){cache.set(file,'(dry-run)');return '(dry-run)'}
  const ext=path.extname(file).toLowerCase();
  const video=['.mp4','.webm'].includes(ext),pdf=ext==='.pdf';
  const opts={folder:'dsdl',resource_type:video?'video':pdf?'raw':'image',unique_filename:true,overwrite:false};
  const r=await new Promise((res,rej)=>{const cb=(e,u)=>e?rej(e):res(u);
   video?cloudinary.uploader.upload_large(full,{...opts,chunk_size:6000000},cb):cloudinary.uploader.upload(full,opts,cb)});
  uploaded++;console.log('  uploaded',file);cache.set(file,r.secure_url);return r.secure_url;
 }
 async function walk(x){
  if(Array.isArray(x)){let c=false;for(let i=0;i<x.length;i++){const r=await walk(x[i]);if(r.changed){x[i]=r.value;c=true}}return{value:x,changed:c}}
  if(x&&typeof x==='object'&&x.constructor===Object){let c=false;for(const k of Object.keys(x)){const r=await walk(x[k]);if(r.changed){x[k]=r.value;c=true}}return{value:x,changed:c}}
  if(typeof x==='string'){const m=x.match(RE);if(m){const u=await toCloud(m[1]);if(u)return{value:u,changed:true}}}
  return{value:x,changed:false};
 }
 for(const n of NAMES){
  const col=mongoose.connection.collection(n);
  for(const doc of await col.find().toArray()){
   const {_id,...rest}=doc;const r=await walk(rest);
   if(r.changed){updated++;if(!DRY)await col.updateOne({_id},{$set:r.value})}
  }
 }
 console.log(`${DRY?'Would update':'Updated'} ${updated} document(s); ${uploaded} file(s) uploaded.`);
 if(missing.size){console.log('These referenced files are NOT in ./uploads - re-upload them in the admin panel:');missing.forEach(f=>console.log(' - /uploads/'+f))}
 await mongoose.disconnect()})().catch(e=>{console.error(e.message);process.exit(1)});
