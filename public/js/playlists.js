// Harmoniq Playlists Management
document.addEventListener('DOMContentLoaded', () => {
  const playlistsGrid = document.getElementById('playlists-grid');
  const emptyState = document.getElementById('empty-state');
  const createPlaylistBtn = document.getElementById('create-playlist-btn');
  const playlistNameInput = document.getElementById('new-playlist-name');
  const playlistDescInput = document.getElementById('new-playlist-desc');
  const playlistModal = document.getElementById('playlist-modal');
  const modalClose = document.getElementById('modal-close');

  let allPlaylists = [];
  let currentPlaylistId = null;

  // Load playlists from localStorage
  function loadPlaylists() {
    const stored = localStorage.getItem('harmoniq_playlists');
    allPlaylists = stored ? JSON.parse(stored) : [];
    renderPlaylists();
  }

  // Save playlists to localStorage
  function savePlaylists() {
    localStorage.setItem('harmoniq_playlists', JSON.stringify(allPlaylists));
  }

  // Create new playlist
  createPlaylistBtn.addEventListener('click', () => {
    const name = playlistNameInput.value.trim();
    const description = playlistDescInput.value.trim();

    if (!name) {
      alert('Please enter a playlist name');
      return;
    }

    const newPlaylist = {
      id: Date.now().toString(),
      name: name,
      description: description,
      createdAt: new Date().toISOString(),
      tracks: []
    };

    allPlaylists.push(newPlaylist);
    savePlaylists();
    renderPlaylists();

    // Clear inputs
    playlistNameInput.value = '';
    playlistDescInput.value = '';
  });

  // Render playlists
  function renderPlaylists() {
    if (allPlaylists.length === 0) {
      playlistsGrid.innerHTML = '';
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';
    playlistsGrid.innerHTML = allPlaylists.map(playlist => `
      <div class="playlist-card" data-playlist-id="${playlist.id}">
        <div class="playlist-card-header">
          <h3>${escapeHtml(playlist.name)}</h3>
          <span class="playlist-count">${playlist.tracks.length} tracks</span>
        </div>
        <p class="playlist-desc">${escapeHtml(playlist.description || 'No description')}</p>
        <div class="playlist-card-footer">
          <p class="playlist-date">Created ${formatDate(playlist.createdAt)}</p>
          <button class="playlist-open-btn" data-playlist-id="${playlist.id}">Open</button>
        </div>
      </div>
    `).join('');

    // Attach event listeners
    document.querySelectorAll('.playlist-open-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const playlistId = btn.getAttribute('data-playlist-id');
        openPlaylistModal(playlistId);
      });
    });
  }

  // Open playlist modal
  function openPlaylistModal(playlistId) {
    currentPlaylistId = playlistId;
    const playlist = allPlaylists.find(p => p.id === playlistId);

    if (!playlist) return;

    document.getElementById('modal-playlist-name').textContent = playlist.name;
    document.getElementById('modal-playlist-desc').textContent = playlist.description || 'No description';

    const modalTracks = document.getElementById('modal-tracks');
    if (playlist.tracks.length === 0) {
      modalTracks.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No tracks in this playlist yet</p>';
    } else {
      modalTracks.innerHTML = playlist.tracks.map((track, idx) => `
        <div class="modal-track-item">
          <div class="modal-track-info">
            <h4>${escapeHtml(track.title)}</h4>
            <p>${escapeHtml(track.artist)}</p>
          </div>
          <button class="modal-track-remove" data-index="${idx}">Remove</button>
        </div>
      `).join('');

      document.querySelectorAll('.modal-track-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(btn.getAttribute('data-index'), 10);
          playlist.tracks.splice(index, 1);
          savePlaylists();
          openPlaylistModal(playlistId);
        });
      });
    }

    // Setup modal actions
    document.getElementById('share-playlist-btn').onclick = () => sharePlaylist(playlist);
    document.getElementById('export-playlist-btn').onclick = () => exportPlaylist(playlist);
    document.getElementById('delete-playlist-btn').onclick = () => deletePlaylist(playlistId);

    playlistModal.style.display = 'flex';
  }

  // Close modal
  modalClose.addEventListener('click', () => {
    playlistModal.style.display = 'none';
  });

  playlistModal.addEventListener('click', (e) => {
    if (e.target === playlistModal) {
      playlistModal.style.display = 'none';
    }
  });

  // Share playlist
  function sharePlaylist(playlist) {
    const playlistData = encodeURIComponent(JSON.stringify(playlist));
    const shareText = `Check out my playlist "${playlist.name}" on Harmoniq: ${window.location.origin}/?import=${playlistData}`;
    
    // Try native share if available
    if (navigator.share) {
      navigator.share({
        title: 'Harmoniq Playlist',
        text: shareText,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Playlist link copied to clipboard!');
      });
    }
  }

  // Export playlist
  function exportPlaylist(playlist) {
    const dataStr = JSON.stringify(playlist, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${playlist.name.replace(/\s+/g, '_')}_playlist.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Delete playlist
  function deletePlaylist(playlistId) {
    if (confirm('Are you sure you want to delete this playlist?')) {
      allPlaylists = allPlaylists.filter(p => p.id !== playlistId);
      savePlaylists();
      playlistModal.style.display = 'none';
      renderPlaylists();
    }
  }

  // Helper: escape HTML
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // Helper: format date
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // Setup media player (same as discovery page)
  setupMediaPlayer();

  function setupMediaPlayer() {
    const playerPlayBtn = document.getElementById('player-play');
    const playerPrevBtn = document.getElementById('player-prev');
    const playerNextBtn = document.getElementById('player-next');

    playerPlayBtn.addEventListener('click', () => {
      alert('Select a track to play');
    });

    playerPrevBtn.addEventListener('click', () => {
      alert('Select a track to play');
    });

    playerNextBtn.addEventListener('click', () => {
      alert('Select a track to play');
    });
  }

  // Initial load
  loadPlaylists();
});
