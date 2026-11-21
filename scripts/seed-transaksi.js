import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import Barang from '../src/models/Barang.js';
import Transaksi from '../src/models/Transaksi.js';
import { createTransaksi, cancelTransaksi } from '../src/services/transaksiService.js';

// Contoh penjualan
const contoh = [
  {
    catatan: 'Contoh penjualan pulpen dan buku',
    barang: [['Pulpen Pilot Hitam', 3], ['Buku Tulis Sinar Dunia 38', 2]]
  },
  {
    catatan: 'Contoh penjualan stabilo dan lem',
    barang: [['Stabilo Boss Kuning', 2], ['Lem Kertas Stick', 2]]
  },
  {
    catatan: 'Contoh penjualan yang dibatalkan',
    barang: [['Spidol Biru', 1], ['Penghapus Joyko Putih', 2]], batal: true
  }
];

try {
  await connectDatabase();
  await Promise.all([Barang.init(), Transaksi.init()]);
  const barang = await Barang.find({ aktif: true });
  const idBarang = new Map(barang.map((item) => [item.nama, String(item._id)]));

  // Cek barang
  for (const transaksi of contoh) {
    if (await Transaksi.exists({ catatan: transaksi.catatan })) continue;
    for (const [nama] of transaksi.barang) {
      if (!idBarang.has(nama)) throw new Error(`Barang "${nama}" belum tersedia. Jalankan npm run seed terlebih dahulu.`);
    }
  }

  let ditambahkan = 0;
  for (const data of contoh) {
    // Cegah duplikat
    let transaksi = await Transaksi.findOne({ catatan: data.catatan });
    if (!transaksi) {
      const items = data.barang.map(([nama, jumlah]) => ({ barangId: idBarang.get(nama), jumlah }));
      const body = { items, catatan: data.catatan };
      transaksi = await createTransaksi(body);
      ditambahkan += 1;
    }
    // Contoh pembatalan
    if (data.batal && transaksi.status === 'selesai') {
      await cancelTransaksi(String(transaksi._id), { alasan: 'Contoh pelanggan membatalkan pembelian' });
    }
  }
  console.log(`${ditambahkan} contoh penjualan ditambahkan. Stok disesuaikan melalui proses penjualan dan pembatalan.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
