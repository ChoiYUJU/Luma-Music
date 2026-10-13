'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const audio = $('#audio-engine');
const content = $('#content');
const searchInput = $('#search-input');
const playlistNav = $('#playlist-nav');
const smartPlaylistNav = $('#smart-playlist-nav');
const smartPlaylistDialog = $('#smart-playlist-dialog');
const settingsDialog = $('#settings-dialog');
const queueDialog = $('#queue-dialog');
const equalizerDialog = $('#equalizer-dialog');
const lyricsDialog = $('#lyrics-dialog');
const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ_PRESETS = {
  'Flat': { preamp: 0, bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  'Bass Boost': { preamp: -2, bands: [5, 4, 3, 1, 0, 0, 0, 0, 0, 1] },
  'Vocal': { preamp: -1, bands: [-2, -1, 0, 1, 2, 3, 2, 1, 0, -1] },
  'Pop': { preamp: -2, bands: [2, 3, 1, 0, -1, 0, 1, 2, 2, 1] },
  'Rock': { preamp: -2, bands: [4, 3, 1, -1, -2, 1, 3, 4, 4, 3] },
  'Classical': { preamp: -1, bands: [3, 2, 1, 0, -1, -1, 0, 1, 2, 3] },
  'Treble Boost': { preamp: -2, bands: [-1, 0, 0, 0, 0, 1, 2, 3, 4, 4] }
};

const SMART_PLAYLIST_FIELDS = {
  favorite: { label: 'Status favorit', type: 'select', options: [['yes', 'Favorit'], ['no', 'Bukan favorit']], operators: [['is', 'adalah']] },
  artist: { label: 'Artis', type: 'text', operators: [['contains', 'memuat'], ['is', 'sama dengan'], ['not-contains', 'tidak memuat']] },
  album: { label: 'Album', type: 'text', operators: [['contains', 'memuat'], ['is', 'sama dengan'], ['not-contains', 'tidak memuat']] },
  genre: { label: 'Genre', type: 'text', operators: [['contains', 'memuat'], ['is', 'sama dengan'], ['not-contains', 'tidak memuat']] },
  year: { label: 'Tahun', type: 'number', operators: [['is', 'sama dengan'], ['at-least', 'minimal'], ['at-most', 'maksimal']] },
  'play-count': { label: 'Jumlah pemutaran', type: 'number', operators: [['at-least', 'minimal'], ['at-most', 'maksimal']] },
  'last-played-days': { label: 'Terakhir diputar', type: 'number', operators: [['within-last', 'dalam hari terakhir']] },
  'added-days': { label: 'Ditambahkan', type: 'number', operators: [['within-last', 'dalam hari terakhir']] },
  'duration-minutes': { label: 'Durasi (menit)', type: 'number', operators: [['at-least', 'minimal'], ['at-most', 'maksimal']] },
  'bitrate-kbps': { label: 'Bitrate (kb/s)', type: 'number', operators: [['at-least', 'minimal'], ['at-most', 'maksimal']] }
};

let library = { folder: null, tracks: [], scannedAt: null };
let currentView = 'home';
let currentPlaylist = null;
let currentAlbumKey = null;
let currentArtistName = null;
let currentSmartPlaylistId = null;
let editingSmartPlaylistId = null;
let smartPlaylistDraftRules = [];
let activeTrackId = null;
let playQueue = [];
let queuePosition = -1;
let isShuffle = false;
let repeatMode = 0; // 0: off, 1: all, 2: one
let isSeeking = false;
let viewHistory = ['home'];
let historyPosition = 0;
let scanUnsubscribe = null;
let lastSavedPositionBucket = -1;
let lastStatsWallClock = 0;
let countedPlaybackStartId = null;
let sleepTimerInterval = null;
let sleepTimerEndsAt = 0;
let sleepTimerEndOfTrack = false;
let localMixRefreshSeed = 0;
let audioContext = null;
let audioSource = null;
let eqFilters = [];
let eqPreampNode = null;
let lyricsTrackId = null;
let lyricsLines = [];
let lastActiveLyric = -1;
let lyricsRequestToken = 0;
let appState = loadAppState();
isShuffle = appState.shuffle;
repeatMode = appState.repeatMode;

function hydrateLibrary(data) {
  const covers = data?.covers && typeof data.covers === 'object' ? data.covers : {};
  const tracks = Array.isArray(data?.tracks) ? data.tracks.map(track => ({ ...track, cover: track.cover || (track.coverId ? covers[track.coverId] : null) || null })) : [];
  return { folder: typeof data?.folder === 'string' ? data.folder : null, tracks, covers, scannedAt: data?.scannedAt || null };
}

function loadAppState() {
  try {
    const data = JSON.parse(localStorage.getItem('luma-music-state') || '{}');
    return {
      favorites: Array.isArray(data.favorites) ? data.favorites.filter(item => typeof item === 'string') : [],
      playlists: Array.isArray(data.playlists) ? data.playlists.filter(p => p && typeof p.name === 'string' && Array.isArray(p.ids)).map(p => ({ name: p.name, ids: p.ids.filter(id => typeof id === 'string') })) : [],
      smartPlaylists: Array.isArray(data.smartPlaylists) ? data.smartPlaylists.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.rules)).slice(0, 200).map(p => ({ id: p.id, name: p.name.slice(0, 64), match: p.match === 'any' ? 'any' : 'all', rules: p.rules.filter(rule => rule && Object.hasOwn(SMART_PLAYLIST_FIELDS, rule.field) && typeof rule.operator === 'string').slice(0, 20).map(rule => ({ field: rule.field, operator: rule.operator, value: String(rule.value ?? '').slice(0, 120) })) })) : [],
      volume: Number.isFinite(data.volume) ? Math.min(1, Math.max(0, data.volume)) : 0.78,
      lastTrack: typeof data.lastTrack === 'string' ? data.lastTrack : null,
      lastTime: Number.isFinite(data.lastTime) ? Math.max(0, data.lastTime) : 0,
      shuffle: Boolean(data.shuffle),
      repeatMode: Number.isInteger(data.repeatMode) ? Math.max(0, Math.min(2, data.repeatMode)) : 0,
      eqPreset: typeof data.eqPreset === 'string' && (Object.hasOwn(EQ_PRESETS, data.eqPreset) || data.eqPreset === 'Custom') ? data.eqPreset : 'Flat',
      eqBands: Array.isArray(data.eqBands) && data.eqBands.length === 10 ? data.eqBands.map(v => Number.isFinite(v) ? Math.max(-12, Math.min(12, v)) : 0) : [...EQ_PRESETS.Flat.bands],
      eqPreamp: Number.isFinite(data.eqPreamp) ? Math.max(-12, Math.min(12, data.eqPreamp)) : 0,
      material: data.material === 'solid' ? 'solid' : 'glass',
      playHistory: Array.isArray(data.playHistory) ? data.playHistory.filter(item => item && typeof item.id === 'string' && Number.isFinite(item.at)).slice(0, 500) : [],
      playCounts: data.playCounts && typeof data.playCounts === 'object' && !Array.isArray(data.playCounts) ? Object.fromEntries(Object.entries(data.playCounts).filter(([id, count]) => typeof id === 'string' && Number.isFinite(count) && count >= 0).slice(0, 50000).map(([id, count]) => [id, Math.floor(count)])) : {},
      addedAt: data.addedAt && typeof data.addedAt === 'object' && !Array.isArray(data.addedAt) ? Object.fromEntries(Object.entries(data.addedAt).filter(([id, at]) => typeof id === 'string' && Number.isFinite(at)).slice(0, 50000)) : {},
      listenSeconds: data.listenSeconds && typeof data.listenSeconds === 'object' && !Array.isArray(data.listenSeconds) ? Object.fromEntries(Object.entries(data.listenSeconds).filter(([id, seconds]) => typeof id === 'string' && Number.isFinite(seconds) && seconds >= 0).slice(0, 50000).map(([id, seconds]) => [id, Math.floor(seconds)])) : {},
      autoContinue: Boolean(data.autoContinue),
      sortMode: ['library', 'title', 'artist', 'album', 'year', 'recently-added', 'most-played', 'duration'].includes(data.sortMode) ? data.sortMode : 'library'
    };
  } catch {
    return { favorites: [], playlists: [], smartPlaylists: [], volume: 0.78, lastTrack: null, lastTime: 0, shuffle: false, repeatMode: 0, eqPreset: 'Flat', eqBands: [...EQ_PRESETS.Flat.bands], eqPreamp: 0, material: 'glass', playHistory: [], playCounts: {}, addedAt: {}, listenSeconds: {}, autoContinue: false, sortMode: 'library' };
  }
}

