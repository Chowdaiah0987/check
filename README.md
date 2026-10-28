# Data Science Digital Library — Flat Project

This version keeps application source files at the project root. There are no separate `frontend`, `backend`, or `database` source folders. The `uploads/` directory is retained only for media files; root-level JSON files are import/export snapshots, not a live database. MongoDB Atlas remains the live database.

## Run locally (Windows, macOS, Linux)
1. Install Node.js 18 or newer.
2. Run `npm install` in this folder.
3. Copy `.env.example` to `.env` and set `MONGODB_URI` and a long random `SESSION_SECRET`. For first-time setup, also set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 10 characters).
4. Run `npm run dev` and open `http://localhost:3000`.
5. After the first administrator is created, remove `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.

Do not upload `.env` to GitHub or include it in ZIP files. If the old ZIP or repository exposed live credentials, rotate the MongoDB credentials and session/admin secrets.

## Why images/videos disappeared after a while
The previous version saved new uploads to the app's local `uploads/` directory by default. Render and similar hosts can erase local files during a restart or redeploy. MongoDB stores the media URL, not the media bytes, so those URLs then point to missing files.

Choose ONE permanent storage option for deployment:
- **Cloudinary (recommended):** set `CLOUDINARY_URL` in the hosting service's environment variables. New uploads are saved as permanent HTTPS URLs.
- **Persistent disk:** attach a persistent disk and set `UPLOAD_DIR` to its mounted path (for example `/var/data/uploads`). The application will save local uploads there.

In production, uploads are deliberately rejected with a clear error if neither option is configured, rather than silently saving files that will disappear. The included `uploads/` folder preserves the files bundled with this ZIP, but does not make future local uploads permanent by itself. Seven stale media references in the supplied JSON snapshots pointed to files that were not present in the ZIP; those fields were cleared so importing these snapshots will not create known broken media links. Restore the original files and their URLs if you have them.

## Deploy on Render
- Build command: `npm install`
- Start command: `npm start`
- Set `NODE_ENV=production`, `MONGODB_URI`, and a unique `SESSION_SECRET` in Render Environment.
- Set `CLOUDINARY_URL` **or** attach a persistent disk and set `UPLOAD_DIR`.
- Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` only for the first boot if no administrator exists; remove them after the admin is created.
- In MongoDB Atlas Network Access, permit the Render service to connect. Use a strong database password and never commit it.
- Health endpoint: `/health`. It reports database connection status and upload storage mode.

## Data snapshots
The root-level `subjects.json`, `modules.json`, `experiments.json`, `subexperiments.json`, `projects.json`, `resources.json`, and `tools.json` are import/export snapshots. Run `npm run import` to import snapshots into MongoDB, or `npm run export` to export live MongoDB content into these files. Importing is upsert-based; back up MongoDB before importing a snapshot over live data.

## Code execution
`npm run runner` starts the optional remote execution runner. Code execution remains off unless configured as described in `exec.js` and `.env.example`. Do not enable unsandboxed local execution on a public deployment.
