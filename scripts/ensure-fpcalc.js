const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const VERSION = '1.6.0';
const binDir = path.join(__dirname, '..', 'bin');
const isWin = process.platform === 'win32';
const binName = isWin ? 'fpcalc.exe' : 'fpcalc';
const binPath = path.join(binDir, binName);

const DOWNLOADS = {
  win32: {
    url: `https://github.com/acoustid/chromaprint/releases/download/v${VERSION}/chromaprint-fpcalc-${VERSION}-windows-x86_64.zip`,
    archive: path.join(binDir, 'fpcalc.zip'),
    extract: () => {
      const zipPath = path.join(binDir, 'fpcalc.zip');
      execSync(
        `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${binDir}' -Force"`,
        { stdio: 'inherit' }
      );
    }
  },
  darwin: {
    url: `https://github.com/acoustid/chromaprint/releases/download/v${VERSION}/chromaprint-fpcalc-${VERSION}-macos-universal.tar.gz`,
    archive: path.join(binDir, 'fpcalc.tar.gz'),
    extract: () => {
      execSync(`tar -xzf "${path.join(binDir, 'fpcalc.tar.gz')}" -C "${binDir}"`, { stdio: 'inherit' });
    }
  },
  linux: {
    url: `https://github.com/acoustid/chromaprint/releases/download/v${VERSION}/chromaprint-fpcalc-${VERSION}-linux-x86_64.tar.gz`,
    archive: path.join(binDir, 'fpcalc.tar.gz'),
    extract: () => {
      execSync(`tar -xzf "${path.join(binDir, 'fpcalc.tar.gz')}" -C "${binDir}"`, { stdio: 'inherit' });
    }
  }
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (targetUrl) => {
      https.get(targetUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          request(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed (${response.statusCode}): ${targetUrl}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    };
    request(url);
  });
}

function findBinary(root) {
  if (fs.existsSync(path.join(root, binName))) {
    return path.join(root, binName);
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const nested = findBinary(path.join(root, entry.name));
      if (nested) return nested;
    }
  }
  return null;
}

async function main() {
  if (fs.existsSync(binPath)) {
    return;
  }

  if (process.env.FPCALC_PATH && fs.existsSync(process.env.FPCALC_PATH)) {
    return;
  }

  const platform = isWin ? 'win32' : process.platform;
  const config = DOWNLOADS[platform];
  if (!config) {
    console.warn(`[ensure-fpcalc] No bundled download for ${platform}. Install fpcalc manually or set FPCALC_PATH.`);
    return;
  }

  fs.mkdirSync(binDir, { recursive: true });
  console.log(`[ensure-fpcalc] Downloading Chromaprint fpcalc ${VERSION} for ${platform}...`);

  try {
    await downloadFile(config.url, config.archive);
    config.extract();

    const discovered = findBinary(binDir);
    if (discovered && discovered !== binPath) {
      fs.copyFileSync(discovered, binPath);
    }

    if (!fs.existsSync(binPath)) {
      throw new Error('fpcalc binary not found after extraction.');
    }

    if (!isWin) {
      fs.chmodSync(binPath, 0o755);
    }

    if (fs.existsSync(config.archive)) {
      fs.unlinkSync(config.archive);
    }

    console.log(`[ensure-fpcalc] Ready at ${binPath}`);
  } catch (error) {
    console.warn(`[ensure-fpcalc] Could not install fpcalc automatically: ${error.message}`);
    console.warn('[ensure-fpcalc] Install Chromaprint manually or set FPCALC_PATH in .env');
  }
}

main();
