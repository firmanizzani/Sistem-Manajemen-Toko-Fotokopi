import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import Barang from '../models/Barang.js';
import Transaksi from '../models/Transaksi.js';
import { HttpError, validateBody, validateText, validateItems, validateId, validateQuery, getDateFilter, getPagination, fail } from './validation.js';

// Validasi transaksi
function validateTransaksi(body) {
  validateBody(body, ['items', 'catatan']);
  const items = validateItems(body.items);
  const catatan = body.catatan === undefined ? '' : validateText(body.catatan, 'catatan', 500);
  return { items, catatan };
}

// Buat transaksi
export async function createTransaksi(body) {
  const input = validateTransaksi(body);
  // Transaksi atomik
  return mongoose.connection.transaction(async (session) => {
    const details = [];
    let total = 0;
    // Urutkan barang
    for (const item of [...input.items].sort((a, b) => a.barangId.localeCompare(b.barangId))) {
      const barang = await Barang.findOne({ _id: item.barangId, aktif: true }).session(session);
      if (!barang) throw new HttpError(404, `Barang ${item.barangId} tidak ditemukan atau tidak aktif.`);
      // Perbarui stok
      const filter = { _id: barang._id, aktif: true, stok: { $gte: item.jumlah } };
      const updated = await Barang.findOneAndUpdate(filter, { $inc: { stok: -item.jumlah } }, { session, returnDocument: 'after' });
      if (!updated) throw new HttpError(409, `Stok ${barang.nama} tidak cukup atau melampaui batas.`);
      // Hitung subtotal
      const harga = barang.harga;
      const subtotal = harga * item.jumlah;
      total += subtotal;
      if (!Number.isSafeInteger(total)) fail('Total transaksi melebihi batas angka yang didukung.');
      details.push({ barangId: barang._id, nama: barang.nama, jumlah: item.jumlah, harga, subtotal });
    }
    // Simpan transaksi
    const [transaksi] = await Transaksi.create([{
      nomorTransaksi: `TRX-${randomUUID()}`,
      tanggal: new Date(), items: details, total, catatan: input.catatan
    }], { session });
    return transaksi;
  }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
}

// Batalkan transaksi
export async function cancelTransaksi(transaksiId, body) {
  validateId(transaksiId);
  validateBody(body, ['alasan']);
  const alasan = validateText(body.alasan, 'alasan', 500);
  return mongoose.connection.transaction(async (session) => {
    const transaksi = await Transaksi.findById(transaksiId).session(session);
    if (!transaksi) throw new HttpError(404, 'Transaksi tidak ditemukan.');
    if (transaksi.status !== 'selesai') throw new HttpError(409, 'Transaksi sudah dibatalkan.');
    for (const item of [...transaksi.items].sort((a, b) => String(a.barangId).localeCompare(String(b.barangId)))) {
      // Pulihkan stok
      const barang = await Barang.findOneAndUpdate({
        _id: item.barangId, aktif: true,
        stok: { $lte: 1_000_000_000 - item.jumlah }
      }, { $inc: { stok: item.jumlah } }, { session, returnDocument: 'after' });
      if (!barang) {
        const existing = await Barang.findById(item.barangId).session(session);
        if (!existing) throw new HttpError(409, `Pembatalan gagal: barang "${item.nama}" sudah dihapus.`);
        throw new HttpError(409, `Pembatalan gagal: ${item.nama} tidak aktif, stok tidak cukup, atau melampaui batas.`);
      }
    }
    // Catat pembatalan
    transaksi.status = 'dibatalkan';
    transaksi.alasanPembatalan = alasan;
    transaksi.dibatalkanPada = new Date();
    await transaksi.save({ session });
    return transaksi;
  }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
}

// Riwayat transaksi
export async function listTransaksi(query) {
  validateQuery(query, ['status', 'barangId', 'dari', 'sampai', 'page', 'limit']);
  const filter = getDateFilter(query);
  if (query.status !== undefined) {
    if (!['selesai', 'dibatalkan'].includes(query.status)) fail('status harus selesai atau dibatalkan.');
    filter.status = query.status;
  }
  if (query.barangId !== undefined) filter['items.barangId'] = validateId(query.barangId, 'barangId');
  const { page, limit, skip } = getPagination(query);
  const [data, total] = await Promise.all([
    Transaksi.find(filter).sort({ tanggal: -1, _id: -1 }).skip(skip).limit(limit), Transaksi.countDocuments(filter)
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// Detail transaksi
export async function getTransaksi(transaksiId) {
  const data = await Transaksi.findById(validateId(transaksiId));
  if (!data) throw new HttpError(404, 'Transaksi tidak ditemukan.');
  return data;
}
