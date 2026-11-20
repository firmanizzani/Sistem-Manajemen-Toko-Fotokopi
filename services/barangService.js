import Barang, { namaKunci } from '../models/Barang.js';
import { HttpError, validateBody, validateText, validateInteger, validateId, validateQuery, readQueryInteger, getPagination, escapeRegex } from './validation.js';

export async function createBarang(body) {
  validateBody(body, ['nama', 'kategori', 'harga', 'stok', 'stokMinimum']);
  const nama = validateText(body.nama, 'nama');
  const data = await Barang.create({
    nama, namaKunci: namaKunci(nama),
    kategori: validateText(body.kategori, 'kategori', 80),
    harga: validateInteger(body.harga, 'harga'),
    stok: validateInteger(body.stok === undefined ? 0 : body.stok, 'stok'),
    stokMinimum: validateInteger(body.stokMinimum === undefined ? 10 : body.stokMinimum, 'stokMinimum')
  });
  const result = data.toObject();
  delete result.namaKunci;
  return result;
}

export async function listBarang(query) {
  validateQuery(query, ['q', 'kategori', 'stokMaks', 'aktif', 'sort', 'page', 'limit']);
  const filter = { aktif: true };
  if (query.aktif !== undefined) {
    if (!['true', 'false'].includes(query.aktif)) throw new HttpError(400, 'aktif harus true atau false.');
    filter.aktif = query.aktif === 'true';
  }
  if (query.q !== undefined) filter.nama = { $regex: escapeRegex(validateText(query.q, 'q')), $options: 'i' };
  if (query.kategori !== undefined) filter.kategori = validateText(query.kategori, 'kategori', 80);
  if (query.stokMaks !== undefined) filter.stok = { $lte: readQueryInteger(query.stokMaks, 'stokMaks') };
  const sorts = { nama: { nama: 1, _id: 1 }, stok: { stok: 1, _id: 1 }, '-stok': { stok: -1, _id: -1 }, terbaru: { createdAt: -1, _id: -1 } };
  const sort = query.sort ?? 'nama';
  if (!Object.hasOwn(sorts, sort)) throw new HttpError(400, 'sort harus nama, stok, -stok, atau terbaru.');
  const { page, limit, skip } = getPagination(query);
  const [data, total] = await Promise.all([
    Barang.find(filter).sort(sorts[sort]).skip(skip).limit(limit), Barang.countDocuments(filter)
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getBarang(barangId) {
  const data = await Barang.findById(validateId(barangId));
  if (!data) throw new HttpError(404, 'Barang tidak ditemukan.');
  return data;
}

export async function updateBarang(barangId, body) {
  validateBody(body, ['nama', 'kategori', 'harga', 'stokMinimum']);
  if (!Object.keys(body).length) throw new HttpError(400, 'Isi minimal satu field yang ingin diperbarui.');
  const update = {};
  if ('nama' in body) {
    update.nama = validateText(body.nama, 'nama');
    update.namaKunci = namaKunci(update.nama);
  }
  if ('kategori' in body) {
    update.kategori = validateText(body.kategori, 'kategori', 80);
  }
  for (const field of ['harga', 'stokMinimum']) {
    if (field in body) update[field] = validateInteger(body[field], field);
  }
  const data = await Barang.findOneAndUpdate({ _id: validateId(barangId), aktif: true }, update, { returnDocument: 'after', runValidators: true });
  if (!data) throw new HttpError(404, 'Barang aktif tidak ditemukan.');
  return data;
}

export async function deleteBarang(barangId) {
  // Arsip mempertahankan referensi riwayat dan hanya boleh dilakukan saat stok nol.
  const data = await Barang.findOneAndUpdate({ _id: validateId(barangId), aktif: true, stok: 0 }, { aktif: false }, { returnDocument: 'after' });
  if (!data) {
    const existing = await Barang.findById(barangId);
    if (!existing || !existing.aktif) throw new HttpError(404, 'Barang aktif tidak ditemukan.');
    throw new HttpError(409, 'Barang hanya dapat dihapus/diarsipkan ketika stok nol.');
  }
  return data;
}

export async function lowStock(query) {
  validateQuery(query, ['batas', 'page', 'limit']);
  const { page, limit, skip } = getPagination(query);
  const filter = { aktif: true };
  if (query.batas !== undefined) filter.stok = { $lte: readQueryInteger(query.batas, 'batas') };
  else filter.$expr = { $lte: ['$stok', '$stokMinimum'] };
  const [data, total] = await Promise.all([
    Barang.find(filter).sort({ stok: 1, _id: 1 }).skip(skip).limit(limit), Barang.countDocuments(filter)
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function availability(query) {
  validateQuery(query, []);
  const [jumlahBarang, habis] = await Promise.all([
    Barang.countDocuments({ aktif: true }), Barang.find({ aktif: true, stok: 0 }).sort({ nama: 1 })
  ]);
  return {
    jumlahBarang, jumlahBarangTersedia: jumlahBarang - habis.length,
    jumlahBarangHabis: habis.length,
    seluruhBarangTersedia: jumlahBarang > 0 && habis.length === 0,
    status: jumlahBarang === 0 ? 'kosong' : habis.length ? 'perlu_restock' : 'aman', barangHabis: habis
  };
}
