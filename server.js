
require('dotenv').config();

// Fix Node.js SRV DNS lookups on local Windows development.
const dns = require('node:dns');

const dnsServers = (
  process.env.DNS_SERVERS ||
  (process.env.NODE_ENV === 'production' ? '' : '8.8.8.8,1.1.1.1')
)
  .split(',')
  .map(server => server.trim())
  .filter(Boolean);

if (dnsServers.length) {
  dns.setServers(dnsServers);
}

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const {
  MONGODB_URI,
  SESSION_SECRET,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  PORT = 3000,
  NODE_ENV
} = process.env;

const PROD = NODE_ENV === 'production';

// Database name. If MONGODB_DB is set it always wins. Otherwise the name in the
// URI is used; if the URI has none, MongoDB silently falls back to "test".
// Pin it with MONGODB_DB (or put it in the URI) so local and deployed apps
// always read the SAME database.
const MONGODB_DB = (process.env.MONGODB_DB || '').trim();
const uriDbName = (() => {
  try {
    return decodeURIComponent(
      new URL(MONGODB_URI.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.replace(/^\//, '')
    );
  } catch {
    return '';
  }
})();
const ACTIVE_DB = MONGODB_DB || uriDbName || 'test';
const mongoOpts = MONGODB_DB ? { dbName: MONGODB_DB } : {};

if (!MONGODB_URI || !SESSION_SECRET) {
  console.error('Set MONGODB_URI and SESSION_SECRET (see .env.example)');
  process.exit(1);
}

const UP = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, 'uploads');

fs.mkdirSync(UP, { recursive: true });

const S = mongoose.Schema;
const T = String;
const OID = S.Types.ObjectId;

const sch = (definition, index) => {
  const schema = new S(definition, { timestamps: true });
  if (index) schema.index(...index);
  return schema;
};

// -------------------- DATABASE MODELS --------------------

const User = mongoose.model(
  'User',
  sch({
    name: T,
    email: { type: T, unique: true },
    passwordHash: T,
    role: { type: T, enum: ['admin', 'user'], default: 'user' },
    rollNo: T,
    faculty: T,
    degree: T,
    department: T,
    institution: T,
    semester: T,
    github: T,
    linkedin: T,
    bio: T,
    skills: [T],
    photo: T
  })
);

const Subject = mongoose.model(
  'Subject',
  sch({
    name: T,
    code: T,
    description: T,
    category: T,
    cover: T
  })
);

const Module = mongoose.model(
  'Module',
  sch(
    {
      subject: { type: OID, ref: 'Subject' },
      number: { type: Number, min: 1, max: 5 },
      name: T,
      description: T,
      pdf: T,
      videoUrl: T,
      topics: [T],
      notes: T
    },
    [{ subject: 1, number: 1 }, { unique: true }]
  )
);

const Experiment = mongoose.model(
  'Experiment',
  sch({
    number: { type: Number, unique: true },
    name: T,
    description: T,
    objective: T,
    cover: T,
    videoUrl: T,
    github: T,
    notes: T
  })
);

const Sub = mongoose.model(
  'SubExperiment',
  sch(
    {
      experiment: { type: OID, ref: 'Experiment', index: true },
      label: T,
      name: T,
      aim: T,
      description: T,
      procedure: T,
      language: { type: T, default: 'python' },
      code: T,
      sampleInput: T,
      expectedOutput: T,
      output: T,
      videoUrl: T,
      fileUrl: T,
      notes: T,
      order: { type: Number, default: 0 }
    },
    [{ experiment: 1, label: 1 }, { unique: true }]
  )
);

const Project = mongoose.model(
  'Project',
  sch({
    name: T,
    description: T,
    details: T,
    category: T,
    tags: [T],
    status: T,
    cover: T,
    github: T,
    demoUrl: T,
    doc: T
  })
);

const Resource = mongoose.model(
  'Resource',
  sch({
    name: T,
    description: T,
    category: T,
    url: T,
    videoUrl: T,
    doc: T,
    tags: [T],
    relatedSubject: T
  })
);

const Tool = mongoose.model(
  'Tool',
  sch({
    name: T,
    description: T,
    category: T,
    url: T,
    docsUrl: T,
    videoUrl: T,
    icon: T,
    tags: [T]
  })
);

// -------------------- HELPERS --------------------

const bad = message => Object.assign(new Error(message), { status: 400 });

const wrap = handler => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const URLF = new Set([
  'videoUrl', 'github', 'linkedin', 'demoUrl', 'url',
  'docsUrl', 'cover', 'pdf', 'photo', 'doc', 'icon', 'fileUrl'
]);

const LANGS = [
  'python', 'java', 'c', 'cpp', 'javascript', 'r', 'sql', 'other'
];

const SUBF = [
  'name', 'aim', 'description', 'procedure', 'language', 'code',
  'sampleInput', 'expectedOutput', 'output', 'videoUrl', 'fileUrl', 'notes'
];

// -------------------- PDF STORAGE IN MONGODB (GridFS) --------------------
const pdfBucket = () =>
  new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'pdfs' });