function saveAppState() {
  try {
    localStorage.setItem('luma-music-state', JSON.stringify({
      favorites: appState.favorites,
      playlists: appState.playlists,
      smartPlaylists: appState.smartPlaylists,
      volume: appState.volume,
      lastTrack: appState.lastTrack,
      lastTime: appState.lastTime,
      shuffle: isShuffle,
      repeatMode,
      eqPreset: appState.eqPreset,
      eqBands: appState.eqBands,
      eqPreamp: appState.eqPreamp,
      material: appState.material,
      playHistory: appState.playHistory.slice(0, 500),
      playCounts: appState.playCounts,
      addedAt: appState.addedAt,
      listenSeconds: appState.listenSeconds,
      autoContinue: appState.autoContinue,
      sortMode: appState.sortMode
    }));
  } catch {
    toast('Pengaturan lokal tidak dapat disimpan.');
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

const CONTROL_ICON_PATHS = {
  play: '<path d="M8 5.8v12.4a1 1 0 0 0 1.52.85l9.5-6.2a1 1 0 0 0 0-1.7l-9.5-6.2A1 1 0 0 0 8 5.8Z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6.8" y="5" width="4.1" height="14" rx="1.1" fill="currentColor" stroke="none"/><rect x="13.1" y="5" width="4.1" height="14" rx="1.1" fill="currentColor" stroke="none"/>',
  previous: '<path d="M6 5v14"/><path d="M18.5 5.8 9 12l9.5 6.2V5.8Z" fill="currentColor" stroke="none"/>',
  next: '<path d="M18 5v14"/><path d="M5.5 5.8 15 12l-9.5 6.2V5.8Z" fill="currentColor" stroke="none"/>',
  shuffle: '<path d="M3 6h2.5a5 5 0 0 1 4 2l5 6a5 5 0 0 0 4 2H21"/><path d="m17 12 4 4-4 4"/><path d="M3 18h2.5a5 5 0 0 0 4-2l5-6a5 5 0 0 1 4-2H21"/><path d="m17 2 4 4-4 4"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  'repeat-one': '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/><path d="M11 10h2v5"/><path d="M11 15h4"/>',
  heart: '<path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.5a5.5 5.5 0 0 0-.1-7.8Z"/>',
  'heart-filled': '<path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.5a5.5 5.5 0 0 0-.1-7.8Z" fill="currentColor"/>',
  volume: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
  queue: '<path d="M9 6h12"/><path d="M9 12h12"/><path d="M9 18h7"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/>',
  'chevron-up': '<path d="m6 14 6-6 6 6"/>',
  'chevron-down': '<path d="m6 10 6 6 6-6"/>',
  lyrics: '<path d="M8 5h12"/><path d="M8 9h12"/><path d="M8 13h8"/><path d="M4 5h.01"/><path d="M4 9h.01"/><path d="M4 13h.01"/><path d="M4 17h9"/>',
  equalizer: '<path d="M4 6v12"/><path d="M12 4v16"/><path d="M20 8v8"/><path d="M1.8 10h4.4"/><path d="M9.8 14h4.4"/><path d="M17.8 11h4.4"/>',
  fullscreen: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/>'
};

function iconMarkup(name, size = 18) {
  const body = CONTROL_ICON_PATHS[name] || '';
  return `<svg class="control-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

function setPlayControl(button, paused, showLabel = false) {
  if (!button) return;
  const label = paused ? 'Putar' : 'Jeda';
  button.innerHTML = `${iconMarkup(paused ? 'play' : 'pause', showLabel ? 16 : 18)}${showLabel ? `<span class="button-label">${label}</span>` : ''}`;
  button.title = label;
  button.setAttribute('aria-label', `${label}${showLabel ? '' : ' lagu'}`);
}

function setShuffleControl(button, enabled) {
  if (!button) return;
  button.classList.toggle('active', enabled);
  button.setAttribute('aria-pressed', String(Boolean(enabled)));
  button.title = enabled ? 'Acak aktif' : 'Acak';
  button.setAttribute('aria-label', button.title);
}

function setRepeatControl(button, mode) {
  if (!button) return;
  button.innerHTML = iconMarkup(mode === 2 ? 'repeat-one' : 'repeat', 18);
  button.classList.toggle('active', mode !== 0);
  button.setAttribute('aria-pressed', String(mode !== 0));
  button.title = ['Ulangi: mati', 'Ulangi: antrean', 'Ulangi: satu lagu'][mode];
  button.setAttribute('aria-label', button.title);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = whole % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function toast(message) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  $('#toast-region').append(node);
  window.setTimeout(() => node.remove(), 3400);
}

function isFavorite(trackId) {
  return appState.favorites.includes(trackId);
}

function favoriteButton(trackId, compact = false) {
  const liked = isFavorite(trackId);
  return `<button class="row-action ${liked ? 'liked' : ''}" data-action="favorite" data-id="${escapeHtml(trackId)}" title="${liked ? 'Hapus dari favorit' : 'Tambah ke favorit'}" aria-label="${liked ? 'Hapus dari favorit' : 'Tambah ke favorit'}">${iconMarkup(liked ? 'heart-filled' : 'heart', 16)}</button>`;
}

function coverMarkup(track, className = 'track-thumb') {
  const cover = track?.cover;
  if (cover) return `<div class="${className}"><img src="${escapeHtml(cover)}" alt="Sampul ${escapeHtml(track.album || track.title)}"></div>`;
  return `<div class="${className} cover-placeholder"><span>♫</span></div>`;
}

function getTrackById(id) {
  return library.tracks.find(track => track.id === id) || null;
}

function filteredTracks(tracks) {
  const q = searchInput.value.trim().toLocaleLowerCase();
  if (!q) return tracks;
  return tracks.filter(track => [track.title, track.artist, track.albumArtist, track.album, track.genre, track.composer, track.year, track.ext].some(value => String(value ?? '').toLocaleLowerCase().includes(q)));
}

function allIndexes(tracks) {
  return tracks.map(track => library.tracks.indexOf(track)).filter(index => index >= 0);
}

function trackPlayCount(trackId) {
  return Number(appState.playCounts[trackId]) || 0;
}

function normalizeSmartRule(rule) {
  const field = SMART_PLAYLIST_FIELDS[rule?.field] ? rule.field : 'artist';
  const config = SMART_PLAYLIST_FIELDS[field];
  const operator = config.operators.some(([value]) => value === rule?.operator) ? rule.operator : config.operators[0][0];
  let value = String(rule?.value ?? '').slice(0, 120);
  if (config.type === 'number') {
    const number = Number(value);
    value = value.trim() && Number.isFinite(number) ? String(Math.max(0, Math.min(100000, number))) : '';
  } else if (config.type === 'select') {
    if (!config.options.some(([option]) => option === value)) value = config.options[0][0];
  }
  return { field, operator, value };
}

function smartRuleIsActive(rule) {
  return rule.field === 'favorite' || String(rule.value ?? '').trim() !== '';
}

function latestPlayTimestampByTrack() {
  const latest = new Map();
  for (const item of appState.playHistory) {
    if (!latest.has(item.id) || latest.get(item.id) < item.at) latest.set(item.id, item.at);
  }
  return latest;
}

function smartRuleMatches(track, rule, latestPlayed = null, now = Date.now()) {
  const value = String(rule.value ?? '').trim();
  const config = SMART_PLAYLIST_FIELDS[rule.field];
  if (!config) return false;
  if (rule.field !== 'favorite' && !value) return true;
  const compareText = (actual) => {
    const left = String(actual ?? '').trim().toLocaleLowerCase();
    const right = value.toLocaleLowerCase();
    if (rule.operator === 'is') return left === right;
    if (rule.operator === 'not-contains') return !left.includes(right);
    return left.includes(right);
  };
  const compareNumber = (actual) => {
    const left = Number(actual);
    const right = Number(value);
    if (!Number.isFinite(right) || !Number.isFinite(left)) return false;
    if (rule.operator === 'is') return left === right;
    if (rule.operator === 'at-least') return left >= right;
    if (rule.operator === 'at-most') return left <= right;
    return false;
  };
  switch (rule.field) {
    case 'favorite': return isFavorite(track.id) === (value === 'yes');
    case 'artist': return compareText(track.artist || track.albumArtist);
    case 'album': return compareText(track.album);
    case 'genre': return compareText(track.genre);
    case 'year': return compareNumber(Number(track.year) || 0);
    case 'play-count': return compareNumber(trackPlayCount(track.id));
    case 'last-played-days': {
      const timestamp = latestPlayed?.get(track.id);
      return Boolean(timestamp && now - timestamp <= Number(value) * 86400000);
    }
    case 'added-days': {
      const timestamp = appState.addedAt[track.id];
      return Boolean(timestamp && now - timestamp <= Number(value) * 86400000);
    }
    case 'duration-minutes': return compareNumber((Number(track.duration) || 0) / 60);
    case 'bitrate-kbps': return compareNumber((Number(track.bitrate) || 0) / 1000);
    default: return false;
  }
}

function smartPlaylistTracks(playlist) {
  if (!playlist || !Array.isArray(playlist.rules)) return [];
  const activeRules = playlist.rules.map(normalizeSmartRule).filter(smartRuleIsActive);
  if (!activeRules.length) return [...library.tracks];
  const latestPlayed = latestPlayTimestampByTrack();
  const now = Date.now();
  return library.tracks.filter(track => playlist.match === 'any'
    ? activeRules.some(rule => smartRuleMatches(track, rule, latestPlayed, now))
    : activeRules.every(rule => smartRuleMatches(track, rule, latestPlayed, now)));
}

function renderSmartPlaylist(playlistId) {
  const playlist = appState.smartPlaylists.find(item => item.id === playlistId);
  if (!playlist) return pageHeading('Playlist pintar tidak ditemukan', 'KOLEKSI DINAMIS', 'Playlist ini mungkin telah dihapus.') + emptyState('Playlist tidak tersedia', 'Buat playlist pintar baru dari bagian Playlist Pintar.');
  const tracks = filteredTracks(smartPlaylistTracks(playlist));
  const activeRules = playlist.rules.map(normalizeSmartRule).filter(smartRuleIsActive);
  const logicText = activeRules.length ? `${activeRules.length} aturan · ${playlist.match === 'any' ? 'salah satu aturan cocok' : 'semua aturan cocok'} · diperbarui otomatis` : 'Belum ada aturan aktif · seluruh koleksi ditampilkan';
  const extra = `<div class="playlist-page-actions"><button class="secondary-button" data-action="edit-smart-playlist" data-id="${escapeHtml(playlist.id)}">Ubah aturan</button><button class="secondary-button danger-button" data-action="delete-smart-playlist" data-id="${escapeHtml(playlist.id)}">Hapus</button></div>`;
  const heading = pageHeading(playlist.name, 'PLAYLIST PINTAR', logicText, extra);
  if (!tracks.length) return heading + `<div class="empty-state smart-playlist-empty"><div class="empty-icon">${iconMarkup('equalizer', 24)}</div><h2>Belum ada lagu yang cocok</h2><p>Coba longgarkan aturan playlist ini, atau pilih kolom pencarian untuk menghapus filter.</p><button class="primary-button" data-action="edit-smart-playlist" data-id="${escapeHtml(playlist.id)}">Ubah aturan</button></div>`;
  return heading + trackListMarkup(tracks, 'Lagu yang cocok', `${tracks.length} lagu saat ini`);
}

function makeSmartRule() {
  return { field: 'artist', operator: 'contains', value: '' };
}

function smartRuleMarkup(rule, index) {
  const config = SMART_PLAYLIST_FIELDS[rule.field] || SMART_PLAYLIST_FIELDS.artist;
  const fieldOptions = Object.entries(SMART_PLAYLIST_FIELDS).map(([key, field]) => `<option value="${key}" ${key === rule.field ? 'selected' : ''}>${escapeHtml(field.label)}</option>`).join('');
  const operators = config.operators.map(([key, label]) => `<option value="${key}" ${key === rule.operator ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
  let valueMarkup;
  if (config.type === 'select') {
    valueMarkup = `<select data-smart-rule-value aria-label="Nilai aturan">${config.options.map(([key, label]) => `<option value="${key}" ${key === rule.value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select>`;
  } else {
    const isNumber = config.type === 'number';
    const placeholder = rule.field === 'artist' ? 'Nama artis' : rule.field === 'album' ? 'Nama album' : rule.field === 'genre' ? 'Genre' : rule.field === 'year' ? 'Tahun' : rule.field === 'play-count' ? 'Kali' : rule.field === 'last-played-days' || rule.field === 'added-days' ? 'Hari' : rule.field === 'duration-minutes' ? 'Menit' : rule.field === 'bitrate-kbps' ? 'kb/s' : 'Nilai';
    valueMarkup = `<input data-smart-rule-value type="${isNumber ? 'number' : 'text'}" ${isNumber ? 'min="0" max="100000" step="1"' : 'maxlength="120"'} value="${escapeHtml(rule.value)}" placeholder="${placeholder}" aria-label="Nilai aturan">`;
  }
  return `<div class="smart-rule-row" data-rule-index="${index}"><select data-smart-rule-field aria-label="Kolom aturan">${fieldOptions}</select><select data-smart-rule-operator aria-label="Kondisi aturan">${operators}</select>${valueMarkup}<button class="icon-button small smart-rule-remove" type="button" data-smart-rule-remove="${index}" aria-label="Hapus aturan" title="Hapus aturan">×</button></div>`;
}

function renderSmartPlaylistRules() {
  const container = $('#smart-playlist-rules');
  if (!container) return;
  container.innerHTML = smartPlaylistDraftRules.map(smartRuleMarkup).join('');
  updateSmartPlaylistPreviewCount();
}

function updateSmartPlaylistPreviewCount() {
  const label = $('#smart-playlist-preview-count');
  if (!label) return;
  const activeRules = smartPlaylistDraftRules.map(normalizeSmartRule).filter(smartRuleIsActive);
  label.textContent = activeRules.length ? `${activeRules.length} aturan aktif` : 'Tanpa aturan: semua lagu';
}

function openSmartPlaylistEditor(playlist = null) {
  if (!playlist && appState.smartPlaylists.length >= 200) return toast('Maksimal 200 playlist pintar.');
  editingSmartPlaylistId = playlist?.id || null;
  $('#smart-playlist-dialog-title').textContent = playlist ? 'Ubah Playlist Pintar' : 'Playlist Pintar Baru';
  $('#smart-playlist-name').value = playlist?.name || '';
  $('#smart-playlist-match').value = playlist?.match === 'any' ? 'any' : 'all';
  smartPlaylistDraftRules = (playlist?.rules || [makeSmartRule()]).map(normalizeSmartRule);
  renderSmartPlaylistRules();
  smartPlaylistDialog.showModal();
  $('#smart-playlist-name').focus();
}

function saveSmartPlaylistFromDialog(event) {
  event.preventDefault();
  const name = $('#smart-playlist-name').value.trim().slice(0, 64);
  if (!name) return toast('Beri nama untuk playlist pintar ini.');
  if (appState.smartPlaylists.some(item => item.id !== editingSmartPlaylistId && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return toast('Nama playlist pintar itu sudah digunakan.');
  const rules = smartPlaylistDraftRules.slice(0, 20).map(normalizeSmartRule);
  const playlist = { id: editingSmartPlaylistId || `smart-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, name, match: $('#smart-playlist-match').value === 'any' ? 'any' : 'all', rules };
  const existingIndex = appState.smartPlaylists.findIndex(item => item.id === playlist.id);
  if (existingIndex >= 0) appState.smartPlaylists[existingIndex] = playlist;
  else appState.smartPlaylists.push(playlist);
  saveAppState();
  smartPlaylistDialog.close();
  editingSmartPlaylistId = null;
  updateSidebar();
  setView('smart-playlist', playlist.id);
  toast(`Playlist pintar “${name}” disimpan.`);
}

function deleteSmartPlaylist(id) {
  const playlist = appState.smartPlaylists.find(item => item.id === id);
  if (!playlist) return;
  if (!window.confirm(`Hapus playlist pintar “${playlist.name}”? File musik tidak akan dihapus.`)) return;
  appState.smartPlaylists = appState.smartPlaylists.filter(item => item.id !== id);
  viewHistory = viewHistory.filter(key => key !== `smart-playlist:${id}`);
  historyPosition = Math.max(0, viewHistory.length - 1);
  saveAppState();
  setView('home');
  toast(`Playlist pintar “${playlist.name}” dihapus.`);
}

function sortedTracks(tracks, mode = appState.sortMode) {
  const copy = [...tracks];
  const compareText = (a, b, key) => String(a[key] || '').localeCompare(String(b[key] || ''), undefined, { numeric: true, sensitivity: 'base' });
  switch (mode) {
    case 'title': return copy.sort((a, b) => compareText(a, b, 'title'));
    case 'artist': return copy.sort((a, b) => compareText(a, b, 'artist') || compareText(a, b, 'title'));
    case 'album': return copy.sort((a, b) => compareText(a, b, 'album') || (a.discNo - b.discNo) || (a.trackNo - b.trackNo));
    case 'year': return copy.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0) || compareText(a, b, 'title'));
    case 'recently-added': return copy.sort((a, b) => (appState.addedAt[b.id] || 0) - (appState.addedAt[a.id] || 0));
    case 'most-played': return copy.sort((a, b) => trackPlayCount(b.id) - trackPlayCount(a.id) || (appState.addedAt[b.id] || 0) - (appState.addedAt[a.id] || 0));
    case 'duration': return copy.sort((a, b) => (a.duration || 0) - (b.duration || 0));
    default: return copy;
  }
}

function recentHistoryTracks(limit = 30) {
  const seen = new Set();
  const tracks = [];
  for (const entry of appState.playHistory) {
    if (seen.has(entry.id)) continue;
    const track = getTrackById(entry.id);
    if (!track) continue;
    seen.add(entry.id);
    tracks.push(track);
    if (tracks.length >= limit) break;
  }
  return tracks;
}

function recordTrackStart(trackId) {
  const now = Date.now();
  appState.playCounts[trackId] = trackPlayCount(trackId) + 1;
  appState.playHistory.unshift({ id: trackId, at: now });
  appState.playHistory = appState.playHistory.slice(0, 500);
  if (!appState.addedAt[trackId]) appState.addedAt[trackId] = now;
  saveAppState();
}

function ensureAddedAtForLibrary() {
  const fallback = Date.parse(library.scannedAt || '') || Date.now();
  let changed = false;
  for (const track of library.tracks) {
    if (!Number.isFinite(appState.addedAt[track.id])) {
      appState.addedAt[track.id] = fallback;
      changed = true;
    }
  }
  if (changed) saveAppState();
}

function localMixTracks(limit = 40) {
  const tracks = library.tracks;
  if (!tracks.length) return [];
  const reference = getTrackById(activeTrackId) || recentHistoryTracks(1)[0] || [...tracks].sort((a, b) => trackPlayCount(b.id) - trackPlayCount(a.id))[0];
  const recentIds = new Set(appState.playHistory.slice(0, 25).map(item => item.id));
  const seed = localMixRefreshSeed;
  return tracks.filter(track => track.id !== reference?.id).map(track => {
    let score = 0;
    if (isFavorite(track.id)) score += 4;
    score += Math.min(4, trackPlayCount(track.id) * 0.35);
    if (reference) {
      if (track.artist && track.artist === reference.artist) score += 5;
      if (track.albumArtist && track.albumArtist === reference.albumArtist) score += 3.5;
      if (track.genre && reference.genre && track.genre.toLocaleLowerCase() === reference.genre.toLocaleLowerCase()) score += 3;
      if (track.album && reference.album && track.album === reference.album) score += 1;
    }
    if (!recentIds.has(track.id)) score += 2.25;
    if (!trackPlayCount(track.id)) score += 0.7;
    const jitter = Math.abs(Math.sin((track.id.charCodeAt(0) || 1) * (seed + 1) * 0.137)) * 1.2;
    return { track, score: score + jitter };
  }).sort((a, b) => b.score - a.score).slice(0, limit).map(item => item.track);
}

function renderLocalMix() {
  const tracks = localMixTracks();
  const reference = getTrackById(activeTrackId) || recentHistoryTracks(1)[0];
  const subtitle = reference ? `Dipilih dari artis, genre, favorit, dan riwayat lokal dekat dengan ${reference.artist}.` : 'Mix awal dari favorit, genre, dan lagu yang belum banyak diputar.';
  const heading = pageHeading('Mix untukmu', 'LUMA PERSONAL MIX', subtitle, `<button class="secondary-button" data-action="refresh-local-mix">${iconMarkup('shuffle', 15)} Segarkan mix</button>`);
  if (!tracks.length) return heading + emptyState('Belum cukup bahan untuk mix', 'Impor koleksi musik untuk membiarkan Luma menyusun mix lokal.');
  const indexIds = escapeHtml(tracks.map(track => track.id).join(','));
  return heading + `<section class="local-mix-hero"><div class="local-mix-orb">${iconMarkup('equalizer', 38)}</div><div class="local-mix-copy"><span class="eyebrow">DIBUAT DI PERANGKAT INI</span><h2>Favorit lama, temuan baru.</h2><p>Luma menyusun urutan dari kebiasaan mendengarkanmu. Tidak ada data yang dikirim ke server.</p><button class="primary-button" data-action="play-current-list" data-list-ids="${indexIds}">${iconMarkup('play', 15)} Putar mix</button></div></section>${trackListMarkup(tracks, 'Pilihan mix', `${tracks.length} lagu · diperbarui secara lokal`)}`;
}

function renderLumaReplay() {
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const monthAgo = now - 30 * 86400000;
  const lastWeek = appState.playHistory.filter(item => item.at >= weekAgo && getTrackById(item.id));
  const lastMonth = appState.playHistory.filter(item => item.at >= monthAgo && getTrackById(item.id));
  const topTracks = sortedTracks(library.tracks, 'most-played').filter(track => trackPlayCount(track.id) > 0).slice(0, 5);
  const artistCounts = new Map();
  for (const track of library.tracks) artistCounts.set(track.artist || 'Artis tidak diketahui', (artistCounts.get(track.artist || 'Artis tidak diketahui') || 0) + trackPlayCount(track.id));
  const topArtist = [...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const totalSeconds = Object.values(appState.listenSeconds).reduce((sum, seconds) => sum + (Number(seconds) || 0), 0);
  const cards = [
    ['Sesi pemutaran', String(Object.values(appState.playCounts).reduce((sum, count) => sum + (Number(count) || 0), 0)), 'Total mulai putar yang tercatat'],
    ['7 hari terakhir', String(lastWeek.length), 'Pemutaran yang dimulai'],
    ['30 hari terakhir', String(lastMonth.length), 'Pemutaran yang dimulai'],
    ['Waktu mendengarkan', `${Math.floor(totalSeconds / 3600)}j ${Math.floor((totalSeconds % 3600) / 60)}m`, 'Perkiraan waktu aktif audio']
  ];
  const artistCard = topArtist && topArtist[1] ? `<section class="replay-top-artist"><span class="eyebrow">ARTIS PALING SERING DIPUTAR</span><h2>${escapeHtml(topArtist[0])}</h2><p>${topArtist[1]} kali mulai diputar dalam statistik lokal.</p></section>` : '';
  const topTrackSection = topTracks.length ? trackListMarkup(topTracks, 'Lagu yang paling sering diputar', 'Berdasarkan jumlah sesi pemutaran yang dimulai') : emptyState('Statistik sedang dimulai', 'Putar beberapa lagu untuk membangun Replay milikmu.');
  return pageHeading('Luma Replay', 'STATISTIK PRIBADI', 'Ringkasan kebiasaan mendengarkan yang hanya tersimpan di perangkatmu.') + `<section class="replay-grid">${cards.map(([label, value, detail]) => `<article class="replay-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></article>`).join('')}</section>${artistCard}${topTrackSection}`;
}

function indexesFromIdList(value) {
  return String(value || '').split(',').map(id => library.tracks.findIndex(track => track.id === id)).filter(index => index >= 0);
}

function currentViewTracks() {
  let tracks = [...library.tracks];
  if (currentView === 'favorites') {
    tracks = tracks.filter(track => isFavorite(track.id));
  } else if (currentView === 'playlist' && currentPlaylist) {
    const playlist = appState.playlists.find(item => item.name === currentPlaylist);
    const ids = playlist?.ids || [];
    tracks = ids.map(getTrackById).filter(Boolean);
  } else if (currentView === 'smart-playlist' && currentSmartPlaylistId) {
    tracks = smartPlaylistTracks(appState.smartPlaylists.find(item => item.id === currentSmartPlaylistId));
  } else if (currentView === 'album-detail' && currentAlbumKey) {
    tracks = albumGroups(library.tracks).find(item => item.key === currentAlbumKey)?.tracks || [];
  } else if (currentView === 'artist-detail' && currentArtistName) {
    tracks = library.tracks.filter(track => (track.albumArtist || track.artist) === currentArtistName || track.artist === currentArtistName);
  }
  return filteredTracks(tracks);
}

function updateSidebar() {
  $('#song-count').textContent = String(library.tracks.length);
  $('#library-status-title').textContent = library.tracks.length ? `${library.tracks.length} lagu tersedia` : 'Perpustakaan lokal';
  $('#library-status-detail').textContent = library.folder ? shortenPath(library.folder) : 'Belum ada folder musik';
  $('#settings-folder').textContent = library.folder || 'Belum ada folder musik yang dipilih.';
  playlistNav.innerHTML = appState.playlists.map(playlist => `
    <button class="playlist-item ${currentView === 'playlist' && currentPlaylist === playlist.name ? 'active' : ''}" data-playlist="${escapeHtml(playlist.name)}" title="${escapeHtml(playlist.name)}"><span>♫</span><span>${escapeHtml(playlist.name)}</span></button>
  `).join('');
  smartPlaylistNav.innerHTML = appState.smartPlaylists.map(playlist => `
    <button class="playlist-item smart-playlist-item ${currentView === 'smart-playlist' && currentSmartPlaylistId === playlist.id ? 'active' : ''}" data-smart-playlist="${escapeHtml(playlist.id)}" title="${escapeHtml(playlist.name)}"><span>${iconMarkup('equalizer', 14)}</span><span>${escapeHtml(playlist.name)}</span></button>
  `).join('');
  $$('.nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.view === currentView);
  });
}

function shortenPath(value) {
  if (value.length <= 29) return value;
  return `…${value.slice(-26)}`;
}

function pageHeading(title, eyebrow, description, extra = '') {
  return `<div class="page-heading"><div><span class="eyebrow">${escapeHtml(eyebrow)}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${extra}</div>`;
}

function emptyState(title = 'Belum ada musik di sini', description = 'Pilih folder yang berisi file audio untuk mulai membangun perpustakaan musikmu.') {
  return `<div class="empty-state"><div class="empty-icon">♫</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p><button class="primary-button" data-action="import-folder">＋ Impor folder musik</button></div>`;
}

function albumGroups(tracks) {
  const groups = new Map();
  for (const track of tracks) {
    const albumArtist = track.albumArtist || track.artist || 'Unknown Artist';
    const key = JSON.stringify([track.album || 'Unknown Album', albumArtist]);
    if (!groups.has(key)) groups.set(key, { key, album: track.album || 'Unknown Album', artist: albumArtist, cover: track.cover, tracks: [] });
    const group = groups.get(key);
    group.tracks.push(track);
    if (!group.cover && track.cover) group.cover = track.cover;
  }
  return [...groups.values()].sort((a, b) => a.album.localeCompare(b.album, undefined, { sensitivity: 'base' }));
}

function artistGroups(tracks) {
  const groups = new Map();
  for (const track of tracks) {
    const artist = track.artist || 'Unknown Artist';
    if (!groups.has(artist)) groups.set(artist, []);
    groups.get(artist).push(track);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }));
}

