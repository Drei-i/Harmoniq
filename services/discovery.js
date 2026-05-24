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
  
  // Return local results immediately (don't wait for external APIs)
  if (!query.trim()) {
    // For empty query, just return local tracks
    console.log(`[discovery] Empty query - returning ${filteredLocalTracks.length} local tracks immediately`);
    return {
      tracks: filteredLocalTracks,
      source: 'local'
    };
  }

  // For search queries, start with local results and optionally add external results
  let combinedTracks = [...filteredLocalTracks];
  let source = filteredLocalTracks.length > 0 ? 'local' : 'none';

  console.log(`[discovery] Searching external APIs for: "${query}"`);

  // Try external APIs in parallel with a timeout to avoid blocking
  const externalResults = await Promise.allSettled([
    searchExternalWithTimeout('jamendo', query),
    searchExternalWithTimeout('archive', query)
  ]);

  // Process results from Jamendo (if available)
  if (externalResults[0].status === 'fulfilled' && externalResults[0].value?.length) {
    const jamendoTracks = externalResults[0].value;
    console.log(`[discovery] Jamendo returned ${jamendoTracks.length} tracks`);
    combinedTracks = [...combinedTracks, ...jamendoTracks];
    source = source === 'none' ? 'jamendo' : 'mixed';
  } else if (externalResults[0].status === 'rejected') {
    console.warn(`[discovery] Jamendo failed:`, externalResults[0].reason);
  }

  // Process results from Internet Archive (if available)
  if (externalResults[1].status === 'fulfilled' && externalResults[1].value?.length) {
    const archiveTracks = externalResults[1].value;
    console.log(`[discovery] Internet Archive returned ${archiveTracks.length} tracks`);
    combinedTracks = [...combinedTracks, ...archiveTracks];
    source = source === 'none' ? 'archive' : 'mixed';
  } else if (externalResults[1].status === 'rejected') {
    console.warn(`[discovery] Internet Archive failed:`, externalResults[1].reason);
  }

  // Remove duplicates by id
  const uniqueTracks = Array.from(
    new Map(combinedTracks.map(track => [track.id, track])).values()
  );

  console.log(`[discovery] Returning ${uniqueTracks.length} total tracks (source: ${source})`);
  
  return {
    tracks: uniqueTracks,
    source: source
  };
}

// Helper function to call external APIs with a timeout
async function searchExternalWithTimeout(apiName, query = '') {
  const timeoutMs = 5000; // 5 second timeout
  
  try {
    const promise = apiName === 'jamendo' 
      ? searchJamendoWithTimeout(query, timeoutMs)
      : searchArchiveWithTimeout(query, timeoutMs);
    
    return await promise;
  } catch (error) {
    console.warn(`[discovery] ${apiName} error:`, error.message);
    return [];
  }
}

// Jamendo search with timeout
async function searchJamendoWithTimeout(query, timeoutMs) {
  if (!process.env.JAMENDO_CLIENT_ID || process.env.JAMENDO_CLIENT_ID === 'your_jamendo_client_id') {
    return [];
  }

  console.log(`[discovery] Querying Jamendo for: "${query}"`);
  
  return Promise.race([
    searchJamendo(query),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Jamendo timeout')), timeoutMs)
    )
  ]);
}

// Internet Archive search with timeout
async function searchArchiveWithTimeout(query, timeoutMs) {
  console.log(`[discovery] Querying Internet Archive for: "${query}"`);
  
  return Promise.race([
    searchArchive(query),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Internet Archive timeout')), timeoutMs)
    )
  ]);
}

module.exports = {
  searchTracks,
  readLocalTracks,
  filterLocalTracks
};
