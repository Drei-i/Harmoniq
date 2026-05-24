require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded audio files at /audio so discovery tracks can reference them
app.use('/audio', express.static(path.join(__dirname, 'uploads')));

// Simple request logging for basic monitoring
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount API routes
const tracksRouter = require('./routes/tracks');
const uploadRouter = require('./routes/upload');
const paidRouter = require('./routes/paidProvider');
const { isFpcalcAvailable, isAcoustidConfigured } = require('./services/acoustid');
const { isProviderConfigured } = require('./services/paidProvider');

app.use('/api/tracks', tracksRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/paid', paidRouter);

app.get('/api/health', (req, res) => {
  // Detect node-fetch availability
  let nodeFetchAvailable = true;
  try {
    require.resolve('node-fetch');
  } catch (e) {
    nodeFetchAvailable = false;
  }

  // Check uploads writable
  let uploadsWritable = false;
  try {
    const uploadsPath = path.join(__dirname, 'uploads');
    fs.accessSync(uploadsPath, fs.constants.W_OK);
    uploadsWritable = true;
  } catch (e) {
    uploadsWritable = false;
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    acoustidConfigured: isAcoustidConfigured(),
    fpcalcAvailable: isFpcalcAvailable(),
    paidProviderConfigured: isProviderConfigured(),
    nodeFetchAvailable,
    uploadsWritable
  });
});
if (!isFpcalcAvailable()) {
  console.warn('[startup] Chromaprint fpcalc is not available. Upload verification may be disabled. Install fpcalc or set FPCALC_PATH.');
}
if (!isAcoustidConfigured()) {
  console.warn('[startup] ACOUSTID_API_KEY is not configured. Add your key to .env or deployment environment.');
}
// Fallback for SPA routing if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  Harmoniq MVP Server Running!`);
  console.log(`  Local Address: http://localhost:${PORT}`);
  console.log(`========================================`);
});
