import Transaksi from '../models/Transaksi.js';
import { createTransaksi, cancelTransaksi } from '../services/transaksiService.js';
import { HttpError, success } from '../utils/http.js';
import { id, queryFields, dateFilter, pagination, metadata, fail } from '../utils/validation.js';

export async function create(req, res) {
  return success(res, await createTransaksi(req.body), 'Transaksi berhasil dicatat dan stok diperbarui.', 201);
}

export async function cancel(req, res) {
  return success(res, await cancelTransaksi(req.params.id, req.body), 'Transaksi dibatalkan dan perubahan stok dikembalikan.');
}

export async function list(req, res) {
  queryFields(req.query, ['jenis', 'status', 'barangId', 'dari', 'sampai', 'page', 'limit']);
  const filter = dateFilter(req.query);
  if (req.query.jenis !== undefined) {
    if (!['masuk', 'keluar'].includes(req.query.jenis)) fail('jenis harus masuk atau keluar.');
    filter.jenis = req.query.jenis;
  }
  if (req.query.status !== undefined) {
    if (!['selesai', 'dibatalkan'].includes(req.query.status)) fail('status harus selesai atau dibatalkan.');
    filter.status = req.query.status;
  }
  if (req.query.barangId !== undefined) filter['items.barangId'] = id(req.query.barangId, 'barangId');
  const { page, limit, skip } = pagination(req.query);
  const [data, total] = await Promise.all([
    Transaksi.find(filter).sort({ tanggal: -1, _id: -1 }).skip(skip).limit(limit), Transaksi.countDocuments(filter)
  ]);
  return success(res, data, 'Riwayat transaksi.', 200, metadata(page, limit, total));
}

export async function detail(req, res) {
  const data = await Transaksi.findById(id(req.params.id));
  if (!data) throw new HttpError(404, 'Transaksi tidak ditemukan.');
  return success(res, data);
}
