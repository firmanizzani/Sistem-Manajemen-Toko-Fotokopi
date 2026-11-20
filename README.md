# Sistem Manajemen Toko Fotokopi

REST API untuk mengelola barang, stok, dan transaksi toko fotokopi. Final Project Backend Basic KSM Veterantech UPNVJ 2026.

## Fitur

- CRUD barang, validasi input, dan pencegahan nama duplikat.
- Pencarian, filter kategori, stok menipis, dan pemeriksaan stok habis.
- Penjualan dengan beberapa barang sekaligus dan restock terpisah.
- Perubahan stok otomatis, riwayat transaksi, dan pembatalan.
- Laporan nilai inventaris dan total penjualan.

Collection `barang` menyimpan stok, `transaksi` khusus penjualan pelanggan, dan `restock` khusus riwayat barang masuk. Nomor penjualan memakai awalan `TRX-`, sedangkan restock memakai `RST-`.

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

Setelah barang tersedia, `npm run seed:transaksi` mengisi **3 penjualan contoh** (2 selesai, 1 dibatalkan) dan **2 restock**, sekaligus menyesuaikan stok. Menjalankannya ulang tidak menggandakan contoh yang sama.

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
| DELETE | `/api/barang/:id` | Hapus permanen barang dengan stok nol |
| POST | `/api/transaksi` | Catat penjualan pelanggan |
| GET | `/api/transaksi` | Riwayat penjualan |
| GET | `/api/transaksi/:id` | Detail transaksi |
| PATCH | `/api/transaksi/:id/batal` | Batalkan transaksi dan pulihkan stok |
| POST | `/api/restock` | Catat barang masuk dan tambah stok |
| GET | `/api/restock` | Riwayat restock |
| GET | `/api/restock/:id` | Detail restock |
| PATCH | `/api/restock/:id/batal` | Batalkan restock jika stok masih cukup |
| GET | `/api/laporan/inventaris` | Ringkasan stok dan nilai inventaris |
| GET | `/api/laporan/penjualan` | Total penjualan dan rekap harian |

Body POST/PATCH menggunakan JSON. Stok setelah pembuatan barang diubah melalui penjualan, restock, dan pembatalan. Detail barang disimpan dalam array `items`; body penjualan/restock cukup berisi `items` dan `catatan` opsional, tanpa `jenis`.

PATCH barang cukup berisi field yang diubah, misalnya `{ "harga": 5000 }`.

DELETE menghapus barang dari MongoDB, sedangkan riwayat transaksinya tetap tersimpan. Transaksi yang melibatkan barang yang sudah dihapus tidak dapat dibatalkan. Selesaikan koreksi transaksi sebelum menghapus barang.

## Pengujian

Dengan service MongoDB aktif:

```powershell
npm test
npm run test:postman
```

Untuk Postman, import [collection ini](postman/sistem-manajemen-toko-fotokopi.postman_collection.json) dan jalankan berurutan. Hasil terakhir: **23 test integrasi dan 79 assertion Postman lulus**.

Contoh request tersedia di collection Postman. Bukti pengujian otomatis tersimpan di [hasil pengujian](postman/hasil-pengujian.json). Query barang: `q`, `kategori`, `stokMaks`; query riwayat penjualan/restock: `status`, `barangId`, `dari`, `sampai` (tanggal `YYYY-MM-DD`, WIB).

**Author:** Muhammad Firman Izzani (2510512069).
