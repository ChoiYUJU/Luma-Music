# Audit fitur Luma Music

Dokumen ini memisahkan kemampuan yang sudah terlihat di kode dengan pekerjaan yang masih diperlukan untuk menjadi pemutar musik desktop yang matang.

## Sudah tersedia di sumber 1.0.0

- Pemindaian folder/subfolder audio dan pembacaan metadata melalui `music-metadata`.
- Cache metadata lokal untuk mengurangi pemindaian ulang berkas yang tidak berubah.
- Tampilan Beranda, Semua Lagu, Album, Artis, Favorit, playlist, dan Sedang Diputar.
- Pemutaran HTMLMediaElement, seek, volume, shuffle, repeat off/all/one, dan antrean.
- Konteks klik-kanan pada lagu untuk pemutaran, antrean, playlist, dan favorit.
- Lirik lokal `.lrc`/`.txt` serta highlight waktu untuk `.lrc` tersinkron.
- Equalizer 10 band berbasis Web Audio dengan preset dan preamp.
- Pintasan keyboard, status Media Session di runtime Chromium, preferensi lokal, dan menu aplikasi Electron.
- Tema Glass/Solid dan proteksi renderer melalui preload/context isolation serta protokol audio lokal.

## Prioritas sebelum rilis produksi

### P0 — Kualitas dasar dan uji regresi

- Uji pada Linux Mint XFCE nyata: impor, scan ulang, hilangnya file, pemulihan favorit/playlist, dan pengaturan cache.
- Uji decode MP3, FLAC, WAV, Ogg/Opus, M4A/AAC di Chromium/Electron target.
- Uji seek panjang, lagu rusak, audio error, perubahan sample rate, repeat-one/all, shuffle, serta file tanpa tag.
- Uji jendela pada resolusi rendah, tema Solid, akses keyboard, pembaca layar, dan skala tampilan desktop.
- Bangun dan pasang `.deb` serta AppImage dari lingkungan Linux; periksa dependensi paket dan jalankan smoke test.

### P1 — Fitur manajemen koleksi

- Pengurutan interaktif (judul, artis, album, tahun, durasi, terakhir ditambahkan) dan filter genre/format.
- Impor/ekspor M3U dan playlist pintar berbasis aturan.
- Pengeditan tag dan pengelolaan beberapa folder musik.
- Riwayat pemutaran, play count, statistik koleksi, dan daftar terbaru berdasarkan tanggal indeks, bukan hanya mtime.
- Dukungan drag-and-drop untuk folder/file melalui API Electron yang aman.
- Dukungan CUE sebagai trek virtual, urutan disk untuk album multi-disc, serta pengelolaan beberapa folder musik.

### P2 — Audio engine dan desktop Linux

- Evaluasi GStreamer atau libVLC untuk gapless yang lebih andal dan dukungan codec yang lebih luas.
- ReplayGain serta normalisasi EBU R128 dengan pengukuran nyata, bukan preset EQ.
- MPRIS2/D-Bus untuk kontrol media native di Linux dan notifikasi desktop.
- Pemilihan perangkat output / backend audio dan diagnosis underrun.
- Crossfade opsional dan visualisasi yang tidak membebani CPU saat tidak aktif.

### P3 — Ekosistem opsional

- Integrasi server musik pribadi (mis. Jellyfin/Subsonic) sebagai provider terpisah.
- Pencarian sampul/lirik dengan opt-in eksplisit, status sumber, dan pengaturan privasi.
- Scrobbling Last.fm/ListenBrainz yang opt-in.

## Yang sengaja tidak diklaim

Luma Music 1.0.0 tidak mengklaim pemutaran bit-perfect, gapless yang terjamin, MPRIS2 native, ReplayGain/EBU R128, atau dukungan seluruh codec. Hal tersebut memerlukan implementasi dan pengujian audio yang belum ada di versi ini.