function albumCard(group, index, artistMode = false) {
  const cover = group.cover;
  const count = group.tracks?.length ?? 0;
  const title = artistMode ? group.artistName : group.album;
  const subtitle = artistMode ? `${count} lagu` : group.artist;
  const body = cover
    ? `<img src="${escapeHtml(cover)}" alt="Sampul ${escapeHtml(title)}">`
    : `<div class="fallback-cover palette-${index % 5}">${artistMode ? escapeHtml((title || '?').slice(0, 1).toUpperCase()) : '♫'}</div>`;
  const cardClass = artistMode ? 'artist-card' : 'album-card';
  if (artistMode) {
    return `<button class="${cardClass}" data-action="open-artist" data-artist="${escapeHtml(group.artistName)}"><div class="artist-avatar palette-${index % 5}">${body.includes('<img') ? body : escapeHtml((title || '?').slice(0, 1).toUpperCase())}</div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle)}</small></button>`;
  }
  return `<article class="${cardClass}" data-action="open-album" data-album-key="${escapeHtml(group.key)}" tabindex="0" aria-label="Buka album ${escapeHtml(title)}"><div class="album-cover">${body}<button type="button" class="album-play" data-action="play-album" data-album-key="${escapeHtml(group.key)}" aria-label="Putar album ${escapeHtml(title)}" title="Putar album">${iconMarkup('play', 17)}</button></div><strong class="album-name" title="${escapeHtml(title)}">${escapeHtml(title)}</strong><span class="album-meta" title="${escapeHtml(subtitle)}">${escapeHtml(subtitle)}</span></article>`;
}

