# Testing

Vertical slice: service unit tests cover load, completion, unknown entry, and mutation idempotency. Flutter widget/state tests cover progress calculation and completion state. Future gates add PostgreSQL integration, API E2E, authorization/privacy, offline replay, celebration idempotency, accessibility, and performance.

Untuk menguji reward visual Circle di development, gunakan `PATCH /v1/circles/:id/testing/level` sebagai Owner. Nilai level yang diterima adalah 1–30. Setelah pengujian, panggil `DELETE /v1/circles/:id/testing/level` agar Circle kembali menggunakan EXP asli dari amalan anggota. Fitur ini tidak tersedia saat `NODE_ENV=production`.
