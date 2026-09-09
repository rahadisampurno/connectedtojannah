# API

Base: `/v1`. JSON only. Endpoint pengguna memakai Bearer access token berdurasi 15 menit. Refresh token opaque dirotasi setiap penggunaan dan dikirim lewat cookie `HttpOnly`, `SameSite=Lax`, serta `Secure` pada production.

- `POST /v1/auth/register` — daftar dengan `displayName`, `email`, dan password kuat.
- `POST /v1/auth/login` — login; kredensial salah memakai respons generik untuk mencegah enumerasi.
- `POST /v1/auth/refresh` — rotasi sesi melalui cookie.
- `POST /v1/auth/logout` — cabut refresh session dan hapus cookie.
- `GET/PATCH /v1/me` — baca/perbarui profil pengguna.
- `GET /health` — liveness dan identitas service.
- `GET /v1/overview` — Circle, challenge, Journey Garden, notifikasi, dan preferensi.
- `GET /v1/daily` — daily amalan and authoritative summary.
- `POST /v1/daily/:entryId/complete` — body `{ "clientMutationId": "uuid" }`; idempotently completes entry and returns daily + journey state.
- `POST /v1/challenges/:id/join` — ikuti challenge.
- `POST /v1/circles/:id/encouragements` — kirim dukungan positif.
- `POST /v1/circles/:id/invites` — buat tautan undangan 72 jam.
- `PATCH /v1/circles/:id/testing/level` — khusus development, Owner dapat melihat Circle pada level 1–30 menggunakan body `{ "level": 20 }`.
- `DELETE /v1/circles/:id/testing/level` — khusus development, hapus override dan kembali ke EXP Circle yang sebenarnya.
- `GET /v1/invites/:token` — pratinjau undangan aktif.
- `POST /v1/invites/:token/accept` — terima undangan sekali pakai.
- `POST /v1/notifications/:id/read` — tandai notifikasi milik pengguna sebagai telah dibaca.
- `PATCH /v1/privacy` — perbarui proyeksi privasi Circle.
- `PATCH /v1/preferences` — simpan preferensi pengingat dan pengurangan animasi.

Errors follow `{ statusCode, code, message }`. Mutation IDs are unique per user and operation.

Endpoint `/testing/level` membutuhkan Bearer access token milik Owner Circle. Endpoint ini merespons `404` saat `NODE_ENV=production`, sehingga tidak dapat dipakai untuk memanipulasi progres produksi.

Implementasi menggunakan PostgreSQL untuk akun, refresh session, amalan, mutation-idempotency, Circle, challenge membership, notifikasi, preferensi, dan undangan. Validasi, authorization guard, scrypt password hashing, refresh-token rotation, secure headers, CORS, dan rate limit aktif. Secret, TLS, backup, monitoring, serta rate-limit store terdistribusi tetap menjadi deployment gate produksi.
