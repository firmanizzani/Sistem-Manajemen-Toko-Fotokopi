import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Barang from '../models/Barang.js';
import Transaksi from '../models/Transaksi.js';
import Restock from '../models/Restock.js';
import { createTransaksi, cancelTransaksi } from '../services/transaksiService.js';
import { createRestock } from '../services/restockService.js';

// Contoh transaksi
const contoh = [
  {
    restock: true, catatan: 'Contoh restock kertas',
    barang: [['Kertas HVS A4 80 gsm (Rim)', 5], ['Kertas HVS F4 70 gsm (Rim)', 6]]
  },
  {
    restock: true, catatan: 'Contoh restock amplop',
    barang: [['Amplop Putih (Pak)', 10]]
  },
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
  await Promise.all([Barang.init(), Transaksi.init(), Restock.init()]);
  const barang = await Barang.find({ aktif: true });
  const idBarang = new Map(barang.map((item) => [item.nama, String(item._id)]));

  // Cek barang
  for (const transaksi of contoh) {
    const model = transaksi.restock ? Restock : Transaksi;
    if (await model.exists({ catatan: transaksi.catatan })) continue;
    for (const [nama] of transaksi.barang) {
      if (!idBarang.has(nama)) throw new Error(`Barang "${nama}" belum tersedia. Jalankan npm run seed terlebih dahulu.`);
    }
  }

  let ditambahkan = 0;
  for (const data of contoh) {
    // Cegah duplikat
    const model = data.restock ? Restock : Transaksi;
    let transaksi = await model.findOne({ catatan: data.catatan });
    if (!transaksi) {
      const items = data.barang.map(([nama, jumlah]) => ({ barangId: idBarang.get(nama), jumlah }));
      const body = { items, catatan: data.catatan };
      transaksi = data.restock ? await createRestock(body) : await createTransaksi(body);
      ditambahkan += 1;
    }
    // Contoh pembatalan
    if (data.batal && transaksi.status === 'selesai') {
      await cancelTransaksi(String(transaksi._id), { alasan: 'Contoh pelanggan membatalkan pembelian' });
    }
  }
  console.log(`${ditambahkan} catatan contoh ditambahkan (penjualan/restock). Stok disesuaikan melalui proses transaksi.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
