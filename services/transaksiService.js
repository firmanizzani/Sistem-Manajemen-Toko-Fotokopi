import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import Barang from '../models/Barang.js';
import Transaksi from '../models/Transaksi.js';
import { HttpError, validateBody, validateText, validateInteger, validateId, validateQuery, getDateFilter, getPagination, fail } from './validation.js';

function validateTransaksi(body) {
  validateBody(body, ['jenis', 'items', 'catatan']);
  if (!['masuk', 'keluar'].includes(body.jenis)) fail('jenis harus masuk atau keluar.');
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) fail('items harus berisi 1–50 barang.');
  const seen = new Set();
  const items = body.items.map((item) => {
    validateBody(item, ['barangId', 'jumlah']);
    const barangId = validateId(item.barangId, 'barangId').toLowerCase();
    if (seen.has(barangId)) fail('Barang yang sama tidak boleh berulang dalam satu transaksi; gabungkan jumlahnya.');
    seen.add(barangId);
    return { barangId, jumlah: validateInteger(item.jumlah, 'jumlah', 1, 1_000_000) };
  });
  const catatan = body.catatan === undefined ? '' : validateText(body.catatan, 'catatan', 500);
  return { jenis: body.jenis, items, catatan };
}

export async function createTransaksi(body) {
  const input = validateTransaksi(body);
  return mongoose.connection.transaction(async (session) => {
    const details = [];
    let total = 0;
    // Urutan konsisten mengurangi konflik ketika transaksi menyentuh banyak barang.
    for (const item of [...input.items].sort((a, b) => a.barangId.localeCompare(b.barangId))) {
      const barang = await Barang.findOne({ _id: item.barangId, aktif: true }).session(session);
      if (!barang) throw new HttpError(404, `Barang ${item.barangId} tidak ditemukan atau sudah diarsipkan.`);
      const delta = input.jenis === 'masuk' ? item.jumlah : -item.jumlah;
      const filter = { _id: barang._id, aktif: true, stok: delta < 0 ? { $gte: item.jumlah } : { $lte: 1_000_000_000 - delta } };
      const updated = await Barang.findOneAndUpdate(filter, { $inc: { stok: delta } }, { session, returnDocument: 'after' });
      if (!updated) throw new HttpError(409, `Stok ${barang.nama} tidak cukup atau melampaui batas.`);
      const harga = input.jenis === 'keluar' ? barang.harga : 0;
      const subtotal = harga * item.jumlah;
      total += subtotal;
      if (!Number.isSafeInteger(total)) fail('Total transaksi melebihi batas angka yang didukung.');
      details.push({ barangId: barang._id, nama: barang.nama, jumlah: item.jumlah, harga, subtotal });
    }
    const [transaksi] = await Transaksi.create([{
      nomorTransaksi: `TRX-${randomUUID()}`, jenis: input.jenis,
      tanggal: new Date(), items: details, total, catatan: input.catatan
    }], { session });
    return transaksi;
  }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
}

export async function cancelTransaksi(transaksiId, body) {
  validateId(transaksiId);
  validateBody(body, ['alasan']);
  const alasan = validateText(body.alasan, 'alasan', 500);
  return mongoose.connection.transaction(async (session) => {
    const transaksi = await Transaksi.findById(transaksiId).session(session);
    if (!transaksi) throw new HttpError(404, 'Transaksi tidak ditemukan.');
    if (transaksi.status !== 'selesai') throw new HttpError(409, 'Transaksi sudah dibatalkan.');
    for (const item of [...transaksi.items].sort((a, b) => String(a.barangId).localeCompare(String(b.barangId)))) {
      const delta = transaksi.jenis === 'masuk' ? -item.jumlah : item.jumlah;
      const barang = await Barang.findOneAndUpdate({
        _id: item.barangId, aktif: true,
        stok: delta < 0 ? { $gte: item.jumlah } : { $lte: 1_000_000_000 - delta }
      }, { $inc: { stok: delta } }, { session, returnDocument: 'after' });
      if (!barang) throw new HttpError(409, `Pembatalan gagal: ${item.nama} diarsipkan, stok tidak cukup, atau melampaui batas.`);
    }
    transaksi.status = 'dibatalkan';
    transaksi.alasanPembatalan = alasan;
    transaksi.dibatalkanPada = new Date();
    await transaksi.save({ session });
    return transaksi;
  }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
}

export async function listTransaksi(query) {
  validateQuery(query, ['jenis', 'status', 'barangId', 'dari', 'sampai', 'page', 'limit']);
  const filter = getDateFilter(query);
  if (query.jenis !== undefined) {
    if (!['masuk', 'keluar'].includes(query.jenis)) fail('jenis harus masuk atau keluar.');
    filter.jenis = query.jenis;
  }
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

export async function getTransaksi(transaksiId) {
  const data = await Transaksi.findById(validateId(transaksiId));
  if (!data) throw new HttpError(404, 'Transaksi tidak ditemukan.');
  return data;
}
