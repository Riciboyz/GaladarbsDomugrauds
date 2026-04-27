const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const CHAT_MIMES = new Set([...IMAGE_MIMES, 'video/mp4', 'application/pdf']);

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

function hasPrefix(buf, prefix) {
  if (!buf || buf.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (buf[i] !== prefix[i]) return false;
  }
  return true;
}

function detectFileKind(buf) {
  if (hasPrefix(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (hasPrefix(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (hasPrefix(buf, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (hasPrefix(buf, [0x52, 0x49, 0x46, 0x46]) && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (hasPrefix(buf, [0x25, 0x50, 0x44, 0x46])) return 'application/pdf';
  if (buf.length >= 12 && buf.slice(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';
  return null;
}

function uploadHandler({ imagesOnly }) {
  return (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const allowedMimes = imagesOnly ? IMAGE_MIMES : CHAT_MIMES;
    if (!allowedMimes.has(req.file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }
    const detectedMime = detectFileKind(req.file.buffer);
    if (!detectedMime || detectedMime !== req.file.mimetype || !allowedMimes.has(detectedMime)) {
      return res.status(400).json({ error: 'Invalid file contents' });
    }
    ensureUploadDir();
    const ext = safeExt(req.file.originalname, detectedMime) || '.bin';
    const name = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, name);
    fs.writeFile(filePath, req.file.buffer, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save file' });
      // Return a relative path so any client (local or remote) can resolve it
      // via Next.js `/uploads/*` rewrite to the backend. Storing absolute URLs
      // with `localhost` made images unreachable for other users.
      res.json({ success: true, url: `/uploads/${name}` });
    });
  };
}

module.exports = function () {
  const router = Router();
  const uploadSingle = (field) => (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (!err) return next();
      return res.status(400).json({ error: err.message || 'Invalid upload' });
    });
  };

  router.post('/upload', authenticateToken, uploadSingle('file'), uploadHandler({ imagesOnly: true }));
  router.post('/upload/chat', authenticateToken, uploadSingle('file'), uploadHandler({ imagesOnly: false }));

  return router;
};
