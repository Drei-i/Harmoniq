const fs = require('fs');
const path = require('path');
const { searchJamendo } = require('./jamendo');
const { searchArchive } = require('./archiveDiscovery');

// Use absolute path resolution to work on both local and Render
const localTracksPath = path.resolve(__dirname, '..', 'data', 'tracks.json');

function readLocalTracks() {
  try {
    // Verify file exists before reading
    if (!fs.existsSync(localTracksPath)) {
      console.error('Local tracks file not found at:', localTracksPath);
      return [];
    }
    
    const rawData = fs.readFileSync(localTracksPath, 'utf8');
    const tracks = JSON.parse(rawData);
    
    if (!Array.isArray(tracks)) {
      console.error('Tracks data is not an array');
      return [];
    }
    
    return tracks;
  } catch (error) {
    console.error('Error reading local tracks database:', error.message);
    console.error('Attempted path:', localTracksPath);
    return [];
  }
}

function filterLocalTracks(tracks, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return tracks;
  }

  return tracks.filter((track) => {
    return (
      track.title.toLowerCase().includes(normalized) ||
      track.artist.toLowerCase().includes(normalized) ||
      track.genre.toLowerCase().includes(normalized) ||
      track.mood.toLowerCase().includes(normalized)
    );
  });
}

async function searchTracks(query = '') {
  // Always search local tracks first
  const localTracks = readLocalTracks();
  const filteredLocalTracks = filterLocalTracks(localTracks, query);
  
  console.log(`[discovery] Found ${filteredLocalTracks.length} local tracks for query: "${query}"`);
  
  let combinedTracks = [...filteredLocalTracks];
  let source = 'local';

  // If we have a specific search query, also try external APIs to get more results
  if (query.trim()) {
    // Try Jamendo
    if (process.env.JAMENDO_CLIENT_ID && process.env.JAMENDO_CLIENT_ID !== 'your_jamendo_client_id') {
      try {
        console.log('[discovery] Trying Jamendo API for query:', query);
        const jamendoTracks = await searchJamendo(query);
        if (jamendoTracks?.length) {
          console.log(`[discovery] Jamendo returned ${jamendoTracks.length} tracks`);
          combinedTracks = [...combinedTracks, ...jamendoTracks];
          source = 'mixed';
        }
      } catch (error) {
        console.warn('[discovery] Jamendo error:', error.message);
      }
    }

    // Try Internet Archive
    try {
      console.log('[discovery] Trying Internet Archive API for query:', query);
      const archiveTracks = await searchArchive(query);
      if (archiveTracks?.length) {
        console.log(`[discovery] Internet Archive returned ${archiveTracks.length} tracks`);
        combinedTracks = [...combinedTracks, ...archiveTracks];
        source = 'mixed';
      }
    } catch (error) {
      console.warn('[discovery] Internet Archive error:', error.message);
    }
  }

  // Remove duplicates by id if present
  const uniqueTracks = Array.from(
    new Map(combinedTracks.map(track => [track.id, track])).values()
  );

  console.log(`[discovery] Returning ${uniqueTracks.length} total tracks (source: ${source})`);
  
  return {
    tracks: uniqueTracks,
    source: source
  };
}

module.exports = {
  searchTracks,
  readLocalTracks,
  filterLocalTracks
};
