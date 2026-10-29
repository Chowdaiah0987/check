# Deploy checklist (read this before every deploy)

## 1. Environment variables on the host (Render -> Environment)
| Name | Value |
|---|---|
| NODE_ENV | production |
| MONGODB_URI | your Atlas connection string |
| MONGODB_DB | database name - SAME as local. Your old data is probably in `test` |
| SESSION_SECRET | long random string |
| CLOUDINARY_URL | cloudinary://API_KEY:API_SECRET@CLOUD_NAME |

`.env` is NOT uploaded to GitHub/Render, so every value above must be typed into the host.

## 2. After deploy, open  https://YOUR-SITE/health
Must show:  "ok": true,  "uploads": "cloud",  "databasePinned": true
and `counts` with your real number of subjects/modules.
- uploads not "cloud"      -> CLOUDINARY_URL missing/wrong on the host
- counts are 0 / too small -> wrong database; fix MONGODB_DB / MONGODB_URI
- ok false                 -> Atlas Network Access must allow the host (0.0.0.0/0 on Render free)

## 3. Move old local files to permanent storage (once, from your PC with .env filled in)
    npm install
    npm run migrate-uploads -- --dry-run
    npm run migrate-uploads
Files not found in ./uploads are listed - re-upload those in the admin panel.

## 4. Back up before risky changes
    npm run export        # writes the *.json snapshots from the LIVE database
`npm run import` is now safe (adds missing only). `npm run import -- --force` overwrites - avoid.

## 5. Security
Never put .env in a ZIP. Rotate the MongoDB password, SESSION_SECRET, admin password and
Cloudinary API secret if an old ZIP with .env was shared.

## 6. PDFs (MongoDB)
After deploying, run once locally: `npm run migrate-pdfs -- --dry-run` then `npm run migrate-pdfs`. No Cloudinary setting is needed for PDFs.
