const API_BASE = 'https://api.jamendo.com/v3.0/tracks/';

function getClientId() {
  const id = process.env.JAMENDO_CLIENT_ID;
  if (!id || id === 'your_jamendo_client_id') {
    return null;
  }
  return id;
}

function formatDuration(seconds) {
  const total = Math.round(Number(seconds) || 0);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function licenseLabel(licenseUrl) {
  if (!licenseUrl) return 'Creative Commons';
  if (licenseUrl.includes('publicdomain') || licenseUrl.includes('/zero/')) {
    return 'CC0';
  }

  const match = licenseUrl.match(/licenses\/([a-z-]+)\//);
  if (!match) return 'Creative Commons';

  return `CC ${match[1].toUpperCase().replace(/-/g, '-').split('-').join('-')}`;
}

function normalizeJamendoTrack(track) {
  const genres = track.musicinfo?.tags?.genres || [];
  const instruments = track.musicinfo?.tags?.instruments || [];
  const license = licenseLabel(track.license_ccurl);
  const album = track.album_name ? `Album: ${track.album_name}.` : '';

  return {
    id: `jamendo-${track.id}`,
    title: track.name,
    artist: track.artist_name,
    genre: genres[0] || 'Various',
    mood: genres[1] || instruments[0] || 'Various',
    duration: formatDuration(track.duration),
    license,
    licenseUrl: track.license_ccurl,
    status: 'CC Licensed',
    details: `Streamed from Jamendo. ${license}. ${album}`.trim(),
    filepath: track.audio,
    source: 'jamendo',
    externalUrl: track.shareurl || track.shorturl || `https://www.jamendo.com/track/${track.id}`
  };
}

async function searchJamendo(query = '', limit = 20) {
  const clientId = getClientId();
  if (!clientId) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    format: 'json',
    limit: String(limit),
    include: 'musicinfo',
    audioformat: 'mp32',
    order: query ? 'relevance' : 'popularity_total'
  });

  if (query.trim()) {
    params.set('search', query.trim());
  } else {
    params.set('fuzzytags', 'chill');
  }

  const response = await fetch(`${API_BASE}?${params.toString()}`);
  const data = await response.json();

  if (data.headers?.status === 'failed') {
    throw new Error(data.headers.error_message || 'Jamendo API request failed.');
  }

  return (data.results || []).map(normalizeJamendoTrack);
}

module.exports = {
  searchJamendo,
  getClientId
};