const rmFiles = (...values) =>
  values.flat().forEach(value => {
    if (/^\/uploads\/[\w.-]+$/.test(value || '')) {
      fs.unlink(path.join(UP, path.basename(value)), () => {});
    }
    const m = /^\/files\/([a-f0-9]{24})$/.exec(value || '');
    if (m) pdfBucket().delete(new mongoose.Types.ObjectId(m[1])).catch(() => {});
  });

const ML = new Set(['code', 'expectedOutput', 'sampleInput', 'output']);

function clean(body, allowed) {
  const result = {};
  body = body || {};

  for (const key of allowed) {
    if (!(key in body)) continue;
    let value = body[key];

    if (['topics', 'tags', 'skills'].includes(key)) {
      value = (Array.isArray(value) ? value : [])
        .map(item => String(item).trim().slice(0, 100))
        .filter(Boolean)
        .slice(0, 50);
    } else if (key === 'number') {
      value = Number(value);
      if (!Number.isInteger(value) || value < 1) {
        throw bad('number must be a positive integer');
      }
    } else {
      value = ML.has(key)
        ? String(value ?? '').replace(/\r\n?/g, '\n').trimEnd().slice(0, 50000)
        : String(value ?? '').trim().slice(0, 50000);

      if (
        value &&
        URLF.has(key) &&
        !/^https?:\/\/\S+$/i.test(value) &&
        !/^\/uploads\/[\w.-]+$/.test(value) &&
        !/^\/files\/[a-f0-9]{24}$/.test(value)
      ) {
        throw bad(key + ' must be a valid http(s) URL');
      }

      if (key === 'language' && !LANGS.includes(value)) {
        throw bad('Unsupported language');
      }
    }

    result[key] = value;
  }

  return result;
}

async function one(Model, id) {
  if (!mongoose.isValidObjectId(id)) {
    throw Object.assign(new Error('Not found'), { status: 404 });
  }

  const document = await Model.findById(id);
  if (!document) {
    throw Object.assign(new Error('Not found'), { status: 404 });
  }
  return document;
}

// -------------------- EXPRESS CONFIGURATION --------------------

const app = express();

if (PROD) app.set('trust proxy', 1);

app.use(
  helmet({
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'media-src': ["'self'", 'https:'],
        'worker-src': ["'self'", 'blob:'],
        'frame-src': [
          "'self'",
          'https://www.youtube-nocookie.com',
          'https://res.cloudinary.com'
        ]
      }
    }
  })
);

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const origin = req.get('origin');

  if (req.method !== 'GET' && origin) {
    let originHost;
    try {
      originHost = new URL(origin).host;
    } catch {
      return res.status(403).json({ error: 'Cross-origin request blocked' });
    }

    if (originHost !== req.get('host')) {
      return res.status(403).json({ error: 'Cross-origin request blocked' });
    }
  }

  next();
});

app.use(
  session({
    name: 'dsdl.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGODB_URI, ...(MONGODB_DB ? { dbName: MONGODB_DB } : {}) }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: PROD,
      maxAge: 7 * 864e5
    }
  })
);

// Uploaded files (PDF, images, video). helmet's default CSP (object-src 'none')
// makes Chrome/Edge refuse to render a PDF inside an <iframe>, so the page-level
// CSP is dropped for these static files only. Files are served with an explicit
// type, nosniff, and may only be framed by this same site.
app.use(
  '/uploads',
  (req, res, next) => {
    res.removeHeader('Content-Security-Policy');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    next();
  },
  express.static(UP, {
    index: false,
    dotfiles: 'deny',
    acceptRanges: true,
    setHeaders: (res, filePath) => {
      const type = MIME[path.extname(filePath).toLowerCase()];
      if (type) res.setHeader('Content-Type', type);
      if (type === 'application/pdf') res.setHeader('Content-Disposition', 'inline');
    }
  })
);

