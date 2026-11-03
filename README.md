# Pos Terakhir

Dunia penyintas zombie 2D isometrik untuk serial **Pos Terakhir**. Day 1 dimulai dari satu rumah, dua kaleng makanan, satu botol air, dan dua zombie di luar batas lahan.

Frontend React + Vite, backend Cloudflare Worker, penyimpanan Cloudflare D1. Tidak memerlukan Sites, akun ChatGPT, server berbayar, atau aset eksternal. Tampilan menyesuaikan HP dan desktop.

## Fitur

- Peta Canvas 2D: geser, zoom, pinch, pilih objek, temukan karakter sendiri.
- Kartu penyintas: nama panggilan, peran, sebutan, warna jaket, unduh PNG, tautan kartu baca-saja.
- Aktivitas karakter dan voting prioritas pembangunan. Mengganti pilihan memperbarui suara lama.
- Identitas per browser dengan cookie HttpOnly; kunci pemulihan pribadi untuk pindah perangkat.
- Data disimpan di database bersama, bukan sekadar localStorage. Profil uji dan database lokal tidak masuk repo.

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
