require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
const tracksRouter = require('./routes/tracks');
const uploadRouter = require('./routes/upload');

app.use('/api/tracks', tracksRouter);
app.use('/api/upload', uploadRouter);

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
