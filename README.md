# Sistem Manajemen Toko Fotokopi

REST API untuk mengelola barang, stok, dan transaksi toko fotokopi. Final Project Backend Basic KSM Veterantech UPNVJ 2026.

## Fitur

- CRUD barang, validasi input, dan pencegahan nama duplikat.
- Pencarian, filter kategori, stok menipis, dan pemeriksaan stok habis.
- Transaksi masuk/penjualan dengan beberapa barang sekaligus.
- Perubahan stok otomatis, riwayat transaksi, dan pembatalan.
- Laporan nilai inventaris dan total penjualan.

## Teknologi

Node.js >=20.19, ExpressJS, MongoDB, Mongoose, dan dotenv. Pengujian menggunakan Supertest, Node Test Runner, serta Newman/Postman.

## Menjalankan proyek

Pastikan Node.js dan MongoDB Server sudah terpasang. Jalankan dari folder **Finalproject**:

```powershell
npm ci
Copy-Item .env.example .env
npm start
```

Salin `.env` hanya pada instalasi pertama. API berjalan di `http://127.0.0.1:3000`. MongoDB menggunakan Windows Service lokal di port **27017**, dengan replica set `rsFotokopi` agar transaksi stok konsisten. Service otomatis berjalan saat Windows menyala.

Opsional: jalankan `npm run seed` untuk mengisi **15 barang contoh** dari `data/barang-awal.json`. File ini hanya untuk pengisian awal; API menggunakan MongoDB. Seed ulang tidak menimpa barang yang sudah ada.

Hentikan API dengan Ctrl+C. MongoDB tetap berjalan sebagai service; biasanya cukup jalankan `npm start` saat ingin memakai API lagi.

## Struktur kode

- `index.js`: server Express dan penanganan error.
- `routes/`: daftar URL dan HTTP method.
- `controllers/`: menerima request dan mengirim response.
- `services/`: logika barang, transaksi, dan laporan; validasi berulang ada di satu file `validation.js`.
- `models/`: bentuk data barang dan transaksi di MongoDB.
- `config/database.js`: koneksi MongoDB.

Contoh alur: `POST /api/barang` → `barangRoutes.js` → `barangController.js` → `barangService.js` → model `Barang`.

## Endpoint API

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/api/health` | Cek koneksi database |
| POST | `/api/barang` | Tambah barang |
| GET | `/api/barang` | Daftar, pencarian, dan filter barang |
| GET | `/api/barang/stok-menipis` | Daftar stok menipis |
| GET | `/api/barang/ketersediaan` | Cek ketersediaan stok |
| GET | `/api/barang/:id` | Detail barang |
| PATCH | `/api/barang/:id` | Ubah data barang |
| DELETE | `/api/barang/:id` | Arsipkan barang dengan stok nol |
| POST | `/api/transaksi` | Catat barang masuk/penjualan |
| GET | `/api/transaksi` | Riwayat transaksi |
| GET | `/api/transaksi/:id` | Detail transaksi |
| PATCH | `/api/transaksi/:id/batal` | Batalkan transaksi dan pulihkan stok |
| GET | `/api/laporan/inventaris` | Ringkasan stok dan nilai inventaris |
| GET | `/api/laporan/penjualan` | Total penjualan dan rekap harian |

Body POST/PATCH menggunakan JSON. Stok setelah pembuatan barang diubah melalui transaksi. Detail barang setiap transaksi disimpan dalam array `items`.

## Pengujian

Dengan service MongoDB aktif:

```powershell
npm test
npm run test:postman
```

Untuk Postman, import [collection ini](postman/sistem-manajemen-toko-fotokopi.postman_collection.json) dan jalankan berurutan. Hasil terakhir: **20 test integrasi dan 73 assertion Postman lulus**.

Contoh request tersedia di collection Postman. Bukti pengujian otomatis tersimpan di [hasil pengujian](postman/hasil-pengujian.json). Query barang: `q`, `kategori`, `stokMaks`; query riwayat: `jenis`, `status`, `barangId`, `dari`, `sampai` (tanggal `YYYY-MM-DD`, WIB).

**Author:** Muhammad Firman Izzani (2510512069).
