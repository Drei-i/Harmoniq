const fs = require('fs');
const path = require('path');

function ok(msg) { console.log('OK:', msg); }
function fail(msg) { console.error('FAIL:', msg); process.exitCode = 2; }

try {
  const filesToCheck = [
    'data/tracks.json',
    'public/index.html',
    'server.js'
  ];

  filesToCheck.forEach(f => {
    if (fs.existsSync(path.join(__dirname, '..', f))) {
      ok(`${f} exists`);
    } else {
      fail(`${f} missing`);
    }
  });

  // Check uploads dir writable
  const uploads = path.join(__dirname, '..', 'uploads');
  try {
    fs.accessSync(uploads, fs.constants.W_OK);
    ok('uploads directory writable');
  } catch (e) {
    fail('uploads directory not writable or missing');
  }

  // Report node-fetch availability (optional)
  try {
    require.resolve('node-fetch');
    ok('node-fetch available');
  } catch (e) {
    console.warn('WARN: node-fetch not available (paid provider integrations may be limited)');
  }

  console.log('Smoke test completed');
} catch (err) {
  console.error('Smoke test error:', err);
  process.exitCode = 2;
}
