import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, screen } from 'electron';
import fs from 'node:fs/promises';
import fsNative from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseFile } from 'music-metadata';

// Register the media origin before Electron becomes ready. The renderer never
// receives arbitrary filesystem access; it can only request scanned track IDs.
protocol.registerSchemesAsPrivileged([{
  scheme: 'luma-audio',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true }
}]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.flac', '.wav', '.ogg', '.opus', '.m4a', '.aac', '.aiff', '.aif', '.webm'
]);
const MAX_ART_BYTES = 160 * 1024;
const MAX_LYRICS_BYTES = 2 * 1024 * 1024;
const audioFiles = new Map();
let mainWindow;
let appMenu = null;
let scanInProgress = false;

function cachePath() {
  return path.join(app.getPath('userData'), 'library-cache.json');
}

function stableTrackId(filePath) {
  return createHash('sha256').update(path.resolve(filePath)).digest('hex').slice(0, 32);
}

function isInside(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function assertTrustedSender(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error('Permintaan ditolak: sumber tidak dikenal.');
  }
}

function emptyCache() {
  return { folder: null, tracks: [], covers: {}, scannedAt: null };
}

async function readCache() {
  try {
    const raw = await fs.readFile(cachePath(), 'utf8');
    const data = JSON.parse(raw);
    const folder = typeof data.folder === 'string' ? data.folder : null;
    const covers = data.covers && typeof data.covers === 'object' && !Array.isArray(data.covers) ? data.covers : {};
    const tracks = Array.isArray(data.tracks) ? data.tracks
      .filter(track => track && typeof track === 'object' && typeof (track.path || track.id) === 'string')
      .map(track => {
        const nativePath = typeof track.path === 'string' ? path.resolve(track.path) : path.resolve(track.id);
        const id = stableTrackId(nativePath);
        return { ...track, id, path: nativePath, src: `luma-audio://track/${id}` };
      }) : [];
    return {
      folder,
      tracks,
      covers,
      scannedAt: typeof data.scannedAt === 'string' ? data.scannedAt : null
    };
  } catch {
    return emptyCache();
  }
}

async function writeCache(data) {
  const file = cachePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, JSON.stringify(data), 'utf8');
  await fs.rename(temp, file);
}

function publicLibrary(data) {
  return {
    folder: data.folder,
    scannedAt: data.scannedAt,
    covers: data.covers,
    tracks: data.tracks.map(({ path: _path, ...track }) => track)
  };
}

function registerAudioFiles(data) {
  audioFiles.clear();
  if (!data.folder) return;
  for (const track of data.tracks) {
    if (typeof track.path !== 'string' || !isInside(data.folder, track.path)) continue;
    if (!AUDIO_EXTENSIONS.has(path.extname(track.path).toLowerCase())) continue;
    audioFiles.set(track.id, track.path);
  }
}

async function collectAudioFiles(root, sender) {
  const found = [];
  const pending = [root];
  let visited = 0;
  while (pending.length) {
    const current = pending.pop();
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) found.push(fullPath);
    }
    visited += 1;
    if (sender && !sender.isDestroyed() && visited % 12 === 0) {
      sender.send('library:progress', { phase: 'discover', completed: visited, total: null });
    }
  }
  return found.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function cleanText(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/[\u0000-\u001f]/g, '').trim();
  return normalized || fallback;
}

function firstString(value) {
  if (Array.isArray(value)) return value.find(item => typeof item === 'string' && item.trim()) || '';
  return typeof value === 'string' ? value : '';
}

