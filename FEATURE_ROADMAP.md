# Luma Music Feature Roadmap

## Included in 2.0.0

- Local library scan/cache and metadata/artwork browsing.
- Fullscreen immersive Now Playing and consistent inline SVG controls.
- Manual playlists, sorting, queue add/remove and move-up/down controls.
- Rule-based Smart Playlists using ALL/ANY rules for artist, album, genre, favorites, year, play count, recent play date, added date, duration, and bitrate.
- Local history, play counts, estimated listening time, recent/most-played collections and Luma Replay.
- Local Mix and opt-in Local Autoplay based only on local metadata and listening history.
- M3U/M3U8 import/export, offline lyrics, 10-band EQ, sleep timer.
- Linux AppImage/DEB build scripts and initial Windows x64 NSIS configuration.

## Must be verified on target systems

1. Run playback tests on MP3, FLAC, WAV, Ogg/Opus and M4A with representative devices.
2. Test Smart Playlist create/edit/delete, persistence, empty rules, ALL/ANY logic and all field/operator combinations using a real library.
3. Validate queue reordering across different queue positions and ensure the active track remains stable.
4. Validate playlist import/export round trips and malformed or relative M3U entries.
5. Test sleep timer across pause/resume, manual track skips, repeat-one and app shutdown.
6. Test statistics for long playback, seeking, repeated starts and switching tracks.
7. Test Local Autoplay on queue completion and verify it only chooses library tracks.
8. Build and test AppImage/DEB on Linux Mint and NSIS on a Windows x64 system.

## Next candidates

- Playlist folders and import/export of playlists as a bundle.
- A visual, sortable queue with drag-and-drop (currently move-up/down controls).
- Smart collection editor improvements and playlist rule explanations.
- Investigate a dedicated audio engine for actual crossfade/gapless, plus ReplayGain/EBU R128.
- Metadata tag editing, CUE virtual tracks, and native MPRIS2/D-Bus integration.

## Out of scope for a local-first player unless designed as a separate project

- Licensed music-streaming catalog, Spotify DJ, online radio, cloud sync/profiles, streaming recommendations or collaborative playlists. These require a service, licensing and account/security design; Luma must not pretend local heuristics are those services.
