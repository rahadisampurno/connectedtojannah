# Hostinger Deployment

## Arsitektur production

Deploy hanya satu aplikasi Node.js dari folder `web`. UI dan seluruh backend di `web/lib/server/backend` berjalan dalam process Next.js yang sama, dan browser mengakses API same-origin melalui `/api/v1`.

Data tetap persisten di PostgreSQL. Karena database tersebut bukan process Node.js aplikasi, ia dapat memakai PostgreSQL eksternal (misalnya Supabase) tanpa melanggar pola satu service/satu aplikasi. Gunakan connection string SSL yang bisa diakses dari internet dan aktifkan backup pada penyedia database.

## Pengaturan hPanel

Hubungkan repository GitHub dan gunakan konfigurasi berikut:

- Branch: `main`
- Root directory: `web`
- Framework: Next.js
- Node.js: 22.x
- Install: `npm ci` (otomatis dari `package-lock.json`)
- Build: `npm run build`
- Output directory: `.next`
- Output mode: Next.js standar, sama seperti aplikasi FMO
- Automatic deployment: aktif

Tambahkan environment variables di hPanel, bukan di Git:

```dotenv
NODE_ENV=production
APP_ORIGIN=https://domain-aplikasi.example
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
ACCESS_TOKEN_SECRET=<random-secret-minimal-64-karakter>
APP_TIME_ZONE=Asia/Jakarta
DB_POOL_SIZE=5
```

`RESEND_API_KEY` dan `EMAIL_FROM` bersifat opsional, tetapi dibutuhkan agar email verifikasi dan reset password benar-benar terkirim. Jangan isi `NEXT_PUBLIC_API_URL`: default aplikasi sudah memakai `/api/v1` pada origin yang sama.

Schema dan seed referensi dijalankan idempoten ketika endpoint API pertama kali dipanggil. Setelah deploy selesai, cek berurutan:

1. `GET https://domain-aplikasi.example/api/v1/health` mengembalikan `status: ok`.
2. Register akun baru dari `/register`.
3. Selesaikan onboarding dan buka `/app`.
4. Tandai satu amalan selesai, refresh halaman, lalu pastikan progres tetap tersimpan.
5. Logout dan login kembali.

Jika health mengembalikan `DATABASE_NOT_CONFIGURED` atau `AUTH_NOT_CONFIGURED`, environment variable belum terbaca oleh deployment. Jika status `500`, lihat **Log runtime**; penyebab paling umum adalah connection string PostgreSQL/SSL atau database tidak dapat dijangkau.

## Alternatif Docker/VPS

`docker-compose.production.yml` juga memakai satu container Node.js bernama `app`, ditambah PostgreSQL dan reverse proxy sebagai infrastruktur. Jalankan dengan `docker compose -f docker-compose.production.yml up -d`. Jalur ini bukan konfigurasi utama untuk managed Node.js pada screenshot hPanel.
