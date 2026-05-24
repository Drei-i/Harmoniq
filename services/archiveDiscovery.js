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

  return `CC ${match[1].toUpperCase()}`;
}

function buildArchiveQuery(query) {
  const base = 'mediatype:audio AND licenseurl:*creativecommons*';
  const trimmed = query.trim();
  if (!trimmed) {
    return base;
  }

  const escaped = trimmed.replace(/"/g, '');
  return `${base} AND (title:(${escaped}) OR creator:(${escaped}))`;
}

async function fetchArchiveTrack(doc) {
  const metadataResponse = await fetch(`https://archive.org/metadata/${doc.identifier}`);
  if (!metadataResponse.ok) {
    return null;
  }

  const metadata = await metadataResponse.json();
  const mp3File = (metadata.files || []).find((file) => {
    return file.name?.endsWith('.mp3') &&
      !file.name.endsWith('_files.xml') &&
      (file.format?.includes('MP3') || file.source === 'original');
  });

  if (!mp3File) {
    return null;
  }

  const title = mp3File.title || doc.title || doc.identifier;
  const artist = mp3File.artist || mp3File.creator || doc.creator || 'Unknown artist';
  const license = licenseLabel(doc.licenseurl);
  const streamUrl = `https://archive.org/download/${doc.identifier}/${encodeURIComponent(mp3File.name)}`;

  return {
    id: `archive-${doc.identifier}`,
    title,
    artist,
    genre: mp3File.genre || 'Various',
    mood: 'Archive',
    duration: formatDuration(Number(mp3File.length) || 0),
    license,
    licenseUrl: doc.licenseurl,
    status: 'CC Licensed',
    details: `Creative Commons audio from Internet Archive. ${license}.`,
    filepath: streamUrl,
    source: 'archive',
    externalUrl: `https://archive.org/details/${doc.identifier}`
  };
}

async function searchArchive(query = '', limit = 12) {
  const searchUrl = new URL('https://archive.org/advancedsearch.php');
  searchUrl.searchParams.set('q', buildArchiveQuery(query));
  searchUrl.searchParams.append('fl[]', 'identifier');
  searchUrl.searchParams.append('fl[]', 'title');
  searchUrl.searchParams.append('fl[]', 'creator');
  searchUrl.searchParams.append('fl[]', 'licenseurl');
  searchUrl.searchParams.set('rows', String(limit));
  searchUrl.searchParams.set('output', 'json');
  searchUrl.searchParams.set('sort[]', 'downloads desc');

  const searchResponse = await fetch(searchUrl.toString());
  if (!searchResponse.ok) {
    throw new Error(`Internet Archive search failed (${searchResponse.status}).`);
  }

  const searchData = await searchResponse.json();
  const docs = searchData.response?.docs || [];
  const tracks = await Promise.all(docs.map(fetchArchiveTrack));

  return tracks.filter(Boolean);
}

module.exports = {
  searchArchive
};
