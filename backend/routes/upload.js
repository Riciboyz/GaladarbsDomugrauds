const { Router } = require('express');
const upload = require('../middleware/upload');

module.exports = function () {
  const router = Router();

  function dataUrlResponse(req, res) {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const b64 = req.file.buffer.toString('base64');
    const url = `data:${req.file.mimetype};base64,${b64}`;
    res.json({ success: true, url });
  }

  router.post('/upload', upload.single('file'), dataUrlResponse);
  router.post('/upload/chat', upload.single('file'), dataUrlResponse);

  return router;
};
