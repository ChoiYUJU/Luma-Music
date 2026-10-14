const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lumaMusic', Object.freeze({
  loadLibrary: () => ipcRenderer.invoke('library:load'),
  chooseFolder: () => ipcRenderer.invoke('library:choose-folder'),
  rescanLibrary: () => ipcRenderer.invoke('library:rescan'),
  clearLibrary: () => ipcRenderer.invoke('library:clear'),
  migrateTrackIds: (ids) => ipcRenderer.invoke('library:migrate-track-ids', ids),
  loadAdjacentLyrics: (trackId) => ipcRenderer.invoke('lyrics:load-adjacent', trackId),
  importPlaylistM3U: () => ipcRenderer.invoke('playlist:import-m3u'),
  exportPlaylistM3U: (playlist) => ipcRenderer.invoke('playlist:export-m3u', playlist),
  exportAppBackup: (backup) => ipcRenderer.invoke('appdata:export-backup', backup),
  importAppBackup: () => ipcRenderer.invoke('appdata:import-backup'),
  setFullscreen: (enabled) => ipcRenderer.invoke('window:set-fullscreen', Boolean(enabled)),
  setPlaybackMenuState: (state) => ipcRenderer.send('menu:playback-state', state),
  onMenuCommand: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('menu:command', listener);
    return () => ipcRenderer.removeListener('menu:command', listener);
  },
  onScanProgress: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('library:progress', listener);
    return () => ipcRenderer.removeListener('library:progress', listener);
  }
}));
