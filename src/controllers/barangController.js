import Barang, { namaKunci } from '../models/Barang.js';
import { HttpError, success } from '../utils/http.js';
import { object, text, integer, id, queryFields, queryInt, pagination, metadata, escapeRegex } from '../utils/validation.js';

export async function createBarang(req, res) {
  object(req.body, ['nama', 'kategori', 'harga', 'stok', 'stokMinimum']);
  const nama = text(req.body.nama, 'nama');
  const data = await Barang.create({
    nama, namaKunci: namaKunci(nama),
    kategori: text(req.body.kategori, 'kategori', 80),
    harga: integer(req.body.harga, 'harga'),
    stok: integer(req.body.stok === undefined ? 0 : req.body.stok, 'stok'),
    stokMinimum: integer(req.body.stokMinimum === undefined ? 10 : req.body.stokMinimum, 'stokMinimum')
  });
  const result = data.toObject();
  delete result.namaKunci;
  return success(res, result, 'Barang berhasil ditambahkan.', 201);
}

export async function listBarang(req, res) {
  queryFields(req.query, ['q', 'kategori', 'stokMaks', 'aktif', 'sort', 'page', 'limit']);
  const filter = { aktif: true };
  if (req.query.aktif !== undefined) {
    if (!['true', 'false'].includes(req.query.aktif)) throw new HttpError(400, 'aktif harus true atau false.');
    filter.aktif = req.query.aktif === 'true';
  }
  if (req.query.q !== undefined) filter.nama = { $regex: escapeRegex(text(req.query.q, 'q')), $options: 'i' };
  if (req.query.kategori !== undefined) filter.kategori = text(req.query.kategori, 'kategori', 80);
  if (req.query.stokMaks !== undefined) filter.stok = { $lte: queryInt(req.query.stokMaks, 'stokMaks') };
  const sorts = { nama: { nama: 1, _id: 1 }, stok: { stok: 1, _id: 1 }, '-stok': { stok: -1, _id: -1 }, terbaru: { createdAt: -1, _id: -1 } };
  const sort = req.query.sort ?? 'nama';
  if (!Object.hasOwn(sorts, sort)) throw new HttpError(400, 'sort harus nama, stok, -stok, atau terbaru.');
  const { page, limit, skip } = pagination(req.query);
  const [data, total] = await Promise.all([
    Barang.find(filter).sort(sorts[sort]).skip(skip).limit(limit), Barang.countDocuments(filter)
  ]);
  return success(res, data, 'Daftar barang.', 200, metadata(page, limit, total));
}

export async function getBarang(req, res) {
  const data = await Barang.findById(id(req.params.id));
  if (!data) throw new HttpError(404, 'Barang tidak ditemukan.');
  return success(res, data);
}

export async function updateBarang(req, res) {
  object(req.body, ['nama', 'kategori', 'harga', 'stokMinimum']);
  if (!Object.keys(req.body).length) throw new HttpError(400, 'Isi minimal satu field yang ingin diperbarui.');
  const update = {};
  if ('nama' in req.body) { update.nama = text(req.body.nama, 'nama'); update.namaKunci = namaKunci(update.nama); }
  if ('kategori' in req.body) update.kategori = text(req.body.kategori, 'kategori', 80);
  for (const field of ['harga', 'stokMinimum']) if (field in req.body) update[field] = integer(req.body[field], field);
  const data = await Barang.findOneAndUpdate({ _id: id(req.params.id), aktif: true }, update, { returnDocument: 'after', runValidators: true });
  if (!data) throw new HttpError(404, 'Barang aktif tidak ditemukan.');
  return success(res, data, 'Barang berhasil diperbarui. Perubahan stok dilakukan melalui transaksi.');
}

export async function deleteBarang(req, res) {
  // Arsip mempertahankan referensi riwayat dan hanya boleh dilakukan saat stok nol.
  const data = await Barang.findOneAndUpdate({ _id: id(req.params.id), aktif: true, stok: 0 }, { aktif: false }, { returnDocument: 'after' });
  if (!data) {
    const existing = await Barang.findById(req.params.id);
    if (!existing || !existing.aktif) throw new HttpError(404, 'Barang aktif tidak ditemukan.');
    throw new HttpError(409, 'Barang hanya dapat dihapus/diarsipkan ketika stok nol.');
  }
  return success(res, data, 'Barang dihapus dari daftar aktif (diarsipkan); riwayat tetap tersimpan.');
}

export async function lowStock(req, res) {
  queryFields(req.query, ['batas', 'page', 'limit']);
  const { page, limit, skip } = pagination(req.query);
  const filter = { aktif: true };
  if (req.query.batas !== undefined) filter.stok = { $lte: queryInt(req.query.batas, 'batas') };
  else filter.$expr = { $lte: ['$stok', '$stokMinimum'] };
  const [data, total] = await Promise.all([
    Barang.find(filter).sort({ stok: 1, _id: 1 }).skip(skip).limit(limit), Barang.countDocuments(filter)
  ]);
  return success(res, data, 'Barang dengan stok menipis atau habis.', 200, metadata(page, limit, total));
}

export async function availability(req, res) {
  queryFields(req.query, []);
  const [jumlahBarang, habis] = await Promise.all([
    Barang.countDocuments({ aktif: true }), Barang.find({ aktif: true, stok: 0 }).sort({ nama: 1 })
  ]);
  return success(res, {
    jumlahBarang, jumlahBarangTersedia: jumlahBarang - habis.length,
    jumlahBarangHabis: habis.length,
    seluruhBarangTersedia: jumlahBarang > 0 && habis.length === 0,
    status: jumlahBarang === 0 ? 'kosong' : habis.length ? 'perlu_restock' : 'aman', barangHabis: habis
  });
}
