# Feature Research — Spotify and Apple Music

Research date: 13 October 2026

This document compares public feature descriptions from Spotify and Apple Music and explains how a privacy-first *local library player* can adapt the underlying listening patterns without copying brand assets, streaming catalogs, subscription-only services, or cloud recommendation claims.

## Patterns worth learning from

| Product pattern | Public documentation | Luma approach |
|---|---|---|
| Queue controls, shuffle/repeat, quick reshuffle and recommended tracks after a queue | [Spotify: Everyday listening updates (28 May 2026)](https://newsroom.spotify.com/2026-05-28/playlist-folders-mobile-queue-controls-updates/), [Spotify: queue and discovery controls](https://newsroom.spotify.com/2025-05-07/experience-a-new-dimension-of-music-discovery-with-more-controls-and-enhanced-tools/) | Existing queue/shuffle/repeat retained; optional Local Autoplay can continue with songs chosen from the user's own tags and listening history. |
| Library sort/filter and playlist folders | [Spotify: Your Library](https://support.spotify.com/id-id/article/your-library/), [Spotify: Playlist folders](https://support.spotify.com/id-id/article/playlist-folders/) | Added table sorting for title, artist, album, year, added date, play count and duration; playlist folder hierarchy remains a later task. |
| Smart playlists whose contents update based on user-defined criteria | [Apple Music: Smart Playlists on Windows](https://support.apple.com/en-gb/guide/music-windows/mus1712973f4/1.6/windows/10) | Luma 2.0 has a local rule builder with ALL/ANY matching for artist, album, genre, year, favorite, play count, recent-played age, added age, duration and bitrate, plus predefined live collections. |
| Recently Played and replay-like personal statistics | [Apple Music: listening history settings](https://support.apple.com/guide/music-windows/general-settings-mus4130f48/windows) | Added local playback history, play counts, approximate listening time, top artist and Luma Replay. Nothing is uploaded or synchronized. |
| Sort by different metadata categories | [Apple Music: sorting songs on Windows](https://support.apple.com/en-gb/guide/music-windows/mus53d258611/windows) | Added an explicit sort selector to song, favorites and playlist tables. |
| M3U import/export and moving playlists between players | Industry-standard interoperability, not a claimed Spotify/Apple-exclusive feature | Added native M3U/M3U8 import/export. Imported entries must match the current local library; paths outside it are not loaded into the library. |
| Sleep timer | Spotify queue controls and common player feature patterns | Added a local timer to stop after a selected duration or at the end of the current track. |
| Lossless / Spatial Audio / streaming discovery | [Apple Music audio features](https://www.apple.com/id/apple-music/), [Apple Music lossless settings](https://support.apple.com/id-id/guide/music-windows/mus90b573cbb/windows) | Not imitated as a marketing claim. Luma plays user-owned local files; actual decoding and output depend on the OS/runtime. ReplayGain, guaranteed bit-perfect output, gapless playback and spatial audio require separate engineering and verification. |

## Luma 2.0 adaptation summary

Luma 2.0 borrows workflow ideas—not branding or proprietary presentation—from established players: artwork-first listening, a dedicated Now Playing view, queue management, sorting, user-defined Smart Playlists, recent and most-played views, local recap statistics, playlist interchange and sleep timer. These features operate against the user's local library and app state. The queue has move-up/down controls; drag-and-drop queue ordering and playlist folders remain future candidates.

## Why some features are not included in 2.0

Luma is a local-first player, not a streaming service. Spotify DJ, licensed radio, cloud sync, cloud recommendations, collaborative online playlists, online catalog search and artist/tour feeds would require external services, accounts, licensing or servers. This release does not fake those features with static buttons. Instead, Local Mix and Local Autoplay operate only on the local library and local play history.

## Sources

- Spotify Newsroom, 28 May 2026: https://newsroom.spotify.com/2026-05-28/playlist-folders-mobile-queue-controls-updates/
- Spotify Support, Your Library: https://support.spotify.com/id-id/article/your-library/
- Spotify Support, Playlist folders: https://support.spotify.com/id-id/article/playlist-folders/
- Apple Support, Smart Playlists: https://support.apple.com/en-gb/guide/music-windows/mus1712973f4/1.6/windows/10
- Apple Support, Sort songs: https://support.apple.com/en-gb/guide/music-windows/mus53d258611/windows
- Apple Support, listening history settings: https://support.apple.com/guide/music-windows/general-settings-mus4130f48/windows
- Apple Music features: https://www.apple.com/id/apple-music/