// PDF.js (self-hosted) - draws PDF pages on a canvas so PDFs work on phones,
// where browsers cannot show a PDF inside an <iframe>.
app.use(
  '/vendor/pdfjs',
  express.static(path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build'), {
    index: false,
    dotfiles: 'deny',
    maxAge: '7d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.mjs')) res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    }
  })
);

// Serve a PDF stored in MongoDB. Public read (same as /uploads), inline display,
// byte-range support so large PDFs open and scroll quickly.
app.get('/files/:id', async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{24}$/.test(req.params.id)) return res.status(404).send('Not found');
    const _id = new mongoose.Types.ObjectId(req.params.id);
    const file = await mongoose.connection.db.collection('pdfs.files').findOne({ _id });
    if (!file) return res.status(404).send('PDF not found');

    const size = file.length;
    const name = String(file.filename || 'document.pdf').replace(/[^\w.\- ]/g, '_');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader(
      'Content-Disposition',
      (req.query.download ? 'attachment' : 'inline') + '; filename="' + name + '"'
    );

    let start = 0, end = size - 1;
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range && (range[1] || range[2])) {
      if (range[1]) { start = Number(range[1]); if (range[2]) end = Math.min(Number(range[2]), size - 1); }
      else { start = Math.max(size - Number(range[2]), 0); }
      if (start > end || start >= size) {
        res.setHeader('Content-Range', 'bytes */' + size);
        return res.status(416).end();
      }
      res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    }
    res.setHeader('Content-Length', end - start + 1);
    if (req.method === 'HEAD') return res.end();

    pdfBucket()
      .openDownloadStream(_id, { start, end: end + 1 })
      .on('error', () => res.destroy())
      .pipe(res);
  } catch (error) {
    next(error);
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/app.js', (req, res) => res.sendFile(path.join(__dirname, 'app.js')));
app.get('/styles.css', (req, res) => res.sendFile(path.join(__dirname, 'styles.css')));

// Cloudinary configuration
const CLOUD = Boolean(process.env.CLOUDINARY_URL);
const cloudinary = CLOUD ? require('cloudinary').v2 : null;

if (CLOUD) {
  cloudinary.config({ secure: true });
}

app.get('/health', async (req, res) => {
  const uploads = CLOUD
    ? 'cloud'
    : PROD
      ? process.env.UPLOAD_DIR
        ? 'persistent-disk'
        : 'not-configured'
      : 'local';

  const out = {
    ok: mongoose.connection.readyState === 1,
    uploads,
    pdfStorage: 'mongodb',
    database: mongoose.connection.name || ACTIVE_DB,
    databasePinned: Boolean(MONGODB_DB || uriDbName)
  };

  if (out.ok) {
    try {
      out.counts = {
        subjects: await Subject.estimatedDocumentCount(),
        modules: await Module.estimatedDocumentCount(),
        experiments: await Experiment.estimatedDocumentCount()
      };
    } catch {
      /* counts are informational only */
    }
  }

  res.json(out);
});

// -------------------- API AND AUTHENTICATION --------------------

const api = express.Router();
app.use('/api', api);

api.use(
  wrap(async (req, res, next) => {
    if (req.session.uid) {
      req.user = await User.findById(req.session.uid);
    }
    next();
  })
);

const requireAuth = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: 'Authentication required' });

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return req.user.role === 'admin'
    ? next()
    : res.status(403).json({ error: 'Administrator access required' });
};

// -------------------- LOGIN AND LOGOUT --------------------

const tries = new Map();
const DUMMY = bcrypt.hashSync('x', 12);

api.post(
  '/auth/login',
  wrap(async (req, res) => {
    const key = req.ip;
    const attempt = tries.get(key) || { c: 0, at: Date.now() };

    if (Date.now() - attempt.at > 9e5) {
      attempt.c = 0;
      attempt.at = Date.now();
    }

    if (attempt.c >= 10) {
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }

    const user = await User.findOne({
      email: String(req.body.email || '').toLowerCase().trim()
    });

    const valid = await bcrypt.compare(
      String(req.body.password || ''),
      user ? user.passwordHash : DUMMY
    );

    if (!user || !valid) {
      attempt.c++;
      tries.set(key, attempt);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate(error => error ? reject(error) : resolve());
    });

    req.session.uid = String(user._id);

    return res.json({
      user: {
        name: user.name,
        role: user.role,
        email: user.email,
        photo: user.photo
      }
    });
  })
);