function trackListMarkup(tracks, title = 'Daftar lagu', subtitle = '', playlistMode = false) {
  const sortableView = ['songs', 'favorites', 'playlist', 'smart-playlist'].includes(currentView);
  const displayTracks = sortableView ? sortedTracks(tracks) : tracks;
  if (!displayTracks.length) return `<div class="track-section"><div class="section-heading"><div><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</div></div>${emptyState(searchInput.value ? 'Tidak ditemukan' : 'Belum ada lagu', searchInput.value ? 'Coba kata kunci lain atau hapus pencarian.' : 'Impor folder musik untuk melihat lagu di sini.')}</div>`;

  const indexes = allIndexes(displayTracks);
  const listIds = escapeHtml(displayTracks.map(track => track.id).join(','));
  const rows = displayTracks.map((track, visibleIndex) => {
    const index = indexes[visibleIndex];
    const playing = track.id === activeTrackId;
    const trackNo = track.trackNo ? String(track.trackNo).padStart(2, '0') : String(visibleIndex + 1).padStart(2, '0');
    return `<tr class="track-row ${playing ? 'playing' : ''}" data-action="play-track" data-list-ids="${listIds}" data-idx="${index}" data-track-id="${escapeHtml(track.id)}" tabindex="0" aria-label="Putar ${escapeHtml(track.title)}">
      <td>${playing && !audio.paused ? '♫' : trackNo}</td>
      <td class="track-title-cell"><div class="track-main">${coverMarkup(track)}<div class="track-text"><strong>${escapeHtml(track.title)}</strong><span>${escapeHtml(track.artist)}</span></div></div></td>
      <td title="${escapeHtml(track.album)}">${escapeHtml(track.album)}</td>
      <td>${escapeHtml(track.year || track.ext || '—')}</td>
      <td><div class="track-actions">${favoriteButton(track.id)}${playlistMode ? `<button class="row-action" data-action="remove-playlist-track" data-id="${escapeHtml(track.id)}" title="Hapus dari playlist" aria-label="Hapus dari playlist">−</button>` : `<button class="row-action" data-action="add-playlist" data-id="${escapeHtml(track.id)}" title="Tambah ke playlist" aria-label="Tambah ke playlist">＋</button>`}<span class="duration-cell" title="${escapeHtml([track.bitrate ? `${Math.round(track.bitrate / 1000)} kb/s` : '', track.sampleRate ? `${(track.sampleRate / 1000).toFixed(1)} kHz` : '', track.bitsPerSample ? `${track.bitsPerSample}-bit` : '', track.lossless === true ? 'Lossless' : ''].filter(Boolean).join(' · '))}">${formatTime(track.duration)}</span></div></td>
    </tr>`;
  }).join('');
  const sortControl = sortableView ? `<label class="sort-control"><span>Urutkan</span><select id="track-sort" aria-label="Urutkan lagu"><option value="library" ${appState.sortMode === 'library' ? 'selected' : ''}>Urutan koleksi</option><option value="title" ${appState.sortMode === 'title' ? 'selected' : ''}>Judul</option><option value="artist" ${appState.sortMode === 'artist' ? 'selected' : ''}>Artis</option><option value="album" ${appState.sortMode === 'album' ? 'selected' : ''}>Album</option><option value="year" ${appState.sortMode === 'year' ? 'selected' : ''}>Tahun terbaru</option><option value="recently-added" ${appState.sortMode === 'recently-added' ? 'selected' : ''}>Baru ditambahkan</option><option value="most-played" ${appState.sortMode === 'most-played' ? 'selected' : ''}>Paling sering diputar</option><option value="duration" ${appState.sortMode === 'duration' ? 'selected' : ''}>Durasi</option></select></label>` : '';
  return `<div class="track-section"><div class="section-heading"><div><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : `<p>${displayTracks.length} lagu</p>`}</div><div class="track-section-tools">${sortControl}<button class="subtle-button" data-action="play-current-list" data-list-ids="${listIds}">${iconMarkup('play', 14)} Putar semua</button></div></div><table class="track-table"><thead><tr><th>#</th><th>JUDUL</th><th>ALBUM</th><th>TAHUN</th><th class="align-right">DURASI</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderHome() {
  const tracks = filteredTracks(library.tracks);
  const albums = albumGroups(tracks).slice(0, 5);
  const recentlyAdded = [...tracks].sort((a, b) => (appState.addedAt[b.id] || 0) - (appState.addedAt[a.id] || 0)).slice(0, 8);
  const recentlyPlayed = recentHistoryTracks(8).filter(track => tracks.some(item => item.id === track.id));
  const hasLibrary = library.tracks.length > 0;
  const lastTrack = getTrackById(appState.lastTrack);
  const heading = `<div class="home-heading"><div><span class="eyebrow">PERPUSTAKAAN LOKAL</span><h1>Beranda</h1><p>Musik yang tersimpan di perangkatmu.</p></div><div class="home-heading-actions"><button class="secondary-button" data-action="show-songs">Semua lagu</button>${hasLibrary ? `<button class="primary-button" data-action="play-current-list">${iconMarkup('play', 15)}<span class="button-label">Putar semua</span></button>` : `<button class="primary-button" data-action="import-folder">＋ Pilih folder</button>`}</div></div>`;
  if (!hasLibrary) {
    return heading + `<section class="welcome-panel"><div class="welcome-icon">♫</div><div><h2>Mulai dari koleksi musikmu</h2><p>Pilih folder musik lokal untuk melihat lagu, album, artis, dan sampul yang tertanam dalam file audio.</p><button class="primary-button" data-action="import-folder">Pilih folder musik…</button></div></section>`;
  }
  const continueCard = lastTrack ? `<section class="continue-panel"><div class="continue-art">${lastTrack.cover ? `<img src="${escapeHtml(lastTrack.cover)}" alt="">` : '<span>♫</span>'}</div><div class="continue-copy"><span class="small-label">TERAKHIR DIPUTAR</span><strong>${escapeHtml(lastTrack.title)}</strong><span>${escapeHtml(lastTrack.artist)} · ${escapeHtml(lastTrack.album)}</span></div><button class="play-button continue-play" data-action="resume-last" title="Putar lagu terakhir" aria-label="Putar lagu terakhir">${iconMarkup('play', 18)}</button></section>` : '';
  const albumSection = albums.length ? `<div class="section-heading"><div><h2>Album</h2><p>Kelompokkan berdasarkan album di koleksimu</p></div><button class="subtle-button" data-action="show-albums">Lihat semua →</button></div><div class="featured-grid">${albums.map((album, i) => albumCard(album, i)).join('')}</div>` : '';
  const mixBanner = `<section class="home-mix-banner"><div class="home-mix-symbol">${iconMarkup('equalizer', 27)}</div><div><span class="eyebrow">LUMA PERSONAL MIX</span><h2>Putar sesuai seleramu</h2><p>Mix dari favorit, genre, dan riwayat lokal.</p></div><button class="primary-button" data-action="open-smart-mix">Dengarkan mix ${iconMarkup('next', 14)}</button></section>`;
  const recentAddedSection = recentlyAdded.length ? trackListMarkup(recentlyAdded, 'Baru ditambahkan', 'Berdasarkan waktu pertama kali masuk ke perpustakaan') : '';
  const recentPlayedSection = recentlyPlayed.length ? trackListMarkup(recentlyPlayed, 'Baru diputar', 'Lagu terakhir yang kamu dengarkan') : '';
  return heading + continueCard + mixBanner + albumSection + recentAddedSection + recentPlayedSection;
}
function renderAlbumDetail(key) {
  const album = albumGroups(library.tracks).find(item => item.key === key);
  if (!album) return pageHeading('Album tidak ditemukan', 'KOLEKSI', 'Album ini tidak lagi tersedia di perpustakaanmu.') + emptyState('Album tidak tersedia', 'Pindai ulang folder musik untuk memperbarui koleksi.');
  const tracks = filteredTracks(album.tracks);
  const year = album.tracks.find(track => track.year)?.year;
  const art = album.cover
    ? `<img src="${escapeHtml(album.cover)}" alt="Sampul ${escapeHtml(album.album)}">`
    : `<div class="detail-art-fallback">♫</div>`;
  return `<section class="album-detail-hero"><div class="detail-artwork">${art}</div><div class="detail-copy"><span class="eyebrow">ALBUM</span><h1>${escapeHtml(album.album)}</h1><p class="detail-artist">${escapeHtml(album.artist)}</p><p class="detail-meta">${year ? `${escapeHtml(year)} · ` : ''}${album.tracks.length} lagu · ${formatTime(album.tracks.reduce((sum, track) => sum + (track.duration || 0), 0))}</p><div class="detail-actions"><button class="primary-button" data-action="play-album" data-album-key="${escapeHtml(album.key)}">${iconMarkup('play', 15)}<span class="button-label">Putar album</span></button><button class="secondary-button" data-action="queue-album" data-album-key="${escapeHtml(album.key)}">Tambahkan ke antrean</button></div></div></section>${trackListMarkup(tracks, 'Daftar lagu', `${tracks.length} lagu dari album ini`)}`;
}

function renderArtistDetail(name) {
  const tracks = library.tracks.filter(track => (track.albumArtist || track.artist) === name || track.artist === name);
  if (!tracks.length) return pageHeading('Artis tidak ditemukan', 'KOLEKSI', 'Artis ini tidak lagi tersedia di perpustakaanmu.') + emptyState('Artis tidak tersedia', 'Pindai ulang folder musik untuk memperbarui koleksi.');
  const albums = albumGroups(tracks);
  const artTrack = tracks.find(track => track.cover);
  const art = artTrack?.cover ? `<img src="${escapeHtml(artTrack.cover)}" alt="">` : `<span>${escapeHtml(name.slice(0, 1).toUpperCase())}</span>`;
  const albumSection = albums.length ? `<div class="section-heading"><div><h2>Album</h2><p>${albums.length} album dalam koleksi</p></div></div><div class="featured-grid">${albums.map((album, index) => albumCard(album, index)).join('')}</div>` : '';
  return `<section class="artist-detail-hero"><div class="artist-detail-avatar">${art}</div><div class="detail-copy"><span class="eyebrow">ARTIS</span><h1>${escapeHtml(name)}</h1><p class="detail-meta">${tracks.length} lagu · ${albums.length} album</p><div class="detail-actions"><button class="primary-button" data-action="play-artist" data-artist="${escapeHtml(name)}">${iconMarkup('play', 15)}<span class="button-label">Putar artis</span></button></div></div></section>${albumSection}${trackListMarkup(filteredTracks(tracks), 'Semua lagu', `Lagu dari ${name}`)}`;
}

function renderAlbums() {
  const groups = albumGroups(filteredTracks(library.tracks));
  if (!groups.length) return pageHeading('Album', 'KOLEKSI', 'Semua album dalam satu ruang.') + emptyState('Album belum tersedia', 'Impor folder musik agar Luma dapat mengelompokkan lagu berdasarkan album.');
  return pageHeading('Album', 'KOLEKSI', `${groups.length} album dalam perpustakaanmu.`) + `<div class="album-library-grid">${groups.map((album, i) => albumCard(album, i)).join('')}</div>`;
}

function renderArtists() {
  const groups = artistGroups(filteredTracks(library.tracks));
  if (!groups.length) return pageHeading('Artis', 'KOLEKSI', 'Semua artis yang ada di perpustakaanmu.') + emptyState('Artis belum tersedia', 'Impor folder musik untuk mengelompokkan lagu berdasarkan artis.');
  const cards = groups.map(([name, tracks], i) => albumCard({ artistName: name, tracks, cover: tracks.find(t => t.cover)?.cover }, i, true)).join('');
  return pageHeading('Artis', 'KOLEKSI', `${groups.length} artis dalam perpustakaanmu.`) + `<div class="artist-grid">${cards}</div>`;
}

function renderNowPlaying() {
  const track = getTrackById(activeTrackId);
  const heading = pageHeading(
    'Sedang Diputar',
    'PEMUTARAN',
    'Lagu yang sedang berjalan, kontrol cepat, dan antrean berikutnya.',
    track ? `<button class="secondary-button now-fullscreen-entry" data-action="open-immersive-player" title="Buka tampilan layar penuh (F)">${iconMarkup('fullscreen', 15)}<span class="button-label">Tampilan penuh</span></button>` : ''
  );
  if (!track) {
    return heading + `<div class="now-playing-empty"><div class="empty-icon">♫</div><h2>Belum ada lagu diputar</h2><p>Pilih lagu dari perpustakaan untuk memulai. Lagu aktif dan antrean akan muncul di halaman ini.</p><button class="primary-button" data-action="show-songs">Buka semua lagu</button></div>`;
  }

  const liked = isFavorite(track.id);
  const nextEntries = playQueue
    .map((index, pos) => ({ track: library.tracks[index], pos }))
    .filter(entry => entry.track && entry.pos > queuePosition)
    .slice(0, 8);
  const queueMarkup = nextEntries.length ? nextEntries.map(({ track: next, pos }) => `
    <div class="now-up-next-row" data-action="play-queue-position" data-pos="${pos}" tabindex="0" role="button" aria-label="Putar ${escapeHtml(next.title)} berikutnya">
      ${coverMarkup(next, 'now-up-next-cover')}
      <span class="now-up-next-copy"><strong>${escapeHtml(next.title)}</strong><small>${escapeHtml(next.artist)} · ${escapeHtml(next.album)}</small></span>
      <time>${formatTime(next.duration)}</time>
      <button class="queue-remove" data-action="remove-queue-position" data-pos="${pos}" title="Hapus dari antrean" aria-label="Hapus ${escapeHtml(next.title)} dari antrean">×</button>
    </div>`).join('') : `<div class="now-up-next-empty">Tidak ada lagu berikutnya. Pilih lagu lain dari koleksi atau tambahkan lagu ke antrean.</div>`;

  const technical = [track.ext, track.lossless === true ? 'Lossless' : '', track.bitrate ? `${Math.round(track.bitrate / 1000)} kb/s` : '', track.sampleRate ? `${(track.sampleRate / 1000).toFixed(1)} kHz` : '', track.bitsPerSample ? `${track.bitsPerSample}-bit` : ''].filter(Boolean).join(' · ');
  return heading + `
    <section class="now-playing-view" aria-label="Lagu yang sedang diputar">
      <div class="now-view-artwork">${track.cover ? `<img src="${escapeHtml(track.cover)}" alt="Sampul ${escapeHtml(track.album || track.title)}">` : '<div class="now-view-artwork-fallback">♫</div>'}</div>
      <div class="now-view-details">
        <span class="eyebrow">SEKARANG DIPUTAR</span>
        <h2>${escapeHtml(track.title)}</h2>
        <p class="now-view-artist">${escapeHtml(track.artist || 'Artis tidak diketahui')}</p>
        <p class="now-view-album">${escapeHtml(track.album || 'Album tidak diketahui')}${track.year ? ` · ${escapeHtml(track.year)}` : ''}</p>
        <div class="now-view-actions">
          <button class="secondary-button transport-text-button" data-action="previous-track" title="Lagu sebelumnya">${iconMarkup('previous', 16)}<span class="button-label">Sebelumnya</span></button>
          <button id="now-view-play" class="primary-button transport-text-button" data-action="toggle-playback">${iconMarkup(audio.paused ? 'play' : 'pause', 16)}<span class="button-label">${audio.paused ? 'Putar' : 'Jeda'}</span></button>
          <button class="secondary-button transport-text-button" data-action="next-track" title="Lagu berikutnya"><span class="button-label">Berikutnya</span>${iconMarkup('next', 16)}</button>
          <button class="icon-button ${liked ? 'liked' : ''}" data-action="favorite" data-id="${escapeHtml(track.id)}" title="${liked ? 'Hapus dari favorit' : 'Tambah ke favorit'}" aria-label="${liked ? 'Hapus dari favorit' : 'Tambah ke favorit'}">${iconMarkup(liked ? 'heart-filled' : 'heart', 17)}</button>
        </div>
        <div class="now-view-timeline"><span id="now-view-current-time">${formatTime(audio.currentTime)}</span><input id="now-view-seek-slider" type="range" min="0" max="1000" value="${Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.currentTime / audio.duration * 1000) : 0}" aria-label="Posisi lagu saat ini"><span id="now-view-total-time">${formatTime(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : track.duration)}</span></div>
        <p class="now-view-technical">${escapeHtml(technical || 'Informasi teknis tidak tersedia')}</p>
        <div class="now-view-tools"><button class="subtle-button" data-action="open-lyrics">Buka lirik</button><button class="subtle-button" data-action="open-equalizer">Equalizer</button><button class="subtle-button" data-action="open-queue">Antrean lengkap</button></div>
      </div>
    </section>
    <section class="now-up-next-section">
      <div class="section-heading"><div><h2>Berikutnya</h2><p>${Math.max(0, playQueue.length - queuePosition - 1)} lagu dalam antrean setelah lagu ini</p></div><button class="subtle-button" data-action="open-queue">Lihat antrean →</button></div>
      <div class="now-up-next-list">${queueMarkup}</div>
    </section>`;
}

function syncNowPlayingView() {
  const button = $('#now-view-play');
  if (button) {
    const paused = audio.paused;
    button.innerHTML = `${iconMarkup(paused ? 'play' : 'pause', 16)}<span class="button-label">${paused ? 'Putar' : 'Jeda'}</span>`;
    button.title = paused ? 'Putar' : 'Jeda';
    button.setAttribute('aria-label', paused ? 'Putar lagu' : 'Jeda lagu');
  }
}

function updateNowPlayingTimeline() {
  const current = $('#now-view-current-time');
  const total = $('#now-view-total-time');
  const slider = $('#now-view-seek-slider');
  if (current && !isSeeking) current.textContent = formatTime(audio.currentTime);
  if (total) total.textContent = formatTime(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (getTrackById(activeTrackId)?.duration || 0));
  if (slider && !isSeeking && Number.isFinite(audio.duration) && audio.duration > 0) {
    slider.value = String(Math.round(audio.currentTime / audio.duration * 1000));
  }
}

const immersivePlayer = $('#immersive-player');
let immersiveReturnFocus = null;

function syncImmersivePlayer() {
  const track = getTrackById(activeTrackId);
  const background = $('#immersive-backdrop-image');
  const artwork = $('#immersive-cover-image');
  const fallback = $('#immersive-cover-fallback');
  if (!track) return;

  $('#immersive-title').textContent = track.title || 'Judul tidak diketahui';
  $('#immersive-artist').textContent = track.artist || 'Artis tidak diketahui';
  $('#immersive-album').textContent = [track.album, track.year].filter(Boolean).join(' · ');
  $('#immersive-technical').textContent = [track.ext, track.lossless === true ? 'Lossless' : '', track.bitrate ? `${Math.round(track.bitrate / 1000)} kb/s` : ''].filter(Boolean).join(' · ');
  if (track.cover) {
    background.src = track.cover;
    artwork.src = track.cover;
    artwork.hidden = false;
    fallback.hidden = true;
  } else {
    background.removeAttribute('src');
    artwork.removeAttribute('src');
    artwork.hidden = true;
    fallback.hidden = false;
  }
  syncImmersivePlaybackState();
  syncImmersiveFavorite();
  updateImmersiveTimeline();
  $('#immersive-volume-slider').value = String(appState.volume);
}

function syncImmersivePlaybackState() {
  const button = $('#immersive-play');
  if (!button) return;
  setPlayControl(button, audio.paused);
  setShuffleControl($('#immersive-shuffle'), isShuffle);
  setRepeatControl($('#immersive-repeat'), repeatMode);
}

function syncImmersiveFavorite() {
  const button = $('#immersive-favorite');
  if (!button) return;
  const liked = activeTrackId && isFavorite(activeTrackId);
  button.innerHTML = iconMarkup(liked ? 'heart-filled' : 'heart', 20);
  button.classList.toggle('liked', Boolean(liked));
  button.title = liked ? 'Hapus dari favorit' : 'Tambah ke favorit';
  button.setAttribute('aria-label', liked ? 'Hapus dari favorit' : 'Tambah ke favorit');
}

function updateImmersiveTimeline() {
  const current = $('#immersive-current-time');
  const total = $('#immersive-total-time');
  const slider = $('#immersive-seek-slider');
  if (!current || !total || !slider) return;
  const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (getTrackById(activeTrackId)?.duration || 0);
  if (!isSeeking) {
    current.textContent = formatTime(audio.currentTime || 0);
    slider.value = duration > 0 ? String(Math.round((audio.currentTime / duration) * 1000)) : '0';
  }
  total.textContent = formatTime(duration);
}

function openImmersivePlayer() {
  if (!activeTrackId || !getTrackById(activeTrackId)) {
    toast('Pilih lagu terlebih dahulu untuk membuka tampilan penuh.');
    return;
  }
  immersiveReturnFocus = document.activeElement;
  syncImmersivePlayer();
  immersivePlayer.hidden = false;
  document.body.classList.add('immersive-player-open');
  window.lumaMusic.setFullscreen(true).catch(() => {});
  $('#immersive-close').focus();
}

function closeImmersivePlayer() {
  if (immersivePlayer.hidden) return;
  immersivePlayer.hidden = true;
  document.body.classList.remove('immersive-player-open');
  window.lumaMusic.setFullscreen(false).catch(() => {});
  if (immersiveReturnFocus && typeof immersiveReturnFocus.focus === 'function') immersiveReturnFocus.focus();
  immersiveReturnFocus = null;
}

function renderPage() {
  updateSidebar();
  const count = library.tracks.length;
  if (currentView === 'home') {
    content.innerHTML = renderHome();
  } else if (currentView === 'songs') {
    content.innerHTML = pageHeading('Semua lagu', 'PERPUSTAKAAN', count ? `${count} lagu tersimpan di perangkat ini.` : 'Koleksi musik lokalmu.') + trackListMarkup(filteredTracks(library.tracks), 'Seluruh lagu');
  } else if (currentView === 'albums') {
    content.innerHTML = renderAlbums();
  } else if (currentView === 'artists') {
    content.innerHTML = renderArtists();
  } else if (currentView === 'favorites') {
    const tracks = filteredTracks(library.tracks.filter(track => isFavorite(track.id)));
    content.innerHTML = pageHeading('Favorit', 'KOLEKSI PRIBADI', 'Lagu yang ingin selalu dekat.') + trackListMarkup(tracks, 'Lagu favorit');
  } else if (currentView === 'recently-added') {
    const tracks = sortedTracks(filteredTracks(library.tracks), 'recently-added');
    content.innerHTML = pageHeading('Baru ditambahkan', 'KOLEKSI PINTAR', 'Lagu yang baru masuk ke perpustakaan lokalmu.') + trackListMarkup(tracks, 'Baru ditambahkan');
  } else if (currentView === 'recently-played') {
    const tracks = filteredTracks(recentHistoryTracks(200));
    content.innerHTML = pageHeading('Baru diputar', 'RIWAYAT LOKAL', 'Lagu terbaru yang mulai kamu dengarkan.') + trackListMarkup(tracks, 'Riwayat pemutaran');
  } else if (currentView === 'most-played') {
    const tracks = sortedTracks(filteredTracks(library.tracks), 'most-played').filter(track => trackPlayCount(track.id) > 0);
    content.innerHTML = pageHeading('Paling sering diputar', 'KOLEKSI PINTAR', 'Disusun berdasarkan jumlah sesi pemutaran lokal.') + trackListMarkup(tracks, 'Paling sering diputar');
  } else if (currentView === 'smart-mix') {
    content.innerHTML = renderLocalMix();
  } else if (currentView === 'luma-replay') {
    content.innerHTML = renderLumaReplay();
  } else if (currentView === 'now-playing') {
    content.innerHTML = renderNowPlaying();
  } else if (currentView === 'album-detail') {
    content.innerHTML = renderAlbumDetail(currentAlbumKey);
  } else if (currentView === 'artist-detail') {
    content.innerHTML = renderArtistDetail(currentArtistName);
  } else if (currentView === 'playlist') {
    const playlist = appState.playlists.find(item => item.name === currentPlaylist);
    const tracks = filteredTracks((playlist?.ids || []).map(getTrackById).filter(Boolean));
    const extra = `<div class="playlist-page-actions"><button class="secondary-button" data-action="rename-playlist">Ubah nama</button><button class="secondary-button" data-action="export-playlist">Ekspor M3U</button><button class="secondary-button danger-button" data-action="delete-playlist">Hapus playlist</button></div>`;
    content.innerHTML = pageHeading(currentPlaylist || 'Playlist', 'PLAYLIST PRIBADI', `${tracks.length} lagu`, extra) + trackListMarkup(tracks, 'Isi playlist', '', true);
  } else if (currentView === 'smart-playlist') {
    content.innerHTML = renderSmartPlaylist(currentSmartPlaylistId);
  } else {
    currentView = 'home';
    content.innerHTML = renderHome();
  }
  updateCurrentTrackHighlight();
}

function updateCurrentTrackHighlight() {
  $$('.track-row').forEach(row => {
    const track = library.tracks[Number(row.dataset.idx)];
    const playing = track?.id === activeTrackId;
    row.classList.toggle('playing', Boolean(playing));
    const firstCell = row.querySelector('td:first-child');
    if (playing && firstCell) firstCell.textContent = !audio.paused ? '♫' : String(track.trackNo || Number(row.dataset.idx) + 1).padStart(2, '0');
  });
}

function setView(view, context = null, pushHistory = true) {
  currentView = view;
  currentPlaylist = view === 'playlist' ? context : null;
  currentAlbumKey = view === 'album-detail' ? context : null;
  currentArtistName = view === 'artist-detail' ? context : null;
  currentSmartPlaylistId = view === 'smart-playlist' ? context : null;
  if (pushHistory) {
    const next = view === 'playlist' ? `playlist:${context}`
      : view === 'album-detail' ? `album:${context}`
      : view === 'artist-detail' ? `artist:${context}`
      : view === 'smart-playlist' ? `smart-playlist:${context}` : view;
    const last = viewHistory[historyPosition];
    if (last !== next) {
      viewHistory = viewHistory.slice(0, historyPosition + 1);
      viewHistory.push(next);
      historyPosition = viewHistory.length - 1;
    }
  }
  renderPage();
  content.scrollTop = 0;
}

function navigateHistory(delta) {
  const nextPos = historyPosition + delta;
  if (nextPos < 0 || nextPos >= viewHistory.length) return;
  historyPosition = nextPos;
  const key = viewHistory[historyPosition];
  if (key.startsWith('playlist:')) setView('playlist', key.slice(9), false);
  else if (key.startsWith('album:')) setView('album-detail', key.slice(6), false);
  else if (key.startsWith('artist:')) setView('artist-detail', key.slice(7), false);
  else if (key.startsWith('smart-playlist:')) setView('smart-playlist', key.slice(15), false);
  else setView(key, null, false);
}

function shuffleArray(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function playIndexes(indexes, startIndex) {
  if (!indexes.length) {
    toast('Belum ada lagu untuk diputar.');
    return;
  }
  const unique = [...new Set(indexes)].filter(index => Number.isInteger(index) && index >= 0 && index < library.tracks.length);
  const start = unique.includes(startIndex) ? startIndex : unique[0];
  playQueue = isShuffle ? [start, ...shuffleArray(unique.filter(index => index !== start))] : unique;
  queuePosition = playQueue.indexOf(start);
  playTrackAtQueuePosition();
}

function setupAudioGraph() {
  if (audioContext || !window.AudioContext) return;
  try {
    audioContext = new window.AudioContext();
    audioSource = audioContext.createMediaElementSource(audio);
    eqPreampNode = audioContext.createGain();
    eqFilters = EQ_FREQUENCIES.map((frequency, index) => {
      const filter = audioContext.createBiquadFilter();
      filter.frequency.value = frequency;
      filter.Q.value = 1.05;
      filter.type = index === 0 ? 'lowshelf' : index === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
      filter.gain.value = appState.eqBands[index] || 0;
      return filter;
    });
    audioSource.connect(eqPreampNode);
    let previous = eqPreampNode;
    for (const filter of eqFilters) {
      previous.connect(filter);
      previous = filter;
    }
    previous.connect(audioContext.destination);
    applyEqualizer();
  } catch (error) {
    console.error('Equalizer initialization failed:', error);
    // If the media element has already been captured by Web Audio, route it
    // directly to the output instead of leaving playback silent.
    if (audioSource && audioContext) {
      try { audioSource.disconnect(); } catch {}
      try { audioSource.connect(audioContext.destination); } catch {}
      eqFilters = [];
      eqPreampNode = null;
    } else {
      try { audioContext?.close(); } catch {}
      audioContext = null;
      audioSource = null;
      eqFilters = [];
      eqPreampNode = null;
    }
    toast('Equalizer tidak tersedia di sistem ini; pemutaran normal tetap aktif.');
  }
}

async function resumeAudioGraph() {
  setupAudioGraph();
  if (audioContext?.state === 'suspended') {
    try { await audioContext.resume(); } catch {}
  }
}

function applyEqualizer() {
  eqFilters.forEach((filter, index) => {
    if (filter) filter.gain.setTargetAtTime(appState.eqBands[index] || 0, audioContext.currentTime, 0.015);
  });
  if (eqPreampNode && audioContext) {
    eqPreampNode.gain.setTargetAtTime(10 ** (appState.eqPreamp / 20), audioContext.currentTime, 0.015);
  }
}

function playTrackAtQueuePosition(restoreTime = 0) {
  if (queuePosition < 0 || queuePosition >= playQueue.length) return;
  const track = library.tracks[playQueue[queuePosition]];
  if (!track) return;
  accumulateListeningTime(true);
  lastStatsWallClock = 0;
  activeTrackId = track.id;
  countedPlaybackStartId = null;
  lastStatsWallClock = Date.now();
  audio.pause();
  audio.src = track.src;
  audio.load();
  audio.volume = appState.volume;
  $('#now-title').textContent = track.title;
  $('#now-artist').textContent = `${track.artist} · ${track.album}`;
  $('#now-cover').innerHTML = track.cover ? `<img src="${escapeHtml(track.cover)}" alt="">` : '<span>♫</span>';
  $('#now-cover').classList.toggle('cover-placeholder', !track.cover);
  $('#now-favorite').disabled = false;
  updateNowFavorite();
  setPlayControl($('#play-button'), false);
  $('#play-button').disabled = false;
  $('#total-time').textContent = formatTime(track.duration);
  $('#current-time').textContent = '0:00';
  $('#seek-slider').value = '0';
  appState.lastTrack = track.id;
  appState.lastTime = restoreTime;
  saveAppState();
  updateMediaSession(track);
  renderPage();
  syncImmersivePlayer();
  if (restoreTime > 0) {
    const restore = () => {
      if (Number.isFinite(audio.duration) && restoreTime < audio.duration) audio.currentTime = restoreTime;
    };
    if (audio.readyState >= 1) restore();
    else audio.addEventListener('loadedmetadata', restore, { once: true });
  }
  loadLyricsForTrack(track);
  resumeAudioGraph().then(() => audio.play()).catch(() => {
    setPlayControl($('#play-button'), true);
    toast(`Tidak bisa memutar file ini: ${track.ext}. Format atau codec mungkin tidak didukung oleh Chromium.`);
  });
}

function updateMediaSession(track) {
  if (!('mediaSession' in navigator)) return;
  try {
    if ('MediaMetadata' in window) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Unknown Title',
        artist: track.artist || 'Unknown Artist',
        album: track.album || 'Unknown Album',
        artwork: track.cover ? [{ src: track.cover, sizes: '512x512' }] : []
      });
    }
    navigator.mediaSession.playbackState = 'paused';
    try { navigator.mediaSession.setActionHandler('play', () => togglePlayback()); } catch {}
    try { navigator.mediaSession.setActionHandler('pause', () => audio.pause()); } catch {}
    try { navigator.mediaSession.setActionHandler('previoustrack', () => previousTrack()); } catch {}
    try { navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack(true)); } catch {}
    try { navigator.mediaSession.setActionHandler('seekto', detail => { if (Number.isFinite(detail.seekTime)) audio.currentTime = detail.seekTime; }); } catch {}
  } catch {}
}

function togglePlayback() {
  if (!activeTrackId) {
    const tracks = currentViewTracks();
    playIndexes(allIndexes(tracks), allIndexes(tracks)[0]);
    return;
  }
  if (audio.paused) {
    resumeAudioGraph().then(() => audio.play()).then(() => {
      setPlayControl($('#play-button'), false);
      updateCurrentTrackHighlight();
    }).catch(() => toast('Pemutaran gagal. Coba pilih lagu lain.'));
  } else {
    audio.pause();
    setPlayControl($('#play-button'), true);
    updateCurrentTrackHighlight();
  }
}

function nextTrack(manual = false) {
  if (!playQueue.length) return;
  if (queuePosition < playQueue.length - 1) {
    queuePosition += 1;
  } else if (repeatMode === 1 || manual) {
    if (isShuffle && playQueue.length > 1) {
      const justPlayed = playQueue[queuePosition];
      const shuffled = shuffleArray(playQueue);
      if (shuffled[0] === justPlayed) shuffled.push(shuffled.shift());
      playQueue = shuffled;
    }
    queuePosition = 0;
  } else {
    audio.pause();
    setPlayControl($('#play-button'), true);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    return;
  }
  playTrackAtQueuePosition();
}

function previousTrack() {
  if (!playQueue.length) return;
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  queuePosition = queuePosition > 0 ? queuePosition - 1 : (repeatMode === 1 ? playQueue.length - 1 : 0);
  playTrackAtQueuePosition();
}

function updateNowFavorite() {
  const button = $('#now-favorite');
  const liked = activeTrackId && isFavorite(activeTrackId);
  button.innerHTML = iconMarkup(liked ? 'heart-filled' : 'heart', 20);
  button.classList.toggle('liked', Boolean(liked));
  button.title = liked ? 'Hapus dari favorit' : 'Tambah ke favorit';
  button.setAttribute('aria-label', button.title);
}

function toggleFavorite(id) {
  if (isFavorite(id)) appState.favorites = appState.favorites.filter(item => item !== id);
  else appState.favorites.push(id);
  saveAppState();
  renderPage();
  updateNowFavorite();
  syncImmersiveFavorite();
}

function createPlaylist(promptForSongId = null) {
  const name = window.prompt('Nama playlist baru:');
  if (name === null) return;
  const normalized = name.trim();
  if (!normalized) return toast('Nama playlist tidak boleh kosong.');
  const existing = appState.playlists.find(p => p.name.toLocaleLowerCase() === normalized.toLocaleLowerCase());
  if (existing) {
    if (promptForSongId) addTrackToPlaylist(promptForSongId, existing.name);
    else toast('Playlist dengan nama itu sudah ada.');
    return;
  }
  const playlist = { name: normalized, ids: [] };
  if (promptForSongId) playlist.ids.push(promptForSongId);
  appState.playlists.push(playlist);
  saveAppState();
  renderPage();
  if (promptForSongId) toast(`Ditambahkan ke “${normalized}”.`);
  else toast(`Playlist “${normalized}” dibuat.`);
}

function addTrackToPlaylist(trackId, playlistName = null) {
  if (!appState.playlists.length && !playlistName) return createPlaylist(trackId);
  let targetName = playlistName;
  if (!targetName) {
    targetName = window.prompt(`Tambah ke playlist mana?\n${appState.playlists.map(p => `• ${p.name}`).join('\n')}\n\nKetik nama yang sudah ada, atau nama baru:`);
    if (targetName === null) return;
    targetName = targetName.trim();
    if (!targetName) return;
  }
  let playlist = appState.playlists.find(p => p.name.toLocaleLowerCase() === targetName.toLocaleLowerCase());
  if (!playlist) {
    playlist = { name: targetName, ids: [] };
    appState.playlists.push(playlist);
  }
  if (!playlist.ids.includes(trackId)) playlist.ids.push(trackId);
  saveAppState();
  renderPage();
  toast(`Ditambahkan ke “${playlist.name}”.`);
}

function removeTrackFromCurrentPlaylist(trackId) {
  if (!currentPlaylist) return;
  const playlist = appState.playlists.find(item => item.name === currentPlaylist);
  if (!playlist) return;
  playlist.ids = playlist.ids.filter(id => id !== trackId);
  saveAppState();
  renderPage();
  const track = getTrackById(trackId);
  toast(track ? `“${track.title}” dihapus dari playlist.` : 'Lagu dihapus dari playlist.');
}


function renameCurrentPlaylist() {
  if (!currentPlaylist) return;
  const playlist = appState.playlists.find(item => item.name === currentPlaylist);
  if (!playlist) return;
  const nextName = window.prompt('Nama playlist baru:', playlist.name);
  if (nextName === null) return;
  const name = nextName.trim();
  if (!name) return toast('Nama playlist tidak boleh kosong.');
  if (appState.playlists.some(item => item !== playlist && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return toast('Playlist dengan nama itu sudah ada.');
  const previous = playlist.name;
  playlist.name = name;
  currentPlaylist = name;
  viewHistory = viewHistory.map(key => key === `playlist:${previous}` ? `playlist:${name}` : key);
  saveAppState();
  renderPage();
  toast(`Playlist diubah menjadi “${name}”.`);
}

async function importPlaylistM3U() {
  if (!library.folder || !library.tracks.length) return toast('Impor folder musik dahulu sebelum mengimpor playlist.');
  try {
    const result = await window.lumaMusic.importPlaylistM3U();
    if (result?.canceled) return;
    if (!result.trackIds?.length) return toast('Tidak ada lagu playlist yang cocok dengan perpustakaan lokal ini.');
    let name = result.name || 'Playlist impor';
    let suffix = 2;
    while (appState.playlists.some(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) name = `${result.name || 'Playlist impor'} (${suffix++})`;
    appState.playlists.push({ name, ids: result.trackIds });
    saveAppState();
    renderPage();
    setView('playlist', name);
    toast(`Playlist “${name}” diimpor: ${result.trackIds.length} lagu.`);
  } catch (error) {
    toast(error?.message || 'Impor playlist M3U gagal.');
  }
}

async function exportCurrentPlaylistM3U() {
  if (!currentPlaylist) return;
  const playlist = appState.playlists.find(item => item.name === currentPlaylist);
  if (!playlist) return;
  try {
    const result = await window.lumaMusic.exportPlaylistM3U({ name: playlist.name, trackIds: playlist.ids });
    if (result?.canceled) return;
    toast(`Playlist diekspor: ${result.count} lagu.`);
  } catch (error) {
    toast(error?.message || 'Ekspor playlist M3U gagal.');
  }
}

function startSleepTimer() {
  const choice = $('#sleep-timer-select').value;
  if (sleepTimerInterval) window.clearInterval(sleepTimerInterval);
  sleepTimerInterval = null;
  sleepTimerEndsAt = 0;
  sleepTimerEndOfTrack = false;
  if (choice === 'off') {
    $('#sleep-timer-status').textContent = 'Timer tidur mati.';
    toast('Timer tidur dimatikan.');
    return;
  }
  if (choice === 'end-track') {
    if (!activeTrackId) return toast('Putar lagu terlebih dahulu untuk memakai timer akhir lagu.');
    sleepTimerEndOfTrack = true;
    $('#sleep-timer-status').textContent = 'Pemutaran akan berhenti saat lagu ini selesai.';
    toast('Timer tidur aktif: berhenti saat lagu selesai.');
    return;
  }
  const minutes = Number(choice);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 720) return toast('Durasi timer tidak valid.');
  sleepTimerEndsAt = Date.now() + minutes * 60 * 1000;
  const update = () => {
    const remaining = Math.max(0, sleepTimerEndsAt - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    $('#sleep-timer-status').textContent = remaining ? `Pemutaran berhenti dalam ${mins}:${String(secs).padStart(2, '0')}.` : 'Timer selesai.';
    if (remaining <= 0) {
      window.clearInterval(sleepTimerInterval);
      sleepTimerInterval = null;
      sleepTimerEndsAt = 0;
      audio.pause();
      toast('Timer tidur selesai. Pemutaran dihentikan.');
    }
  };
  update();
  sleepTimerInterval = window.setInterval(update, 1000);
  toast(`Timer tidur aktif: ${minutes} menit.`);
}

function maybeAutoContinueLocal() {
  if (!appState.autoContinue || !library.tracks.length || !activeTrackId) return false;
  const mix = localMixTracks(30);
  if (!mix.length) return false;
  const indexes = allIndexes(mix);
  if (!indexes.length) return false;
  playQueue = isShuffle ? [indexes[0], ...shuffleArray(indexes.slice(1))] : indexes;
  queuePosition = 0;
  playTrackAtQueuePosition();
  toast('Melanjutkan dengan mix serupa dari perpustakaan lokal.');
  return true;
}

function accumulateListeningTime(force = false) {
  const now = Date.now();
  if (!activeTrackId || (!force && audio.paused) || !lastStatsWallClock) {
    lastStatsWallClock = audio.paused ? 0 : now;
    return;
  }
  const elapsed = Math.max(0, Math.min(5, (now - lastStatsWallClock) / 1000));
  appState.listenSeconds[activeTrackId] = (Number(appState.listenSeconds[activeTrackId]) || 0) + elapsed;
  lastStatsWallClock = now;
}
function deleteCurrentPlaylist() {
  if (!currentPlaylist) return;
  const name = currentPlaylist;
  if (!window.confirm(`Hapus playlist “${name}”? File musik tidak akan dihapus.`)) return;
  appState.playlists = appState.playlists.filter(p => p.name !== name);
  saveAppState();
  setView('home');
  toast(`Playlist “${name}” dihapus.`);
}

function addIndexesToQueue(indexes) {
  const unique = [...new Set(indexes)].filter(index => Number.isInteger(index) && index >= 0 && index < library.tracks.length);
  if (!unique.length) return toast('Album ini tidak memiliki lagu yang bisa ditambahkan.');
  if (!playQueue.length || queuePosition < 0) return playIndexes(unique, unique[0]);
  const currentIndex = playQueue[queuePosition];
  const upcoming = unique.filter(index => index !== currentIndex && !playQueue.includes(index));
  playQueue.push(...upcoming);
  renderQueue();
  renderPage();
  saveAppState();
  toast(upcoming.length ? `${upcoming.length} lagu ditambahkan ke antrean.` : 'Lagu album ini sudah ada di antrean.');
}

function addTrackToQueue(index, playNext = false) {
  if (!Number.isInteger(index) || index < 0 || index >= library.tracks.length) return;
  if (!playQueue.length || queuePosition < 0) {
    playIndexes([index], index);
    return;
  }
  if (playQueue[queuePosition] === index) {
    toast('Lagu ini sedang diputar.');
    return;
  }
  const existing = playQueue.indexOf(index);
  if (existing >= 0) {
    if (playNext && existing === queuePosition + 1) {
      toast('Lagu ini sudah menjadi lagu berikutnya.');
      return;
    }
    playQueue.splice(existing, 1);
    if (existing < queuePosition) queuePosition -= 1;
  }
  if (playNext) {
    playQueue.splice(queuePosition + 1, 0, index);
    toast(`“${library.tracks[index].title}” akan diputar berikutnya.`);
  } else {
    playQueue.push(index);
    toast(`“${library.tracks[index].title}” ditambahkan ke antrean.`);
  }
  renderQueue();
  renderPage();
  saveAppState();
}

function syncPlaybackMenuState() {
  window.lumaMusic?.setPlaybackMenuState({ shuffle: isShuffle, repeatMode });
}

function applyMaterialMode(mode, notify = true) {
  appState.material = mode === 'solid' ? 'solid' : 'glass';
  document.body.dataset.material = appState.material;
  const selector = $('#material-mode');
  if (selector) selector.value = appState.material;
  saveAppState();
  if (notify) toast(appState.material === 'glass' ? 'Material kaca buram aktif.' : 'Material solid aktif. Blur dimatikan.');
}

function setRepeatMode(mode, announce = true) {
  repeatMode = Math.max(0, Math.min(2, Number(mode) || 0));
  setRepeatControl($('#repeat-button'), repeatMode);
  syncImmersivePlaybackState();
  saveAppState();
  syncPlaybackMenuState();
  if (announce) toast(['Pengulangan mati.', 'Antrean akan diulang.', 'Lagu ini akan diulang.'][repeatMode]);
}

function handleMenuCommand(command) {
  if (command === 'choose-folder') return chooseFolder();
  if (command === 'rescan-library') return rescanFolder();
  if (command === 'import-playlist-m3u') return importPlaylistM3U();
  if (command === 'open-sleep-timer') { settingsDialog.showModal(); $('#sleep-timer-select').focus(); return; }
  if (command === 'open-settings') return settingsDialog.showModal();
  if (command === 'toggle-playback') return togglePlayback();
  if (command === 'previous-track') return previousTrack();
  if (command === 'next-track') return nextTrack(true);
  if (command === 'seek-back') { if (activeTrackId) audio.currentTime = Math.max(0, audio.currentTime - 10); return; }
  if (command === 'seek-forward') { if (activeTrackId && Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10); return; }
  if (command === 'volume-down' || command === 'volume-up') {
    const delta = command === 'volume-up' ? 0.05 : -0.05;
    appState.volume = Math.min(1, Math.max(0, Math.round((appState.volume + delta) * 100) / 100));
    audio.volume = appState.volume;
    $('#volume-slider').value = String(appState.volume);
    $('#immersive-volume-slider').value = String(appState.volume);
    saveAppState();
    return;
  }
  if (command === 'toggle-shuffle') return $('#shuffle-button').click();
  if (command.startsWith('repeat-mode:')) return setRepeatMode(Number(command.split(':')[1]));
  if (command === 'show-queue') { renderQueue(); if (!queueDialog.open) queueDialog.showModal(); return; }
  if (command === 'show-lyrics') { if (!lyricsDialog.open) toggleLyrics(); return; }
  if (command === 'show-equalizer') { if (!equalizerDialog.open) { equalizerDialog.showModal(); requestAnimationFrame(drawEqualizerCurve); } return; }
  if (command === 'view:now-playing') {
    setView('now-playing');
    if (activeTrackId) openImmersivePlayer();
    return;
  }
  if (command.startsWith('view:')) return setView(command.slice(5));
  if (command === 'focus-search') { searchInput.focus(); searchInput.select(); return; }
  if (command === 'navigate-back') return navigateHistory(-1);
  if (command === 'navigate-forward') return navigateHistory(1);
  if (command === 'create-playlist') return createPlaylist();
  if (command === 'create-smart-playlist') return openSmartPlaylistEditor();
  if (command === 'play-library') { const indexes = library.tracks.map((_track, index) => index); return playIndexes(indexes, indexes[0]); }
  if (command === 'clear-upcoming-queue') return clearUpcomingQueue();
  if (command === 'toggle-material') return applyMaterialMode(appState.material === 'glass' ? 'solid' : 'glass');
  if (command === 'show-shortcuts') return settingsDialog.showModal();
  if (command === 'show-about') return toast('Luma Music 2.0.0 · Open source · Lisensi MIT.');
}

function playAlbumKey(key) {
  const group = albumGroups(library.tracks).find(album => album.key === key);
  if (!group) return;
  const indexes = allIndexes(group.tracks);
  playIndexes(indexes, indexes[0]);
}

function playArtist(name) {
  const tracks = library.tracks.filter(track => (track.albumArtist || track.artist) === name || track.artist === name);
  const indexes = allIndexes(tracks);
  if (indexes.length) playIndexes(indexes, indexes[0]);
}

async function chooseFolder() {
  try {
    setBusy(true, 'Memindai folder musik…');
    const result = await window.lumaMusic.chooseFolder();
    if (result?.canceled) {
      setBusy(false);
      renderPage();
      return;
    }
    replaceLibrary(result);
    searchInput.value = '';
    setBusy(false);
    renderPage();
    toast(library.tracks.length ? `${library.tracks.length} lagu berhasil ditambahkan.` : 'Folder dipilih, tetapi tidak ada file audio yang dikenali.');
  } catch (error) {
    setBusy(false);
    renderPage();
    toast(error?.message || 'Tidak dapat membaca folder musik.');
  }
}

async function rescanFolder() {
  if (!library.folder) return chooseFolder();
  try {
    setBusy(true, 'Memindai ulang perpustakaan…');
    replaceLibrary(await window.lumaMusic.rescanLibrary());
    setBusy(false);
    renderPage();
    toast(`Pemindaian selesai: ${library.tracks.length} lagu.`);
  } catch (error) {
    setBusy(false);
    renderPage();
    toast(error?.message || 'Pemindaian ulang gagal.');
  }
}

function setBusy(busy, message = '') {
  $('#import-folder').disabled = busy;
  $('#rescan-folder').disabled = busy;
  if (busy) {
    content.innerHTML = `<div class="loading-state"><div class="loading-disc"></div><strong>${escapeHtml(message || 'Memindai…')}</strong><p id="scan-progress">Menyiapkan file audio…</p></div>`;
  }
}

function decibelsToGain(value) {
  return 10 ** (value / 20);
}

function initializeEqualizer() {
  const container = $('#eq-bands');
  container.innerHTML = EQ_FREQUENCIES.map((frequency, index) => `
    <label class="eq-band" for="eq-band-${index}">
      <output id="eq-value-${index}">0</output>
      <input id="eq-band-${index}" type="range" min="-12" max="12" step="0.5" value="${appState.eqBands[index]}" aria-label="${frequency >= 1000 ? `${frequency / 1000} kHz` : `${frequency} Hz`}">
      <span>${frequency >= 1000 ? `${frequency / 1000}k` : frequency}</span>
    </label>`).join('');
  EQ_FREQUENCIES.forEach((_frequency, index) => {
    const slider = $(`#eq-band-${index}`);
    slider.addEventListener('input', () => {
      appState.eqBands[index] = Number(slider.value);
      $(`#eq-value-${index}`).textContent = `${Number(slider.value) > 0 ? '+' : ''}${slider.value}`;
      appState.eqPreset = 'Custom';
      $('#eq-preset').value = 'Custom';
      applyEqualizer();
      drawEqualizerCurve();
      saveAppState();
    });
  });
  $('#eq-preset').value = appState.eqPreset;
  $('#eq-preamp').value = String(appState.eqPreamp);
  $('#eq-preamp-value').textContent = `${appState.eqPreamp > 0 ? '+' : ''}${appState.eqPreamp} dB`;
  syncEqualizerControls();
  $('#eq-preset').addEventListener('change', () => {
    const preset = EQ_PRESETS[$('#eq-preset').value];
    if (!preset) return;
    appState.eqPreset = $('#eq-preset').value;
    appState.eqBands = [...preset.bands];
    appState.eqPreamp = preset.preamp;
    syncEqualizerControls();
    applyEqualizer();
    drawEqualizerCurve();
    saveAppState();
  });
  $('#eq-preamp').addEventListener('input', event => {
    appState.eqPreamp = Number(event.target.value);
    appState.eqPreset = 'Custom';
    $('#eq-preset').value = 'Custom';
    $('#eq-preamp-value').textContent = `${appState.eqPreamp > 0 ? '+' : ''}${appState.eqPreamp} dB`;
    applyEqualizer();
    drawEqualizerCurve();
    saveAppState();
  });
  $('#eq-reset').addEventListener('click', () => {
    appState.eqPreset = 'Flat';
    appState.eqBands = [...EQ_PRESETS.Flat.bands];
    appState.eqPreamp = 0;
    $('#eq-preset').value = 'Flat';
    syncEqualizerControls();
    applyEqualizer();
    drawEqualizerCurve();
    saveAppState();
    toast('Equalizer direset ke Flat.');
  });
  window.addEventListener('resize', drawEqualizerCurve);
}

