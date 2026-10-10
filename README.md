# Stark Store

Website ecommerce / toko online (single merchant) — Next.js 16 App Router + TypeScript + Tailwind CSS.
Katalog, keranjang, checkout + ongkir real-time (RajaOngkir), pembayaran asli (Midtrans),
kelola pesanan, dan dashboard admin. UI Bahasa Indonesia.

## Syarat

- Node.js 20+
- Database PostgreSQL (mis. Supabase / Neon — paket gratis cukup untuk mulai)
- Akun Midtrans (sandbox untuk development; production butuh verifikasi/KYC)
- API key RajaOngkir (paket Starter)

## Setup lokal

```bash
# 1. Install
npm install

# 2. Isi env
cp .env.example .env
# lalu isi minimal: DATABASE_URL, AUTH_SECRET

# 3. Siapkan database
npx prisma db push
npx prisma db seed   # buat akun admin dari ADMIN_EMAIL / ADMIN_PASSWORD

# 4. Jalan
npm run dev          # http://localhost:3000
```

Login admin: pakai `ADMIN_EMAIL` / `ADMIN_PASSWORD` yang diisi saat seed.

## Environment variables

| Var | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | Ya | Connection string PostgreSQL |
| `AUTH_SECRET` | Ya | Random min. 32 char (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Tidak | Google OAuth (opsional) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Ya (seed) | Akun admin awal |
| `MIDTRANS_SERVER_KEY` | Untuk bayar | Server key Midtrans |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Untuk bayar | Client key (publik, aman di browser) |
| `MIDTRANS_IS_PRODUCTION` | Tidak | `true` = production, selain itu sandbox |
| `RAJAONGKIR_API_KEY` | Untuk ongkir | API key RajaOngkir Starter |
| `RAJAONGKIR_ORIGIN_CITY_ID` | Untuk ongkir | ID kota asal toko |
| `NEXT_PUBLIC_APP_URL` | Ya | URL publik app (untuk callback Midtrans) |
| `CRON_SECRET` | Ya (prod) | Pengaman endpoint cron expire pesanan |

Tanpa `MIDTRANS_*` / `RAJAONGKIR_*`, aplikasi tetap jalan & build lolos —
fitur bayar/ongkir menampilkan pesan jelas, tidak crash.

## Perintah

```bash
npm run dev        # development
npm run build      # production build
npm start          # jalankan hasil build
npx prisma studio  # GUI database
npx prisma db seed # (ulang) buat admin
```

## Deploy ke Vercel (oleh pemilik repo)

1. Push repo ke GitHub, lalu di Vercel: **Add New Project → Import** repo tersebut.
2. Isi **Environment Variables** (lihat tabel di atas; `DATABASE_URL` dari Supabase/Neon).
3. Deploy. Setelah itu jalankan sekali (via Vercel dashboard → Storage/Functions tidak bisa;
   cara termudah: jalankan lokal dengan `DATABASE_URL` production):
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
4. Di dashboard Midtrans: isi **Notification URL** dengan
   `https://<domain>/api/webhooks/midtrans`, dan Payment Notification diaktifkan.
5. Cron expire pesanan (24 jam) otomatis via `vercel.json` → `/api/cron/expire-orders`
   (butuh `CRON_SECRET` terisi; Vercel mengirimnya otomatis sebagai Bearer token).

## Alur penting

- **Stok**: dicadangkan (dikurangi) saat checkout dalam transaksi DB; final saat webhook
  Midtrans sukses (`capture`/`settlement`); dikembalikan bila pesanan expired (24 jam),
  dibatalkan, atau pembayaran gagal. Webhook idempoten & verifikasi signature SHA512.
- **Nominal**: selalu dihitung ulang dari DB di server sebelum membuat transaksi Midtrans.
- **Upload gambar**: tersimpan di `public/uploads/` (cocok untuk lokal/VPS). Untuk Vercel
  production, disarankan pindah ke object storage (Supabase Storage/Cloudinary) karena
  filesystem Vercel ephemeral.

## Struktur singkat

```
app/(shop)/        halaman pembeli (home, katalog, produk, keranjang, checkout, pesanan, akun, login)
app/admin/         dashboard admin (produk, kategori, banner, pesanan, ulasan, laporan)
app/api/           REST API + webhook Midtrans + cron
lib/               db, auth (Auth.js v5), midtrans, rajaongkir, format
prisma/            schema.prisma, seed.ts
proxy.ts           proteksi route (Next 16; pengganti middleware.ts)
```
