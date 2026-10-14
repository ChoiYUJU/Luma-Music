<p align="center">
  <img src="assets/branding/luma-music-logo.png" width="112" alt="Luma Music logo">
</p>

<h1 align="center">Luma Music Max</h1>

<p align="center">Musik lokal. Mendengarkan dengan lebih dekat.</p>

<p align="center">
  <a href="https://github.com/ChoiYuju/Luma-Music/releases/latest"><strong>Download Luma Music Max</strong></a>
  &nbsp;·&nbsp; <a href="docs/INSTALLING.md">Panduan instalasi tanpa Terminal</a>
</p>

**Luma Music Max 3.3.1 — User Install Preview** adalah pemutar musik lokal open-source dengan tampilan Glass, perpustakaan cover-forward, Smart Playlist, dan paket instalasi untuk Linux serta Windows.

> **Status:** source dan alur packaging disiapkan untuk preview. Setelah maintainer menerbitkan GitHub Release yang sudah dibangun dan diuji, pengguna cukup mengunduh paket dari halaman [Releases](https://github.com/ChoiYuju/Luma-Music/releases/latest); mereka tidak perlu memasang Node.js atau membuka Terminal. Sebelum artefak pertama dipublikasikan, halaman Releases mungkin belum memiliki installer.

- **Lisensi:** MIT
- **Teknologi:** JavaScript, HTML/CSS, Electron
- **Target build awal:** Linux x86_64 dan Windows x64
- **Privasi:** local-first; tidak ada akun, iklan, telemetry, koneksi streaming, atau unggahan riwayat
- **Logo:** memakai file equalizer mint asli dari pemilik proyek tanpa modifikasi

## Instalasi untuk pengguna (tanpa Terminal)

Buka **[GitHub Releases](https://github.com/ChoiYuju/Luma-Music/releases/latest)** setelah versi yang diuji diterbitkan, lalu pilih satu paket sesuai sistem:

| Sistem | Pilih berkas | Cara memasang |
|---|---|---|
| Windows 10/11 x64 | `Luma-Music-Max-Setup-*.exe` | Klik dua kali, ikuti wizard, lalu buka dari Start Menu |
| Windows tanpa instalasi | `Luma-Music-Max-Portable-*.exe` | Klik dua kali; data tetap disimpan sesuai perilaku aplikasi |
| Linux Mint / Ubuntu / Debian | `Luma-Music-Max-*.deb` | Klik dua kali untuk membuka Software Manager / installer paket |
| Fedora / RHEL / openSUSE | `Luma-Music-Max-*.rpm` | Buka dengan software installer grafis distro |
| Banyak distro Linux x86_64 | `Luma-Music-Max-*.AppImage` | Klik kanan → Properties → Permissions → izinkan file dijalankan, lalu klik dua kali |

Lihat [panduan instalasi bergambar berbasis GUI](docs/INSTALLING.md) dan [format serta batas kompatibilitas](docs/PORTABILITY.md). Windows installer saat ini mungkin belum ditandatangani secara digital; periksa bahwa file berasal dari repositori resmi dan cocok dengan checksum rilis.

**Penting:** source-code ZIP bukan installer. Jika Releases belum memiliki aset `.exe`, `.AppImage`, `.deb`, atau `.rpm`, tunggu sampai workflow build selesai dan maintainer memublikasikan release yang telah diuji.

## Pengalaman dan fitur

### Pengalaman mendengarkan
- Now Playing imersif/fullscreen dengan artwork besar dan latar blur.
- Kontrol playback SVG, seek, shuffle, repeat, favorit, volume, lirik, equalizer, dan antrean yang dapat disusun ulang.
- Timer tidur dan autoplay opsional dari koleksi sendiri.
- Riwayat lokal, play counts, perkiraan waktu mendengarkan, serta Luma Replay.

### Perpustakaan dan personalisasi
- Scan folder/subfolder, metadata dan artwork tertanam/lokal, halaman album/artis, pencarian dan pengurutan.
- Smart Playlist dengan kondisi ALL/ANY, rating pribadi, favorit, tahun, tanggal ditambahkan/terakhir diputar, durasi, bitrate dan jumlah pemutaran.
- Playlist manual dan folder playlist, impor/ekspor M3U/M3U8.
- Beranda dan Semua Lagu menggunakan grid cover, dengan tampilan daftar sebagai pilihan alternatif.
- Tema Dark / Light / System dan pilihan Glass / Solid.

### Metadata, backup, dan privasi
- Edit judul, artis, album, genre, tahun, serta nomor track sebagai override lokal Luma. File audio asli dan tag tertanam tidak ditulis ulang.
- Backup/restore JSON untuk pengaturan, favorit, playlist, rating, override dan statistik. File audio tidak dimasukkan ke backup.
- Artwork gagal muat akan beralih ke placeholder Luma; scanner dapat mencari cover image lokal di folder album.

## Untuk kontributor dan maintainer

Membangun dari source membutuhkan Node.js 22+:

```bash
npm install
npm test
npm start
```

Build manual dilakukan di OS target:

```bash
npm run dist:linux:release
```

```powershell
npm.cmd run dist:win:release
```

Hasil build berada di `release/`. Pengguna biasa tidak perlu menjalankan perintah-perintah ini; maintainer memakai workflow GitHub Actions untuk membangun dan menyusun draft Release.

## Status build dan rilis

Pengguna tidak perlu Terminal setelah installer tersedia. Maintainer membangun paket, menguji draft release, lalu menerbitkan installer untuk pengguna di halaman [Releases](https://github.com/ChoiYuju/Luma-Music/releases/latest).

- `.github/workflows/ci.yml` menjalankan tes source di Linux dan Windows.
- `.github/workflows/build-packages.yml` membangun artefak utama di runner Linux/Windows saat tag versi `v*` didorong, atau melalui tombol **Run workflow** di GitHub Actions. Isi `release_tag` (contoh `v3.3.1`) untuk menyusun draft Release otomatis; kosongkan untuk build percobaan.
- Workflow membuat **draft GitHub Release** beserta `SHA256SUMS.txt`. Maintainer harus mengunduh dan menguji paket di sistem nyata sebelum menekan **Publish release**.
- Format utama yang dirilis: Linux AppImage, DEB, RPM, tar.gz; Windows Setup EXE, portable EXE, ZIP.
- Pacman dan Flatpak tersedia sebagai jalur eksperimental, bukan pilihan installer utama sampai diuji di distro target.

## Batasan yang diketahui

- Ini adalah pemutar file lokal, bukan layanan streaming berlisensi atau pengganti penuh Spotify/Apple Music. Tidak ada akun/cloud sync, katalog streaming, radio berlisensi, atau rekomendasi server.
- Gapless playback terjamin, crossfade antarfile, ReplayGain/EBU R128, CUE virtual tracks, dan integrasi MPRIS2/D-Bus belum diklaim tersedia.
- Target awal adalah x86_64. ARM64, Alpine/musl, dan versi Linux lama tidak dijanjikan kompatibel sebelum dibuat serta diuji secara terpisah.
- Versi saat ini tetap Preview sampai packaging dan runtime audio diuji pada Linux dan Windows.

## Dokumentasi
- [Panduan instalasi pengguna](docs/INSTALLING.md)
- [Panduan portabilitas](docs/PORTABILITY.md)
- [Checklist rilis maintainer](docs/RELEASE_CHECKLIST.md)
- [Riset fitur](docs/FEATURE_RESEARCH.md)
- [Roadmap](FEATURE_ROADMAP.md)
- [Laporan QA](QA_REPORT.md)
- [Changelog](CHANGELOG.md)
- [Panduan kontribusi](CONTRIBUTING.md)
- [Kebijakan keamanan](SECURITY.md)
