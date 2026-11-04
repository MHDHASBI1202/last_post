# Pos Terakhir

**Web publik: https://pos-terakhir.alah6075.workers.dev**

Sudah diterbitkan ke Cloudflare Workers dengan database D1 produksi terpisah dari data lokal. Deploy berikutnya dari komputer yang sudah login: `npm run deploy`. Koneksi deploy otomatis Workers Builds ke GitHub masih perlu diaktifkan bila ingin setiap push langsung terbit.

Dunia penyintas zombie 2D isometrik untuk serial **Pos Terakhir**. Day 1 dimulai dari satu rumah, dua kaleng makanan, satu botol air, dan dua zombie di luar batas lahan.

Frontend React + Vite, backend Cloudflare Worker, penyimpanan Cloudflare D1. Tidak memerlukan Sites, akun ChatGPT, server berbayar, atau aset eksternal. Tampilan menyesuaikan HP dan desktop.

## Fitur

- Peta Canvas 2D: geser, zoom, pinch, pilih objek, temukan karakter sendiri.
- Kartu penyintas: nama panggilan, peran, sebutan, warna jaket, unduh PNG, tautan kartu baca-saja.
- Aktivitas karakter dan voting prioritas pembangunan. Mengganti pilihan memperbarui suara lama.
- Identitas per browser dengan cookie HttpOnly; kunci pemulihan pribadi untuk pindah perangkat.
- Data disimpan di database bersama, bukan sekadar localStorage. Profil uji dan database lokal tidak masuk repo.
- **Bertahan bersama:** menebang, looting/peti suplai, mencari air/herba, merakit, meramu obat, memperkuat pagar, memperbaiki markas, menjaga, melawan zombie, merawat teman, istirahat, dan ransum.
- Tim hingga 4 pemain, bahan/gudang bersama, bonus keahlian peran, kesehatan/energi, sapaan, jurnal kegiatan, dan gelombang zombie.
- Gerakan dengan rute yang menghindari rumah dan memakai gerbang saat pagar sudah berdiri. Karakter berjalan ke lokasi, mengerjakan kegiatan, lalu kembali; animasi alat aktif setelah tiba.
- Kustomisasi kulit, rambut, topi, aksesori, tas, celana, dan jaket. Tampilan tersimpan di D1 dan konsisten di peta, kartu, link berbagi, serta PNG unduhan.

## Kustomisasi dan interaksi dunia

Buka **Akun → Kustomisasi karakter**, pilih penampilan, cek tampak depan/belakang, lalu tekan **Simpan perubahan**. Kamu juga bisa mengaturnya ketika pertama membuat kartu. Kartu lama mendapat penampilan standar tanpa mengubah identitas atau progresnya. Permintaan dari versi aplikasi lama yang belum mengirim penampilan tidak menimpa pilihan baru.

Klik pohon untuk mulai menebang, peti/rute looting untuk mencari suplai, lahan untuk membangun, atau zombie untuk melawan. Klik penyintas lain untuk menyapa, membantu kegiatan aktif, atau merawat yang terluka. Server tetap memeriksa energi, pekerjaan aktif, bahan, dan target.

Animasi peta memakai Canvas 2D: arah badan, langkah, alat, tas, gerak istirahat/perawatan, respons pohon, peti terbuka saat dicari, serta zombie tumbang saat HP ancaman berkurang. Rute A* menghindari bangunan dan pagar. Gerakan visual di tiap browser tetap lokal; status kegiatan, hasil, dan penampilan tersinkron melalui server. Ini belum sistem posisi multiplayer per frame.

## Cara bermain bersama

1. Buat kartu, lalu buka **Bertahan → Kegiatan**. Keahlian peran ditampilkan di urutan teratas.
2. Kegiatan berlangsung 5–40 detik dan memakai energi. Satu pemain hanya bisa mengikuti satu kegiatan sekaligus. Energi pulih 1 tiap 3 detik, maksimal 100.
3. Pemain lain membuka **Kerja sama** dan menekan **Bantu**. Maksimal 4 pemain per tim. Bantuan memakai 8 energi, mempercepat hingga 5 detik (hingga 8 detik jika ahli), dan menambah hasil pengumpulan, serangan, penjagaan, atau pembangunan. Waktu perjalanan tetap disisakan; tugas yang hampir selesai tidak menerima bantuan baru. Semua anggota mendapat kontribusi setelah selesai.
4. Hasil masuk gudang markas bersama. Bahan untuk crafting/perbaikan/pembangunan dibayar sekali di awal oleh kegiatan pemimpin. Waktu selesai, energi, hasil loot dan pengeluaran bahan ditentukan server.
5. Gunakan **Kerja sama** untuk menyapa, berterima kasih, meminta bantuan, atau merawat penyintas terluka. Kartu yang dibagikan tetap baca-saja.

