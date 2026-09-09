# Connected to Jannah

Social worship companion dan shared spiritual journey. Aplikasi web mobile-first ini mencakup autentikasi, Amalan Hari Ini, Circle, tantangan pribadi, undangan, notifikasi, privasi, dan Journey World dengan progres server-authoritative.

## Struktur

- `web/` — satu aplikasi Next.js full-stack mobile-first/PWA (frontend dan API `/api/v1`).
- `mobile/` — eksperimen Flutter yang dipertahankan sebagai opsi native masa depan.
- `api/` — service domain dan PostgreSQL yang dipakai ulang oleh runtime server Next.js; bukan service deployment terpisah.
- `docs/` — keputusan produk, teknis, visual, keamanan, dan deployment.
- `assets/` — registry aset; hanya aset berstatus `approved` boleh masuk build production.

## Menjalankan aplikasi

```bash
brew services start postgresql@17
createdb ctj # hanya jika database belum ada
npm ci
DATABASE_URL=postgresql://localhost/ctj \
ACCESS_TOKEN_SECRET=ganti-dengan-secret-lokal-minimal-64-karakter \
APP_ORIGIN=http://localhost:3000 \
npm run dev
```

UI dan API berjalan dari satu process Node.js dan satu origin. API tersedia di `http://localhost:3000/api/v1`. Tidak ada akun demo; buat akun dari halaman Register. Access token disimpan hanya selama tab aktif dan refresh session menggunakan cookie HttpOnly.

Routes: `/` landing page publik, `/login` dan `/register` autentikasi aktif, serta `/app` untuk Home, Amalan, Together/Circles, challenge, undangan, Journey/Garden, dan profil.

Untuk production Hostinger, pilih root repository (kosongkan root directory), Node.js 22, build `npm run build`, dan start `npm start`. Aplikasi membutuhkan PostgreSQL eksternal melalui `DATABASE_URL`; detail lengkap ada di [panduan deployment Hostinger](docs/DEPLOYMENT_HOSTINGER.md).

## Menjalankan mobile

```bash
cd mobile
flutter pub get
flutter test
flutter run
```

Salin aset dari `assets/approved/` setelah review visual. Aset draft saat ini sengaja tetap ditandai draft dan digunakan hanya pada build development.

## Status

Alur pengguna utama berjalan sebagai satu aplikasi full-stack dan menyimpan data secara persisten di PostgreSQL. Sebelum produksi publik, siapkan domain/TLS, secret production, backup dan observability PostgreSQL, penyedia pengiriman email bila diperlukan, serta review syariah untuk katalog konten. Lihat [roadmap](docs/IMPLEMENTATION_ROADMAP.md).
