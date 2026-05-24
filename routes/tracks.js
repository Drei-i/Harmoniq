const express = require('express');
const router = express.Router();
const { searchTracks } = require('../services/discovery');

router.get('/', async (req, res) => {
  try {
    const { tracks, source } = await searchTracks('');
    res.json({ source, tracks });
  } catch (error) {
    console.error('Error loading discovery tracks:', error);
    res.status(500).json({ error: error.message || 'Failed to load tracks.' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    const { tracks, source } = await searchTracks(query);
    res.json({ source, tracks });
  } catch (error) {
    console.error('Error searching discovery tracks:', error);
    res.status(500).json({ error: error.message || 'Failed to search tracks.' });
  }
});

module.exports = router;
