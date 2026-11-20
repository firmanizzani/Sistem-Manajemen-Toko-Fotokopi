# Bukti pengujian dan panduan demonstrasi

Pengujian dilakukan pada 20 November 2026 menggunakan MongoDB lokal replica set khusus proyek. Semua pengujian menggunakan database sementara yang terpisah dari `toko_fotokopi`.

## Hasil pengujian integrasi

Perintah: `npm test`.

**20 test lulus, 0 gagal.** Skenario meliputi CRUD, duplikasi nama, input tidak valid, path/query parameter, JSON/content type, stok menipis, ketersediaan, valuasi inventaris, penjualan banyak item, rollback ketika item kedua gagal, snapshot harga/nama, restock, pembatalan, stok yang telah terpakai, filter tanggal WIB, barang arsip, dan database kosong.

Pengujian konkurensi juga lulus: dua penjualan bersamaan tidak menghasilkan stok negatif; dua pembatalan bersamaan hanya mengembalikan stok satu kali.

## Hasil collection Postman

Perintah: `npm run test:postman`.

**31 request, 73 assertion lulus, 0 gagal**, dijalankan melalui Newman menggunakan collection yang sama dengan yang dapat diimpor ke aplikasi Postman. Bukti terstruktur, waktu run, status setiap request, dan hasil assertion ada di `hasil-postman.json`.

Pengujian otomatis ini bukan screenshot aplikasi Postman. Untuk memenuhi kebutuhan demonstrasi, buka collection di Postman dan simpan screenshot hasil Collection Runner serta response yang ingin dijelaskan.

## Urutan presentasi yang disarankan

1. Tunjukkan struktur server, routes, controllers, services, models, serta `.env.example`.
2. Jalankan health check dan daftar 15 barang hasil seed.
3. Tunjukkan filter nama/kategori dan daftar stok menipis/habis.
4. Buat barang baru, tampilkan detail, dan ubah harga atau kategori.
5. Catat barang masuk berisi dua barang, lalu tunjukkan penambahan stok.
6. Catat penjualan dua barang; jelaskan detail `items`, perhitungan total, dan stok berkurang.
7. Coba penjualan melebihi stok. Tunjukkan HTTP 409 serta stok yang tidak berubah sebagian.
8. Tampilkan riwayat dengan query tanggal/jenis/barang dan laporan penjualan.
9. Batalkan penjualan, tunjukkan stok pulih dan penjualan batal tidak dihitung.
10. Arsipkan barang dengan stok nol; jelaskan bahwa riwayat tetap dipertahankan.
11. Jalankan Collection Runner dan tunjukkan hasil seluruh assertion.

## Batas pengujian

- Backend dan collection diuji otomatis secara lokal; belum diunggah ke GitHub dan belum diterapkan ke server publik.
- API tidak menyediakan autentikasi dan ditujukan untuk tugas/demo lokal.
- Collection manual membuat data demo dan mengarsipkannya setelah selesai, tanpa menghapus riwayat.
- Dependency Newman membawa temuan audit pada dependency transitif development. Gunakan hanya collection proyek yang dipercaya. Dependency runtime diperiksa terpisah dengan `npm audit --omit=dev`; Newman tidak diperlukan ketika server dijalankan dengan instalasi production.
