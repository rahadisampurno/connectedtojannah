# Design System

## Prinsip

Premium Islamic fantasy adventure yang tenang. Environment adalah hero; kartu hanya membingkai tindakan. Progress merepresentasikan aktivitas di aplikasi, bukan pahala atau tingkat iman.

## Tokens

| Token | Nilai | Penggunaan |
|---|---:|---|
| Midnight Navy | `#0D2A4A` | background utama |
| Deep Navy | `#143B63` | surface gelap |
| Warm Gold | `#D9B66F` | fokus dan celebratory glow |
| Teal | `#3E9E9A` | progress dan state selesai |
| Ivory | `#F7F2E8` | surface terang |
| Text Dark | `#183044` | teks di atas ivory |

Typography: `Cormorant Garamond`/serif sistem untuk display, `Inter`/sans-serif sistem untuk body. Minimum body 14sp, touch target 48dp. Radius 18–28dp, border tipis ivory/gold, shadow biru gelap transparan.

## Components

`CTJButton`, `CTJCard`, `CTJProgress`, `CTJCircleCard`, `CTJAmalanCard`, `CTJBottomNavigation`, `CTJWorldScene`, `CTJLoadingState`, `CTJErrorState`, dan `CTJEmptyState` memakai tokens terpusat.

## Motion

- Micro 160–240ms; transition 300–420ms; world loop 8–20s.
- Completion: glow + scale lembut + status teks; tidak bergantung pada animasi saja.
- `MediaQuery.disableAnimations` mematikan particles/parallax dan mengurangi durasi.

## Copy

Hangat, tenang, positif. Gunakan “Progress diperbarui”, bukan skor pahala. Hindari rasa bersalah dan perbandingan kesalehan.
