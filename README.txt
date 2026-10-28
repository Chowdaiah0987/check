Flat-layout content snapshots are stored in the project root: subjects.json, modules.json, experiments.json, subexperiments.json, projects.json, resources.json, tools.json.
Run npm run import to import them into MongoDB, or npm run export to refresh them from MongoDB. Uploaded media is in uploads/.

IMPORTANT - permanent uploads
Uploads (PDF, images, videos) are lost on restart if saved to a temporary disk. Set CLOUDINARY_URL
(env variable on your host, and in .env) OR attach a persistent disk and set UPLOAD_DIR.
Check GET /health -> "uploads":"cloud" or "persistent-disk". Re-upload any files that were lost.