api.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('dsdl.sid');
    res.json({ ok: true });
  });
});

api.get('/auth/me', (req, res) =>
  res.json({
    user: req.user
      ? {
          name: req.user.name,
          role: req.user.role,
          email: req.user.email,
          photo: req.user.photo
        }
      : null
  })
);

// -------------------- PROFILE --------------------

const PUB = 'name rollNo faculty degree department institution semester github linkedin bio skills photo'.split(' ');

api.get(
  '/profile',
  wrap(async (req, res) => {
    const user = await User.findOne({ role: 'admin' }).sort('createdAt');
    res.json(user ? Object.fromEntries(PUB.map(key => [key, user[key]])) : {});
  })
);

api.put(
  '/profile',
  requireAdmin,
  wrap(async (req, res) => {
    Object.assign(req.user, clean(req.body, PUB));
    await req.user.save();
    res.json({ ok: true });
  })
);

// -------------------- FILE UPLOADS --------------------

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  storage: multer.diskStorage({
    destination: UP,
    filename: (req, file, callback) =>
      callback(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase())
  }),
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (MIME[extension] !== file.mimetype) {
      return callback(bad('Unsupported file type. Allowed: png, jpg, webp, gif, pdf, mp4, webm'));
    }
    callback(null, true);
  }
});

const SIG = {
  'application/pdf': buffer => buffer.slice(0, 5).toString('latin1') === '%PDF-',
  'image/png': buffer => buffer.slice(0, 4).toString('hex') === '89504e47',
  'image/jpeg': buffer => buffer.slice(0, 3).toString('hex') === 'ffd8ff',
  'image/gif': buffer => /^GIF8[79]a$/.test(buffer.slice(0, 6).toString('latin1')),
  'image/webp': buffer =>
    buffer.slice(0, 4).toString('latin1') === 'RIFF' &&
    buffer.slice(8, 12).toString('latin1') === 'WEBP'
};

function imgOk(file) {
  if (!SIG[file.mimetype]) return true;
  let fd;
  try {
    fd = fs.openSync(file.path, 'r');
    const buffer = Buffer.alloc(12);
    fs.readSync(fd, buffer, 0, 12, 0);
    return SIG[file.mimetype](buffer);
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

// Continue with Part 2 immediately after this line.

async function sendUpload(req, res, next) {
  const file = req.file;

  if (!file) {
    return next(bad('No file uploaded'));
  }

  if (file.mimetype === 'application/pdf') {
    if (file.size > 50 * 1024 * 1024) {
      fs.unlink(file.path, () => {});
      return next(bad('PDF must be 50 MB or smaller'));
    }
    try {
      const original = Buffer.from(file.originalname || 'document.pdf', 'latin1').toString('utf8');
      const id = await new Promise((resolve, reject) => {
        const up = pdfBucket().openUploadStream(path.basename(original), {
          contentType: 'application/pdf',
          metadata: { uploadedAt: new Date(), uploadedBy: String(req.user && req.user._id || '') }
        });
        fs.createReadStream(file.path).on('error', reject).pipe(up)
          .on('error', reject).on('finish', () => resolve(up.id));
      });
      return res.status(201).json({ url: '/files/' + id });
    } catch (error) {
      console.error('PDF save to MongoDB failed:', error.message);
      return next(Object.assign(new Error('Could not save the PDF to the database.'), { status: 500 }));
    } finally {
      fs.unlink(file.path, () => {});
    }
  }

  if (!CLOUD) {
    if (PROD && !process.env.UPLOAD_DIR) {
      fs.unlink(file.path, () => {});
      return next(
        Object.assign(
          new Error(
            'Permanent uploads are not configured. Set CLOUDINARY_URL or configure a persistent UPLOAD_DIR.'
          ),
          { status: 503 }
        )
      );
    }

    return res.status(201).json({
      url: '/uploads/' + file.filename
    });
  }

  const video = file.mimetype.startsWith('video/');
  const pdf = file.mimetype === 'application/pdf';

  if (!video && file.size > 10 * 1024 * 1024) {
    fs.unlink(file.path, () => {});
    return next(bad('Images and PDFs must be 10 MB or smaller'));
  }

  const options = {
    folder: 'dsdl',
    resource_type: video ? 'video' : pdf ? 'raw' : 'image',
    use_filename: false,
    unique_filename: true,
    overwrite: false
  };

  try {
    const result = await new Promise((resolve, reject) => {
      const callback = (error, uploaded) => {
        if (error) return reject(error);
        resolve(uploaded);
      };

      if (video) {
        cloudinary.uploader.upload_large(
          file.path,
          { ...options, chunk_size: 6000000 },
          callback
        );
      } else {
        cloudinary.uploader.upload(file.path, options, callback);
      }
    });

    if (!result || !result.secure_url) {
      throw new Error('Cloudinary did not return a secure URL');
    }

    console.log('Cloudinary upload successful:', {
      resourceType: options.resource_type,
      bytes: file.size
    });

    return res.status(201).json({ url: result.secure_url });
  } catch (error) {
    console.error('Cloudinary upload failed:', {
      message: error.message,
      httpCode: error.http_code
    });

    return next(
      Object.assign(
        new Error('Cloudinary upload failed. Check Render logs for details.'),
        { status: 502 }
      )
    );
  } finally {
    fs.unlink(file.path, () => {});
  }
}

api.post('/upload', requireAdmin, (req, res, next) => {
  upload.single('file')(req, res, error => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(bad('File too large (max 100 MB)'));
      }
      return next(error);
    }

    if (!req.file) {
      return next(bad('No file uploaded'));
    }

    if (
      req.file.mimetype.startsWith('image/') &&
      req.file.size > 5 * 1024 * 1024
    ) {
      fs.unlink(req.file.path, () => {});
      return next(bad('Images must be 5 MB or smaller'));
    }

    if (!imgOk(req.file)) {
      fs.unlink(req.file.path, () => {});
      return next(bad('File content does not match an image of that type'));
    }

    sendUpload(req, res, next);
  });
});

