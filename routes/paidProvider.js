const express = require('express');
const router = express.Router();
const { lookupFingerprint, isProviderConfigured } = require('../services/paidProvider');

// POST /api/paid/lookup
// body: { fingerprint?: string, metadata?: { title, artist, album } }
router.post('/lookup', async (req, res) => {
  if (!isProviderConfigured()) {
    return res.status(503).json({ ok: false, error: 'paid provider not configured' });
  }

  const { fingerprint, metadata } = req.body || {};
  try {
    const result = await lookupFingerprint({ fingerprint, trackMeta: metadata });
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'lookup failed' });
  }
});

module.exports = router;
