# Architecture Assessment

## Audit awal

Repository kosong pada 7 September 2026: tidak ada source, dokumen, aset, atau riwayat konfigurasi yang dapat dipertahankan. Karena itu monorepo dibuat dari nol.

## Keputusan

- Next.js mobile-first/PWA menjadi aplikasi full-stack MVP. Route Handler `/api/v1` menggunakan service domain dari `api/src`, sehingga frontend dan backend berjalan dalam satu process Node.js. Flutter dipertahankan sebagai jalur native opsional, bukan dependency peluncuran awal.
- Progress dihitung server-side. Klien mengirim `clientMutationId`; server menyimpan hasil idempoten.
- UI memakai optimistic feedback terbatas, tetapi selalu mengganti state dengan response server.
- Repository domain dipisahkan dari controller dan kini menggunakan PostgreSQL tanpa mengubah kontrak klien.
- Journey World dibuat sebagai komposisi berlapis: generated base art + gradient, glow, particles, dan foreground procedural. Versi berikutnya memecah base art menjadi layer transparan.
- Default privacy `COMPLETION_ONLY`. Endpoint circle future wajib memfilter field setelah authorization, bukan di klien.

## Blocking decisions sebelum production

1. Keputusan apakah email/password tetap menjadi satu-satunya identitas atau ditambah magic link/Apple/Google.
2. Domain production dan kebijakan retensi akun/data.
3. Dewan/reviewer konten agama dan alur persetujuan aset.
4. Firebase project dan kebijakan analytics.

Keputusan ini tidak menghalangi vertical slice lokal, tetapi menghalangi klaim production-ready penuh.