// -------------------- CODE EXECUTION --------------------

require('./exec').mount(api, { wrap, requireAdmin });

// -------------------- SUBJECTS AND MODULES --------------------

api.get('/subjects', wrap(async (req, res) => {
  const subjects = await Subject.find().sort('-updatedAt').lean();

  const counts = await Module.aggregate([
    { $match: { name: { $ne: '' } } },
    { $group: { _id: '$subject', n: { $sum: 1 } } }
  ]);

  const moduleCounts = Object.fromEntries(
    counts.map(item => [item._id, item.n])
  );

  res.json(subjects.map(subject => ({
    ...subject,
    moduleCount: moduleCounts[subject._id] || 0
  })));
}));

api.get('/subjects/:id/modules', wrap(async (req, res) => {
  await one(Subject, req.params.id);
  res.json(await Module.find({ subject: req.params.id }).sort('number'));
}));

api.get('/modules/:id', wrap(async (req, res) => {
  const module = await one(Module, req.params.id);
  res.json({
    ...module.toObject(),
    subjectDoc: await Subject.findById(module.subject).select('name')
  });
}));

api.put('/modules/:id', requireAdmin, wrap(async (req, res) => {
  const module = await one(Module, req.params.id);

  Object.assign(module, clean(req.body, [
    'name', 'description', 'pdf', 'videoUrl', 'topics', 'notes'
  ]));

  await module.save();
  res.json(module);
}));

// -------------------- EXPERIMENTS --------------------

api.get('/experiments', wrap(async (req, res) => {
  const experiments = await Experiment.find().sort('number').lean();
  const subs = await Sub.find().sort('order label').lean();

  res.json(experiments.map(experiment => ({
    ...experiment,
    subs: subs
      .filter(sub => String(sub.experiment) === String(experiment._id))
      .map(sub => ({ _id: sub._id, label: sub.label }))
  })));
}));

api.get('/experiments/by-number/:n', wrap(async (req, res) => {
  const experiment = await Experiment.findOne({
    number: Number(req.params.n)
  });

  if (!experiment) {
    throw Object.assign(new Error('Not found'), { status: 404 });
  }

  res.json({
    ...experiment.toObject(),
    subs: await Sub.find({ experiment: experiment._id }).sort('order label')
  });
}));

api.post('/experiments/:id/subs', requireAdmin, wrap(async (req, res) => {
  const experiment = await one(Experiment, req.params.id);
  const used = (await Sub.find({ experiment: experiment._id }))
    .map(sub => sub.label);

  const label = [...Array(26).keys()]
    .map(index => experiment.number + String.fromCharCode(65 + index))
    .find(value => !used.includes(value));

  if (!label) throw bad('Maximum of 26 sub-experiments reached');

  const data = clean(req.body, SUBF);
  if (!data.name) throw bad('name is required');

  res.status(201).json(await Sub.create({
    ...data,
    experiment: experiment._id,
    label,
    order: used.length
  }));
}));

