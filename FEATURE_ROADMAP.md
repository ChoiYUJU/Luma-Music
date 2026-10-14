# Feature Roadmap — Luma Music Max

## 3.2.0 — Cover-forward UI & Light Theme Preview

- [x] Dark / Light / System theme selection.
- [x] All Songs cover grid as default plus optional list layout.
- [x] Cover-grid collections on Beranda for recently added and recently played.
- [x] Color-filled seek and volume controls.
- [x] Larger embedded cover support and same-folder local sidecar-art discovery.
- [x] Graceful placeholders on cover image load failure.
- [x] One-time refresh of older artwork caches after upgrading.
- [ ] Runtime test in Electron on Linux Mint and Windows.
- [ ] Verify folder art lookup with libraries organized as one album per folder and mixed album folders.
- [ ] Verify all saved theme/material combinations and contrast under the user-selected OS appearance.

## Next priorities

1. Run playback regression tests (play/pause, next/previous, seek, queue, shuffle/repeat) on target operating systems.
2. Test metadata import and artwork on MP3, FLAC, M4A, OGG/Opus and WAV sample files.
3. Evaluate audio-engine improvements only after real playback tests; keep audio-quality claims evidence-based.
4. Package and verify Linux AppImage/deb and Windows NSIS installer before calling any build a stable release.

# Feature Roadmap — Luma Music Max

## 3.1.0 — Glass UI Preview

- Complete visual system refresh: floating glass sidebar, translucent toolbar and mini-player, responsive page rhythm, refined typography, artwork cards, track tables, dialogs, and immersive Now Playing.
- Preserve the exact user-supplied mint equalizer logo and Solid mode fallback.
- Run browser layout smoke tests plus source-level functional tests; Electron/real-audio tests remain a release gate.

# Luma Music Max — Feature Roadmap

## Implemented in 3.0.0 Max Preview

- Local library scanner with metadata/artwork cache, track/album/artist views, search, sorting, favorites and manual playlists.
- Immersive fullscreen Now Playing, unified SVG controls, queue reordering, previous/next/repeat/shuffle, seek, volume, sleep timer, keyboard shortcuts and Media Session where supported.
- Rule-based Smart Playlists using ALL/ANY matching across artist, album, genre, favorite, year, play count, added/last-played age, duration, bitrate and personal rating.
- Local Mix and optional local autoplay using local tags/favorites/history; listening history, play counts, estimated listening duration, and Luma Replay.
- M3U/M3U8 import/export and playlist folders.
- App-local metadata overrides and personal 0–5 ratings. These overrides do not edit audio tags on disk.
- JSON backup/restore of local app state with a size cap and a schema check. Audio files are not copied into backups.
- Offline `.lrc` lyric reading, 10-band Web Audio EQ, Glass/Solid material mode and original user-provided logo.
- Linux AppImage/DEB and Windows x64 NSIS build targets. Build target support is not proof that the produced installers have been runtime-tested.

## Must be verified on target systems before calling stable

1. Play/pause, seeking, previous/next, shuffle, repeat-one/all/off and queue-end behavior across multiple formats.
2. Test the fixed Next path with at least five tracks and verify no track is skipped.
3. Create/edit/delete Smart Playlists; test every rule/operator, rating, ALL/ANY, empty rules and persistence.
4. Edit track metadata; restart/rescan; verify overrides persist and original audio file tags do not change.
5. Rate tracks, sort by rating and filter by rating in Smart Playlists.
6. Create playlist folders, move playlists between folders, restart and verify sidebar layout.
7. Export/import state backup; reject malformed/oversized JSON; ensure the backup does not contain file paths or audio content.
8. Import/export M3U/M3U8 with relative and absolute paths and handle missing files without crashing.
9. Verify timer expiry while paused/playing, manual track skips, repeat-one and app shutdown.
10. Test statistics under long playback, seeks, starts/stops and track switches.
11. Build, install and exercise AppImage/DEB on Linux Mint and NSIS on Windows x64.
12. Check memory/CPU use with a large library and during Glass mode/fullscreen.

## Candidates beyond Max Preview

- Dedicated audio engine evaluation for true gapless and crossfade.
- ReplayGain/EBU R128 analysis and optional volume normalization.
- Embedded tag-writing with safe file backup, CUE virtual tracks, and robust duplicate detection.
- Native MPRIS2/D-Bus integration for Linux media keys and desktop controls.
- Drag-and-drop reorder, playlist covers, ratings-aware local recommendations and deeper keyboard/accessibility polish.

## Intentionally not imitated without service rights/infrastructure

Spotify/Apple licensed music catalogs, cloud sync, paid lossless/spatial catalogs, DJ-generated streaming, online radio, shared Jams/collaborative playlists and server-side recommender systems require separate service, licensing and security designs. Luma does not fake these as if they're working offline.
