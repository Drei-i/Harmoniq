const fpcalc = require('fpcalc');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const MATCH_SCORE_THRESHOLD = 0.5;
const LOOKUP_URL = 'https://api.acoustid.org/v2/lookup';

function getApiKey() {
  const key = process.env.ACOUSTID_API_KEY;
  return key && key !== 'your_acoustid_application_key' ? key : null;
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

  return binName;
}

function fingerprintFile(filePath) {
  return new Promise((resolve, reject) => {
    const command = getFpcalcCommand();
    if (!command) {
      return reject(new Error('Chromaprint fpcalc is not configured. Install it or set FPCALC_PATH.'));
    }

    fpcalc(filePath, { command }, (err, result) => {
      if (err) {
        return reject(new Error(
          'Could not fingerprint audio. Ensure Chromaprint fpcalc is installed and accessible.'
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

  const response = await fetch(`${LOOKUP_URL}?${params.toString()}&meta=recordings+releasegroups`);
  if (!response.ok) {
    throw new Error(`AcoustID lookup failed with status ${response.status}.`);
  }

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

function buildReport({ filename, fileSize, format, fingerprint, duration, results = [], lookupError }) {
  const fingerprintHash = fingerprint ? hashFingerprint(fingerprint) : 'unavailable';
  const base = {
    filename,
    fileSize,
    format,
    scanTimestamp: new Date().toISOString(),
    fingerprintHash,
    confidenceScore: 0,
    identificationSource: 'AcoustID'
  };

  if (lookupError) {
    return {
      ...base,
      status: 'Verification unavailable',
      match: null,
      error: lookupError.message,
      licenseAlternative: {
        licenseName: 'Verification unavailable',
        url: 'https://acoustid.org/webservice',
        text: lookupError.message ||
          'The fingerprint verification could not complete because the service is not configured or an external lookup failed.'
      }
    };
  }

  const parsed = parseMatchResults(results);
  if (!parsed.matched) {
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

async function verifyAudioFile(filePath, meta) {
  let fingerprint;
  let duration = 0;

  try {
    const result = await fingerprintFile(filePath);
    fingerprint = result.fingerprint;
    duration = result.duration;
  } catch (error) {
    return buildReport({ ...meta, fingerprint: null, duration: 0, results: [], lookupError: error });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return buildReport({
      ...meta,
      fingerprint,
      duration,
      results: [],
      lookupError: new Error('ACOUSTID_API_KEY is not configured. Add your key to .env or deployment settings.')
    });
  }

  try {
    const results = await lookupFingerprint(duration, fingerprint);
    return buildReport({ ...meta, fingerprint, duration, results });
  } catch (error) {
    return buildReport({ ...meta, fingerprint, duration, results: [], lookupError: error });
  }
}

function isFpcalcAvailable() {
  const command = getFpcalcCommand();
  if (!command) return false;
  try {
    const result = spawnSync(command, ['-version'], {
      stdio: 'ignore',
      shell: false
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

function isAcoustidConfigured() {
  return !!getApiKey();
}

module.exports = {
  verifyAudioFile,
  fingerprintFile,
  lookupFingerprint,
  buildReport,
  isFpcalcAvailable,
  isAcoustidConfigured
};