api.put('/experiments/:id/subs/reorder', requireAdmin, wrap(async (req, res) => {
  const experiment = await one(Experiment, req.params.id);
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
  const subs = await Sub.find({ experiment: experiment._id });

  if (
    new Set(ids).size !== ids.length ||
    ids.length !== subs.length ||
    !subs.every(sub => ids.includes(String(sub._id)))
  ) {
    throw bad('ids must list every sub-experiment exactly once');
  }

  await Sub.bulkWrite(ids.map((id, index) => ({
    updateOne: {
      filter: { _id: id, experiment: experiment._id },
      update: { $set: { order: index } }
    }
  })));

  res.json({ ok: true });
}));

api.get('/subs/:id', wrap(async (req, res) => {
  res.json(await one(Sub, req.params.id));
}));

api.put('/subs/:id', requireAdmin, wrap(async (req, res) => {
  const sub = await one(Sub, req.params.id);
  Object.assign(sub, clean(req.body, SUBF));
  await sub.save();
  res.json(sub);
}));

api.delete('/subs/:id', requireAdmin, wrap(async (req, res) => {
  const sub = await one(Sub, req.params.id);
  await sub.deleteOne();
  rmFiles(sub.videoUrl, sub.fileUrl);
  res.json({ ok: true });
}));

// -------------------- GENERIC CRUD --------------------

function crud(route, Model, allowed, required, after, del) {
  api.get('/' + route, wrap(async (req, res) => {
    res.json(await Model.find().sort('-updatedAt'));
  }));

  api.get('/' + route + '/:id', wrap(async (req, res) => {
    res.json(await one(Model, req.params.id));
  }));

  api.post('/' + route, requireAdmin, wrap(async (req, res) => {
    const data = clean(req.body, allowed);

    for (const key of required) {
      if (!data[key]) throw bad(key + ' is required');
    }

    const document = await Model.create(data);
    if (after) await after(document);
    res.status(201).json(document);
  }));

  api.put('/' + route + '/:id', requireAdmin, wrap(async (req, res) => {
    const document = await one(Model, req.params.id);
    Object.assign(document, clean(req.body, allowed));

    for (const key of required) {
      if (!document[key]) throw bad(key + ' is required');
    }

    await document.save();
    res.json(document);
  }));

  api.delete('/' + route + '/:id', requireAdmin, wrap(async (req, res) => {
    const document = await one(Model, req.params.id);
    if (del) await del(document);
    await document.deleteOne();
    res.json({ ok: true });
  }));
}

crud(
  'subjects',
  Subject,
  ['name', 'code', 'description', 'category', 'cover'],
  ['name'],
  subject => Module.insertMany(
    [1, 2, 3, 4, 5].map(number => ({
      subject: subject._id,
      number,
      name: '',
      description: '',
      topics: []
    }))
  ),
  subject => Module.deleteMany({ subject: subject._id })
);

crud(
  'experiments',
  Experiment,
  ['number', 'name', 'description', 'objective', 'cover', 'videoUrl', 'github', 'notes'],
  ['number', 'name'],
  null,
  async experiment => {
    const subs = await Sub.find({ experiment: experiment._id });
    await Sub.deleteMany({ experiment: experiment._id });

    rmFiles(
      experiment.cover,
      experiment.videoUrl,
      subs.flatMap(sub => [sub.videoUrl, sub.fileUrl])
    );
  }
);

crud(
  'projects',
  Project,
  ['name', 'description', 'details', 'category', 'tags', 'status', 'cover', 'github', 'demoUrl', 'doc'],
  ['name']
);

crud(
  'resources',
  Resource,
  ['name', 'description', 'category', 'url', 'videoUrl', 'doc', 'tags', 'relatedSubject'],
  ['name']
);

crud(
  'tools',
  Tool,
  ['name', 'description', 'category', 'url', 'docsUrl', 'videoUrl', 'icon', 'tags'],
  ['name']
);

// -------------------- STATISTICS AND SEARCH --------------------

