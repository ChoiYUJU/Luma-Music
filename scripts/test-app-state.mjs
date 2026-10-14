import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/renderer.js', import.meta.url), 'utf8');
const start = source.indexOf('function sanitizeMetadataOverrides(source) {');
const end = source.indexOf('\n}', start) + 2;
assert.ok(start >= 0 && end > start, 'Metadata override sanitizer is missing.');
const context = vm.createContext({ Object, Number, String, Array });
vm.runInContext(`${source.slice(start, end)}\nglobalThis.clean = sanitizeMetadataOverrides;`, context, { timeout: 1000 });
const cleaned = context.clean({
  trackA: { title: '  New Title  ', artist: 'Artist', year: 2022, trackNo: 4, id: 'bad', path: 'C:/private/music.mp3' },
  trackB: { title: '<script>alert(1)</script>', genre: 'K-pop', year: 9000 },
  invalid: 'not-an-object'
});
assert.deepEqual(JSON.parse(JSON.stringify(cleaned.trackA)), { title: 'New Title', artist: 'Artist', year: 2022, trackNo: 4 }, 'Only permitted metadata fields should persist.');
assert.ok(!Object.hasOwn(cleaned.trackA, 'path'), 'Native file paths must never be stored as metadata overrides.');
assert.ok(!Object.hasOwn(cleaned.trackB, 'year'), 'Years outside supported range should be dropped.');
assert.ok(!Object.hasOwn(cleaned, 'invalid'), 'Invalid entries should be ignored.');
console.log('App-state tests passed: metadata override allowlist, bounds, and path exclusion.');
