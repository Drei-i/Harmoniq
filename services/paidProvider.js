// Prototype paid-provider integration abstraction
// Supports a 'mock' provider and can be extended for real providers like Gracenote/AudibleMagic

const PROVIDER = process.env.PAID_PROVIDER || 'mock';
const API_KEY = process.env.PAID_PROVIDER_API_KEY || '';

// Note: `node-fetch` is optional for the mock provider. If a real provider is selected,
// we attempt to require it at runtime and return a clear error if missing so the app doesn't crash.

async function lookupFingerprint({ fingerprint, trackMeta = {} } = {}) {
  // Basic input validation
  if (!fingerprint && !trackMeta.title) {
    return { ok: false, error: 'missing fingerprint or metadata' };
  }

  // Mock provider returns deterministic results useful for testing
  if (PROVIDER === 'mock') {
    // Very simple heuristic: if title contains "match" return positive
    const title = (trackMeta.title || '').toLowerCase();
    const match = title.includes('match') || Math.random() > 0.85;
    return {
      ok: true,
      provider: 'mock',
      match,
      confidence: match ? 0.92 : 0.12,
      details: match ? { providerId: 'MOCK-12345', info: 'Simulated match' } : null
    };
  }

  // Example: placeholder for extending to a real provider (Gracenote/AudibleMagic)
  if (!API_KEY) {
    return { ok: false, error: 'provider not configured (missing API key)' };
  }

  try {
    // If a real provider is requested and we need to make HTTP calls, ensure fetch is available
    let fetchImpl = null;
    try {
      fetchImpl = require('node-fetch');
    } catch (e) {
      // If node-fetch is missing, provide a helpful error to the caller
      return { ok: false, error: 'provider integration requires node-fetch; install dependency or use mock provider' };
    }

    if (PROVIDER === 'gracenote') {
      // Gracenote integration would go here. This is a placeholder to show structure.
      // Real integration requires SDK/API agreement and credentials.
      // For now, return a not-implemented response.
      return { ok: false, error: 'gracenote integration not implemented in prototype' };
    }

    if (PROVIDER === 'audiblemagic') {
      // AudibleMagic integration placeholder
      return { ok: false, error: 'audiblemagic integration not implemented in prototype' };
    }

    return { ok: false, error: 'unsupported provider' };
  } catch (err) {
    return { ok: false, error: err.message || 'lookup failed' };
  }
}

function isProviderConfigured() {
  return PROVIDER === 'mock' || !!API_KEY;
}

module.exports = {
  lookupFingerprint,
  isProviderConfigured,
};
