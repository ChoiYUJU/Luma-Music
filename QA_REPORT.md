# QA Report — Luma Music 2.0.0

## Static checks performed in this build workspace

- `npm test`: passed, including Node syntax checks for main, preload and renderer; structural assertions for HTML selectors/features; and Smart Playlist matcher tests for ALL/ANY, favorite/play-count, duration/bitrate, added date and empty rules.
- CSS parsing using `tinycss2`: passed with 426 top-level rules and zero parser errors.
- Smart Playlist UI and handlers: source-level checks present for editor, criteria matcher, saved rules and sidebar navigation; matcher tests exercise representative rule combinations.
- Playlist M3U import/export: native dialogs run in Electron main process; renderer receives matched local track IDs rather than arbitrary file paths.
- User-provided original PNG logo is preserved byte-identically across `assets/branding/luma-music-logo.png`, `assets/branding/luma-music-mark.png`, and Linux PNG app icons (SHA-256 `61daba553af7704e92cf7230b61442e5bad21b5a56084c2fd000ba9bc5b49bb1`); Windows ICO is a multi-size conversion for packaging.
- Queue move controls now remain disabled for the active queue item; moving upcoming tracks cannot cross the active position.
- No app network calls were added for Local Mix or listening statistics.

## Runtime verification still required

Electron runtime and audio playback were not run end-to-end in this build environment. On Linux Mint, run `npm install`, `npm test`, and `npm start`, then validate:

1. Play/pause, seek, next/previous, shuffle, repeat and fullscreen return.
2. Smart Playlist creation, edit, delete, persistence after restart, and ALL/ANY rule matching.
3. Queue movement controls, removal, and active-track invariance.
4. M3U export/import round trip with the same library folder selected.
5. Sleep timer expiry and stop-at-end-of-track behavior.
6. Statistics increment only during audio playback and persist locally.
7. Local autoplay chooses library tracks only.
8. `.deb`/AppImage on Linux Mint and NSIS installer on Windows x64.

Do not describe runtime playback or packaged installers as production-tested until the above checks pass on target systems.
