# Database

Runtime lokal dan production memakai PostgreSQL. Pada managed Node.js Hostinger, gunakan PostgreSQL eksternal melalui `DATABASE_URL` dengan SSL; aplikasi Next.js tetap hanya satu service. Skema yang aktif: `users`, `refresh_sessions`, `daily_entries`, `daily_mutations`, `circles`, `circle_members`, `challenge_memberships`, `notifications`, dan `circle_invites`.

Constraint penting meliputi `(user_id, client_mutation_id)`, `(user_id, local_date, entry_key)`, keanggotaan Circle unik, serta challenge membership unik. Penyelesaian amalan dan pencatatan mutation ID berjalan dalam satu transaksi. Refresh token hanya disimpan sebagai hash; undangan juga disimpan sebagai hash, kedaluwarsa setelah 72 jam, dan sekali pakai.

Inisialisasi schema saat ini idempoten dan berjalan pada akses API pertama. Sebelum skala produksi: pindahkan migrasi startup menjadi versioned migrations, aktifkan backup/PITR, metrik pool dan slow query, audit log, serta strategi retensi data.
