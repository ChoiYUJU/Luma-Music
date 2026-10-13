# Changelog

## 1.1.1 — Original app logo for GitHub and packages

- Added the original Luma equalizer mark as reusable PNG branding assets.
- Displayed the same mark at the top of the GitHub README.
- Synchronized Linux package icons with the in-app mint tile and dark four-bar equalizer.
- Included `assets/**/*` in packaged application files for in-app branding use.
- Used the exact supplied 512×512 mint equalizer mark for the app header, README branding, Linux package icons, and derived 256×256 variants.


## 1.1.1 — 2026-10-13

### Changed
- Replaced text-glyph playback controls with a consistent set of inline SVG icons for play/pause, previous/next, shuffle, repeat, favorite, volume, lyrics, equalizer, and queue.
- Refined spacing, hover/active states, control hit areas, and small-window sizes for the mini-player and immersive player.
- Added accessible pressed states and labels for shuffle and repeat.
- Kept playback handlers and state transitions unchanged; only the control presentation and synchronized icon states were adjusted.

### Checks
- Added structure assertions to guard the presence of inline SVG icons on all transport controls.

## 1.1.0 — 2026-10-13

### Added
- Immersive full-window Now Playing mode, opened directly from the sidebar navigation or with `F` while on the regular Now Playing page.
- Album-art-derived blurred backdrop and larger centered cover artwork.
- Fullscreen playback controls for play/pause, previous/next, shuffle, repeat, seek, volume and favorites.
- Direct access to local lyrics, equalizer and queue while in immersive mode.
- `Escape` and a visible return control to leave immersive mode.
- Responsive layout for shorter and narrower windows.

### Changed
- Added a trusted preload IPC bridge to toggle the native Electron window fullscreen state.
- Added structure checks for fullscreen Now Playing controls, open/close behavior, and the fullscreen IPC bridge.
- Version bumped to 1.1.0.


## 1.0.0 — Full visual redesign

- Mengganti sistem CSS bertumpuk dengan satu sistem desain konsisten: charcoal netral, aksen hijau lembut, artwork sebagai fokus, glass blur secukupnya, dan hierarki tipografi yang lebih terbaca.
- Merapikan navigasi sidebar, pencarian, daftar lagu, album, artis, favorit, playlist, dialog, dan menu konteks.
- Mengganti ikon navigasi utama dengan SVG inline yang konsisten dan bebas dari dependensi jaringan.
- Menyamakan ikon aplikasi Linux dengan wordmark Luma yang sederhana dan aksen hijau lembut.
- Membuat halaman detail album dan artis dengan artwork sebagai fokus, aksi putar/antrian yang terpisah, serta navigasi kembali/maju.
- Memperbaiki daftar lagu agar aksi Putar Semua mempertahankan daftar yang sedang ditampilkan; kartu album punya aksi buka detail dan tombol play terpisah.
- Memperbesar artwork serta merapikan hierarki halaman Sedang Diputar dan pemutar bawah.
- Merapikan kisi album Beranda agar tidak menyisakan satu kartu sendirian pada baris kedua di layar laptop.
- Menyesuaikan ukuran awal jendela dengan area kerja desktop agar lebih cocok untuk laptop dengan layar 1366×768.
- Memperbarui dokumentasi dan menambahkan batasan yang diketahui supaya fitur yang belum tersedia tidak diklaim.
- Mempertahankan perpustakaan lokal, metadata, playlist, antrean, lirik lokal, equalizer, penyimpanan preferensi, serta pengaturan Glass/Solid.

## 0.3.1

- Menambahkan halaman navigasi Sedang Diputar yang berdiri sendiri.

## 0.3.0

- Menambahkan menu native untuk pemutaran, antrean, lirik, equalizer, dan navigasi.
- Memperbaiki dialog konteks lagu dan tema Glass/Solid.

## 0.2.0

- Menambahkan equalizer 10-band, pembacaan lirik lokal, perbaikan pengelolaan antrean, dan cache metadata.

## 0.1.0

- Fondasi pemutar musik lokal berbasis Electron.
