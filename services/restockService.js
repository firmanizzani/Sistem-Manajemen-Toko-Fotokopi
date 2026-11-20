import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import Barang from '../models/Barang.js';
import Restock from '../models/Restock.js';
import { HttpError, validateBody, validateText, validateItems, validateId, validateQuery, getDateFilter, getPagination, fail } from './validation.js';

// Tambah restock
export async function createRestock(body) {
  validateBody(body, ['items', 'catatan']);
  const items = validateItems(body.items);
  const catatan = body.catatan === undefined ? '' : validateText(body.catatan, 'catatan', 500);

  return mongoose.connection.transaction(async (session) => {
    const details = [];
    for (const item of [...items].sort((a, b) => a.barangId.localeCompare(b.barangId))) {
      const barang = await Barang.findOne({ _id: item.barangId, aktif: true }).session(session);
      if (!barang) throw new HttpError(404, 'Barang restock tidak ditemukan atau tidak aktif.');
      // Tambah stok
      const updated = await Barang.findOneAndUpdate({
        _id: barang._id, aktif: true, stok: { $lte: 1_000_000_000 - item.jumlah }
      }, { $inc: { stok: item.jumlah } }, { session, returnDocument: 'after' });
      if (!updated) throw new HttpError(409, `Stok ${barang.nama} melampaui batas.`);
      details.push({ barangId: barang._id, nama: barang.nama, jumlah: item.jumlah });
    }
    // Simpan restock
    const [restock] = await Restock.create([{
      nomorRestock: `RST-${randomUUID()}`, tanggal: new Date(), items: details, catatan
    }], { session });
    return restock;
  }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
}

// Batalkan restock
export async function cancelRestock(restockId, body) {
  validateId(restockId);
  validateBody(body, ['alasan']);
  const alasan = validateText(body.alasan, 'alasan', 500);
  return mongoose.connection.transaction(async (session) => {
    const restock = await Restock.findById(restockId).session(session);
    if (!restock) throw new HttpError(404, 'Restock tidak ditemukan.');
    if (restock.status !== 'selesai') throw new HttpError(409, 'Restock sudah dibatalkan.');
    for (const item of [...restock.items].sort((a, b) => String(a.barangId).localeCompare(String(b.barangId)))) {
      // Kembalikan stok
      const barang = await Barang.findOneAndUpdate({
        _id: item.barangId, aktif: true, stok: { $gte: item.jumlah }
      }, { $inc: { stok: -item.jumlah } }, { session, returnDocument: 'after' });
      if (!barang) throw new HttpError(409, `Pembatalan restock gagal: ${item.nama} tidak tersedia atau stok telah terpakai.`);
    }
    restock.status = 'dibatalkan';
    restock.alasanPembatalan = alasan;
    restock.dibatalkanPada = new Date();
    await restock.save({ session });
    return restock;
  }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
}

// Riwayat restock
export async function listRestock(query) {
  validateQuery(query, ['status', 'barangId', 'dari', 'sampai', 'page', 'limit']);
  const filter = getDateFilter(query);
  if (query.status !== undefined) {
    if (!['selesai', 'dibatalkan'].includes(query.status)) fail('status harus selesai atau dibatalkan.');
    filter.status = query.status;
  }
  if (query.barangId !== undefined) filter['items.barangId'] = validateId(query.barangId, 'barangId');
  const { page, limit, skip } = getPagination(query);
  const [data, total] = await Promise.all([
    Restock.find(filter).sort({ tanggal: -1, _id: -1 }).skip(skip).limit(limit), Restock.countDocuments(filter)
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// Detail restock
export async function getRestock(restockId) {
  const data = await Restock.findById(validateId(restockId));
  if (!data) throw new HttpError(404, 'Restock tidak ditemukan.');
  return data;
}
