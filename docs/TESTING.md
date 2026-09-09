# Testing

Vertical slice: service unit/integration tests cover load, completion, unknown entry, and mutation idempotency. Flutter widget/state tests cover progress calculation and completion state. A production smoke test di `web/tests/single-service.test.mjs` memastikan satu server Next.js melayani UI, registrasi, onboarding, completion persisten, refresh session, logout, dan login.

Jalankan smoke test terhadap build production lokal:

```bash
npm run build
DATABASE_URL=postgresql://localhost/ctj_test \
ACCESS_TOKEN_SECRET=local-test-secret-minimal-64-karakter \
PORT=3100 npm start

# terminal kedua
E2E_BASE_URL=http://localhost:3100 npm test
```

Future gates menambahkan authorization/privacy negative coverage yang lebih luas, offline replay, celebration idempotency, accessibility, dan performance.

Untuk menguji reward visual Circle di development, gunakan `PATCH /v1/circles/:id/testing/level` sebagai Owner. Nilai level yang diterima adalah 1–30. Setelah pengujian, panggil `DELETE /v1/circles/:id/testing/level` agar Circle kembali menggunakan EXP asli dari amalan anggota. Fitur ini tidak tersedia saat `NODE_ENV=production`.