function syncEqualizerControls() {
  EQ_FREQUENCIES.forEach((_frequency, index) => {
    const slider = $(`#eq-band-${index}`);
    if (!slider) return;
    slider.value = String(appState.eqBands[index]);
    $(`#eq-value-${index}`).textContent = `${appState.eqBands[index] > 0 ? '+' : ''}${appState.eqBands[index]}`;
  });
  $('#eq-preamp').value = String(appState.eqPreamp);
  $('#eq-preamp-value').textContent = `${appState.eqPreamp > 0 ? '+' : ''}${appState.eqPreamp} dB`;
}

function drawEqualizerCurve() {
  const canvas = $('#eq-curve');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const width = rect.width;
  const height = rect.height;
  const left = 24, right = width - 10, top = 13, bottom = height - 24;
  const graphHeight = bottom - top;
  ctx.clearRect(0, 0, width, height);
  ctx.font = '9px system-ui';
  ctx.textAlign = 'right';
  [12, 6, 0, -6, -12].forEach(db => {
    const y = top + ((12 - db) / 24) * graphHeight;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y);
    ctx.strokeStyle = db === 0 ? 'rgba(224,207,255,.3)' : 'rgba(255,255,255,.075)';
    ctx.stroke();
    ctx.fillStyle = '#827a93'; ctx.fillText(`${db}`, left - 6, y + 3);
  });
  const centers = EQ_FREQUENCIES.map((f, i) => ({ f, g: appState.eqBands[i] }));
  const xFor = f => left + (Math.log10(f / 20) / Math.log10(20000 / 20)) * (right - left);
  const yFor = db => top + ((12 - Math.max(-12, Math.min(12, db))) / 24) * graphHeight;
  ctx.beginPath();
  const steps = Math.max(100, Math.floor(width * 1.2));
  for (let i = 0; i <= steps; i += 1) {
    const xRatio = i / steps;
    const freq = 20 * ((20000 / 20) ** xRatio);
    let gain = appState.eqPreamp;
    centers.forEach(({ f, g }) => {
      const octaves = Math.log2(freq / f);
      gain += g * Math.exp(-0.5 * (octaves / 0.72) ** 2);
    });
    const x = left + xRatio * (right - left);
    const y = yFor(gain);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#cbb0ff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#827a93'; ctx.textAlign = 'center';
  [[20, '20'], [100, '100'], [1000, '1k'], [10000, '10k'], [20000, '20k']].forEach(([freq, label]) => ctx.fillText(label, xFor(freq), height - 7));
}

