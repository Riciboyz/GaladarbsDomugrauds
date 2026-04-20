const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const upload = require('../middleware/upload');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function safeExt(originalname, mimetype) {
  const ext = path.extname(originalname || '').toLowerCase();
  if (ext && ext.length <= 10 && /^\.[a-z0-9.]+$/.test(ext)) return ext;
  if (mimetype === 'image/jpeg') return '.jpg';
  if (mimetype === 'image/png') return '.png';
  if (mimetype === 'image/gif') return '.gif';
  if (mimetype === 'image/webp') return '.webp';
  if (mimetype === 'video/mp4') return '.mp4';
  if (mimetype === 'application/pdf') return '.pdf';
  return '';
}

function uploadHandler({ imagesOnly }) {
  return (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    if (imagesOnly && !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image uploads are allowed' });
    }
    ensureUploadDir();
    const ext = safeExt(req.file.originalname, req.file.mimetype) || '.bin';
    const name = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, name);
    fs.writeFile(filePath, req.file.buffer, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save file' });
      const envBase = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
      // Fall back to request host so the URL works even if frontend doesn't
      // proxy /uploads (e.g. before Next dev rewrites are reloaded).
      const reqBase = `${req.protocol}://${req.get('host')}`;
      const base = envBase || reqBase;
      res.json({ success: true, url: `${base}/uploads/${name}` });
    });
  };
}

module.exports = function () {
  const router = Router();

  router.post('/upload', upload.single('file'), uploadHandler({ imagesOnly: true }));
  router.post('/upload/chat', upload.single('file'), uploadHandler({ imagesOnly: false }));

  return router;
};