api.get('/stats', wrap(async (req, res) => {
  const counts = await Promise.all([
    Subject, Module, Experiment, Sub, Project, Resource, Tool
  ].map(model =>
    model === Module
      ? Module.countDocuments({ name: { $ne: '' } })
      : model.countDocuments()
  ));

  res.json(Object.fromEntries([
    'subjects', 'modules', 'experiments', 'subExperiments',
    'projects', 'resources', 'tools'
  ].map((key, index) => [key, counts[index]])));
}));

api.get('/search', wrap(async (req, res) => {
  const query = String(req.query.q || '').trim().slice(0, 100);
  if (!query) return res.json([]);

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');
  const limit = 8;
  const output = [];

  const find = async (Model, fields, map) => {
    const results = await Model.find({
      $or: fields.map(field => ({ [field]: regex }))
    }).limit(limit);

    results.forEach(item => output.push(map(item)));
  };

  await Promise.all([
    find(Subject, ['name', 'description', 'code'], item => ({
      type: 'Subject', title: item.name,
      desc: item.description, link: '#/subjects/' + item._id
    })),
    find(Module, ['name', 'description', 'topics'], item => ({
      type: 'Module', title: `Module ${item.number}: ${item.name}`,
      desc: item.description, link: '#/modules/' + item._id
    })),
    find(Experiment, ['name', 'description'], item => ({
      type: 'Experiment', title: `Experiment ${item.number}: ${item.name}`,
      desc: item.description, link: '#/experiments/' + item.number
    })),
    find(Sub, ['name', 'description', 'code'], item => ({
      type: 'Sub-experiment', title: `${item.label} ${item.name}`,
      desc: item.description,
      link: `#/experiments/${parseInt(item.label)}/sub-experiments/${item.label.toLowerCase()}`
    })),
    find(Project, ['name', 'description', 'category', 'tags'], item => ({
      type: 'Project', title: item.name,
      desc: item.description, link: '#/projects'
    })),
    find(Resource, ['name', 'description', 'category', 'tags'], item => ({
      type: 'Resource', title: item.name,
      desc: item.description, link: '#/resources'
    })),
    find(Tool, ['name', 'description', 'category', 'tags'], item => ({
      type: 'Tool', title: item.name,
      desc: item.description, link: '#/tools'
    }))
  ]);

  res.json(output);
}));

// -------------------- ERROR HANDLING --------------------

api.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((error, req, res, next) => {
  const status =
    error.code === 11000
      ? 409
      : error.status ||
        (error.name === 'ValidationError' || error.name === 'CastError'
          ? 400
          : 500);

  if (status === 500) console.error(error);

  res.status(status).json({
    error:
      error.code === 11000
        ? 'A record with that number/label already exists'
        : status === 500
          ? 'Internal server error'
          : error.message
  });
});

// -------------------- START SERVER --------------------

(async () => {
  await mongoose.connect(MONGODB_URI, mongoOpts);
  console.log('Connected to MongoDB database: "' + mongoose.connection.name + '"');

  if (!MONGODB_DB && !uriDbName) {
    console.warn(
      'WARNING: MONGODB_URI has no database name, so the default "test" database is used. ' +
      'Set MONGODB_DB (or add the name to the URI) on EVERY environment so data is not "lost" between local and deployed.'
    );
  }

  if (process.env.CLOUDINARY_URL && !/^cloudinary:\/\/[^:]+:[^@]+@.+/.test(process.env.CLOUDINARY_URL)) {
    console.warn('WARNING: CLOUDINARY_URL looks malformed. Expected cloudinary://API_KEY:API_SECRET@CLOUD_NAME');
  }

  if (!(await User.exists({ role: 'admin' }))) {
    if (ADMIN_EMAIL && ADMIN_PASSWORD && ADMIN_PASSWORD.length >= 10) {
      await User.create({
        name: 'Administrator',
        email: ADMIN_EMAIL.toLowerCase(),
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
        role: 'admin'
      });
      console.log('First administrator created.');
    } else {
      console.warn(
        'No admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars) once, then restart.'
      );
    }
  }

  app.listen(process.env.PORT || PORT, () => {
    console.log('Listening on ' + (process.env.PORT || PORT));

    if (PROD && !CLOUD && !process.env.UPLOAD_DIR) {
      console.warn(
        'WARNING: uploads are disabled in production until CLOUDINARY_URL or a persistent UPLOAD_DIR is configured.'
      );
    }
  });
})().catch(error => {
  console.error('Startup failed:', error.message);
  process.exit(1);
});
