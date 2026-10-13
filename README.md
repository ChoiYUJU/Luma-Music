<p align="center">
  <img src="assets/branding/luma-music-logo.png" width="112" alt="Luma Music logo">
</p>

# Luma Music

**Luma Music** adalah pemutar musik desktop open-source yang mengutamakan koleksi lokal, alur pemutaran yang jelas, dan antarmuka gelap yang tenang. Desainnya menggabungkan navigasi koleksi ala Spotify dengan halaman artwork-first yang terinspirasi aplikasi Music di macOS—tanpa menyalin merek, aset, atau layanan streaming mereka.

- **Versi:** 1.1.1
- **Branding:** ikon equalizer mint asli dipakai bersama oleh header aplikasi, README, dan ikon paket.
- **Lisensi:** MIT
- **Platform utama:** Linux desktop (diuji manual oleh pengguna tetap diperlukan)
- **Teknologi:** JavaScript, HTML/CSS, Electron
- **Runtime pengembangan:** Node.js 22+

### Immersive Now Playing

Click **Sedang Diputar** in the sidebar to enter the immersive view directly, or open the regular details page from the mini-player and choose **Tampilan penuh**. Press `F` while that page is active to toggle the view. The full-window listening view uses the current album artwork as a soft blurred backdrop and provides play/pause, previous/next, shuffle, repeat, seek, volume, favorite, lyrics, equalizer, and queue controls. Press `Escape` or choose **Kembali** to return to the library view. The view also requests native Electron window fullscreen so the desktop window chrome/panels can be hidden where the desktop environment supports it; returning restores the previous windowed state.


## Fitur

- Perpustakaan lokal yang memindai folder dan subfolder untuk format audio umum.
- Metadata: judul, artis, album, genre, tahun, nomor trek, durasi, bitrate, sample rate, bit depth, dan artwork tertanam bila tersedia.
- Album dan artis dengan halaman detail, semua lagu, favorit, playlist pribadi, antrean, shuffle, dan tiga mode repeat. Kontrol playback memakai ikon SVG inline yang konsisten, tanpa dependensi jaringan; kontrol utama, shuffle, repeat, favorit, volume, lirik, equalizer, dan antrean mengikuti sistem ikon yang sama.
- Halaman **Sedang Diputar** dengan artwork besar, progres lagu, detail teknis, lirik berikutnya, antrean, serta mode imersif layar penuh dengan latar artwork buram dan kontrol playback lengkap.
- Menu desktop Berkas, Pemutaran, Navigasi, Perpustakaan, Tampilan, dan Bantuan.
- Lirik lokal `.lrc` / `.txt` di samping berkas audio; lirik tidak diunduh otomatis.
- Equalizer 10-band Web Audio dengan preset, preamp, dan kurva respons.
- Pintasan keyboard, posisi terakhir, favorit, playlist, volume, dan preferensi tema yang disimpan lokal.
- Tema Glass dan Solid; Solid dapat dipilih pada perangkat yang kurang nyaman dengan blur.
- Antarmuka renderer tidak memperoleh akses filesystem Node.js secara langsung. File audio disediakan lewat protokol internal yang dibatasi ke lagu pada perpustakaan.
- Tidak ada akun, iklan, telemetri, atau koneksi jaringan yang diperlukan untuk pemutaran lokal.

## Menjalankan di Linux Mint / Ubuntu

1. Pasang Node.js 22 atau lebih baru. NVM dapat dipakai untuk mengelola beberapa versi Node.js.
2. Ekstrak arsip, lalu buka terminal pada folder proyek.
3. Pasang dependensi dan jalankan pemeriksaan:

```bash
npm install
npm test
```

4. Jalankan aplikasi:

```bash
npm start
```

5. Pilih **Impor musik**, lalu pilih folder koleksi lokal. Pemindaian pertama mungkin memerlukan waktu jika koleksi sangat besar; pemindaian berikutnya dapat memakai cache untuk file yang tidak berubah.

## Build Linux

Setelah `npm install` berhasil:

```bash
npm run dist
```

File `.deb` dan AppImage akan dibuat di folder `release/`. Untuk membangun satu format saja:

```bash
npm run dist:deb
npm run dist:appimage
```

Build perlu dilakukan di lingkungan Linux yang mempunyai dependensi Electron/electron-builder yang sesuai. Paket hasil build harus diuji di mesin target sebelum dibagikan.

## Pintasan utama

| Pintasan | Fungsi |
|---|---|
| `Ctrl+O` | Impor folder musik |
| `Ctrl+K` | Fokus ke pencarian |
| `Ctrl+1` sampai `Ctrl+6` | Beranda, lagu, album, artis, favorit, Sedang Diputar |
| `F` | Buka/tutup tampilan penuh saat di Sedang Diputar |
| `Esc` | Keluar dari tampilan penuh |
| `Spasi` | Putar/jeda saat fokus bukan pada kontrol input |
| `Alt+←` / `Alt+→` | Lagu sebelumnya/berikutnya |
| `←` / `→` | Mundur/maju 5 detik saat tidak mengetik |
| `M` | Senyap/pulihkan volume |
| `L` | Lirik lokal |
| `E` | Equalizer |
| `Q` | Antrean lagu |

Menu aplikasi desktop juga menyediakan kontrol pemutaran, pengulangan, navigasi, dan pengaturan tampilan.

## Batasan yang diketahui

- **Rilis sumber ini belum menyertakan bukti build `.deb`/AppImage atau pengujian audio runtime di semua distro.** Jalankan `npm test`, kemudian uji playback MP3/FLAC, seek, repeat, dan equalizer di Linux Mint sebelum menganggap build siap dibagikan.
- Format yang bisa diputar tergantung dukungan Chromium/Electron dan library sistem; daftar ekstensi yang terindeks bukan jaminan semua codec dapat didekode di semua mesin.
- Equalizer menggunakan Web Audio; ini bukan jalur bit-perfect dan tidak menyediakan pemilihan perangkat audio eksklusif.
- ReplayGain/EBU R128, gapless playback yang terjamin, pemutaran CUE sebagai trek virtual, pengeditan tag, smart playlist, dan integrasi MPRIS2/D-Bus native belum diklaim tersedia.
- Aplikasi ini saat ini adalah pemutar koleksi lokal, bukan klien layanan streaming.

## Pengembangan dan laporan bug

Lihat [QA_REPORT.md](QA_REPORT.md), [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), [CHANGELOG.md](CHANGELOG.md), dan [FEATURE_ROADMAP.md](FEATURE_ROADMAP.md). Saat melaporkan masalah, sertakan versi Node.js, distro, format file, dan keluaran Terminal. Jangan menyertakan file audio pribadi.
