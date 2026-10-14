import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const build = pkg.build;
const scripts = pkg.scripts;
const linuxTargets = new Set(build.linux.target);
const windowsTargets = new Set(build.win.target.map(entry => entry.target));

assert.equal(pkg.version, '3.3.1', 'Expected end-user install preview version 3.3.1.');
assert.equal(pkg.build.appId, 'org.lumamusic.player', 'Application ID must remain stable to preserve user data.');
assert.equal(pkg.productName, 'Luma Music Max');
assert.equal(build.productName, 'Luma Music Max');
for (const target of ['AppImage', 'deb', 'rpm', 'tar.gz']) {
  assert.ok(linuxTargets.has(target), `Missing Linux package target ${target}.`);
}
for (const target of ['nsis', 'portable', 'zip']) {
  assert.ok(windowsTargets.has(target), `Missing Windows target ${target}.`);
}
for (const key of ['dist:linux:all', 'dist:linux:common', 'dist:linux:release', 'dist:linux:experimental', 'dist:appimage', 'dist:deb', 'dist:rpm', 'dist:pacman', 'dist:flatpak', 'dist:win:all', 'dist:win:release', 'dist:win:installer', 'dist:win:portable', 'dist:win:zip']) {
  assert.ok(typeof scripts[key] === 'string' && scripts[key].length, `Missing npm script ${key}.`);
}
assert.equal(build.flatpak.runtime, 'org.freedesktop.Platform');
assert.equal(build.flatpak.sdk, 'org.freedesktop.Sdk');
assert.ok(build.flatpak.finishArgs.includes('--filesystem=home'), 'Local library requires access to user music folders.');
assert.ok(!build.flatpak.finishArgs.includes('--share=network'), 'Offline-first build should not request network access inside Flatpak by default.');
assert.ok(fs.existsSync(path.join(root, 'build/icons/512x512.png')), 'Linux icon asset missing.');
assert.ok(fs.existsSync(path.join(root, 'build/icons/luma.ico')), 'Windows icon asset missing.');
assert.ok(fs.existsSync(path.join(root, '.github/workflows/build-packages.yml')), 'Cross-platform build workflow missing.');
const packagingWorkflow = fs.readFileSync(path.join(root, '.github/workflows/build-packages.yml'), 'utf8');
assert.ok(packagingWorkflow.includes("tags: ['v*']"), 'Tag builds must trigger a packaged release.');
assert.ok(packagingWorkflow.includes('softprops/action-gh-release@v2'), 'Workflow must stage release assets for maintainers.');
assert.ok(fs.existsSync(path.join(root, 'docs/INSTALLING.md')), 'End-user install guide missing.');
assert.ok(fs.existsSync(path.join(root, 'docs/RELEASE_CHECKLIST.md')), 'Maintainer release checklist missing.');
console.log('Portability tests passed: stable Linux release formats, Windows installer/portable/ZIP, release workflow, install guide, stable app ID, and experimental Flatpak permissions.');
