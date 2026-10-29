// One-time helper: moves every PDF referenced in MongoDB into MongoDB itself (GridFS bucket "pdfs")
// and rewrites the reference to "/files/<id>".
//   npm run migrate-pdfs -- --dry-run   -> only report what would happen
//   npm run migrate-pdfs                -> copy PDFs into MongoDB + update references
// Sources handled: "/uploads/<name>.pdf" (file must exist in ./uploads) and
// Cloudinary / other https URLs that end in .pdf (downloaded, if still reachable).
// Identical PDFs are stored once. Original files are NOT deleted. Safe to run again.
require('dotenv').config();
// Fix Node.js SRV DNS lookups on Windows (same workaround as server.js).
{
  const servers = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1').split(',').map(x => x.trim()).filter(Boolean);
  if (servers.length) require('node:dns').setServers(servers);
}

const fs = require('fs'), path = require('path'), crypto = require('crypto'), mongoose = require('mongoose');
const DRY = process.argv.includes('--dry-run');
const NAMES = ['subjects', 'modules', 'experiments', 'subexperiments', 'projects', 'resources', 'tools'];
const DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(__dirname, 'uploads');
const LOCAL = /^\/uploads\/([\w.-]+\.pdf)$/i;
const REMOTE = /^https?:\/\/\S+\.pdf(\?\S*)?$/i;

(async () => {
  if (!process.env.MONGODB_URI) { console.error('Set MONGODB_URI in .env first.'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI, process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {});
  console.log('Database "' + mongoose.connection.name + '"' + (DRY ? ' (dry run)' : ''));
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'pdfs' });
  const files = mongoose.connection.db.collection('pdfs.files');
  const byRef = new Map(), failed = new Map();
  let stored = 0, reused = 0, updated = 0;

  async function load(ref) {
    let m;
    if ((m = LOCAL.exec(ref))) {
      const full = path.join(DIR, m[1]);
      if (!fs.existsSync(full)) throw new Error('file not found in uploads folder');
      return { buf: fs.readFileSync(full), name: m[1] };
    }
    const name = decodeURIComponent(path.basename(new URL(ref).pathname));
    const r = await fetch(ref, { redirect: 'follow' });
    if (r.ok) return { buf: Buffer.from(await r.arrayBuffer()), name };

    // Cloudinary blocks public delivery of PDFs on many accounts (HTTP 401/403).
    // Fall back to an API-signed download using CLOUDINARY_URL from .env.
    const cm = /^https:\/\/res\.cloudinary\.com\/[^/]+\/(raw|image)\/upload\/(?:v\d+\/)?(.+?)(?:\?.*)?$/i.exec(ref);
    if (cm && process.env.CLOUDINARY_URL && [401, 403, 404].includes(r.status)) {
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({ secure: true });
      const publicId = decodeURIComponent(cm[2]);
      const tries = cm[1].toLowerCase() === 'raw'
        ? [[publicId, undefined], [publicId.replace(/\.pdf$/i, ''), 'pdf']]
        : [[publicId.replace(/\.pdf$/i, ''), 'pdf']];
      let last = r.status;
      for (const [id, fmt] of tries) {
        const url = cloudinary.utils.private_download_url(id, fmt, { resource_type: cm[1].toLowerCase(), type: 'upload', attachment: false });
        const r2 = await fetch(url, { redirect: 'follow' });
        if (r2.ok) return { buf: Buffer.from(await r2.arrayBuffer()), name };
        last = r2.status;
      }
      throw new Error('Cloudinary refused the download (HTTP ' + last + '). Turn on "PDF and ZIP files delivery" in Cloudinary Settings -> Security, then run again');
    }
    throw new Error('download failed (HTTP ' + r.status + ')');
  }

  async function toMongo(ref) {
    if (byRef.has(ref)) return byRef.get(ref);
    if (failed.has(ref)) return null;
    try {
      const { buf, name } = await load(ref);
      if (buf.slice(0, 5).toString('latin1') !== '%PDF-') throw new Error('not a valid PDF');
      const sha = crypto.createHash('sha256').update(buf).digest('hex');
      let doc = await files.findOne({ 'metadata.sha256': sha });
      let id;
      if (doc) { id = doc._id; reused++; }
      else if (DRY) { id = '(dry-run)'; }
      else {
        id = await new Promise((res, rej) => {
          const up = bucket.openUploadStream(name, { contentType: 'application/pdf', metadata: { sha256: sha, migratedFrom: ref } });
          up.on('error', rej).on('finish', () => res(up.id)).end(buf);
        });
        stored++; console.log('  stored', name, '(' + Math.round(buf.length / 1024) + ' KB)');
      }
      const url = '/files/' + id;
      byRef.set(ref, url);
      return url;
    } catch (e) { failed.set(ref, e.message); return null; }
  }

  async function walk(x) {
    if (Array.isArray(x)) { let c = false; for (let i = 0; i < x.length; i++) { const r = await walk(x[i]); if (r.changed) { x[i] = r.value; c = true; } } return { value: x, changed: c }; }
    if (x && typeof x === 'object' && x.constructor === Object) { let c = false; for (const k of Object.keys(x)) { const r = await walk(x[k]); if (r.changed) { x[k] = r.value; c = true; } } return { value: x, changed: c }; }
    if (typeof x === 'string' && (LOCAL.test(x) || REMOTE.test(x))) { const u = await toMongo(x); if (u) return { value: u, changed: true }; }
    return { value: x, changed: false };
  }

  for (const n of NAMES) {
    const col = mongoose.connection.collection(n);
    for (const doc of await col.find().toArray()) {
      const { _id, ...rest } = doc;
      const r = await walk(rest);
      if (r.changed) {
        updated++;
        if (!DRY) await col.updateOne({ _id }, { $set: r.value });
        console.log('  ' + (DRY ? 'would update ' : 'updated ') + n + ' ' + (rest.name || rest.title || _id));
      }
    }
  }
  console.log(`\nDone. PDFs stored: ${stored}, already in MongoDB: ${reused}, records ${DRY ? 'to update' : 'updated'}: ${updated}.`);
  if (failed.size) {
    console.log('\nCould NOT migrate (re-upload these in the admin panel):');
    for (const [ref, why] of failed) console.log('  - ' + ref + '  ->  ' + why);
  }
  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
