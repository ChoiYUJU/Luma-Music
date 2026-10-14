import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/renderer.js', import.meta.url), 'utf8');
const configStart = source.indexOf('const SMART_PLAYLIST_FIELDS = {');
const configEnd = source.indexOf('\n};', configStart) + 3;
const helpersStart = source.indexOf('function normalizeSmartRule(');
const helpersEnd = source.indexOf('function renderSmartPlaylist(', helpersStart);
assert.ok(configStart >= 0 && configEnd > configStart, 'Smart Playlist field definitions were not found.');
assert.ok(helpersStart >= 0 && helpersEnd > helpersStart, 'Smart Playlist matcher functions were not found.');

const testTracks = [
  { id: 'a', artist: 'Yuju', albumArtist: 'Yuju', album: 'Rec.', genre: 'Ballad', year: 2020, duration: 230, bitrate: 320000 },
  { id: 'b', artist: 'GFRIEND', albumArtist: 'GFRIEND', album: 'Time for the Moon Night', genre: 'K-pop', year: 2018, duration: 200, bitrate: 256000 },
  { id: 'c', artist: 'Yuju', albumArtist: 'Yuju', album: 'O', genre: 'Pop', year: 2024, duration: 310, bitrate: 128000 }
];
const testState = {
  favorites: ['b', 'c'],
  ratings: { a: 4, b: 5, c: 2 },
  playCounts: { a: 3, b: 6, c: 1 },
  addedAt: { a: Date.now() - 3 * 86400000, b: Date.now() - 3600000, c: Date.now() - 5 * 86400000 },
  playHistory: [
    { id: 'a', at: Date.now() - 2 * 86400000 },
    { id: 'b', at: Date.now() - 86400000 },
    { id: 'c', at: Date.now() - 12 * 86400000 }
  ]
};

const harness = `
${source.slice(configStart, configEnd)}
let library = { tracks: ${JSON.stringify(testTracks)} };
let appState = ${JSON.stringify(testState)};
function isFavorite(id) { return appState.favorites.includes(id); }
function trackPlayCount(id) { return Number(appState.playCounts[id]) || 0; }
function trackRating(id) { return Number(appState.ratings[id]) || 0; }
${source.slice(helpersStart, helpersEnd)}
globalThis.matchTracks = playlist => smartPlaylistTracks(playlist).map(track => track.id);
`;
const context = vm.createContext({ Date, Math, Object, Number, String, Array, Map, Set, Boolean });
vm.runInContext(harness, context, { timeout: 1000 });
const matches = playlist => [...context.matchTracks(playlist)];

assert.deepEqual(matches({ match: 'all', rules: [
  { field: 'artist', operator: 'contains', value: 'Yuju' },
  { field: 'genre', operator: 'is', value: 'Ballad' }
] }), ['a'], 'ALL mode should apply every active rule.');

assert.deepEqual(matches({ match: 'any', rules: [
  { field: 'artist', operator: 'is', value: 'GFRIEND' },
  { field: 'year', operator: 'at-least', value: '2024' }
] }), ['b', 'c'], 'ANY mode should accept tracks matching either active rule.');

assert.deepEqual(matches({ match: 'all', rules: [
  { field: 'favorite', operator: 'is', value: 'yes' },
  { field: 'play-count', operator: 'at-least', value: '5' }
] }), ['b'], 'Favorite and play count rules should combine correctly.');

assert.deepEqual(matches({ match: 'all', rules: [
  { field: 'duration-minutes', operator: 'at-most', value: '4' },
  { field: 'bitrate-kbps', operator: 'at-least', value: '256' }
] }), ['a', 'b'], 'Duration and bitrate rules should use minutes and kb/s.');

assert.deepEqual(matches({ match: 'all', rules: [
  { field: 'added-days', operator: 'within-last', value: '1' }
] }), ['b'], 'Added-date rule should use the local added-at timestamp.');

assert.deepEqual(matches({ match: 'all', rules: [
  { field: 'year', operator: 'at-least', value: '2020' },
  { field: 'artist', operator: 'not-contains', value: 'GFRIEND' }
] }), ['a', 'c'], 'Year and not-contains operators should filter correctly.');

assert.deepEqual(matches({ match: 'all', rules: [
  { field: 'last-played-days', operator: 'within-last', value: '3' }
] }), ['a', 'b'], 'Last-played age should use the latest local playback timestamp.');

assert.deepEqual(matches({ match: 'all', rules: [ { field: 'rating', operator: 'at-least', value: '4' } ] }), ['a', 'b'], 'Rating rules should match locally rated tracks.');

assert.deepEqual(matches({ match: 'all', rules: [] }), ['a', 'b', 'c'], 'An empty rule set should clearly resolve to the full local library.');

console.log('Smart Playlist rule tests passed: ALL/ANY, favorite/play-count, duration/bitrate, year, not-contains, added date, last-played age, rating, and empty rules.');
