# Sistem Manajemen Toko Fotokopi

REST API untuk mengelola barang, stok, transaksi barang masuk, penjualan, riwayat, dan laporan sederhana. Dibuat sebagai Final Project Study Club Backend Basic KSM Veterantech UPNVJ 2026 oleh Muhammad Firman Izzani (2510512069).

## Fitur

- CRUD barang dengan validasi nama duplikat tanpa membedakan kapital dan spasi berulang.
- Pencarian nama, filter kategori/stok, pengurutan, dan pagination.
- Stok menipis berdasarkan stok minimum masing-masing barang atau batas dari query.
- Pemeriksaan ketersediaan dan daftar barang habis.
- Total unit barang serta estimasi nilai inventaris berdasarkan harga satuan.
- Transaksi masuk dan keluar yang mendukung 1–50 jenis barang dalam satu transaksi.
- Stok otomatis bertambah/berkurang ketika transaksi berhasil.
- MongoDB transaction: seluruh perubahan stok dan riwayat berhasil bersama atau dibatalkan bersama.
- Pembatalan transaksi dengan alasan dan pengembalian perubahan stok tepat satu kali.
- Riwayat dengan filter jenis, status, barang, dan rentang tanggal.
- Snapshot nama dan harga saat penjualan agar riwayat tidak mengikuti perubahan master barang.
- Laporan total penjualan, total unit terjual, dan rekap harian; transaksi batal tidak dihitung.
- 15 barang awal: 8 barang dari Miniproject dan 7 tambahan, termasuk stok menipis/habis.

Stok langsung diperbarui di database setelah request transaksi berhasil. Untuk melihat nilai terbaru, client melakukan GET kembali. Proyek ini berupa backend REST API; belum menyediakan frontend, WebSocket, akun pengguna, atau fitur layanan cetak/fotokopi. Semua transaksi keluar pada versi ini berarti penjualan barang. Harga menggunakan rupiah bulat; tidak ada harga beli, netto, laba, atau biaya operasional.

## Teknologi dan dependencies

- Node.js >=20.19 (dikembangkan dan diuji dengan Node.js 24.16).
- ExpressJS 5 untuk HTTP server dan routing.
- Mongoose 9 untuk schema dan integrasi MongoDB.
- dotenv untuk konfigurasi environment.
- MongoDB lokal dengan replica set satu node untuk pengembangan.
- Supertest dan Node Test Runner untuk pengujian integrasi.
- Newman untuk menjalankan collection Postman secara otomatis.

Versi persis dependencies dikunci dalam `package-lock.json`. Gunakan `npm ci` untuk instalasi yang dapat diulang.

## Instalasi dan menjalankan server (Windows/PowerShell)

Jalankan perintah berikut di folder **Finalproject**:

```powershell
npm ci
Copy-Item .env.example .env
npm run db:start
npm run seed
npm start
```

Jika `.env` sudah ada, pertahankan konfigurasi yang sudah Anda isi. Perintah salin hanya diperlukan pada instalasi pertama.

Server default: `http://127.0.0.1:3000`. Health check: `GET http://127.0.0.1:3000/api/health`.

Untuk development dengan reload: `npm run dev`. Hentikan server dengan Ctrl+C. Setelah server dihentikan, MongoDB proyek dapat dihentikan dengan `npm run db:stop`. Data tetap tersimpan.

### MongoDB khusus proyek

MongoDB lama pada port 27017 tidak diubah. Script `db:start` menjalankan `mongod` lokal pada **127.0.0.1:27018**, dengan replica set **rsFotokopi** dan data/log di `.local/mongo/` dalam Finalproject. Folder ini diabaikan Git. Di Windows, proses berjalan tanpa membuka jendela baru.

Transaksi multi-dokumen membutuhkan replica set; MongoDB standalone tidak mendukungnya. Script menolak mengubah atau menghentikan instance di port 27018 jika lokasi datanya berbeda. Jika `mongod` tidak ditemukan otomatis:

```powershell
$env:MONGOD_PATH = 'C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe'
npm run db:start
```

Konfigurasi `.env`:

```dotenv
PORT=3000
HOST=127.0.0.1
MONGODB_URI=mongodb://127.0.0.1:27018/toko_fotokopi?replicaSet=rsFotokopi&directConnection=true
```

MongoDB Compass maupun mongosh dapat terhubung menggunakan URI tersebut. Bisa juga menggunakan replica set lain/Atlas dengan menyesuaikan URI. Setup lokal ini ditujukan untuk development dan hanya mendengarkan localhost.

`npm run seed` hanya menambahkan barang yang belum ada berdasarkan nama terstandardisasi. Menjalankannya lagi tidak mereset stok, harga, atau riwayat. Stok seed menjadi saldo awal, bukan transaksi penjualan.

## Model data

Hanya ada dua collection aplikasi:

