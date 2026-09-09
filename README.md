# Connected to Jannah

Social worship companion dan shared spiritual journey. Aplikasi web mobile-first ini mencakup autentikasi, Amalan Hari Ini, Circle, tantangan pribadi, undangan, notifikasi, privasi, dan Journey World dengan progres server-authoritative.

## Struktur

- `web/` — aplikasi Next.js mobile-first/PWA (jalur utama MVP).
- `mobile/` — eksperimen Flutter yang dipertahankan sebagai opsi native masa depan.
- `api/` — NestJS API dengan penyimpanan persisten PostgreSQL.
- `docs/` — keputusan produk, teknis, visual, keamanan, dan deployment.
- `assets/` — registry aset; hanya aset berstatus `approved` boleh masuk build production.

## Menjalankan API

```bash
brew services start postgresql@17
createdb ctj # hanya bila database belum dibuat
cd api
pnpm install
pnpm test
pnpm build
DATABASE_URL=postgresql://ctj:ctj-local-development-only@localhost:5432/ctj \
PORT=3002 WEB_ORIGIN=http://localhost:3001 \
ACCESS_TOKEN_SECRET=ganti-dengan-secret-lokal pnpm start
```

API tersedia di `http://localhost:3002/v1`. Tidak ada akun demo; buat akun dari halaman Register. Access token disimpan hanya selama tab aktif dan refresh session menggunakan cookie HttpOnly.

## Menjalankan web

```bash
cd web
pnpm install
NEXT_PUBLIC_API_URL=http://localhost:3002/v1 pnpm dev --port 3001
```

Routes: `/` landing page publik, `/login` dan `/register` autentikasi aktif, serta `/app` untuk Home, Amalan, Together/Circles, challenge, undangan, Journey/Garden, dan profil.

## Menjalankan mobile

```bash
cd mobile
flutter pub get
flutter test
flutter run
```

Salin aset dari `assets/approved/` setelah review visual. Aset draft saat ini sengaja tetap ditandai draft dan digunakan hanya pada build development.

## Status

Alur pengguna utama siap digunakan secara lokal dan menyimpan data secara persisten. Sebelum produksi publik, siapkan domain/TLS, secret production, backup dan observability PostgreSQL, penyedia pengiriman push/email bila diperlukan, serta review syariah untuk katalog konten. Lihat [roadmap](docs/IMPLEMENTATION_ROADMAP.md).
