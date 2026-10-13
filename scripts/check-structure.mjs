import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');
const renderer = fs.readFileSync(new URL('../src/renderer.js', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../src/main.mjs', import.meta.url), 'utf8');
const preload = fs.readFileSync(new URL('../src/preload.cjs', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const css = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
assert.match(renderer, /function renderAlbumDetail\(/, 'Album detail page is missing.');
assert.match(renderer, /function renderArtistDetail\(/, 'Artist detail page is missing.');
assert.match(renderer, /data-action=\"queue-album\"/, 'Queue album action is missing.');
assert.match(renderer, /data-list-ids=\"\$\{listIds\}\"/, 'Track list should preserve its visible play order.');
for (const selector of ['.album-detail-hero', '.artist-detail-hero', '.detail-artwork', '.artist-detail-avatar']) {
  assert.ok(css.includes(selector), `Missing styling for ${selector}.`);
}
assert.match(css, /backdrop-filter:\s*blur\(/, 'Glass material style is missing.');
assert.match(css, /body\[data-material=\"solid\"\]/, 'Solid low-resource material mode is missing.');
assert.match(css, /\.local-mix-hero/, 'Local mix visual system is missing.');
assert.match(css, /\.replay-grid/, 'Luma Replay stats styling is missing.');


const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
assert.deepEqual(duplicates, [], `Duplicate HTML IDs: ${duplicates.join(', ')}`);

const idSet = new Set(ids);
const directSelectors = [...renderer.matchAll(/\$\('#([^']+)'\)/g)].map(match => match[1]);
const dynamicIds = new Set(['scan-progress', 'now-view-play', 'now-view-current-time', 'now-view-total-time', 'now-view-seek-slider']);
const missing = [...new Set(directSelectors)].filter(id => !idSet.has(id) && !dynamicIds.has(id));
assert.deepEqual(missing, [], `JS selectors missing from HTML: ${missing.join(', ')}`);

assert.match(html, /connect-src 'none'/, 'Renderer should not have general network access.');
assert.match(html, /media-src[^;]*luma-audio:/, 'Local audio protocol must be permitted by the CSP.');
assert.doesNotMatch(html, /https?:\/\//, 'The app UI should not load remote URLs.');
assert.match(main, /registerSchemesAsPrivileged/, 'Custom audio scheme must be registered with explicit privileges.');
assert.match(main, /protocol\.handle\('luma-audio'/, 'Custom local audio protocol handler is missing.');
assert.match(main, /Access-Control-Allow-Origin/, 'Web Audio CORS response headers are missing.');
assert.match(preload, /contextBridge\.exposeInMainWorld/, 'Preload bridge is missing.');
assert.match(preload, /loadAdjacentLyrics/, 'Local lyrics API is missing.');
assert.match(preload, /importPlaylistM3U/, 'M3U import bridge is missing.');
assert.match(preload, /exportPlaylistM3U/, 'M3U export bridge is missing.');
assert.match(main, /playlist:import-m3u/, 'M3U import handler is missing.');
assert.match(main, /playlist:export-m3u/, 'M3U export handler is missing.');
assert.match(renderer, /function renderLocalMix/, 'Local smart mix page is missing.');
assert.match(renderer, /function renderLumaReplay/, 'Luma Replay page is missing.');
assert.match(renderer, /function smartPlaylistTracks/, 'Rule-based smart playlists are missing.');
assert.match(renderer, /function openSmartPlaylistEditor/, 'Smart playlist editor is missing.');
assert.match(renderer, /function saveSmartPlaylistFromDialog/, 'Smart playlist save handler is missing.');
assert.match(html, /id="smart-playlist-dialog"/, 'Smart playlist dialog is missing.');
assert.match(html, /id="smart-playlist-rules"/, 'Smart playlist rules host is missing.');
assert.match(html, /id="smart-playlist-nav"/, 'Smart playlist sidebar is missing.');
assert.match(main, /create-smart-playlist/, 'Native menu command for smart playlists is missing.');
assert.match(css, /\.smart-rule-row\s*\{/, 'Smart playlist rules need styling.');
assert.match(renderer, /function startSleepTimer/, 'Sleep timer is missing.');
assert.match(renderer, /function sortedTracks/, 'Library sorting is missing.');
assert.match(main, /label: 'Pemutaran'/, 'Native playback menu is missing.');
assert.match(main, /view:now-playing/, 'Desktop navigation command for Now Playing is missing.');
assert.match(preload, /onMenuCommand/, 'Native menu command bridge is missing.');
assert.match(preload, /setFullscreen:\s*\(enabled\)\s*=>\s*ipcRenderer\.invoke\('window:set-fullscreen'/, 'Fullscreen IPC is missing from preload.');
assert.match(main, /ipcMain\.handle\('window:set-fullscreen'/, 'Fullscreen IPC handler is missing from main process.');
assert.match(main, /assertTrustedSender\(event\)[\s\S]*?mainWindow\.setFullScreen\(enabled\)/, 'Fullscreen handler should validate the sender before changing the window.');

assert.match(html, /id="track-context-menu"/, 'Track context menu is missing.');
assert.match(html, /data-view="now-playing"/, 'Sidebar Now Playing navigation is missing.');
assert.match(renderer, /function renderNowPlaying\(/, 'Now Playing page is missing.');
assert.match(renderer, /function addTrackToQueue/, 'Queue append/priority actions are missing.');
assert.match(renderer, /function moveQueuePosition\(/, 'Queue reordering function is missing.');
assert.match(renderer, /data-action=\"move-queue-position\"/, 'Queue move controls are missing.');
assert.match(renderer, /const canMoveDown = pos < playQueue\.length - 1 && \(queuePosition < 0 \|\| pos > queuePosition\)/, 'The active queue item should not offer a misleading move-down control.');
assert.match(renderer, /position <= queuePosition \|\| target <= queuePosition/, 'Queue reorder must not move tracks across the active position.');
assert.match(renderer, /function moveQueuePosition\(/, 'Queue reordering function is missing.');
assert.match(renderer, /data-action=\"move-queue-position\"/, 'Queue move controls are missing.');
assert.match(renderer, /position <= queuePosition \|\| target <= queuePosition/, 'Queue reorder must not move tracks across the active position.');
assert.match(renderer, /function applyMaterialMode/, 'Glass/solid material setting is missing.');
assert.equal(pkg.version, '2.0.0', 'Unexpected package version.');
assert.ok(Number.parseInt(pkg.engines.node.replace(/[^0-9]/g, ''), 10) >= 22, 'Node.js 22+ is required for the build environment.');

assert.match(html, /id="immersive-player"/, 'Immersive Now Playing overlay is missing.');
for (const id of ['immersive-close', 'immersive-cover-image', 'immersive-backdrop-image', 'immersive-play', 'immersive-seek-slider', 'immersive-volume-slider']) {
  assert.ok(idSet.has(id), `Missing immersive player control: ${id}.`);
}
assert.match(renderer, /function openImmersivePlayer\(/, 'Immersive player open function is missing.');
assert.match(renderer, /function closeImmersivePlayer\(/, 'Immersive player close function is missing.');
assert.match(renderer, /event\.key === 'Escape'.*immersivePlayer/s, 'Escape shortcut should close immersive player.');
assert.match(css, /\.immersive-player\s*\{/, 'Immersive player visual layer is missing.');
assert.match(css, /\.control-icon\s*\{/, 'Unified playback SVG icon styling is missing.');
for (const id of ['shuffle-button', 'previous-button', 'play-button', 'next-button', 'repeat-button', 'immersive-shuffle', 'immersive-previous', 'immersive-play', 'immersive-next', 'immersive-repeat']) {
  const idPosition = html.indexOf(`id="${id}"`);
  const buttonStart = html.lastIndexOf('<button', idPosition);
  const buttonEnd = html.indexOf('</button>', idPosition);
  const buttonMarkup = buttonStart >= 0 && buttonEnd >= 0 ? html.slice(buttonStart, buttonEnd) : '';
  assert.ok(buttonMarkup.includes('<svg') && buttonMarkup.includes('class="control-icon"'), `Playback control ${id} should use a local SVG icon.`);
}
assert.match(renderer, /function setPlayControl\(/, 'Shared play/pause icon state helper is missing.');
assert.match(renderer, /function setShuffleControl\(/, 'Shuffle state helper is missing.');
assert.match(renderer, /function setRepeatControl\(/, 'Repeat state helper is missing.');

console.log(`Structure check passed: ${ids.length} unique HTML IDs, ${new Set(directSelectors).size} static selectors, Luma Music ${pkg.version}.`);
