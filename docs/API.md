# API

Base production: `/api/v1` pada origin yang sama dengan web. JSON only. Endpoint pengguna memakai Bearer access token berdurasi 15 menit. Refresh token opaque dirotasi setiap penggunaan dan dikirim lewat cookie `HttpOnly`, `SameSite=Lax`, serta `Secure` pada production.

- `POST /api/v1/auth/register` — daftar dengan `displayName`, `email`, dan password kuat.
- `POST /api/v1/auth/login` — login; kredensial salah memakai respons generik untuk mencegah enumerasi.
- `POST /api/v1/auth/refresh` — rotasi sesi melalui cookie.
- `POST /api/v1/auth/logout` — cabut refresh session dan hapus cookie.
- `GET/PATCH /api/v1/me` — baca/perbarui profil pengguna.
- `GET /api/v1/health` — liveness, koneksi database, dan identitas service.
- `GET /api/v1/overview` — Circle, challenge, Journey Garden, notifikasi, dan preferensi.
- `GET /api/v1/daily` — daily amalan and authoritative summary.
- `POST /api/v1/daily/:entryId/complete` — body `{ "clientMutationId": "uuid" }`; idempotently completes entry and returns daily + journey state.
- `POST /api/v1/challenges/:id/join` — ikuti challenge.
- `POST /api/v1/circles/:id/encouragements` — kirim dukungan positif.
- `POST /api/v1/circles/:id/invites` — buat tautan undangan 72 jam.
- `PATCH /api/v1/circles/:id/testing/level` — khusus development, Owner dapat melihat Circle pada level 1–30 menggunakan body `{ "level": 20 }`.
- `DELETE /api/v1/circles/:id/testing/level` — khusus development, hapus override dan kembali ke EXP Circle yang sebenarnya.
- `GET /api/v1/invites/:token` — pratinjau undangan aktif.
- `POST /api/v1/invites/:token/accept` — terima undangan sekali pakai.
- `POST /api/v1/notifications/:id/read` — tandai notifikasi milik pengguna sebagai telah dibaca.
- `PATCH /api/v1/privacy` — perbarui proyeksi privasi Circle.
- `PATCH /api/v1/preferences` — simpan preferensi pengingat dan pengurangan animasi.

Errors follow `{ statusCode, code, message }`. Mutation IDs are unique per user and operation.

Endpoint `/testing/level` membutuhkan Bearer access token milik Owner Circle. Endpoint ini merespons `404` saat `NODE_ENV=production`, sehingga tidak dapat dipakai untuk memanipulasi progres produksi.

Implementasi menggunakan PostgreSQL untuk akun, refresh session, amalan, mutation-idempotency, Circle, challenge membership, notifikasi, preferensi, dan undangan. Service domain berada di dalam aplikasi Next.js dan dipakai langsung oleh Route Handler, jadi tidak ada process Node.js kedua di production. Validasi, authorization, scrypt password hashing, refresh-token rotation, secure headers, dan rate limit aktif. Secret, TLS, backup, monitoring, serta rate-limit store terdistribusi tetap menjadi deployment gate produksi.
