// Harmoniq Frontend Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // Global Track State
  let allTracks = [];
  let currentTrackIndex = -1;
  let synthInterval = null;
  let audioContext = null;
  let synthNodes = [];

  // Core HTML Elements
  const tracksGrid = document.getElementById('tracks-grid');
  const tracksLoading = document.getElementById('tracks-loading');
  const searchInput = document.getElementById('search-input');
  
  // Media Player Elements
  const mainAudio = document.getElementById('main-audio');
  const bottomPlayer = document.getElementById('bottom-player');
  const playerTitle = document.getElementById('player-title');
  const playerArtist = document.getElementById('player-artist');
  const playerPlayBtn = document.getElementById('player-play');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const playerPrevBtn = document.getElementById('player-prev');
  const playerNextBtn = document.getElementById('player-next');
  const playerTimeCurrent = document.getElementById('player-time-current');
  const playerTimeTotal = document.getElementById('player-time-total');
  const playerProgressTrack = document.getElementById('player-progress-track');
  const playerProgressFilled = document.getElementById('player-progress-filled');
  const playerVolumeSlider = document.getElementById('player-volume-slider');
  const playerVolumeFilled = document.getElementById('player-volume-filled');

  // Upload Page Elements (Only if on upload.html)
  const uploadZone = document.getElementById('upload-zone');
  const audioFileInput = document.getElementById('audio-file-input');
  const browseBtn = document.getElementById('browse-btn');
  const uploadLoader = document.getElementById('upload-loader');
  const uploadProgressFill = document.getElementById('upload-progress-fill');
  const loaderMessage = document.getElementById('loader-message');
  const reportContainer = document.getElementById('report-container');
  const resetUploadBtn = document.getElementById('reset-upload-btn');
  const fileSelectedDisplay = document.getElementById('file-selected-display');
  const fileNameSpan = document.getElementById('file-name-span');

  const tabFile = document.getElementById('tab-file');
  const tabLink = document.getElementById('tab-link');
  const linkZone = document.getElementById('link-zone');
  const audioLinkInput = document.getElementById('audio-link-input');
  const verifyLinkBtn = document.getElementById('verify-link-btn');


  // Initialize features depending on which page is active
  if (tracksGrid) {
    loadTracks();
    setupDiscoveryEvents();
  }

  if (uploadZone) {
    setupUploadEvents();
  }

  setupMediaPlayer();

  // ==========================================
  // DISCOVERY PAGE LOGIC
  // ==========================================
  
  async function loadTracks(searchQuery = '') {
    try {
      if (tracksLoading) tracksLoading.style.display = 'flex';
      if (tracksGrid) tracksGrid.style.display = 'none';

      const url = searchQuery 
        ? `/api/tracks/search?q=${encodeURIComponent(searchQuery)}`
        : '/api/tracks';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load tracks.');

      const data = await response.json();
      allTracks = Array.isArray(data) ? data : (data.tracks || []);
      renderTracks(allTracks, data.source);
    } catch (error) {
      console.error(error);
      if (tracksGrid) {
        tracksGrid.innerHTML = `<p class="error-msg" style="grid-column: 1/-1; text-align: center; color: var(--color-risk);">Error loading tracks database. Please ensure the backend server is running.</p>`;
        tracksGrid.style.display = 'grid';
      }
    } finally {
      if (tracksLoading) tracksLoading.style.display = 'none';
    }
  }

  function getLicenseBadge(track) {
    if (track.status === 'CC Licensed') {
      const license = track.license || 'CC';
      if (license.includes('NC')) {
        return { className: 'warning', text: license };
      }
      return { className: 'safe', text: license };
    }

    const isRisk = track.status === 'Match Flagged';
    return {
      className: isRisk ? 'risk' : 'safe',
      text: isRisk ? 'Match Flagged' : 'No Match'
    };
  }

  function renderTracks(tracks, source = 'local') {
    if (!tracksGrid) return;
    
    if (tracks.length === 0) {
      tracksGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">No tracks match your query.</p>`;
      tracksGrid.style.display = 'grid';
      return;
    }

    const sourceLabel = source === 'jamendo'
      ? 'Jamendo'
      : source === 'archive'
        ? 'Internet Archive'
        : 'Local demo catalog';

    tracksGrid.innerHTML = tracks.map((track, index) => {
      const badge = getLicenseBadge(track);

      return `
        <div class="track-card" data-index="${index}">
          <div class="track-header">
            <div class="track-meta">
              <h3 class="track-title" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</h3>
              <p class="track-artist">${escapeHtml(track.artist)}</p>
            </div>
            <span class="status-badge ${badge.className}" title="${escapeHtml(track.simplified_license || track.license)}">${escapeHtml(badge.text)}</span>
          </div>
          <p class="track-details">${escapeHtml(track.details)}</p>
          <div class="track-footer">
            <div class="track-info-tags">
              <span class="tag">${escapeHtml(track.genre)}</span>
              <span class="tag">${escapeHtml(track.mood)}</span>
              <span class="tag">${escapeHtml(sourceLabel)}</span>
            </div>
            <button class="play-action-btn" data-action="play" data-index="${index}">
              <svg viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    tracksGrid.style.display = 'grid';

    // Hook play buttons
    document.querySelectorAll('.play-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.getAttribute('data-index'), 10);
        playTrack(index);
      });
    });
  }

  function setupDiscoveryEvents() {
    // Debounce search input
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadTracks(e.target.value);
      }, 300);
    });

    // Randomize Search filter tag
    const filterBtn = document.getElementById('filter-btn');
    if (filterBtn) {
      filterBtn.addEventListener('click', () => {
        const moods = ['ambient', 'rock', 'jazz', 'electronic', 'chill'];
        const randomMood = moods[Math.floor(Math.random() * moods.length)];
        searchInput.value = randomMood;
        loadTracks(randomMood);
      });
    }
  }

  // ==========================================
  // PLAYBACK & SYNTHESIZER FALLBACK
  // ==========================================

  function setupMediaPlayer() {
    // Media Player Event Listeners
    playerPlayBtn.addEventListener('click', togglePlayback);
    
    playerPrevBtn.addEventListener('click', () => {
      if (allTracks.length === 0) return;
      let prevIndex = currentTrackIndex - 1;
      if (prevIndex < 0) prevIndex = allTracks.length - 1;
      playTrack(prevIndex);
    });

    playerNextBtn.addEventListener('click', () => {
      if (allTracks.length === 0) return;
      let nextIndex = currentTrackIndex + 1;
      if (nextIndex >= allTracks.length) nextIndex = 0;
      playTrack(nextIndex);
    });

    mainAudio.addEventListener('timeupdate', () => {
      if (mainAudio.duration) {
        const pct = (mainAudio.currentTime / mainAudio.duration) * 100;
        playerProgressFilled.style.width = `${pct}%`;
        playerTimeCurrent.textContent = formatTime(mainAudio.currentTime);
      }
    });

    mainAudio.addEventListener('durationchange', () => {
      playerTimeTotal.textContent = formatTime(mainAudio.duration);
    });

    mainAudio.addEventListener('ended', () => {
      // Auto advance
      if (allTracks.length > 0) {
        let nextIndex = (currentTrackIndex + 1) % allTracks.length;
        playTrack(nextIndex);
      } else {
        stopSynth();
        showPlayState(false);
      }
    });

    // Click track to seek
    playerProgressTrack.addEventListener('click', (e) => {
      if (!mainAudio.duration) return;
      const rect = playerProgressTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const clickPct = clickX / width;
      mainAudio.currentTime = clickPct * mainAudio.duration;
    });

    // Volume Adjustment
    playerVolumeSlider.addEventListener('click', (e) => {
      const rect = playerVolumeSlider.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      let pct = Math.max(0, Math.min(1, clickX / width));
      playerVolumeFilled.style.width = `${pct * 100}%`;
      mainAudio.volume = pct;
    });
  }

  function playTrack(index) {
    if (index < 0 || (allTracks.length > 0 && index >= allTracks.length)) return;
    
    currentTrackIndex = index;
    // If not using dynamic discovery database but checking page, mock track list
    const track = allTracks[index] || {
      title: 'Synthesized Preview',
      artist: 'Harmoniq Synth Engine',
      filepath: '/audio/test.mp3',
      genre: 'Synth',
      mood: 'Chill'
    };

    playerTitle.textContent = track.title;
    playerArtist.textContent = track.artist;
    bottomPlayer.classList.add('active');

    // Attempt HTML5 standard playback
    stopSynth();
    mainAudio.src = track.filepath;
    
    // Catch absolute error to trigger synth fallback
    mainAudio.play().then(() => {
      showPlayState(true);
    }).catch(err => {
      console.log('Using Web Audio API synthesis engine fallback.');
      startSynth(track.genre, track.mood);
      showPlayState(true);
    });
  }

  function togglePlayback() {
    if (synthInterval) {
      stopSynth();
      showPlayState(false);
    } else if (mainAudio.paused && mainAudio.src) {
      mainAudio.play().then(() => {
        showPlayState(true);
      }).catch(() => {
        const track = allTracks[currentTrackIndex] || {};
        startSynth(track.genre, track.mood);
        showPlayState(true);
      });
    } else {
      mainAudio.pause();
      showPlayState(false);
    }
  }

  function showPlayState(isPlaying) {
    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }

  // Beautiful Synthesizer Fallback for immediate preview capability
  function startSynth(genre = 'Ambient', mood = 'Chill') {
    stopSynth();
    
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    let bpm = 90;
    let chordScale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88]; // C Major
    let patternIndex = 0;
    
    if (genre.toLowerCase().includes('ambient')) {
      bpm = 60;
      chordScale = [130.81, 146.83, 164.81, 196.00, 220.00]; // Pentatonic Low
    } else if (genre.toLowerCase().includes('synthwave')) {
      bpm = 110;
      chordScale = [146.83, 174.61, 220.00, 293.66, 349.23]; // D minor
    } else if (genre.toLowerCase().includes('lofi')) {
      bpm = 75;
      chordScale = [261.63, 311.13, 392.00, 466.16]; // Eb Maj7 notes
    }

    const secondsPerBeat = 60.0 / bpm;
    let simulatedSeconds = 0;
    playerTimeTotal.textContent = "Preview";

    synthInterval = setInterval(() => {
      // Advance progress bar visually
      simulatedSeconds += secondsPerBeat;
      const pct = (simulatedSeconds % 60) / 60 * 100;
      playerProgressFilled.style.width = `${pct}%`;
      playerTimeCurrent.textContent = formatTime(simulatedSeconds % 60);

      // Play note
      try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);

        const baseNote = chordScale[Math.floor(Math.random() * chordScale.length)];
        // Add random octaves for melody
        const multiplier = Math.random() > 0.6 ? 2 : 1;
        osc.frequency.setValueAtTime(baseNote * multiplier, audioContext.currentTime);

        // Adjust waveforms based on genre
        if (genre.toLowerCase().includes('synthwave')) {
          osc.type = 'sawtooth';
        } else if (genre.toLowerCase().includes('lofi')) {
          osc.type = 'triangle';
        } else {
          osc.type = 'sine';
        }

        gain.gain.setValueAtTime(0.12, audioContext.currentTime);
        // Exponential decay
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + (secondsPerBeat * 0.9));
        
        osc.start();
        osc.stop(audioContext.currentTime + secondsPerBeat);
        
        synthNodes.push({ osc, gain });
        // Cleanup old finished nodes
        if (synthNodes.length > 10) {
          synthNodes.shift();
        }
      } catch (err) {
        console.error('Synth node play error:', err);
      }
    }, secondsPerBeat * 1000);
  }

  function stopSynth() {
    if (synthInterval) {
      clearInterval(synthInterval);
      synthInterval = null;
    }
    synthNodes.forEach(node => {
      try {
        node.osc.stop();
      } catch (e) {}
    });
    synthNodes = [];
  }

  // ==========================================
  // COPYRIGHT CHECKER / UPLOAD LOGIC
  // ==========================================

  function setupUploadEvents() {
    // Tab toggling logic
    tabFile.addEventListener('click', () => {
      tabFile.classList.add('active');
      tabLink.classList.remove('active');
      uploadZone.style.display = 'flex';
      linkZone.style.display = 'none';
    });

    tabLink.addEventListener('click', () => {
      tabLink.classList.add('active');
      tabFile.classList.remove('active');
      linkZone.style.display = 'flex';
      uploadZone.style.display = 'none';
    });

    // Verify Link action
    verifyLinkBtn.addEventListener('click', () => {
      const urlVal = audioLinkInput.value.trim();
      if (!urlVal) {
        alert('Please enter an audio link URL to verify.');
        return;
      }
      try {
        new URL(urlVal); // Basic URL format validation
      } catch (e) {
        alert('Please enter a valid URL (including http:// or https://).');
        return;
      }
      startVerificationLink(urlVal);
    });

    // Allow Enter key in link input
    audioLinkInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        verifyLinkBtn.click();
      }
    });

    // Open picker
    browseBtn.addEventListener('click', () => audioFileInput.click());
    
    // Selection handler
    audioFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    });

    // Drag-over styling
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    // Drag drop selection
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });

    // Reset upload form
    resetUploadBtn.addEventListener('click', () => {
      reportContainer.style.display = 'none';
      if (tabFile.classList.contains('active')) {
        uploadZone.style.display = 'flex';
      } else {
        linkZone.style.display = 'flex';
      }
      fileSelectedDisplay.style.display = 'none';
      audioFileInput.value = '';
      audioLinkInput.value = '';
    });
  }

  async function startVerificationLink(url) {
    // Show uploading screen
    uploadZone.style.display = 'none';
    linkZone.style.display = 'none';
    uploadLoader.style.display = 'flex';
    uploadProgressFill.style.width = '0%';
    loaderMessage.textContent = 'Connecting to audio stream...';

    // Simulate progress bar visually
    let progress = 0;
    const progressTimer = setInterval(() => {
      if (progress < 90) {
        progress += Math.floor(Math.random() * 20) + 10;
        if (progress > 90) progress = 90;
        uploadProgressFill.style.width = `${progress}%`;
        
        if (progress > 40) {
          loaderMessage.textContent = 'Extracting audio signature...';
        }
        if (progress > 70) {
          loaderMessage.textContent = 'Querying AcoustID database...';
        }
      }
    }, 120);

    try {
      const response = await fetch('/api/upload/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url })
      });

      clearInterval(progressTimer);
      uploadProgressFill.style.width = '100%';

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server returned an error.');
      }

      const report = await response.json();
      
      // Delay displaying report for visual satisfaction
      setTimeout(() => {
        displayReport(report);
      }, 500);

    } catch (err) {
      clearInterval(progressTimer);
      alert(`Error scanning link: ${err.message}`);
      uploadLoader.style.display = 'none';
      if (tabFile.classList.contains('active')) {
        uploadZone.style.display = 'flex';
      } else {
        linkZone.style.display = 'flex';
      }
    }
  }

  function handleFileSelection(file) {
    // Verify it is audio
    if (!file.type.startsWith('audio/') && !['.mp3', '.wav', '.ogg', '.m4a', '.aac'].some(ext => file.name.toLowerCase().endsWith(ext))) {
      alert('Selected file is not a supported audio format.');
      return;
    }

    fileNameSpan.textContent = file.name;
    fileSelectedDisplay.style.display = 'flex';
    
    // Start verification post request
    startVerificationUpload(file);
  }

  async function startVerificationUpload(file) {
    // Show uploading screen
    uploadZone.style.display = 'none';
    uploadLoader.style.display = 'flex';
    uploadProgressFill.style.width = '0%';
    loaderMessage.textContent = 'Uploading track data...';

    // Simulate progress bar visually
    let progress = 0;
    const progressTimer = setInterval(() => {
      if (progress < 90) {
        progress += Math.floor(Math.random() * 15) + 5;
        if (progress > 90) progress = 90;
        uploadProgressFill.style.width = `${progress}%`;
        
        if (progress > 50) {
          loaderMessage.textContent = 'Generating Chromaprint fingerprint...';
        }
      }
    }, 150);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressTimer);
      uploadProgressFill.style.width = '100%';

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server returned an error.');
      }

      const report = await response.json();
      
      // Delay displaying report for visual satisfaction
      setTimeout(() => {
        displayReport(report);
      }, 500);

    } catch (err) {
      clearInterval(progressTimer);
      alert(`Error scanning track: ${err.message}`);
      uploadLoader.style.display = 'none';
      uploadZone.style.display = 'flex';
    }
  }

  function displayReport(report) {
    uploadLoader.style.display = 'none';
    reportContainer.style.display = 'block';

    // Set core text contents
    document.getElementById('report-file-name').textContent = report.filename;
    document.getElementById('report-file-meta').innerHTML = `${report.fileSize} &bull; ${report.format}`;
    document.getElementById('report-hash').textContent = report.fingerprintHash;
    document.getElementById('report-timestamp').textContent = `Scanned on: ${new Date(report.scanTimestamp).toLocaleString()}`;
    document.getElementById('report-match-rate').textContent = `${report.confidenceScore}% similarity`;

    // Status Styling
    const statusBadge = document.getElementById('report-status-badge');
    const matchBox = document.getElementById('match-details-box');
    const matchHeader = document.getElementById('match-title-header');
    const matchRows = document.getElementById('match-rows-container');
    const recomTitle = document.getElementById('recom-title');
    const recomDesc = document.getElementById('recom-desc');

    statusBadge.className = 'status-badge';
    matchRows.innerHTML = '';

    if (report.status === 'No Match Found') {
      statusBadge.classList.add('warning');
      statusBadge.textContent = 'Not Verified';

      matchBox.className = 'match-details-box warning-theme';
      matchHeader.className = 'match-title warning-txt';
      matchHeader.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width: 24px; height: 24px;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        No Match — Not Safe to Release
      `;

      matchRows.innerHTML = `
        <div class="match-row">
          <label>Identification Source</label>
          <span>${escapeHtml(report.identificationSource || 'AcoustID')}</span>
        </div>
        <div class="match-row">
          <label>Match Confidence</label>
          <span>${report.confidenceScore}% similarity</span>
        </div>
      `;

      recomTitle.textContent = 'Release Warning';
      recomDesc.textContent = report.licenseAlternative.text;

      // Allow previewing uploaded track using synth engine since file is deleted on server for temp reasons
      // Add fake item to track registry so the player can list it
      allTracks = [{
        title: report.filename.split('.')[0],
        artist: 'Your Uploaded Track',
        filepath: '#',
        genre: 'Electronic',
        mood: 'Ambient'
      }];
      currentTrackIndex = 0;
      
    } else {
      // Risk Theme
      statusBadge.classList.add('risk');
      statusBadge.textContent = 'Match Found';

      matchBox.className = 'match-details-box';
      matchHeader.className = 'match-title risk-txt';
      matchHeader.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width: 24px; height: 24px;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        Known Recording Identified
      `;

      matchRows.innerHTML = `
        <div class="match-row">
          <label>Matched Track Name</label>
          <span>${escapeHtml(report.match.matchedTrack)}</span>
        </div>
        <div class="match-row">
          <label>Original Artist</label>
          <span>${escapeHtml(report.match.matchedArtist)}</span>
        </div>
        <div class="match-row">
          <label>Release / Album</label>
          <span>${escapeHtml(report.match.label)}</span>
        </div>
        <div class="match-row">
          <label>Analysis Detail</label>
          <span>${escapeHtml(report.match.matchType)}</span>
        </div>
      `;

      recomTitle.textContent = 'Identification Note';
      recomDesc.textContent = report.match.recommendation;

      // Setup audio preview with matching details
      allTracks = [{
        title: report.match.matchedTrack,
        artist: report.match.matchedArtist,
        filepath: '#',
        genre: 'Synthwave',
        mood: 'Energetic'
      }];
      currentTrackIndex = 0;
    }
  }

  // ==========================================
  // UTILITY HELPER FUNCTIONS
  // ==========================================

  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
