# QA Report — Luma Music 1.0.0

## Pemeriksaan yang berhasil

- `npm test`: lolos. Memeriksa sintaks `src/main.mjs`, `src/preload.cjs`, `src/renderer.js`, keunikan ID HTML, selector statis, keberadaan menu/halaman Sedang Diputar, protokol audio, jalur preload, dan kelas tema.
- Pemeriksaan CSS dengan parser `tinycss2`: 299 aturan tingkat atas, tanpa error parsing.
- Pemeriksaan visual renderer Chromium pada viewport 1366×768 dengan API Electron tiruan dan koleksi musik sintetis: Beranda, halaman detail album, halaman Sedang Diputar kosong, dan halaman Sedang Diputar aktif berhasil dirender tanpa error JavaScript pada simulasi.
- Struktur album: lima kartu tampil sejajar di beranda pada viewport pengujian; daftar lagu beranda memakai urutan yang tampil, bukan antrean seluruh perpustakaan secara tidak sengaja.

## Belum diverifikasi

- `npm install` tidak selesai di lingkungan pembuatan ini; proses terhenti saat menunggu registry npm, dan tidak ada paket runtime yang berhasil dipasang.
- Aplikasi Electron nyata belum dijalankan dari paket ini. Pemutaran file lokal melalui protokol `luma-audio://`, codec yang tersedia di distro, Media Session, perangkat audio, dan integrasi desktop harus diuji di Linux Mint.
- Installer `.deb` dan AppImage belum dibuat. Setelah instalasi dependensi berhasil di Linux, jalankan `npm test`, `npm start`, kemudian `npm run dist`.

Simulasi Chromium hanya membuktikan alur render antarmuka dengan API tiruan. Itu bukan bukti bahwa pemutaran audio Electron telah lolos pengujian runtime.
