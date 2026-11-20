import Barang, { namaKunci } from '../models/Barang.js';
import AppError from '../utils/AppError.js';
import { validateText, validateId, validateQuery, readQueryInteger } from '../validators/commonValidator.js';
import { validateCreateBarang, validateUpdateBarang } from '../validators/barangValidator.js';
import { getPagination, escapeRegex } from '../utils/queryHelpers.js';

// Tambah barang
export async function createBarang(body) {
  const input = validateCreateBarang(body);
  const data = await Barang.create({ ...input, namaKunci: namaKunci(input.nama) });
  const result = data.toObject();
  delete result.namaKunci;
  return result;
}

// Filter barang
export async function listBarang(query) {
  validateQuery(query, ['q', 'kategori', 'stokMaks', 'aktif', 'sort', 'page', 'limit']);
  const filter = { aktif: true };
  if (query.aktif !== undefined) {
    if (!['true', 'false'].includes(query.aktif)) throw new AppError(400, 'aktif harus true atau false.');
    filter.aktif = query.aktif === 'true';
  }
  if (query.q !== undefined) filter.nama = { $regex: escapeRegex(validateText(query.q, 'q')), $options: 'i' };
  if (query.kategori !== undefined) filter.kategori = validateText(query.kategori, 'kategori', 80);
  if (query.stokMaks !== undefined) filter.stok = { $lte: readQueryInteger(query.stokMaks, 'stokMaks') };
  // Urutkan data
  const sorts = { nama: { nama: 1, _id: 1 }, stok: { stok: 1, _id: 1 }, '-stok': { stok: -1, _id: -1 }, terbaru: { _id: -1 } };
  const sort = query.sort ?? 'nama';
  if (!Object.hasOwn(sorts, sort)) throw new AppError(400, 'sort harus nama, stok, -stok, atau terbaru.');
  const { page, limit, skip } = getPagination(query);
  const [data, total] = await Promise.all([
    Barang.find(filter).sort(sorts[sort]).skip(skip).limit(limit), Barang.countDocuments(filter)
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// Cari barang
export async function getBarang(barangId) {
  const data = await Barang.findById(validateId(barangId));
  if (!data) throw new AppError(404, 'Barang tidak ditemukan.');
  return data;
}

// Ubah barang
export async function updateBarang(barangId, body) {
  const update = validateUpdateBarang(body);
  if (update.nama !== undefined) update.namaKunci = namaKunci(update.nama);
  const data = await Barang.findOneAndUpdate({ _id: validateId(barangId), aktif: true }, update, { returnDocument: 'after', runValidators: true });
  if (!data) throw new AppError(404, 'Barang aktif tidak ditemukan.');
  return data;
}

// Hapus barang
export async function deleteBarang(barangId) {
  const data = await Barang.findOneAndDelete({ _id: validateId(barangId), stok: 0 });
  if (!data) {
    const existing = await Barang.findById(barangId);
    if (!existing) throw new AppError(404, 'Barang tidak ditemukan.');
    throw new AppError(409, 'Barang hanya dapat dihapus ketika stok nol.');
  }
  return data;
}

// Stok menipis
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

// Ketersediaan stok
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