function parseLrc(raw) {
  const lines = [];
  for (const rawLine of String(raw || '').split(/\r?\n/)) {
    if (/^\s*\[(?:ar|al|ti|by|re|ve|offset|length):/i.test(rawLine)) continue;
    const matches = [...rawLine.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const lyric = rawLine.replace(/\[[^\]]+\]/g, '').trim();
    if (!lyric) continue;
    if (!matches.length) {
      lines.push({ time: null, text: lyric });
      continue;
    }
    for (const match of matches) {
      const fraction = match[3] ? Number(match[3].padEnd(3, '0').slice(0, 3)) / 1000 : 0;
      lines.push({ time: Number(match[1]) * 60 + Number(match[2]) + fraction, text: lyric });
    }
  }
  return lines.sort((a, b) => (a.time ?? -1) - (b.time ?? -1));
}

function renderLyrics() {
  const container = $('#lyrics-content');
  if (!lyricsLines.length) {
    container.innerHTML = '<div class="lyrics-empty">Belum ada file lirik .lrc yang cocok. Letakkan file .lrc dengan nama yang sama di folder lagu.</div>';
    return;
  }
  if (lyricsLines.every(line => line.time === null)) {
    container.innerHTML = `<div class="lyrics-plain">${lyricsLines.map(line => `<p>${escapeHtml(line.text)}</p>`).join('')}</div>`;
    return;
  }
  container.innerHTML = lyricsLines.map((line, index) => `<p class="lyric-line" data-lyric-index="${index}" ${line.time === null ? '' : `data-time="${line.time}"`}>${escapeHtml(line.text)}</p>`).join('');
  lastActiveLyric = -1;
  syncLyricHighlight();
}

async function loadLyricsForTrack(track) {
  if (!track) return;
  lyricsTrackId = track.id;
  const token = ++lyricsRequestToken;
  $('#lyrics-track-title').textContent = track.title;
  $('#lyrics-track-artist').textContent = `${track.artist} · ${track.album}`;
  $('#lyrics-content').innerHTML = '<div class="lyrics-empty">Mencari lirik lokal…</div>';
  lyricsLines = [];
  lastActiveLyric = -1;
  try {
    const result = await window.lumaMusic.loadAdjacentLyrics(track.id);
    if (token !== lyricsRequestToken || lyricsTrackId !== track.id || !lyricsDialog.open) return;
    lyricsLines = parseLrc(result?.lyrics || '');
    renderLyrics();
  } catch {
    if (token === lyricsRequestToken) $('#lyrics-content').innerHTML = '<div class="lyrics-empty">Lirik tidak dapat dibaca.</div>';
  }
}

function syncLyricHighlight() {
  if (!lyricsDialog.open || !lyricsLines.length || lyricsLines.every(line => line.time === null)) return;
  let low = 0, high = lyricsLines.length - 1, active = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lyricsLines[mid].time !== null && lyricsLines[mid].time <= audio.currentTime) { active = mid; low = mid + 1; }
    else high = mid - 1;
  }
  if (active === lastActiveLyric) return;
  lastActiveLyric = active;
  $$('.lyric-line').forEach(node => node.classList.toggle('active', Number(node.dataset.lyricIndex) === active));
  const node = $(`.lyric-line[data-lyric-index="${active}"]`);
  if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function toggleLyrics() {
  if (!activeTrackId) {
    toast('Putar lagu dulu untuk membuka lirik.');
    return;
  }
  if (lyricsDialog.open) { lyricsDialog.close(); return; }
  lyricsDialog.showModal();
  const track = getTrackById(activeTrackId);
  if (track) await loadLyricsForTrack(track);
}

