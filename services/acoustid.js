const fpcalc = require('fpcalc');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const MATCH_SCORE_THRESHOLD = 0.5;
const LOOKUP_URL = 'https://api.acoustid.org/v2/lookup';

function getApiKey() {
  const key = process.env.ACOUSTID_API_KEY;
  if (!key || key === 'your_acoustid_application_key') {
    throw new Error('ACOUSTID_API_KEY is not configured. Add your key to .env.');
  }
  return key;
}

function getFpcalcCommand() {
  if (process.env.FPCALC_PATH && fs.existsSync(process.env.FPCALC_PATH)) {
    return process.env.FPCALC_PATH;
  }

  const binName = process.platform === 'win32' ? 'fpcalc.exe' : 'fpcalc';
  const bundledPath = path.join(__dirname, '..', 'bin', binName);
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }

  return 'fpcalc';
}

function fingerprintFile(filePath) {
  return new Promise((resolve, reject) => {
    fpcalc(filePath, { command: getFpcalcCommand() }, (err, result) => {
      if (err) {
        return reject(new Error(
          'Could not fingerprint audio. Ensure Chromaprint fpcalc is installed (run npm install).'
        ));
      }
      resolve(result);
    });
  });
}

async function lookupFingerprint(duration, fingerprint) {
  const params = new URLSearchParams({
    client: getApiKey(),
    duration: String(Math.round(duration)),
    fingerprint,
    format: 'json'
  });

  // AcoustID expects literal "+" separators in meta; URLSearchParams encodes them incorrectly.
  const response = await fetch(`${LOOKUP_URL}?${params.toString()}&meta=recordings+releasegroups`);
  const data = await response.json();

  if (data.status === 'error') {
    throw new Error(data.error?.message || 'AcoustID lookup failed.');
  }

  let results = data.results || [];

  const topMatch = results.find(result => result.score >= MATCH_SCORE_THRESHOLD);
  if (topMatch && !topMatch.recordings?.length && topMatch.id) {
    const trackParams = new URLSearchParams({
      client: getApiKey(),
      trackid: topMatch.id,
      format: 'json'
    });
    const trackResponse = await fetch(`${LOOKUP_URL}?${trackParams.toString()}&meta=recordings+releasegroups`);
    const trackData = await trackResponse.json();
    if (trackData.status === 'ok' && trackData.results?.[0]?.recordings?.length) {
      results = [trackData.results[0], ...results.filter(result => result.id !== topMatch.id)];
    }
  }

  return results;
}

function hashFingerprint(fingerprint) {
  return 'sha256-' + crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 32);
}

function parseMatchResults(results) {
  const candidates = (results || [])
    .filter(result => result.score >= MATCH_SCORE_THRESHOLD && result.recordings?.length)
    .sort((a, b) => b.score - a.score);

  if (!candidates.length) {
    return { matched: false };
  }

  const best = candidates[0];
  const recording = best.recordings[0];
  const artist = recording.artists?.[0]?.name || 'Unknown artist';
  const title = recording.title || 'Unknown title';
  const release = recording.releasegroups?.[0];
  const confidence = Math.round(best.score * 1000) / 10;

  return {
    matched: true,
    confidence,
    match: {
      matchedTrack: title,
      matchedArtist: artist,
      label: release?.title || 'Unknown release',
      matchType: `AcoustID database match (${confidence}% confidence)`,
      recommendation:
        'This audio matches a known recording in the AcoustID database. It is not safe to release commercially without obtaining proper licenses from the rights holders.'
    }
  };
}

function buildReport({ filename, fileSize, format, fingerprint, duration, results }) {
  const parsed = parseMatchResults(results);
  const fingerprintHash = hashFingerprint(fingerprint);
  const confidenceScore = parsed.matched ? parsed.confidence : 0;

  const base = {
    filename,
    fileSize,
    format,
    scanTimestamp: new Date().toISOString(),
    fingerprintHash,
    confidenceScore,
    identificationSource: 'AcoustID'
  };

  if (parsed.matched) {
    return {
      ...base,
      status: 'Match Found',
      match: parsed.match,
      licenseAlternative: {
        licenseName: 'Identification note',
        url: 'https://acoustid.org/webservice',
        text: 'A known recording was identified. This result does not determine copyright status or grant permission to use the audio.'
      }
    };
  }

  return {
    ...base,
    status: 'No Match Found',
    match: null,
    licenseAlternative: {
      licenseName: 'Release warning',
      url: 'https://acoustid.org/webservice',
      text: 'No match was found in the AcoustID fingerprint database. This does not mean the track is safe to release — it may still contain uncleared samples, covers, or other protected material. Do not distribute until you have confirmed proper rights and licensing.'
    }
  };
}

async function verifyAudioFile(filePath, meta) {
  const { fingerprint, duration } = await fingerprintFile(filePath);
  const results = await lookupFingerprint(duration, fingerprint);
  return buildReport({ ...meta, fingerprint, duration, results });
}

module.exports = {
  verifyAudioFile,
  fingerprintFile,
  lookupFingerprint,
  buildReport
};
