<p align="center">
  <img src="assets/branding/luma-music-logo.png" width="112" alt="Luma Music logo">
</p>

<h1 align="center">Luma Music</h1>

<p align="center">Musik lokal. Mendengarkan dengan lebih dekat.</p>

**Luma Music 2.0.0** adalah pemutar musik desktop open-source untuk koleksi audio milikmu sendiri. Arah pengalaman belajarnya mengambil inspirasi dari navigasi koleksi Spotify dan tampilan artwork-first Apple Music, tetapi tetap memakai identitas Luma: logo equalizer mint asli, antarmuka glass yang tenang, dan pendekatan local-first tanpa akun, iklan, telemetri, atau katalog streaming palsu.

- **Lisensi:** MIT
- **Teknologi:** JavaScript, HTML/CSS, Electron
- **Node.js untuk pengembangan:** 22 atau lebih baru
- **Platform target:** Linux desktop; konfigurasi paket Windows NSIS juga tersedia untuk diuji
- **Privasi:** riwayat, statistik, smart playlist, dan mix disimpan lokal

## Yang baru di 2.0

### Pengalaman mendengarkan

- Mode **Sedang Diputar** immersive/fullscreen dengan sampul album besar dan latar artwork buram.
- Kontrol playback SVG yang konsisten, seek, shuffle, tiga mode repeat, favorit, volume, lirik, equalizer, dan antrean.
- Antrean dapat diubah urutannya dengan kontrol naik/turun untuk lagu berikutnya; lagu aktif tidak dipindahkan oleh kontrol tersebut.
- Timer tidur berdasarkan durasi atau akhir lagu.
- **Local Autoplay** opsional untuk melanjutkan lagu serupa hanya dari perpustakaan lokal.

### Perpustakaan dan personalisasi

- Pemindaian folder dan subfolder, cache metadata/artwork, halaman album/artis, pencarian, favorit, dan playlist manual.
- Pengurutan lagu berdasarkan judul, artis, album, tahun, waktu ditambahkan, jumlah pemutaran, dan durasi.
- **Playlist Pintar**: buat playlist dinamis dengan aturan artis, album, genre, favorit, tahun, jumlah pemutaran, waktu terakhir diputar, waktu ditambahkan, durasi, atau bitrate. Aturan bisa dicocokkan sebagai semua (ALL) atau salah satu (ANY).
- Koleksi pintar siap pakai: Mix untukmu, Baru ditambahkan, Baru diputar, Paling sering diputar, dan Luma Replay.
- Riwayat lokal, jumlah sesi pemutaran, serta perkiraan waktu mendengarkan.
- Impor dan ekspor playlist M3U/M3U8.

### Fitur audio

- Metadata umum termasuk judul, artis, album, genre, tahun, durasi, bitrate, sample rate, bit depth, dan artwork tertanam jika tersedia.
- Lirik lokal `.lrc` / `.txt` di samping file audio; tidak ada pengunduhan lirik otomatis.
- Equalizer 10-band dengan preset dan preamp melalui Web Audio.
- Tema Glass dan Solid untuk perangkat yang kurang nyaman dengan blur.

## Memulai di Linux Mint / Ubuntu

1. Pasang Node.js 22 atau lebih baru. NVM bisa dipakai untuk menyimpan beberapa versi Node.js berdampingan.
2. Ekstrak source code, buka terminal di folder `luma-music`, lalu jalankan:

```bash
npm install
npm test
npm start
```

3. Di aplikasi, pilih **Impor musik** dan arahkan ke folder koleksi lokal.
4. Buat playlist pintar lewat tombol `+` di bagian **Playlist Pintar** pada sidebar. Tambahkan aturan seperti `Artis memuat Yuju`, `Favorit adalah Favorit`, atau `Jumlah pemutaran minimal 3`.

## Build Linux

Setelah dependensi terpasang:

```bash
npm run dist
```

File `.deb` dan AppImage akan dibuat di `release/`. Pilihan per format:

```bash
npm run dist:deb
npm run dist:appimage
```

## Build Windows

Konfigurasi installer NSIS tersedia untuk Windows x64. Bangun pada mesin Windows atau CI Windows setelah memasang dependensi:

```powershell
npm install
npm test
npm run dist:win
```

Hasil build akan ada di `release/`. Konfigurasi target bukan bukti bahwa installer sudah diuji; jalankan dan tes hasilnya pada Windows sungguhan sebelum membagikannya.

## Pintasan utama

| Pintasan | Fungsi |
|---|---|
| `Ctrl+O` | Impor folder musik |
| `Ctrl+K` | Fokus pencarian |
| `Ctrl+1`–`Ctrl+6` | Navigasi utama |
| `F` | Buka/tutup fullscreen ketika halaman Sedang Diputar aktif |
| `Esc` | Keluar dari fullscreen |
| `Spasi` | Putar/jeda ketika fokus bukan pada input/kontrol |
| `Alt+←` / `Alt+→` | Lagu sebelumnya/berikutnya |
| `←` / `→` | Mundur/maju 5 detik ketika tidak mengetik |
| `M` | Senyap/pulihkan volume |
| `L` | Lirik lokal |
| `E` | Equalizer |
| `Q` | Antrean lagu |
| `Ctrl+Shift+O` | Impor M3U |

Menu native juga menyediakan navigasi, pemutaran, timer tidur, pengaturan, dan pembuatan playlist pintar.

## Privasi dan data playlist

Luma tidak mengunggah riwayat atau statistik mendengarkan ke server. Statistik tersimpan di penyimpanan lokal aplikasi. **Ekspor M3U menggunakan path file lokal** agar playlist mudah dipakai di mesin yang sama; periksa berkas hasil ekspor sebelum membagikannya, karena path dapat mengungkap struktur folder di komputermu.

## Batasan yang diketahui

- Luma adalah pemutar koleksi lokal, bukan klien katalog streaming. Spotify DJ, radio berlisensi, sinkronisasi cloud, rekomendasi online, dan playlist kolaboratif tidak disimulasikan.
- Local Mix dan Local Autoplay adalah heuristik sederhana di perangkat, bukan model rekomendasi cloud.
- Statistik waktu mendengarkan adalah perkiraan dari aktivitas playback; bukan laporan durasi dengar tersertifikasi.
- Equalizer memakai Web Audio, sehingga bukan jalur bit-perfect dan tidak memberi akses audio eksklusif.
- Gapless playback yang terjamin, crossfade antarfile yang sebenarnya, ReplayGain/EBU R128, pengeditan tag, dukungan CUE sebagai trek virtual, dan integrasi MPRIS2/D-Bus belum dinyatakan tersedia.
- Build runtime Electron dan audio perlu diuji secara manual untuk setiap target platform sebelum publikasi rilis.

## Dokumentasi proyek

- [Riset fitur Spotify / Apple Music](docs/FEATURE_RESEARCH.md)
- [Roadmap](FEATURE_ROADMAP.md)
- [Laporan QA](QA_REPORT.md)
- [Changelog](CHANGELOG.md)
- [Panduan kontribusi](CONTRIBUTING.md)
- [Kebijakan keamanan](SECURITY.md)

Laporan bug sebaiknya menyertakan sistem operasi, versi Node.js/Electron, jenis file audio, serta pesan error. Jangan mengirimkan file musik pribadi atau informasi path sensitif.
