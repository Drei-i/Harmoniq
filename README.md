# Harmoniq 🎵

A unified music discovery and copyright verification platform for creators.

## Overview

Harmoniq simplifies music discovery for content creators by aggregating Creative Commons licensed tracks and providing audio fingerprinting for copyright verification. Find royalty-free music from multiple sources, understand licensing restrictions, and verify tracks before using them in your projects.

## Features

### 🔍 **Music Discovery**
- Search thousands of CC-licensed tracks from:
  - **Local demo catalog** (7 sample tracks)
  - **Jamendo** (requires API key)
  - **Internet Archive** (free music collections)
- Filter by genre, mood, or custom search
- View license types with beginner-friendly explanations:
  - ✅ **Free for All** - CC BY, CC0
  - ⚠️ **Personal Use Only** - CC BY-NC, CC BY-NC-SA
  - 🔒 **No Remixing** - CC BY-ND
  - ❌ **Copyrighted** - Cannot use

### 🎧 **Built-in Music Player**
- Play/pause, next/previous controls
- Volume adjustment
- Progress tracking
- Works with preview audio from discovery sources

### 📚 **Saved Playlists**
- Create custom playlists (stored in browser localStorage)
- Add tracks from any search result
- Organize by genre, project, or mood
- Export playlists as JSON
- Share playlists with copy-to-clipboard

### 🔐 **Copyright Verification**
- Upload audio files for Chromaprint fingerprinting
- Verify against AcoustID database
- Get identification results (not legal advice)
- Support for MP3, WAV, OGG, M4A, AAC files (up to 25MB)

### 📱 **Responsive Design**
- Mobile-first layout
- Glassmorphism UI elements
- Dark mode with vibrant accents
- Works on desktop, tablet, and phone

## License Information

**Quick Reference:**
| License | Commercial | Remix | Attribution |
|---------|-----------|-------|-------------|
| **CC0 (Public Domain)** | ✅ Yes | ✅ Yes | ❌ No |
| **CC BY** | ✅ Yes | ✅ Yes | ✅ Required |
| **CC BY-NC** | ❌ No | ✅ Yes | ✅ Required |
| **CC BY-NC-SA** | ❌ No | ✅ Yes* | ✅ Required |
| **CC BY-ND** | ✅ Yes | ❌ No | ✅ Required |

*Must share remixes under same license

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/harmoniq.git
cd harmoniq

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start the server
npm start
```

Visit `http://localhost:3000` in your browser.

### Environment Variables

```env
PORT=3000
NODE_ENV=development
JAMENDO_CLIENT_ID=your_jamendo_api_key
```

To get a Jamendo API key:
1. Visit [jamendo.com/api](https://www.jamendo.com/api)
2. Create a free account
3. Register an application
4. Copy your Client ID to `.env`

## File Structure

```
harmoniq/
├── public/
│   ├── index.html          # Discovery page
│   ├── playlists.html      # Playlist management
│   ├── upload.html         # Copyright checker
│   ├── css/
│   │   └── style.css       # All UI styling
│   └── js/
│       ├── main.js         # Core app logic
│       └── playlists.js    # Playlist management
├── routes/
│   ├── tracks.js           # Music search API
│   └── upload.js           # File upload API
├── services/
│   ├── discovery.js        # Multi-source search
│   ├── jamendo.js          # Jamendo API integration
│   ├── archiveDiscovery.js # Internet Archive integration
│   ├── acoustid.js         # Audio fingerprinting
│   └── acoustid.js         # AcoustID database queries
├── data/
│   └── tracks.json         # Local track database
├── bin/
│   └── chromaprint/        # Audio fingerprinting tool
├── scripts/
│   ├── ensure-fpcalc.js    # Download chromaprint utility
│   └── test-*.js           # API testing scripts
├── server.js               # Express app entry point
└── package.json            # Dependencies & scripts
```

## Usage

### Discovering Music

1. Go to the **Discover** page
2. Browse all available tracks or search by:
   - Track title
   - Artist name
   - Genre
   - Mood
3. Click on any track to read its license details
4. Click the **play icon** to preview audio
5. Click the **bookmark icon** to save to a playlist
6. Click the **share icon** to share with others

### Managing Playlists

1. Go to **My Playlists**
2. Create a new playlist with a name and optional description
3. Add tracks from Discovery → save to playlist
4. View playlist details, export as JSON, or share
5. Remove tracks or delete entire playlists

### Verifying Audio

1. Go to **Copyright Checker**
2. Upload an audio file (MP3, WAV, OGG, M4A, AAC)
3. Or paste a direct audio URL
4. Get fingerprint analysis results
5. Check if it matches known copyrighted material

## Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** JSON file (local), Jamendo API, Internet Archive API, AcoustID
- **Audio Fingerprinting:** Chromaprint/fpcalc
- **Deployment:** Render

## API Endpoints

### Discovery API
```
GET /api/tracks                    # Get all local tracks
GET /api/tracks/search?q=query     # Search tracks
```

### Upload API
```
POST /api/upload                   # Upload audio file
POST /api/verify-link              # Verify audio URL
```

## Deployment

### Deploy to Render

1. Push code to GitHub
2. Create new Web Service on [render.com](https://render.com)
3. Connect your GitHub repository
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables in Render dashboard
7. Deploy! 🚀

Live URL will be provided (e.g., `https://harmoniq-xxxx.onrender.com`)

### Recommended Render environment variables

- `PORT` (optional) — Render provides one automatically
- `NODE_ENV` — `production`
- `ACOUSTID_API_KEY` — your AcoustID API key (optional; upload verification will be limited without it)
- `FPCALC_PATH` — path to `fpcalc` binary if not installed system-wide (optional)
- `PAID_PROVIDER` — `mock` or provider name (optional)
- `PAID_PROVIDER_API_KEY` — API key for paid provider (optional)

Notes:
- The platform uses `fpcalc` (Chromaprint). The `postinstall` script attempts to ensure an fpcalc binary; verify `ensure-fpcalc.js` ran successfully in build logs.
- If you rely on paid provider integrations, ensure `node-fetch` is installed (it's included in `package.json`).

## Troubleshooting

### Search returns no results
- Check if local `data/tracks.json` exists
- Verify Jamendo/Archive APIs are responding
- Check server logs for errors

### Audio upload fails
- Ensure file is under 25MB
- Check supported formats: MP3, WAV, OGG, M4A, AAC
- Verify `uploads/` directory exists and is writable

### Player not working
- Check browser console for errors
- Verify audio file paths are correct
- Try different audio format

## Future Enhancements

- [ ] User authentication & accounts
- [ ] Cloud storage for playlists
- [ ] Advanced audio fingerprinting
- [ ] Real-time collaborative playlists
- [ ] Music recommendations engine
- [ ] Legal analysis integration

## Contributing

Found a bug or have a feature request? Open an issue on GitHub!

## License

This project is open source. Music tracks are licensed under their respective Creative Commons or copyright terms.

## Support

For issues or questions, contact [your-email@example.com](mailto:your-email@example.com)

---

**Harmoniq** - Making music discovery simple for creators. 🎵