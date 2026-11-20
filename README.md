# Sistem Manajemen Toko Fotokopi

REST API untuk mengelola barang, stok, penjualan, dan restock. Final Project Backend Basic KSM Veterantech UPNVJ 2026.

## Fitur

- CRUD barang melalui GET, POST, PUT, PATCH, dan DELETE, dengan validasi input serta pencegahan nama duplikat.
- Pencarian nama, filter kategori/stok, pengurutan, dan pagination.
- Pemeriksaan stok menipis, barang habis, dan ketersediaan stok.
- Penjualan beberapa barang sekaligus, dengan perhitungan total dan pengurangan stok otomatis.
- Restock barang dengan penambahan stok otomatis dan riwayat tersendiri.
- Riwayat penjualan/restock yang dapat difilter berdasarkan tanggal, status, dan barang.
- Pembatalan penjualan/restock dengan pengembalian perubahan stok.
- Laporan jumlah jenis barang, total unit, dan estimasi nilai inventaris.
- Laporan total penjualan, jumlah unit terjual, dan rekap harian.

## Teknologi

Node.js >=20.19, ExpressJS, MongoDB, Mongoose, dan dotenv. Pengujian: Supertest, Node Test Runner, serta Newman/Postman.

## Menjalankan

Pastikan service MongoDB aktif pada port **27017** dengan replica set **rsFotokopi**. Jalankan dari folder **Finalproject**:

```powershell
npm ci
Copy-Item .env.example .env
npm start
```

Salin `.env` hanya saat instalasi pertama. API: `http://127.0.0.1:3000`.

Data contoh opsional: jalankan `npm run seed`, lalu `npm run seed:transaksi`. Perintah ini mengisi 15 barang, 3 penjualan, dan 2 restock tanpa menggandakan contoh yang sudah ada.

## Endpoint API

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/api/health` | Cek koneksi |
| GET | `/api/barang` | Daftar, pencarian, dan filter barang |
| POST | `/api/barang` | Tambah barang |
| GET | `/api/barang/:id` | Detail barang |
| PUT | `/api/barang/:id` | Ganti nama, kategori, harga, dan stok minimum |
| PATCH | `/api/barang/:id` | Ubah sebagian data barang |
| DELETE | `/api/barang/:id` | Hapus permanen barang |
| GET | `/api/barang/stok-menipis` | Stok menipis |
| GET | `/api/barang/ketersediaan` | Ketersediaan stok |
| POST | `/api/transaksi` | Catat penjualan |
| GET | `/api/transaksi` | Riwayat penjualan |
| GET | `/api/transaksi/:id` | Detail penjualan |
| PATCH | `/api/transaksi/:id/batal` | Batalkan penjualan dan kembalikan stok |
| POST | `/api/restock` | Tambah stok |
| GET | `/api/restock` | Riwayat restock |
| GET | `/api/restock/:id` | Detail restock |
| PATCH | `/api/restock/:id/batal` | Batalkan restock jika stok masih cukup |
| GET | `/api/laporan/inventaris` | Ringkasan inventaris |
| GET | `/api/laporan/penjualan` | Total penjualan dan rekap harian |

Body POST/PUT/PATCH menggunakan JSON. Stok berubah melalui penjualan, restock, dan pembatalan. Timestamp barang diisi otomatis. Riwayat tetap tersimpan setelah barang dihapus, tetapi transaksi terkait tidak dapat dibatalkan lagi.

## Pengujian

Import [collection presentasi](postman/sistem-manajemen-toko-fotokopi.postman_collection.json) ke Postman. Mulai dari **0. Health Check**, lalu ikuti urutan request. Contoh body dan keterangan variabel tersedia di collection.

Pengujian otomatis:

```powershell
npm test
npm run test:postman
```

Hasil terakhir: **24 test integrasi dan 85 assertion lulus**. [Bukti pengujian](postman/hasil-pengujian.json).

**Author:** Muhammad Firman Izzani (2510512069).
