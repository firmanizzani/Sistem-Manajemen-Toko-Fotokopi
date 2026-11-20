import Barang from '../models/Barang.js';
import Transaksi from '../models/Transaksi.js';
import { success } from '../utils/http.js';
import { queryFields, dateFilter } from '../utils/validation.js';

export async function inventaris(req, res) {
  queryFields(req.query, []);
  const [data] = await Barang.aggregate([
    { $match: { aktif: true } },
    { $group: { _id: null, jumlahJenisBarang: { $sum: 1 }, totalStok: { $sum: '$stok' },
      totalNilaiInventaris: { $sum: { $multiply: ['$stok', '$harga'] } },
      jumlahStokMenipis: { $sum: { $cond: [{ $lte: ['$stok', '$stokMinimum'] }, 1, 0] } },
      jumlahStokHabis: { $sum: { $cond: [{ $eq: ['$stok', 0] }, 1, 0] } }
    } }, { $project: { _id: 0 } }
  ]);
  return success(res, data ?? { jumlahJenisBarang: 0, totalStok: 0, totalNilaiInventaris: 0, jumlahStokMenipis: 0, jumlahStokHabis: 0 });
}

export async function penjualan(req, res) {
  queryFields(req.query, ['dari', 'sampai']);
  const match = { jenis: 'keluar', status: 'selesai', ...dateFilter(req.query) };
  const [data] = await Transaksi.aggregate([
    { $match: match },
    { $facet: {
      ringkasan: [{ $group: { _id: null, jumlahTransaksi: { $sum: 1 }, totalPenjualan: { $sum: '$total' }, totalUnitTerjual: { $sum: { $sum: '$items.jumlah' } } } }, { $project: { _id: 0 } }],
      harian: [{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$tanggal', timezone: '+07:00' } }, jumlahTransaksi: { $sum: 1 }, totalPenjualan: { $sum: '$total' } } }, { $sort: { _id: 1 } }, { $project: { _id: 0, tanggal: '$_id', jumlahTransaksi: 1, totalPenjualan: 1 } }]
    } }
  ]);
  return success(res, { ...(data.ringkasan[0] ?? { jumlahTransaksi: 0, totalPenjualan: 0, totalUnitTerjual: 0 }), harian: data.harian });
}
