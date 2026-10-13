# Changelog

## 2.0.0 — Smart Listening Update

### Added
- Rule-based Smart Playlists with ALL/ANY logic for artist, album, genre, favorite, year, play count, recent-played age, added age, duration, and bitrate.
- Sidebar section for user-created Smart Playlists; rules persist locally and matching is recalculated from the local library.
- Queue reorder controls for upcoming items; active item remains fixed when using move controls.
- Local play history, play counts, estimated listening time, recent/most-played collections, and Luma Replay.
- Local Mix and optional Local Autoplay; recommendation logic runs locally on metadata, favorites and history.
- Sorting for title, artist, album, year, added date, play count and duration.
- M3U/M3U8 import and export via native file dialogs.
- Sleep timer by elapsed duration or end of current track.
- Initial Windows x64 NSIS target configuration.

### Improved
- Continued the existing fullscreen Now Playing design and unified SVG playback controls.
- Kept original user-provided Luma logo assets byte-identical.
- Updated documentation, feature research and QA checklist.

### Notes
- This is a source release. Passing static tests does not prove native Electron playback or installers work on every platform.
- M3U exports intentionally include absolute local paths for same-machine portability; inspect before sharing.
- Streaming catalogs, cloud profiles, online discovery, guaranteed gapless playback, true inter-track crossfade, ReplayGain/EBU R128, tag editing and MPRIS2 remain outside this release.