| Peran | Keunggulan |
| --- | --- |
| Perintis | Hasil kayu dan progres pagar lebih besar |
| Penjaga | Pertahanan dan damage lebih kuat, luka tempur lebih ringan |
| Penjelajah | Peluang peti suplai 55% (umum 30%), luka looting lebih ringan |
| Perakit | Kayu, perkakas, pagar dan perbaikan lebih efektif |
| Peramu | Hasil air, herba, dan kotak medis lebih banyak |
| Medis | Perawatan memulihkan 45 HP (umum 25), hasil kotak medis lebih banyak |

Semua peran masih dapat melakukan kegiatan dasar; keahlian memberi hasil lebih baik. Perkakas gudang menambah kayu/scrap maksimal +3. Pagar perimeter berdiri mengelilingi markas dengan gerbang utama dan naik satu level tiap 60 progres; tampilan visual meningkat (palisade, palang penguat, kawat berduri) dan tiap level menahan 4 kerusakan tambahan.

Gelombang zombie dijadwalkan tiap 15 menit, dengan 2 menit untuk merespons. Serang untuk menghabiskan HP ancaman, atau jaga untuk mengurangi kerusakan rumah. Pertahanan penjagaan habis setelah serangan. Markas yang rusak dapat diperbaiki; karakter tidak hilang permanen.

Aktivitas bersama disinkronkan lewat polling 15 detik saat tab terlihat dan saat tugas sendiri selesai, bukan gerakan multiplayer lewat WebSocket. Daftar penyintas bukan indikator online. Jam server menjadi sumber waktu: hasil pekerjaan yang jatuh tempo dicatat saat permintaan berikutnya, termasuk setelah browser ditutup. Saat semua pemain offline, sistem tidak menghitung rangkaian serangan tanpa batas; satu serangan terlewat diselesaikan saat markas kembali diakses. Tidak memerlukan cron atau server yang terus hidup.

Penyelesaian tugas menggunakan transaksi D1 dan transisi status bersyarat. Dua browser yang menyelesaikan satu tugas tidak menggandakan hasil. Percobaan bergabung dua kali atau memulai pekerjaan kedua ditolak tanpa memotong bahan/energi tambahan.

Pengujian lokal (jalankan dev server dahulu): `npm run test:api` dan `npm run test:survival`. Tes survival membuat karakter uji dan mengubah jam tugas **di database lokal saja** untuk menguji kerja sama, biaya bahan, hadiah sekali, pagar, perawatan, dan serangan. Jangan gunakan database produksi untuk tes ini.

## Jalankan lokal

Gunakan Node.js **22.13+**.

```sh
npm ci
npm run db:local
npm run dev
```

Buka URL yang dicetak Vite. Database lokal terpisah dari produksi. Tidak perlu akun Cloudflare untuk pengembangan lokal.

```sh
npm test
npm run build
```

## Publikasi gratis: Cloudflare Workers + D1

Pilih **Workers Free**, bukan Workers for Platforms dan bukan Pages statis. Aplikasi ini punya API dan database sehingga mengunggah folder HTML saja tidak cukup.

### Deploy pertama dari komputer

1. Buat/masuk akun Cloudflare paket Free. Jangan memasukkan token ke source atau GitHub.
2. Jalankan dari folder repo:

```sh
npm ci
npx wrangler login
npm run db:setup
npm run deploy
```

`db:setup` mencari atau membuat D1 bernama `pos-terakhir-db`, lalu menulis ID-nya ke `wrangler.jsonc`. ID database bukan password. `deploy` memeriksa TypeScript, membangun frontend + Worker, menerapkan migrasi, dan menerbitkan situs. Wrangler mencetak URL `https://pos-terakhir.<subdomain-akun>.workers.dev` yang bisa dibuka publik.

3. Simpan ID database agar build berikutnya memakai database yang sama:

```sh
git add wrangler.jsonc
git commit -m "Configure production D1 database"
git push origin main
```

Jika nama Worker `pos-terakhir` sudah dipakai di akunmu, ganti `name` di `wrangler.jsonc` sebelum deploy. Gunakan nama yang sama ketika menghubungkan Workers Builds.

### Deploy otomatis setelah push GitHub

Sesudah deploy pertama:

1. Dashboard Cloudflare → **Workers & Pages** → pilih Worker `pos-terakhir` → **Settings → Builds** → hubungkan repo `MHDHASBI1202/last_post`.
2. Pilih branch produksi `main`, root directory `/`.
3. Isi **Build command:** `npm run build`.
4. Isi **Deploy command:** `npm run deploy:built`.
5. Jika tersedia, set environment variable build `NODE_VERSION=22`. Environment build bukan runtime secret.