function renderQueue() {
  const queueTracks = playQueue.map((index, pos) => ({ track: library.tracks[index], pos })).filter(entry => entry.track);
  if (!queueTracks.length) {
    $('#queue-list').innerHTML = '<div class="empty-state"><div class="empty-icon">♫</div><h2>Antrean masih kosong</h2><p>Pilih lagu dari perpustakaan untuk mulai memutar musik.</p></div>';
    return;
  }
  $('#queue-list').innerHTML = queueTracks.map(({ track, pos }) => {
    const current = track.id === activeTrackId;
    const canMoveUp = queuePosition < 0 ? pos > 0 : pos > queuePosition + 1;
    const canMoveDown = pos < playQueue.length - 1 && (queuePosition < 0 || pos > queuePosition);
    return `<div class="queue-row ${current ? 'active' : ''}" data-action="play-queue-position" data-pos="${pos}" tabindex="0" role="button" aria-label="Putar ${escapeHtml(track.title)}">
      ${coverMarkup(track)}<div class="track-text"><strong>${escapeHtml(track.title)}</strong><span>${escapeHtml(track.artist)}</span></div><time>${formatTime(track.duration)}</time><div class="queue-row-actions"><button class="queue-reorder" data-action="move-queue-position" data-direction="-1" data-pos="${pos}" ${!canMoveUp ? 'disabled' : ''} title="Pindah ke atas" aria-label="Pindah ${escapeHtml(track.title)} ke atas">${iconMarkup('chevron-up', 14)}</button><button class="queue-reorder" data-action="move-queue-position" data-direction="1" data-pos="${pos}" ${!canMoveDown ? 'disabled' : ''} title="Pindah ke bawah" aria-label="Pindah ${escapeHtml(track.title)} ke bawah">${iconMarkup('chevron-down', 14)}</button><button class="queue-remove" data-action="remove-queue-position" data-pos="${pos}" title="Hapus dari antrean" aria-label="Hapus ${escapeHtml(track.title)} dari antrean">×</button></div>
    </div>`;
  }).join('');
}

function moveQueuePosition(position, direction) {
  if (!Number.isInteger(position) || !Number.isInteger(direction) || ![-1, 1].includes(direction)) return;
  const target = position + direction;
  if (position < 0 || target < 0 || target >= playQueue.length || position >= playQueue.length) return;
  if (queuePosition >= 0 && (position <= queuePosition || target <= queuePosition)) {
    toast('Lagu yang sedang diputar tetap di posisi aktif; susun lagu berikutnya.');
    return;
  }
  [playQueue[position], playQueue[target]] = [playQueue[target], playQueue[position]];
  renderQueue();
  renderPage();
  saveAppState();
}

function removeQueuePosition(position) {
  if (!Number.isInteger(position) || position < 0 || position >= playQueue.length) return;
  const wasCurrent = position === queuePosition;
  playQueue.splice(position, 1);
  if (!playQueue.length) {
    queuePosition = -1;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    activeTrackId = null;
    appState.lastTrack = null;
    appState.lastTime = 0;
    $('#now-title').textContent = 'Belum ada lagu diputar';
    $('#now-artist').textContent = 'Pilih lagu dari perpustakaan';
    $('#now-cover').innerHTML = '<span>♫</span>';
    $('#now-cover').classList.add('cover-placeholder');
    $('#now-favorite').disabled = true;
    $('#play-button').disabled = true;
    saveAppState();
    renderPage();
  } else if (wasCurrent) {
    queuePosition = Math.min(position, playQueue.length - 1);
    playTrackAtQueuePosition();
  } else {
    if (position < queuePosition) queuePosition -= 1;
    renderPage();
  }
  renderQueue();
}

function clearUpcomingQueue() {
  const activeIndex = library.tracks.findIndex(track => track.id === activeTrackId);
  playQueue = activeIndex >= 0 ? [activeIndex] : [];
  queuePosition = playQueue.length ? 0 : -1;
  renderQueue();
  renderPage();
  toast(playQueue.length ? 'Antrean selanjutnya dikosongkan; lagu saat ini tetap berjalan.' : 'Antrean dikosongkan.');
}

function replaceLibrary(data) {
  const oldQueueIds = playQueue.map(index => library.tracks[index]?.id).filter(Boolean);
  const oldActiveId = activeTrackId;
  library = hydrateLibrary(data);
  const liveIds = new Set(library.tracks.map(track => track.id));
  const timestamp = Date.now();
  for (const track of library.tracks) if (!Number.isFinite(appState.addedAt[track.id])) appState.addedAt[track.id] = timestamp;
  appState.addedAt = Object.fromEntries(Object.entries(appState.addedAt).filter(([id]) => liveIds.has(id)));
  appState.playHistory = appState.playHistory.filter(entry => liveIds.has(entry.id));
  appState.playCounts = Object.fromEntries(Object.entries(appState.playCounts).filter(([id]) => liveIds.has(id)));
  appState.listenSeconds = Object.fromEntries(Object.entries(appState.listenSeconds).filter(([id]) => liveIds.has(id)));
  const newIndexes = new Map(library.tracks.map((track, index) => [track.id, index]));
  playQueue = oldQueueIds.map(id => newIndexes.get(id)).filter(index => index !== undefined);
  if (oldActiveId && newIndexes.has(oldActiveId)) {
    const activeIndex = newIndexes.get(oldActiveId);
    if (!playQueue.includes(activeIndex)) playQueue.splice(Math.max(0, queuePosition), 0, activeIndex);
    queuePosition = playQueue.indexOf(activeIndex);
  } else if (oldActiveId) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    activeTrackId = null;
    queuePosition = -1;
    playQueue = [];
    appState.lastTrack = null;
    appState.lastTime = 0;
    $('#now-title').textContent = 'Belum ada lagu diputar';
    $('#now-artist').textContent = 'Impor folder musik untuk memulai';
    $('#now-cover').innerHTML = '<span>♫</span>';
    $('#now-cover').classList.add('cover-placeholder');
    $('#now-favorite').disabled = true;
    $('#play-button').disabled = true;
  }
  saveAppState();
}

content.addEventListener('click', event => {
  const actionNode = event.target.closest('[data-action]');
  if (!actionNode) return;
  const { action } = actionNode.dataset;
  if (action === 'import-folder') return chooseFolder();
  if (action === 'show-songs') return setView('songs');
  if (action === 'show-albums') return setView('albums');
  if (action === 'open-immersive-player') return openImmersivePlayer();
  if (action === 'toggle-playback') return togglePlayback();
  if (action === 'previous-track') return previousTrack();
  if (action === 'next-track') return nextTrack(true);
  if (action === 'open-queue') { renderQueue(); if (!queueDialog.open) queueDialog.showModal(); return; }
  if (action === 'open-lyrics') return toggleLyrics();
  if (action === 'open-equalizer') { equalizerDialog.showModal(); requestAnimationFrame(drawEqualizerCurve); return; }
  if (action === 'play-queue-position') { queuePosition = Number(actionNode.dataset.pos); playTrackAtQueuePosition(); renderQueue(); return; }
  if (action === 'remove-queue-position') { event.stopPropagation(); removeQueuePosition(Number(actionNode.dataset.pos)); return; }
  if (action === 'resume-last') {
    const lastIndex = library.tracks.findIndex(track => track.id === appState.lastTrack);
    if (lastIndex < 0) return toast('Lagu terakhir tidak lagi ada di perpustakaan.');
    const indexes = library.tracks.map((_track, index) => index);
    playQueue = isShuffle ? [lastIndex, ...shuffleArray(indexes.filter(index => index !== lastIndex))] : indexes;
    queuePosition = playQueue.indexOf(lastIndex);
    return playTrackAtQueuePosition(appState.lastTime || 0);
  }
  if (action === 'play-track') {
    const clickedIndex = Number(actionNode.dataset.idx);
    const visibleIndexes = actionNode.dataset.listIds
      ? indexesFromIdList(actionNode.dataset.listIds)
      : allIndexes(currentViewTracks());
    playIndexes(visibleIndexes, clickedIndex);
  }
  if (action === 'favorite') {
    event.stopPropagation();
    return toggleFavorite(actionNode.dataset.id);
  }
  if (action === 'add-playlist') {
    event.stopPropagation();
    return addTrackToPlaylist(actionNode.dataset.id);
  }
  if (action === 'remove-playlist-track') {
    event.stopPropagation();
    return removeTrackFromCurrentPlaylist(actionNode.dataset.id);
  }
  if (action === 'play-current-list') {
    const indexes = actionNode.dataset.listIds
      ? indexesFromIdList(actionNode.dataset.listIds)
      : allIndexes(currentViewTracks());
    return playIndexes(indexes, indexes[0]);
  }
  if (action === 'open-album') return setView('album-detail', actionNode.dataset.albumKey);
  if (action === 'play-album') return playAlbumKey(actionNode.dataset.albumKey);
  if (action === 'queue-album') { const album = albumGroups(library.tracks).find(item => item.key === actionNode.dataset.albumKey); return addIndexesToQueue(allIndexes(album?.tracks || [])); }
  if (action === 'open-artist') return setView('artist-detail', actionNode.dataset.artist);
  if (action === 'play-artist') return playArtist(actionNode.dataset.artist);
  if (action === 'delete-playlist') return deleteCurrentPlaylist();
  if (action === 'rename-playlist') return renameCurrentPlaylist();
  if (action === 'export-playlist') return exportCurrentPlaylistM3U();
  if (action === 'edit-smart-playlist') return openSmartPlaylistEditor(appState.smartPlaylists.find(item => item.id === actionNode.dataset.id));
  if (action === 'delete-smart-playlist') return deleteSmartPlaylist(actionNode.dataset.id);
  if (action === 'open-smart-mix') { setView('smart-mix'); return; }
  if (action === 'refresh-local-mix') { localMixRefreshSeed += 1; setView('smart-mix'); toast('Mix lokal diperbarui.'); return; }
});

content.addEventListener('input', event => {
  if (event.target.matches('#now-view-seek-slider')) {
    isSeeking = true;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      $('#now-view-current-time').textContent = formatTime(audio.duration * (Number(event.target.value) / 1000));
    }
  }
});
content.addEventListener('change', event => {
  if (event.target.matches('#track-sort')) {
    appState.sortMode = event.target.value;
    saveAppState();
    renderPage();
    return;
  }
  if (event.target.matches('#now-view-seek-slider')) {
    if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = audio.duration * (Number(event.target.value) / 1000);
    isSeeking = false;
    updateNowPlayingTimeline();
  }
});

content.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.now-up-next-row')) {
    event.preventDefault();
    queuePosition = Number(event.target.dataset.pos);
    playTrackAtQueuePosition();
    renderQueue();
  }
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.album-card')) {
    if (event.target === event.target.closest('.album-card')) {
      event.preventDefault();
      setView('album-detail', event.target.dataset.albumKey);
    }
  }
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.track-row')) {
    event.preventDefault();
    const index = Number(event.target.dataset.idx);
    const indexes = event.target.dataset.listIds ? indexesFromIdList(event.target.dataset.listIds) : allIndexes(currentViewTracks());
    playIndexes(indexes, index);
  }
});

$$('.nav-item').forEach(button => button.addEventListener('click', () => {
  setView(button.dataset.view);
  // The dedicated playback navigation opens the immersive view directly,
  // while the mini-player still offers access to the detailed in-app page.
  if (button.dataset.view === 'now-playing' && activeTrackId) openImmersivePlayer();
}));
playlistNav.addEventListener('click', event => {
  const button = event.target.closest('[data-playlist]');
  if (button) setView('playlist', button.dataset.playlist);
});
smartPlaylistNav.addEventListener('click', event => {
  const button = event.target.closest('[data-smart-playlist]');
  if (button) setView('smart-playlist', button.dataset.smartPlaylist);
});
$('#create-playlist').addEventListener('click', () => createPlaylist());
$('#create-smart-playlist').addEventListener('click', () => openSmartPlaylistEditor());
$('#close-smart-playlist').addEventListener('click', () => smartPlaylistDialog.close());
$('#cancel-smart-playlist').addEventListener('click', () => smartPlaylistDialog.close());
$('#smart-playlist-add-rule').addEventListener('click', () => {
  if (smartPlaylistDraftRules.length >= 20) return toast('Maksimal 20 aturan per playlist pintar.');
  smartPlaylistDraftRules.push(makeSmartRule());
  renderSmartPlaylistRules();
  const lastRow = $('#smart-playlist-rules').querySelector('.smart-rule-row:last-child');
  const last = lastRow?.querySelector('[data-smart-rule-field]');
  last?.focus();
});
$('#smart-playlist-rules').addEventListener('change', event => {
  const row = event.target.closest('[data-rule-index]');
  if (!row) return;
  const index = Number(row.dataset.ruleIndex);
  const rule = smartPlaylistDraftRules[index];
  if (!rule) return;
  if (event.target.matches('[data-smart-rule-field]')) {
    const field = event.target.value;
    const next = normalizeSmartRule({ field, value: SMART_PLAYLIST_FIELDS[field]?.type === 'select' ? SMART_PLAYLIST_FIELDS[field].options[0][0] : '' });
    smartPlaylistDraftRules[index] = next;
    renderSmartPlaylistRules();
  } else if (event.target.matches('[data-smart-rule-operator]')) {
    rule.operator = event.target.value;
    renderSmartPlaylistRules();
  } else if (event.target.matches('[data-smart-rule-value]')) {
    rule.value = event.target.value;
    updateSmartPlaylistPreviewCount();
  }
});
$('#smart-playlist-rules').addEventListener('input', event => {
  const row = event.target.closest('[data-rule-index]');
  if (!row || !event.target.matches('[data-smart-rule-value]')) return;
  const rule = smartPlaylistDraftRules[Number(row.dataset.ruleIndex)];
  if (rule) { rule.value = event.target.value; updateSmartPlaylistPreviewCount(); }
});
$('#smart-playlist-rules').addEventListener('click', event => {
  const button = event.target.closest('[data-smart-rule-remove]');
  if (!button) return;
  smartPlaylistDraftRules.splice(Number(button.dataset.smartRuleRemove), 1);
  renderSmartPlaylistRules();
});
$('#smart-playlist-form').addEventListener('submit', saveSmartPlaylistFromDialog);
$('#smart-playlist-match').addEventListener('change', updateSmartPlaylistPreviewCount);
$('#import-playlist').addEventListener('click', importPlaylistM3U);
$('#autoplay-local').addEventListener('change', event => { appState.autoContinue = Boolean(event.target.checked); saveAppState(); toast(appState.autoContinue ? 'Lanjutkan dengan lagu serupa aktif.' : 'Lanjutkan otomatis dimatikan.'); });
$('#sleep-timer-start').addEventListener('click', startSleepTimer);
$('#import-folder').addEventListener('click', chooseFolder);
$('#rescan-folder').addEventListener('click', rescanFolder);
$('#play-button').addEventListener('click', togglePlayback);
$('#next-button').addEventListener('click', () => nextTrack(true));
$('#previous-button').addEventListener('click', previousTrack);
$('#shuffle-button').addEventListener('click', () => {
  isShuffle = !isShuffle;
  if (isShuffle && playQueue.length > 1 && queuePosition >= 0) {
    const current = playQueue[queuePosition];
    const before = playQueue.slice(0, queuePosition);
    const upcoming = shuffleArray(playQueue.slice(queuePosition + 1));
    playQueue = [...before, current, ...upcoming];
  }
  setShuffleControl($('#shuffle-button'), isShuffle);
  syncImmersivePlaybackState();
  saveAppState();
  syncPlaybackMenuState();
  renderQueue();
  renderPage();
  toast(isShuffle ? 'Mode acak aktif; lagu berikutnya diacak.' : 'Mode acak nonaktif.');
});
$('#repeat-button').addEventListener('click', () => setRepeatMode((repeatMode + 1) % 3));