async function buildTrack(filePath, cachedTrack = null, cachedCover = null) {
  const stat = await fs.stat(filePath);
  const id = stableTrackId(filePath);
  if (cachedTrack && cachedTrack.size === stat.size && cachedTrack.mtimeMs === stat.mtimeMs) {
    const artist = cleanText(cachedTrack.artist, 'Unknown Artist');
    return {
      ...cachedTrack,
      id,
      path: filePath,
      src: `luma-audio://track/${id}`,
      artist,
      albumArtist: cleanText(cachedTrack.albumArtist, artist),
      album: cleanText(cachedTrack.album, 'Unknown Album'),
      genre: cleanText(cachedTrack.genre, ''),
      composer: cleanText(cachedTrack.composer, ''),
      sampleRate: Number(cachedTrack.sampleRate) || null,
      bitsPerSample: Number(cachedTrack.bitsPerSample) || null,
      cover: cachedCover || null
    };
  }

  const name = path.basename(filePath, path.extname(filePath));
  let tags = {};
  let format = {};
  let cover = null;
  try {
    const metadata = await parseFile(filePath, { duration: true, skipCovers: false });
    tags = metadata.common ?? {};
    format = metadata.format ?? {};
    const picture = Array.isArray(tags.picture) ? tags.picture[0] : null;
    if (picture?.data && picture.data.length <= MAX_ART_BYTES && picture.format) {
      cover = `data:${picture.format};base64,${Buffer.from(picture.data).toString('base64')}`;
    }
  } catch {
    // A playable audio file remains in the library even if its tags are malformed.
  }

  const artist = Array.isArray(tags.artists) && tags.artists.length
    ? tags.artists.join(', ')
    : cleanText(tags.artist, 'Unknown Artist');
  const trackNo = Number(tags.track?.no) || 0;
  const discNo = Number(tags.disk?.no) || 0;
  const sampleRate = Number(format.sampleRate) || null;
  const bitsPerSample = Number(format.bitsPerSample) || null;
  const bitrate = Number.isFinite(format.bitrate) ? format.bitrate : null;

  return {
    id,
    path: filePath,
    src: `luma-audio://track/${id}`,
    title: cleanText(tags.title, name),
    artist: cleanText(artist, 'Unknown Artist'),
    albumArtist: cleanText(tags.albumartist, cleanText(artist, 'Unknown Artist')),
    album: cleanText(tags.album, 'Unknown Album'),
    genre: firstString(tags.genre),
    composer: firstString(tags.composer),
    year: Number(tags.year) || null,
    trackNo,
    discNo,
    duration: Number.isFinite(format.duration) ? format.duration : 0,
    bitrate,
    sampleRate,
    bitsPerSample,
    lossless: typeof format.lossless === 'boolean' ? format.lossless : null,
    ext: path.extname(filePath).slice(1).toUpperCase(),
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    cover
  };
}

async function scanFolder(root, sender) {
  if (scanInProgress) throw new Error('Pemindaian perpustakaan sedang berjalan.');
  scanInProgress = true;
  try {
    const absoluteRoot = path.resolve(root);
    const rootStat = await fs.stat(absoluteRoot);
    if (!rootStat.isDirectory()) throw new Error('Lokasi musik bukan folder yang valid.');

    const previous = await readCache();
    const canReuse = previous.folder && path.resolve(previous.folder) === absoluteRoot;
    const oldByPath = new Map(canReuse ? previous.tracks.map(track => [path.resolve(track.path), track]) : []);
    const oldCovers = canReuse ? previous.covers : {};
    if (sender && !sender.isDestroyed()) sender.send('library:progress', { phase: 'discover', completed: 0, total: null });

    const files = await collectAudioFiles(absoluteRoot, sender);
    const tracks = new Array(files.length);
    let cursor = 0;
    let completed = 0;
    let reused = 0;
    const workers = Array.from({ length: Math.min(4, Math.max(1, files.length)) }, async () => {
      while (cursor < files.length) {
        const index = cursor++;
        const file = files[index];
        const old = oldByPath.get(path.resolve(file));
        try {
          const candidate = await buildTrack(file, old, old?.coverId ? oldCovers[old.coverId] : null);
          if (old && old.size === candidate.size && old.mtimeMs === candidate.mtimeMs) reused += 1;
          tracks[index] = candidate;
        } catch {
          tracks[index] = null;
        }
        completed += 1;
        if (sender && !sender.isDestroyed()) {
          sender.send('library:progress', { phase: 'read', completed, total: files.length, reused });
        }
      }
    });
    await Promise.all(workers);

    const cleanTracks = tracks.filter(Boolean).sort((a, b) => {
      const artistCompare = a.albumArtist.localeCompare(b.albumArtist, undefined, { sensitivity: 'base' });
      if (artistCompare) return artistCompare;
      const albumCompare = a.album.localeCompare(b.album, undefined, { sensitivity: 'base' });
      if (albumCompare) return albumCompare;
      return (a.discNo - b.discNo) || (a.trackNo - b.trackNo) || a.title.localeCompare(b.title);
    });

    // Artwork is content-addressed so hundreds of tracks in one album do not
    // duplicate the same base64 image in the library cache.
    const covers = {};
    for (const track of cleanTracks) {
      if (!track.cover) { track.coverId = null; continue; }
      const coverId = createHash('sha256').update(track.cover).digest('hex').slice(0, 24);
      covers[coverId] = track.cover;
      track.coverId = coverId;
      delete track.cover;
    }

    const payload = { folder: absoluteRoot, tracks: cleanTracks, covers, scannedAt: new Date().toISOString() };
    await writeCache(payload);
    registerAudioFiles(payload);
    if (sender && !sender.isDestroyed()) sender.send('library:progress', { phase: 'done', completed: files.length, total: files.length, reused });
    return payload;
  } finally {
    scanInProgress = false;
  }
}

function mimeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return ({
    '.mp3': 'audio/mpeg', '.flac': 'audio/flac', '.wav': 'audio/wav',
    '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.m4a': 'audio/mp4',
    '.aac': 'audio/aac', '.aiff': 'audio/aiff', '.aif': 'audio/aiff',
    '.webm': 'audio/webm'
  })[extension] || 'application/octet-stream';
}

function parseRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return { invalid: true };
  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!suffixLength) return { invalid: true };
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return { invalid: true };
  return { start, end: Math.min(end, size - 1) };
}

async function serveAudio(request) {
  const url = new URL(request.url);
  if (url.hostname !== 'track') return new Response('Not found', { status: 404 });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Allow-Headers': 'Range' } });
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
  const id = url.pathname.replace(/^\//, '');
  const filePath = audioFiles.get(id);
  if (!filePath) return new Response('Not found', { status: 404 });

  let stat;
  try {
    stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error('Not a file');
  } catch {
    return new Response('Audio file is unavailable', { status: 404 });
  }

  const range = parseRange(request.headers.get('range'), stat.size);
  if (range?.invalid) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}`, 'Accept-Ranges': 'bytes' } });
  }
  const start = range?.start ?? 0;
  const end = range?.end ?? Math.max(0, stat.size - 1);
  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Length, Content-Range',
    'Cache-Control': 'private, max-age=3600',
    'Content-Type': mimeFor(filePath),
    'Content-Length': String(Math.max(0, end - start + 1)),
    'X-Content-Type-Options': 'nosniff'
  });
  if (range) headers.set('Content-Range', `bytes ${start}-${end}/${stat.size}`);
  if (request.method === 'HEAD' || stat.size === 0) {
    return new Response(null, { status: range ? 206 : 200, headers });
  }
  const stream = fsNative.createReadStream(filePath, { start, end });
  stream.on('error', () => {});
  return new Response(Readable.toWeb(stream), { status: range ? 206 : 200, headers });
}

async function loadAdjacentLyrics(trackId) {
  if (typeof trackId !== 'string' || !/^[a-f0-9]{32}$/.test(trackId)) return { lyrics: null, synced: false };
  const data = await readCache();
  const track = data.tracks.find(item => item.id === trackId);
  if (!track?.path || !data.folder || !isInside(data.folder, track.path)) return { lyrics: null, synced: false };
  const lrcPath = path.join(path.dirname(track.path), `${path.basename(track.path, path.extname(track.path))}.lrc`);
  if (!isInside(data.folder, lrcPath)) return { lyrics: null, synced: false };
  try {
    const stat = await fs.stat(lrcPath);
    if (!stat.isFile() || stat.size > MAX_LYRICS_BYTES) return { lyrics: null, synced: false };
    return { lyrics: await fs.readFile(lrcPath, 'utf8'), synced: true, filename: path.basename(lrcPath) };
  } catch {
    return { lyrics: null, synced: false };
  }
}


function sendMenuCommand(command) {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return;
  mainWindow.webContents.send('menu:command', command);
}

function syncNativePlaybackMenu(state = {}) {
  if (!appMenu) return;
  const shuffle = appMenu.getMenuItemById('playback-shuffle');
  if (shuffle) shuffle.checked = Boolean(state.shuffle);
  const repeatMode = Number.isInteger(state.repeatMode) ? Math.max(0, Math.min(2, state.repeatMode)) : 0;
  for (const [id, value] of [['repeat-off', 0], ['repeat-all', 1], ['repeat-one', 2]]) {
    const item = appMenu.getMenuItemById(id);
    if (item) item.checked = repeatMode === value;
  }
}

function installApplicationMenu() {
  const template = [
    {
      label: 'Berkas',
      submenu: [
        { label: 'Tambah Folder Musik…', accelerator: 'CmdOrCtrl+O', click: () => sendMenuCommand('choose-folder') },
        { label: 'Pindai Ulang Perpustakaan', accelerator: 'F5', click: () => sendMenuCommand('rescan-library') },
        { type: 'separator' },
        { label: 'Pengaturan…', click: () => sendMenuCommand('open-settings') },
        { type: 'separator' },
        { role: 'quit', label: 'Keluar dari Luma Music' }
      ]
    },
    {
      label: 'Pemutaran',
      submenu: [
        { label: 'Putar / Jeda', id: 'playback-toggle', click: () => sendMenuCommand('toggle-playback') },
        { label: 'Lagu Sebelumnya', click: () => sendMenuCommand('previous-track') },
        { label: 'Lagu Berikutnya', click: () => sendMenuCommand('next-track') },
        { type: 'separator' },
        { label: 'Mundur 10 Detik', accelerator: 'Ctrl+Left', click: () => sendMenuCommand('seek-back') },
        { label: 'Maju 10 Detik', accelerator: 'Ctrl+Right', click: () => sendMenuCommand('seek-forward') },
        { type: 'separator' },
        { label: 'Volume Turun', accelerator: 'Ctrl+Down', click: () => sendMenuCommand('volume-down') },
        { label: 'Volume Naik', accelerator: 'Ctrl+Up', click: () => sendMenuCommand('volume-up') },
        { type: 'separator' },
        { label: 'Acak', id: 'playback-shuffle', type: 'checkbox', checked: false, click: () => sendMenuCommand('toggle-shuffle') },
        { type: 'separator' },
        { label: 'Ulangi: Mati', id: 'repeat-off', type: 'radio', checked: true, click: () => sendMenuCommand('repeat-mode:0') },
        { label: 'Ulangi Antrean', id: 'repeat-all', type: 'radio', checked: false, click: () => sendMenuCommand('repeat-mode:1') },
        { label: 'Ulangi Satu Lagu', id: 'repeat-one', type: 'radio', checked: false, click: () => sendMenuCommand('repeat-mode:2') },
        { type: 'separator' },
        { label: 'Tampilkan Antrean', accelerator: 'CmdOrCtrl+Shift+Q', click: () => sendMenuCommand('show-queue') },
        { label: 'Tampilkan Lirik Lokal', accelerator: 'CmdOrCtrl+Shift+L', click: () => sendMenuCommand('show-lyrics') },
        { label: 'Equalizer…', accelerator: 'CmdOrCtrl+Shift+E', click: () => sendMenuCommand('show-equalizer') }
      ]
    },
    {
      label: 'Navigasi',
      submenu: [
        { label: 'Sedang Diputar', accelerator: 'CmdOrCtrl+6', click: () => sendMenuCommand('view:now-playing') },
        { label: 'Beranda', accelerator: 'CmdOrCtrl+1', click: () => sendMenuCommand('view:home') },
        { label: 'Semua Lagu', accelerator: 'CmdOrCtrl+2', click: () => sendMenuCommand('view:songs') },
        { label: 'Album', accelerator: 'CmdOrCtrl+3', click: () => sendMenuCommand('view:albums') },
        { label: 'Artis', accelerator: 'CmdOrCtrl+4', click: () => sendMenuCommand('view:artists') },
        { label: 'Favorit', accelerator: 'CmdOrCtrl+5', click: () => sendMenuCommand('view:favorites') },
        { type: 'separator' },
        { label: 'Cari…', accelerator: 'CmdOrCtrl+K', click: () => sendMenuCommand('focus-search') },
        { label: 'Kembali', accelerator: 'Alt+[' , click: () => sendMenuCommand('navigate-back') },
        { label: 'Maju', accelerator: 'Alt+]', click: () => sendMenuCommand('navigate-forward') }
      ]
    },
    {
      label: 'Perpustakaan',
      submenu: [
        { label: 'Playlist Baru…', accelerator: 'CmdOrCtrl+Shift+N', click: () => sendMenuCommand('create-playlist') },
        { label: 'Putar Semua Lagu', click: () => sendMenuCommand('play-library') },
        { label: 'Kosongkan Antrean Berikutnya', click: () => sendMenuCommand('clear-upcoming-queue') }
      ]
    },
    {
      label: 'Tampilan',
      submenu: [
        { label: 'Alihkan Glass / Solid', click: () => sendMenuCommand('toggle-material') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Layar Penuh' },
        { role: 'resetZoom', label: 'Ukuran Tampilan Normal' },
        { role: 'zoomIn', label: 'Perbesar Antarmuka' },
        { role: 'zoomOut', label: 'Perkecil Antarmuka' }
      ]
    },
    {
      label: 'Bantuan',
      submenu: [
        { label: 'Pintasan Keyboard', click: () => sendMenuCommand('show-shortcuts') },
        { label: 'Tentang Luma Music', click: () => sendMenuCommand('show-about') }
      ]
    }
  ];
  appMenu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(appMenu);
  syncNativePlaybackMenu();
}

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const minWidth = Math.min(900, Math.max(680, workArea.width - 40));
  const minHeight = Math.min(620, Math.max(480, workArea.height - 40));
  mainWindow = new BrowserWindow({
    width: Math.min(1360, Math.max(minWidth, workArea.width - 32)),
    height: Math.min(880, Math.max(minHeight, workArea.height - 32)),
    minWidth,
    minHeight,
    show: false,
    backgroundColor: '#101014',
    title: 'Luma Music',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  const pageUrl = pathToFileURL(path.join(__dirname, 'index.html')).href;
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== pageUrl) event.preventDefault();
  });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('library:load', async event => {
  assertTrustedSender(event);
  const data = await readCache();
  registerAudioFiles(data);
  return publicLibrary(data);
});

ipcMain.handle('library:choose-folder', async event => {
  assertTrustedSender(event);
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Pilih folder musik',
    buttonLabel: 'Pilih folder',
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const data = await scanFolder(result.filePaths[0], event.sender);
  return publicLibrary(data);
});

ipcMain.handle('library:rescan', async event => {
  assertTrustedSender(event);
  const cached = await readCache();
  if (!cached.folder) throw new Error('Belum ada folder musik yang dipilih.');
  const data = await scanFolder(cached.folder, event.sender);
  return publicLibrary(data);
});

ipcMain.handle('library:clear', async event => {
  assertTrustedSender(event);
  await fs.rm(cachePath(), { force: true });
  audioFiles.clear();
  return emptyCache();
});

ipcMain.handle('library:migrate-track-ids', async (event, ids) => {
  assertTrustedSender(event);
  if (!Array.isArray(ids)) return [];
  const data = await readCache();
  const aliases = new Map();
  for (const track of data.tracks) {
    aliases.set(track.id, track.id);
    aliases.set(track.path, track.id);
  }
  return ids.slice(0, 50000).map(id => typeof id === 'string' ? (aliases.get(id) || id) : id);
});

ipcMain.handle('lyrics:load-adjacent', async (event, trackId) => {
  assertTrustedSender(event);
  return loadAdjacentLyrics(trackId);
});

ipcMain.on('menu:playback-state', (event, state) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) return;
  syncNativePlaybackMenu(state && typeof state === 'object' ? state : {});
});

app.whenReady().then(() => {
  protocol.handle('luma-audio', serveAudio);
  installApplicationMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
