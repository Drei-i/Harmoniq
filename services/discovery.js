const fs = require('fs');
const path = require('path');
const { searchJamendo } = require('./jamendo');
const { searchArchive } = require('./archiveDiscovery');

const localTracksPath = path.join(__dirname, '..', 'data', 'tracks.json');

function readLocalTracks() {
  try {
    const rawData = fs.readFileSync(localTracksPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error reading local tracks database:', error);
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
  if (process.env.JAMENDO_CLIENT_ID && process.env.JAMENDO_CLIENT_ID !== 'your_jamendo_client_id') {
    try {
      const jamendoTracks = await searchJamendo(query);
      if (jamendoTracks?.length) {
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
    const archiveTracks = await searchArchive(query);
    if (archiveTracks.length) {
      return {
        tracks: archiveTracks,
        source: 'archive'
      };
    }
  } catch (error) {
    console.warn('[discovery] Internet Archive unavailable:', error.message);
  }

  const localTracks = filterLocalTracks(readLocalTracks(), query);
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
