const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyAudioFile } = require('../services/acoustid');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }
});

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm']);

function deleteFileQuietly(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) console.error('Error deleting temp file:', err);
  });
}

function isDirectAudioUrl(urlString) {
  try {
    const ext = path.extname(new URL(urlString).pathname).toLowerCase();
    return AUDIO_EXTENSIONS.has(ext);
  } catch {
    return false;
  }
}

async function downloadDirectAudio(urlString) {
  const response = await fetch(urlString, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Could not download audio link (HTTP ${response.status}).`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('audio/') && !isDirectAudioUrl(urlString)) {
    throw new Error('Link must point to a direct audio file (e.g. .mp3, .wav). Streaming pages are not supported.');
  }

  const ext = path.extname(new URL(urlString).pathname) || '.mp3';
  const tempPath = path.join(uploadDir, `link-${Date.now()}${ext}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tempPath, buffer);
  return tempPath;
}

router.post('/', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  const originalName = req.file.originalname;
  const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);

  try {
    const report = await verifyAudioFile(req.file.path, {
      filename: originalName,
      fileSize: `${fileSizeMB} MB`,
      format: path.extname(originalName).toUpperCase().replace('.', '') || 'AUDIO'
    });

    deleteFileQuietly(req.file.path);
    res.json(report);
  } catch (error) {
    deleteFileQuietly(req.file.path);
    console.error('Error during audio verification:', error);
    res.status(500).json({ error: error.message || 'An error occurred during verification.' });
  }
});

router.post('/link', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Please provide a valid audio link URL.' });
  }

  const trimmedUrl = url.trim();
  let tempPath = null;

  try {
    if (!isDirectAudioUrl(trimmedUrl)) {
      return res.status(400).json({
        error: 'Only direct audio file URLs are supported for fingerprinting (e.g. https://example.com/track.mp3). Use file upload for other sources.'
      });
    }

    tempPath = await downloadDirectAudio(trimmedUrl);
    const ext = path.extname(new URL(trimmedUrl).pathname).toUpperCase().replace('.', '') || 'AUDIO';
    const displayFilename = trimmedUrl.length > 45 ? trimmedUrl.substring(0, 42) + '...' : trimmedUrl;

    const report = await verifyAudioFile(tempPath, {
      filename: displayFilename,
      fileSize: 'External audio link',
      format: ext
    });

    deleteFileQuietly(tempPath);
    res.json(report);
  } catch (error) {
    if (tempPath) deleteFileQuietly(tempPath);
    console.error('Error during link verification:', error);
    res.status(500).json({ error: error.message || 'An error occurred during link verification.' });
  }
});

module.exports = router;