$('#material-mode').addEventListener('change', event => applyMaterialMode(event.target.value));
window.lumaMusic.onMenuCommand(handleMenuCommand);

$('#now-cover').addEventListener('click', () => setView('now-playing'));
$('#player-now-playing').addEventListener('click', () => setView('now-playing'));
$('#now-favorite').addEventListener('click', () => { if (activeTrackId) toggleFavorite(activeTrackId); });
$('#volume-slider').addEventListener('input', event => {
  appState.volume = Number(event.target.value);
  audio.volume = appState.volume;
  $('#immersive-volume-slider').value = String(appState.volume);
  saveAppState();
});
$('#seek-slider').addEventListener('input', () => {
  isSeeking = true;
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    $('#current-time').textContent = formatTime(audio.duration * (Number($('#seek-slider').value) / 1000));
  }
});
$('#seek-slider').addEventListener('change', () => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = audio.duration * (Number($('#seek-slider').value) / 1000);
  isSeeking = false;
});
audio.addEventListener('timeupdate', () => {
  accumulateListeningTime();
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    if (!isSeeking) $('#seek-slider').value = String(Math.round(audio.currentTime / audio.duration * 1000));
    $('#current-time').textContent = formatTime(audio.currentTime);
    $('#total-time').textContent = formatTime(audio.duration);
  }
  appState.lastTime = audio.currentTime || 0;
  updateNowPlayingTimeline();
  updateImmersiveTimeline();
  syncNowPlayingView();
  syncImmersivePlaybackState();
  syncLyricHighlight();
  if ('mediaSession' in navigator && Number.isFinite(audio.duration) && audio.duration > 0 && navigator.mediaSession.setPositionState) {
    try { navigator.mediaSession.setPositionState({ duration: audio.duration, playbackRate: audio.playbackRate, position: audio.currentTime }); } catch {}
  }
  const bucket = Math.floor(appState.lastTime / 5);
  if (bucket !== lastSavedPositionBucket && activeTrackId) {
    lastSavedPositionBucket = bucket;
    saveAppState();
  }
});
audio.addEventListener('play', () => {
  lastStatsWallClock = Date.now();
  if (activeTrackId && countedPlaybackStartId !== activeTrackId) {
    recordTrackStart(activeTrackId);
    countedPlaybackStartId = activeTrackId;
    if (['recently-played', 'most-played', 'luma-replay', 'smart-mix', 'smart-playlist'].includes(currentView)) renderPage();
  }
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  updateCurrentTrackHighlight();
  syncNowPlayingView();
  syncImmersivePlaybackState();
});
audio.addEventListener('pause', () => {
  accumulateListeningTime(true);
  lastStatsWallClock = 0;
  saveAppState();
  setPlayControl($('#play-button'), true);
  $('#play-button').title = 'Putar';
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  updateCurrentTrackHighlight();
  syncNowPlayingView();
  syncImmersivePlaybackState();
});
audio.addEventListener('ended', () => {
  if (sleepTimerEndOfTrack) {
    sleepTimerEndOfTrack = false;
    audio.pause();
    $('#sleep-timer-status').textContent = 'Timer selesai; pemutaran berhenti.';
    toast('Timer tidur selesai.');
    return;
  }
  if (repeatMode === 2) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } else if (queuePosition >= playQueue.length - 1 && repeatMode !== 1 && appState.autoContinue) {
    if (!maybeAutoContinueLocal()) nextTrack(false);
  } else {
    nextTrack(false);
  }
});
audio.addEventListener('error', () => {
  if (activeTrackId) toast('Format audio ini tidak dapat diputar oleh mesin audio bawaan.');
});
$('#search-input').addEventListener('input', renderPage);
$('#nav-back').addEventListener('click', () => navigateHistory(-1));
$('#nav-forward').addEventListener('click', () => navigateHistory(1));
$('#settings-button').addEventListener('click', () => settingsDialog.showModal());
$('#close-settings').addEventListener('click', () => settingsDialog.close());
$('#settings-import').addEventListener('click', () => { settingsDialog.close(); chooseFolder(); });
$('#forget-library').addEventListener('click', async () => {
  if (!window.confirm('Lepas folder musik dari Luma? File musik asli tidak akan dihapus.')) return;
  try {
    library = hydrateLibrary(await window.lumaMusic.clearLibrary());
    closeImmersivePlayer();
    if (activeTrackId) { audio.pause(); audio.removeAttribute('src'); audio.load(); activeTrackId = null; }
    playQueue = [];
    queuePosition = -1;
    appState.lastTime = 0;
    $('#now-title').textContent = 'Belum ada lagu diputar';
    $('#now-artist').textContent = 'Impor folder musik untuk memulai';
    $('#now-cover').innerHTML = '<span>♫</span>';
    $('#now-favorite').disabled = true;
    $('#play-button').disabled = true;
    setPlayControl($('#play-button'), true);
    appState.lastTrack = null;
    appState.lastTime = 0;
    appState.playHistory = [];
    appState.playCounts = {};
    appState.addedAt = {};
    appState.listenSeconds = {};
    saveAppState();
    settingsDialog.close();
    renderPage();
    toast('Perpustakaan dilepas. File aslimu tetap aman.');
  } catch (error) { toast(error?.message || 'Tidak dapat melepas perpustakaan.'); }
});
$('#queue-button').addEventListener('click', () => { renderQueue(); queueDialog.showModal(); });
$('#close-queue').addEventListener('click', () => queueDialog.close());
$('#clear-queue').addEventListener('click', clearUpcomingQueue);
$('#queue-list').addEventListener('click', event => {
  const action = event.target.closest('[data-action]');
  if (!action) return;
  const position = Number(action.dataset.pos);
  if (action.dataset.action === 'remove-queue-position') {
    event.stopPropagation();
    removeQueuePosition(position);
    return;
  }
  if (action.dataset.action === 'move-queue-position') {
    event.stopPropagation();
    moveQueuePosition(position, Number(action.dataset.direction));
    return;
  }
  if (action.dataset.action === 'play-queue-position') {
    queuePosition = position;
    playTrackAtQueuePosition();
    renderQueue();
  }
});
$('#close-equalizer').addEventListener('click', () => equalizerDialog.close());
$('#equalizer-button').addEventListener('click', () => {
  equalizerDialog.showModal();
  requestAnimationFrame(drawEqualizerCurve);
});
$('#close-lyrics').addEventListener('click', () => lyricsDialog.close());
$('#lyrics-button').addEventListener('click', toggleLyrics);


immersivePlayer.addEventListener('keydown', event => {
  if (event.key !== 'Tab' || immersivePlayer.hidden) return;
  const focusable = [...immersivePlayer.querySelectorAll('button:not(:disabled), input:not(:disabled)')]
    .filter(element => element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

$('#immersive-close').addEventListener('click', closeImmersivePlayer);
$('#immersive-previous').addEventListener('click', previousTrack);
$('#immersive-play').addEventListener('click', togglePlayback);
$('#immersive-next').addEventListener('click', () => nextTrack(true));
$('#immersive-shuffle').addEventListener('click', () => $('#shuffle-button').click());
$('#immersive-repeat').addEventListener('click', () => $('#repeat-button').click());
$('#immersive-favorite').addEventListener('click', () => { if (activeTrackId) toggleFavorite(activeTrackId); });
$('#immersive-lyrics').addEventListener('click', toggleLyrics);
$('#immersive-equalizer').addEventListener('click', () => { equalizerDialog.showModal(); requestAnimationFrame(drawEqualizerCurve); });
$('#immersive-queue').addEventListener('click', () => { renderQueue(); queueDialog.showModal(); });
$('#immersive-seek-slider').addEventListener('input', event => {
  isSeeking = true;
  if (Number.isFinite(audio.duration) && audio.duration > 0) $('#immersive-current-time').textContent = formatTime(audio.duration * (Number(event.target.value) / 1000));
});
$('#immersive-seek-slider').addEventListener('change', event => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = audio.duration * (Number(event.target.value) / 1000);
  isSeeking = false;
  updateImmersiveTimeline();
});
$('#immersive-volume-slider').addEventListener('input', event => {
  appState.volume = Number(event.target.value);
  audio.volume = appState.volume;
  $('#volume-slider').value = String(appState.volume);
  saveAppState();
});

window.addEventListener('keydown', event => {
  const modalOpen = [settingsDialog, queueDialog, equalizerDialog, lyricsDialog].some(dialog => dialog.open);
  if (event.key === 'Escape' && !modalOpen && !immersivePlayer.hidden) {
    event.preventDefault();
    closeImmersivePlayer();
    return;
  }
  if ([settingsDialog, queueDialog, equalizerDialog, lyricsDialog].some(dialog => dialog.open) && event.key !== 'Escape') return;
  if (!modalOpen && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && event.key.toLowerCase() === 'f') {
    if ((!immersivePlayer.hidden) || currentView === 'now-playing') {
      event.preventDefault();
      if (immersivePlayer.hidden) openImmersivePlayer();
      else closeImmersivePlayer();
      return;
    }
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
  } else if (event.code === 'Space' && !['INPUT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement.tagName) && !settingsDialog.open && !queueDialog.open && !equalizerDialog.open && !lyricsDialog.open) {
    event.preventDefault();
    togglePlayback();
  } else if (event.key === 'ArrowRight' && event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    nextTrack(true);
  } else if (event.key === 'ArrowLeft' && event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    previousTrack();
  } else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !event.ctrlKey && !event.altKey && !event.metaKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    if (activeTrackId && Number.isFinite(audio.duration)) { event.preventDefault(); audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + (event.key === 'ArrowRight' ? 5 : -5))); }
  } else if (event.key.toLowerCase() === 'm' && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    appState.volume = appState.volume > 0 ? 0 : 0.78;
    audio.volume = appState.volume;
    $('#volume-slider').value = String(appState.volume);
    $('#immersive-volume-slider').value = String(appState.volume);
    saveAppState();
  } else if (!event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement.tagName) && !settingsDialog.open && !queueDialog.open && !equalizerDialog.open && !lyricsDialog.open) {
    if (event.key.toLowerCase() === 'l') { event.preventDefault(); toggleLyrics(); }
    else if (event.key.toLowerCase() === 'e') { event.preventDefault(); equalizerDialog.showModal(); requestAnimationFrame(drawEqualizerCurve); }
    else if (event.key.toLowerCase() === 'q') { event.preventDefault(); renderQueue(); queueDialog.showModal(); }
  }
});

const trackContextMenu = $('#track-context-menu');
let contextTrackId = null;
function closeTrackContextMenu() {
  trackContextMenu.hidden = true;
  contextTrackId = null;
}
function openTrackContextMenu(track, x, y) {
  if (!track) return;
  contextTrackId = track.id;
  $('#context-track-label').textContent = track.title;
  const fav = trackContextMenu.querySelector('[data-context-action="favorite"]');
  fav.textContent = isFavorite(track.id) ? 'Hapus dari favorit' : 'Tambah ke favorit';
  trackContextMenu.hidden = false;
  const width = trackContextMenu.offsetWidth || 230;
  const height = trackContextMenu.offsetHeight || 230;
  trackContextMenu.style.left = `${Math.min(x, window.innerWidth - width - 10)}px`;
  trackContextMenu.style.top = `${Math.min(y, window.innerHeight - height - 10)}px`;
  trackContextMenu.querySelector('button')?.focus();
}
content.addEventListener('contextmenu', event => {
  const row = event.target.closest('.track-row');
  if (!row) return;
  const track = getTrackById(row.dataset.trackId);
  if (!track) return;
  event.preventDefault();
  openTrackContextMenu(track, event.clientX, event.clientY);
});
trackContextMenu.addEventListener('click', event => {
  const button = event.target.closest('[data-context-action]');
  if (!button || !contextTrackId) return;
  const track = getTrackById(contextTrackId);
  if (!track) return closeTrackContextMenu();
  const action = button.dataset.contextAction;
  const index = library.tracks.findIndex(item => item.id === track.id);
  closeTrackContextMenu();
  if (action === 'play-now') {
    const indexes = allIndexes(currentViewTracks());
    if (!indexes.includes(index)) indexes.push(index);
    return playIndexes(indexes, index);
  }
  if (action === 'play-next') return addTrackToQueue(index, true);
  if (action === 'add-queue') return addTrackToQueue(index, false);
  if (action === 'playlist') return addTrackToPlaylist(track.id);
  if (action === 'favorite') return toggleFavorite(track.id);
});
document.addEventListener('pointerdown', event => {
  if (!trackContextMenu.hidden && !trackContextMenu.contains(event.target)) closeTrackContextMenu();
});
content.addEventListener('scroll', closeTrackContextMenu, { passive: true });

scanUnsubscribe = window.lumaMusic.onScanProgress(progress => {
  const label = $('#scan-progress');
  if (!label) return;
  if (progress.phase === 'discover') label.textContent = 'Mencari file audio di folder…';
  else if (progress.total) label.textContent = `${progress.completed} dari ${progress.total} file diperiksa${progress.reused ? ` · ${progress.reused} cache` : ''}…`;
  else label.textContent = 'Menyiapkan pemindaian…';
});

async function init() {
  audio.volume = appState.volume;
  $('#volume-slider').value = String(appState.volume);
  $('#autoplay-local').checked = appState.autoContinue;
  setShuffleControl($('#shuffle-button'), isShuffle);
  setRepeatControl($('#repeat-button'), repeatMode);
  applyMaterialMode(appState.material, false);
  syncPlaybackMenuState();
  initializeEqualizer();
  try {
    library = hydrateLibrary(await window.lumaMusic.loadLibrary());
    // Version 0.1 stored native paths as track IDs. Migrate favorites,
    // playlist membership and the last position without exposing paths again.
    const storedIds = [
      ...appState.favorites,
      ...appState.playlists.flatMap(playlist => playlist.ids),
      ...(appState.lastTrack ? [appState.lastTrack] : [])
    ];
    if (storedIds.length) {
      const migrated = await window.lumaMusic.migrateTrackIds(storedIds);
      const idMap = new Map(storedIds.map((id, index) => [id, migrated[index]]));
      appState.favorites = [...new Set(appState.favorites.map(id => idMap.get(id) || id))];
      appState.playlists = appState.playlists.map(playlist => ({ ...playlist, ids: [...new Set(playlist.ids.map(id => idMap.get(id) || id))] }));
      if (appState.lastTrack) appState.lastTrack = idMap.get(appState.lastTrack) || appState.lastTrack;
      saveAppState();
    }
  } catch {
    library = { folder: null, tracks: [], scannedAt: null };
  }
  ensureAddedAtForLibrary();
  renderPage();
  if (appState.lastTrack && library.tracks.some(track => track.id === appState.lastTrack)) {
    // Restore selection only; do not autoplay unexpectedly.
    const track = getTrackById(appState.lastTrack);
    $('#now-title').textContent = track.title;
    $('#now-artist').textContent = `${track.artist} · ${track.album}`;
    $('#now-cover').innerHTML = track.cover ? `<img src="${escapeHtml(track.cover)}" alt="">` : '<span>♫</span>';
    $('#now-cover').classList.toggle('cover-placeholder', !track.cover);
    $('#now-favorite').disabled = false;
    activeTrackId = track.id;
    updateMediaSession(track);
    const lastIndex = library.tracks.findIndex(item => item.id === track.id);
    playQueue = library.tracks.map((_item, index) => index);
    queuePosition = playQueue.indexOf(lastIndex);
    audio.src = track.src;
    audio.addEventListener('loadedmetadata', () => {
      if (appState.lastTime > 0 && appState.lastTime < audio.duration) audio.currentTime = appState.lastTime;
      $('#total-time').textContent = formatTime(audio.duration);
    }, { once: true });
    $('#play-button').disabled = false;
    setPlayControl($('#play-button'), true);
    updateNowFavorite();
    renderPage();
  }
}

init();
