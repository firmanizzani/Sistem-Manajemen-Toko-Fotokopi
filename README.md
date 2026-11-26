# Sistem Manajemen Toko Fotokopi

**Author:** Muhammad Firman Izzani (2510512069).

Sistem Manajemen Toko Fotokopi adalah aplikasi backend berbasis REST API untuk membantu pengelolaan persediaan barang dan pencatatan penjualan di toko fotokopi. Aplikasi ini dikembangkan menggunakan Node.js dan ExpressJS, dengan MongoDB sebagai database, untuk Final Project Backend Basic KSM Veterantech UPNVJ 2026.

Pengguna dapat mengelola data barang, mencatat penjualan beberapa barang sekaligus, serta menambah stok melalui restock. Setiap penjualan mengurangi stok secara otomatis, sedangkan restock menambah stok. Riwayat penjualan dan restock disimpan secara terpisah agar perubahan stok mudah ditelusuri. Aplikasi juga menyediakan pembatalan, pemeriksaan stok menipis atau habis, serta laporan inventaris dan total penjualan. Seluruh fitur diakses melalui HTTP request dan dapat dicoba menggunakan Postman.

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

## Struktur Folder

```text
Finalproject/
├── data/                       # Data contoh untuk seed dan pengujian
│   └── barang-awal.json
├── postman/                    # Collection API dan laporan pengujiannya
│   ├── sistem-manajemen-toko-fotokopi.postman_collection.json
│   └── hasil-pengujian.json
├── scripts/                    # Script pengisian data contoh ke MongoDB
│   ├── seed.js
│   ├── seed-restock.js
│   └── seed-transaksi.js
├── src/                        # Kode utama aplikasi
│   ├── config/                 # Konfigurasi koneksi MongoDB
│   │   └── database.js
│   ├── controllers/            # Membaca request dan mengirim respons JSON
│   │   ├── barangController.js
│   │   ├── laporanController.js
│   │   ├── restockController.js
│   │   └── transaksiController.js
│   ├── middlewares/            # Pemeriksaan tipe konten dan penanganan error
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   └── validateJson.js
│   ├── models/                 # Schema dan model data Mongoose
│   │   ├── Barang.js
│   │   ├── Restock.js
│   │   └── Transaksi.js
│   ├── routes/                 # Pemetaan method dan URL ke controller
│   │   ├── barangRoutes.js
│   │   ├── laporanRoutes.js
│   │   ├── restockRoutes.js
│   │   └── transaksiRoutes.js
│   ├── services/               # Aturan bisnis, perubahan stok, dan laporan
│   │   ├── barangService.js
│   │   ├── laporanService.js
│   │   ├── restockService.js
│   │   └── transaksiService.js
│   ├── utils/                  # Alat bantu error, pagination, dan filter
│   │   ├── AppError.js
│   │   └── queryHelpers.js
│   ├── validators/             # Validasi input barang, transaksi, dan query
│   │   ├── barangValidator.js
│   │   ├── commonValidator.js
│   │   └── transaksiValidator.js
│   ├── app.js                  # Menyusun middleware dan route Express
│   └── server.js               # Menghubungkan database dan menjalankan server
├── tests/                      # Pengujian otomatis API dan collection Postman
│   ├── api.test.js
│   └── postman.test.js
├── .env.example                # Template konfigurasi environment
├── .gitignore                  # Aturan file yang diabaikan Git
├── package.json                # Identitas, dependency, dan perintah npm
├── package-lock.json           # Versi dependency yang dikunci npm
└── README.md                   # Dokumentasi proyek
```

File `.env` dibuat saat setup lokal, sedangkan `node_modules/` dihasilkan oleh instalasi dependency. Keduanya diabaikan Git dan tidak ditampilkan pada struktur di atas.

Alur utama request: **route → controller → service → model → MongoDB**. Service memanggil validator untuk memeriksa input, controller mengirim hasil sebagai JSON, dan middleware `errorHandler` menangani error yang diteruskan.

## Menjalankan

Pastikan service MongoDB aktif pada port **27017** dengan replica set **rsFotokopi**. Jalankan dari folder **Finalproject**:

```powershell
npm ci
Copy-Item .env.example .env
npm start
```

Salin `.env` hanya saat instalasi pertama. API: `http://127.0.0.1:3000`.

Data contoh opsional: jalankan berurutan `npm run seed` (15 barang), `npm run seed:restock` (2 restock), lalu `npm run seed:transaksi` (3 penjualan). Setiap script melewati contoh yang sudah ada agar tidak menggandakan data dan perubahan stok.

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
