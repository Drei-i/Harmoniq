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
  // Always try local tracks as primary source
  const localTracks = readLocalTracks();
  const filteredLocalTracks = filterLocalTracks(localTracks, query);
  
  // If we have local results, return them immediately
  if (filteredLocalTracks.length > 0) {
    console.log(`[discovery] Returning ${filteredLocalTracks.length} local tracks for query: "${query}"`);
    return {
      tracks: filteredLocalTracks,
      source: 'local'
    };
  }

  // Only try external APIs if local search returns nothing
  if (process.env.JAMENDO_CLIENT_ID && process.env.JAMENDO_CLIENT_ID !== 'your_jamendo_client_id') {
    try {
      console.log('[discovery] Trying Jamendo API...');
      const jamendoTracks = await searchJamendo(query);
      if (jamendoTracks?.length) {
        console.log(`[discovery] Jamendo returned ${jamendoTracks.length} tracks`);
        return {
          tracks: jamendoTracks,
          source: 'jamendo'
        };
      }
    } catch (error) {
      console.warn('[discovery] Jamendo unavailable:', error.message);
    }
  }

  try {
    console.log('[discovery] Trying Internet Archive API...');
    const archiveTracks = await searchArchive(query);
    if (archiveTracks?.length) {
      console.log(`[discovery] Internet Archive returned ${archiveTracks.length} tracks`);
      return {
        tracks: archiveTracks,
        source: 'archive'
      };
    }
  } catch (error) {
    console.warn('[discovery] Internet Archive unavailable:', error.message);
  }

  // Final fallback to local tracks (even if query doesn't match perfectly)
  console.log('[discovery] All external APIs failed, returning local tracks');
  return {
    tracks: localTracks,
    source: 'local'
  };
}

module.exports = {
  searchTracks,
  readLocalTracks,
  filterLocalTracks
};