| Collection | Field utama |
| --- | --- |
| `barang` | `_id`, `nama`, `namaKunci` (internal), `kategori`, `harga`, `stok`, `stokMinimum`, `aktif`, `createdAt`, `updatedAt` |
| `transaksi` | `_id`, `nomorTransaksi`, `jenis`, `tanggal`, `items[]`, `total`, `status`, `catatan`, `alasanPembatalan`, `dibatalkanPada`, timestamps |

Setiap item transaksi berisi `barangId`, snapshot `nama`, `jumlah`, `harga`, dan `subtotal`. Detail disimpan di array `items`, sehingga satu transaksi bisa mencakup beberapa jenis barang tanpa collection detail terpisah. Laporan penjualan dihitung dari transaksi; tidak ada collection total penghasilan.

## Daftar endpoint

Semua body POST/PATCH menggunakan `Content-Type: application/json`. Base URL: `http://127.0.0.1:3000`.

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/api/health` | Status aplikasi dan koneksi database |
| POST | `/api/barang` | Membuat barang beserta saldo stok awal opsional |
| GET | `/api/barang` | Daftar barang aktif, pencarian/filter/sort/pagination |
| GET | `/api/barang/stok-menipis` | Barang dengan stok <= minimum atau batas query |
| GET | `/api/barang/ketersediaan` | Status seluruh stok dan daftar barang habis |
| GET | `/api/barang/:id` | Detail barang, termasuk barang yang diarsipkan |
| PATCH | `/api/barang/:id` | Memperbarui nama, kategori, harga, stok minimum |
| DELETE | `/api/barang/:id` | Menghapus dari daftar aktif melalui pengarsipan, hanya saat stok nol |
| POST | `/api/transaksi` | Mencatat barang masuk/penjualan serta mengubah stok |
| GET | `/api/transaksi` | Riwayat transaksi dengan filter dan pagination |
| GET | `/api/transaksi/:id` | Detail transaksi beserta seluruh item |
| PATCH | `/api/transaksi/:id/batal` | Membatalkan transaksi dan mengembalikan perubahan stok |
| GET | `/api/laporan/inventaris` | Jumlah jenis barang, total stok/nilai, stok menipis/habis |
| GET | `/api/laporan/penjualan` | Total penjualan, unit terjual, dan rekap harian |

### Query parameter

| Endpoint | Parameter |
| --- | --- |
| `/api/barang` | `q` (pencarian nama), `kategori` (tepat sesuai kategori), `stokMaks`, `aktif=true/false`, `sort=nama/stok/-stok/terbaru`, `page`, `limit` |
| `/api/barang/stok-menipis` | `batas` (opsional; default stokMinimum setiap barang), `page`, `limit` |
| `/api/transaksi` | `jenis=masuk/keluar`, `status=selesai/dibatalkan`, `barangId`, `dari`, `sampai`, `page`, `limit` |
| `/api/laporan/penjualan` | `dari`, `sampai` |

`page` default 1, `limit` default 20 dan maksimum 100. `dari` dan `sampai` berformat `YYYY-MM-DD` dan mencakup seluruh hari dalam **UTC+07:00 (WIB)**. Timestamp response disimpan sebagai UTC/ISO. Tanggal transaksi ditentukan server. Query tidak dikenal atau berulang ditolak dengan 400.

Contoh:

```text
GET /api/barang?kategori=Alat%20Tulis&q=pulpen&sort=stok&page=1&limit=10
GET /api/barang/stok-menipis?batas=10
GET /api/transaksi?jenis=keluar&status=selesai&dari=2026-11-01&sampai=2026-11-30
GET /api/laporan/penjualan?dari=2026-11-01&sampai=2026-11-30
```

### Contoh body

Tambah barang:

```json
{
  "nama": "Pulpen Gel Hitam",
  "kategori": "Alat Tulis",
  "harga": 5000,
  "stok": 0,
  "stokMinimum": 10
}
```

Transaksi masuk atau keluar (ganti ID dengan `_id` barang dari response API):

```json
{
  "jenis": "keluar",
  "items": [
    { "barangId": "ID_BARANG_PULPEN", "jumlah": 2 },
    { "barangId": "ID_BARANG_BUKU", "jumlah": 3 }
  ],
  "catatan": "Penjualan alat tulis"
}
```

Ganti `jenis` menjadi `masuk` untuk restock. Client hanya mengirim barang dan jumlah; server mengambil harga dari database serta menghitung subtotal/total. Transaksi masuk menyimpan harga/subtotal/total nol karena tidak mencatat biaya pembelian.

Pembatalan:

```json
{ "alasan": "Pelanggan membatalkan pembelian" }
```

### Aturan konsistensi

- Semua angka stok/harga/jumlah harus bilangan bulat. Jumlah per item 1–1.000.000; harga/stok/stokMinimum 0–1.000.000.000. Maksimal 50 jenis barang per transaksi.
- Barang yang sama tidak boleh diulang di `items`; gabungkan jumlahnya.
- Setelah pembuatan barang, stok hanya berubah melalui transaksi dan pembatalan. PATCH stok langsung ditolak agar riwayat tetap dapat ditelusuri.
- Nama dan harga transaksi adalah snapshot. Mengedit barang tidak mengubah transaksi lama.
- Jika satu item tidak cukup stok atau tidak ditemukan, seluruh transaksi gagal tanpa perubahan sebagian.
- Pembatalan barang masuk hanya berhasil jika stok seluruh barang masih mencukupi untuk dikurangi kembali.
- Transaksi selesai tidak diedit/dihapus bebas. Gunakan pembatalan dan transaksi baru untuk koreksi. Pembatalan kedua ditolak.
- DELETE barang memakai **soft delete** (`aktif=false`) dan membutuhkan stok nol. Nama tetap dicadangkan, detail historis tetap tersimpan. Barang arsip tidak dapat ditransaksikan; pembatalan yang melibatkan barang arsip ditolak. Selesaikan pembatalan yang diperlukan sebelum pengarsipan.
- Setiap POST transaksi yang berhasil membuat transaksi baru. Hindari mengirim ulang request yang sudah sukses tanpa memeriksa riwayat.

### Format response dan status HTTP

```json
{
  "success": true,
  "message": "Daftar barang.",
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

Error berisi `success: false` dan `message`. Status: 200 berhasil, 201 dibuat, 400 input invalid, 404 tidak ditemukan, 409 duplikat/konflik stok/status, 413 body terlalu besar, 415 content type salah, 500 kesalahan server, 503 database tidak tersedia. Error asynchronous diteruskan dengan try/catch ke middleware; detail internal error server tidak dikirim ke client.

## Struktur proyek

```text
src/
  app.js                 Konfigurasi Express dan pemasangan routes
  server.js              Koneksi database, startup, shutdown
  config/database.js     Koneksi dan validasi replica set
  models/                Schema barang dan transaksi
  routes/                Routing dan path parameter
  controllers/           Handler HTTP dan laporan
  services/              Aturan transaksi dan perubahan stok atomik
  middleware/            Penanganan error dan endpoint tidak ditemukan
  utils/                 Validasi, pagination, response, async handler
data/barang-awal.json     Data awal 15 barang
scripts/                 Database lokal, seed, dan runner Postman
tests/api.test.js        Pengujian integrasi dan konkurensi
postman/                 Collection siap diimpor
docs/                    Bukti pengujian dan panduan demonstrasi
.env.example             Contoh konfigurasi tanpa secret
```

## Pengujian

Setelah `npm run db:start`:

```powershell
npm test
npm run test:postman
```

Keduanya memakai database uji bernama unik dan membersihkannya setelah selesai. Database `toko_fotokopi` tidak direset. `test:postman` menjalankan server sementara pada port acak dan menyimpan hasil nyata ke `docs/hasil-postman.json`.

Untuk menguji manual melalui **Postman**:

1. Jalankan `npm start`.
2. Import `postman/sistem-manajemen-toko-fotokopi.postman_collection.json`.
3. Pastikan variable `baseUrl` adalah `http://127.0.0.1:3000`.
4. Jalankan seluruh collection berurutan melalui Collection Runner. Collection mengisi ID otomatis, sehingga tidak perlu menyalin ID manual.
5. Simpan screenshot hasil Runner dan response penting untuk demonstrasi/pengumpulan.

Run manual membuat dua barang demo bernama unik dan dua transaksi, lalu membatalkan transaksinya serta mengarsipkan barang demo di akhir. Jika dihentikan di tengah, data demo tetap ada. Gunakan database demo bila ingin memisahkan demonstrasi dari data utama.

Lihat `docs/PENGUJIAN.md` dan `docs/hasil-postman.json`. Berkas collection boleh dibuat ulang dengan `node scripts/generate-postman.js`.

## Git dan GitHub

Source code, lockfile, README, collection, dan bukti uji disertakan. `.env`, `node_modules`, dan database lokal tidak dimasukkan ke Git. Setelah membuat repository GitHub milik Anda, unggah repository Finalproject ke remote tersebut; jangan gunakan folder Miniproject sebagai tujuan pengerjaan.

```powershell
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin HEAD
```

Deadline pada instruksi tugas: **27 November 2026 pukul 23.59**. Pengumpulan melalui kelas masing-masing di Dignition. Tetap siapkan bukti Postman dan penjelasan alur CRUD/transaksi saat presentasi.

## Referensi

- Express error handling: https://expressjs.com/en/guide/error-handling.html
- MongoDB transactions: https://www.mongodb.com/docs/manual/core/transactions/
- Mongoose transactions: https://mongoosejs.com/docs/transactions.html
