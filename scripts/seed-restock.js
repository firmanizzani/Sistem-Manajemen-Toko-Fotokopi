import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import Barang from '../src/models/Barang.js';
import Restock from '../src/models/Restock.js';
import { createRestock } from '../src/services/restockService.js';

// Contoh restock
const contoh = [
  {
    catatan: 'Contoh restock kertas',
    barang: [['Kertas HVS A4 80 gsm (Rim)', 5], ['Kertas HVS F4 70 gsm (Rim)', 6]]
  },
  {
    catatan: 'Contoh restock amplop',
    barang: [['Amplop Putih (Pak)', 10]]
  }
];

try {
  await connectDatabase();
  await Promise.all([Barang.init(), Restock.init()]);
  const barang = await Barang.find({ aktif: true });
  const idBarang = new Map(barang.map((item) => [item.nama, String(item._id)]));

  // Cek barang
  for (const data of contoh) {
    if (await Restock.exists({ catatan: data.catatan })) continue;
    for (const [nama] of data.barang) {
      if (!idBarang.has(nama)) throw new Error(`Barang "${nama}" belum tersedia. Jalankan npm run seed terlebih dahulu.`);
    }
  }

  let ditambahkan = 0;
  for (const data of contoh) {
    // Cegah duplikat
    if (await Restock.exists({ catatan: data.catatan })) continue;
    const items = data.barang.map(([nama, jumlah]) => ({ barangId: idBarang.get(nama), jumlah }));
    await createRestock({ items, catatan: data.catatan });
    ditambahkan += 1;
  }
  console.log(`${ditambahkan} contoh restock ditambahkan. Stok ditambah melalui proses restock.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
