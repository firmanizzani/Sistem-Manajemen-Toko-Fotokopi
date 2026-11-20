import Barang from '../models/Barang.js';
import Transaksi from '../models/Transaksi.js';
import { validateQuery, getDateFilter } from './validation.js';

// Ringkasan inventaris
export async function getInventaris(query) {
  validateQuery(query, []);
  const barang = await Barang.find({ aktif: true }).lean();

  return {
    jumlahJenisBarang: barang.length,
    totalStok: barang.reduce((total, item) => total + item.stok, 0),
    totalNilaiInventaris: barang.reduce((total, item) => total + item.stok * item.harga, 0),
    jumlahStokMenipis: barang.filter((item) => item.stok <= item.stokMinimum).length,
    jumlahStokHabis: barang.filter((item) => item.stok === 0).length
  };
}

// Ringkasan penjualan
export async function getPenjualan(query) {
  validateQuery(query, ['dari', 'sampai']);
  const transaksi = await Transaksi.find({
    jenis: 'keluar', status: 'selesai', ...getDateFilter(query)
  }).lean();

  let totalPenjualan = 0;
  let totalUnitTerjual = 0;
  const penjualanHarian = {};

  // Hitung total
  for (const penjualan of transaksi) {
    totalPenjualan += penjualan.total;
    totalUnitTerjual += penjualan.items.reduce((total, item) => total + item.jumlah, 0);

    // Tanggal WIB
    const tanggal = new Date(penjualan.tanggal.getTime() + 7 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    if (!penjualanHarian[tanggal]) {
      penjualanHarian[tanggal] = { tanggal, jumlahTransaksi: 0, totalPenjualan: 0 };
    }
    penjualanHarian[tanggal].jumlahTransaksi += 1;
    penjualanHarian[tanggal].totalPenjualan += penjualan.total;
  }

  return {
    jumlahTransaksi: transaksi.length,
    totalPenjualan,
    totalUnitTerjual,
    harian: Object.values(penjualanHarian).sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  };
}