Cloudflare menginstal paket dan menerbitkan perubahan berikutnya dari GitHub. Pastikan ID D1 di `wrangler.jsonc` sudah diisi dan token build yang dibuat Cloudflare mendapat akses **D1 Edit** untuk migrasi. Panduan resmi: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/), [D1 getting started](https://developers.cloudflare.com/d1/get-started/).

Workflow GitHub Actions di repo hanya menjalankan tes dan build. Tidak melakukan deploy dan tidak membutuhkan token Cloudflare.

### Apakah bisa Netlify atau Vercel?

Frontend-nya bisa dihosting statis, tetapi API dan database dalam repo ini menggunakan binding D1 milik Cloudflare. **Import langsung ke Vercel/Netlify belum menjalankan fitur kartu dan voting.** Konfigurasi yang sudah disiapkan dan diuji adalah Cloudflare Workers + D1 agar frontend, API, dan database tetap satu layanan. Untuk hosting lain, backend perlu dipindahkan atau dipasang terpisah dahulu.

## Identitas dan pemulihan

Pengunjung membuat kartu tanpa email/password. Server memberi cookie sesi acak, HttpOnly, SameSite=Lax, Secure di HTTPS, berlaku 180 hari. Kunci pemulihan acak ditampilkan **sekali setelah pendaftaran**; unduh dan simpan secara pribadi. Database menyimpan hash SHA-256 dari sesi dan kunci, bukan nilai aslinya.

Di perangkat baru: menu **Akun → Pulihkan karaktermu**. Nomor `PT-XXXXXXXX` dan link berbagi hanya menampilkan kartu, tidak memberi akses edit. Kunci pemulihan memberi akses penuh ke karakter; jangan tampilkan dalam video atau screenshot. Jika cookie hilang dan kunci tidak disimpan, kartu tidak dapat diambil kembali.

Voting berlaku satu pilihan per karakter. Identitas ini belum memverifikasi satu manusia satu karakter; hapus cookie atau buat karakter baru dapat membuat identitas lain. Cocok untuk polling komunitas cerita, bukan pemungutan suara dengan verifikasi identitas. Ada pembatasan permintaan dasar per jaringan: 60 pendaftaran/jam, 30 percobaan pemulihan/jam, 600 perubahan/jam. Situs besar mungkin perlu Turnstile/moderasi tambahan.

## Kuota gratis dan data

Cloudflare menyediakan Workers dan D1 di paket Free, dengan batas penggunaan. Ini bukan jaminan gratis tanpa batas: [harga dan kuota resmi](https://developers.cloudflare.com/workers/platform/pricing/). Tetap pada paket Free bila tidak ingin tagihan paket berbayar. Ketika kuota Free habis, layanan dapat menolak permintaan sampai kuota pulih.

Day mengikuti episode, bukan tanggal. Angka penyintas dan voting berasal dari D1; tidak ada kerumunan atau hasil voting palsu. Peta merotasi maksimal 30 karakter yang terlihat agar ringan, API menampilkan 200 karakter terbaru, dan karakter sendiri selalu disertakan di browsernya.

Database Sites yang dipakai pratinjau awal tidak otomatis dibawa ke Cloudflare milikmu; deploy ini mulai dengan satu tokoh perintis dan nol pendaftar. Ini juga mencegah data uji ikut terbit. `migrations/` berisi skema, bukan data pengguna.

## Struktur

| Lokasi | Isi |
| --- | --- |
| `src/experience.tsx` | UI dan interaksi komunitas |
| `src/world-engine.ts` | Dunia isometrik Canvas yang digambar dari kode |
| `src/theme.css` | Desain responsif |
| `worker/index.ts` | API kartu, aktivitas, voting, pemulihan |
| `worker/security.ts` | Validasi, cookie, hash |
| `migrations/` | Skema D1 |
| `wrangler.jsonc` | Konfigurasi deployment |

Tidak ada API key, credential, database pengguna, aset video, atau audio pribadi dalam repo ini.

Kustomisasi karakter: laki-laki/perempuan, 8 warna kulit, 12 gaya rambut, 10 warna rambut, 10 penutup kepala, 12 aksesori wajah, 8 pilihan tas (termasuk tanpa tas), 12 warna celana, dan 12 warna jaket. Semua pilihan berlaku untuk kedua gender tanpa perbedaan kemampuan. Penampilan tersimpan di profil, peta, serta kartu; profil lama memakai gender laki-laki tanpa mengubah pilihannya.

Jam dunia mengikuti WIB (Asia/Jakarta, UTC+7), disinkronkan dengan waktu server dan berjalan tiap detik. Pagi 05.00–11.00, siang 11.00–15.00, sore 15.00–18.00, malam 18.00–05.00. Pencahayaan peta bertransisi bertahap, lampu menyala saat gelap. DAY tetap mengikuti episode cerita.

Arga ikut melawan otomatis: 2 damage tiap 12 detik setelah 20 detik perjalanan. Hasil dihitung sekali di server untuk semua pengunjung, termasuk penyelesaian interval tertinggal hingga batas waktu serangan. Gelombang dimulai dari 1 zombie (16 HP), bertambah 1 per 3 pemain terdaftar, maksimum 24. Gelombang yang sudah berjalan tidak bertambah mendadak ketika pemain baru mendaftar.
