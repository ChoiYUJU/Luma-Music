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
assert.match(main, /label: 'Pemutaran'/, 'Native playback menu is missing.');
assert.match(main, /view:now-playing/, 'Desktop navigation command for Now Playing is missing.');
assert.match(preload, /onMenuCommand/, 'Native menu command bridge is missing.');
assert.match(html, /id="track-context-menu"/, 'Track context menu is missing.');
assert.match(html, /data-view="now-playing"/, 'Sidebar Now Playing navigation is missing.');
assert.match(renderer, /function renderNowPlaying\(/, 'Now Playing page is missing.');
assert.match(renderer, /function addTrackToQueue/, 'Queue append/priority actions are missing.');
assert.match(renderer, /function applyMaterialMode/, 'Glass/solid material setting is missing.');
assert.equal(pkg.version, '1.0.0', 'Unexpected package version.');
assert.ok(Number.parseInt(pkg.engines.node.replace(/[^0-9]/g, ''), 10) >= 22, 'Node.js 22+ is required for the build environment.');

console.log(`Structure check passed: ${ids.length} unique HTML IDs, ${new Set(directSelectors).size} static selectors, Luma Music ${pkg.version}.`);
