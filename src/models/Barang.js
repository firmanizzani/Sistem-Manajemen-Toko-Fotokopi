import mongoose from 'mongoose';

// Struktur barang
const barangSchema = new mongoose.Schema({
  nama: { type: String, required: true, trim: true, maxlength: 120 },
  namaKunci: { type: String, required: true, unique: true, select: false },
  kategori: { type: String, required: true, trim: true, maxlength: 80 },
  harga: { type: Number, required: true, min: 0, max: 1_000_000_000 },
  stok: { type: Number, required: true, default: 0, min: 0, max: 1_000_000_000 },
  stokMinimum: { type: Number, default: 10, min: 0, max: 1_000_000_000 },
  aktif: { type: Boolean, default: true }
}, { collection: 'barang', versionKey: false });

// Standarkan nama
export const namaKunci = (nama) => nama.trim().replace(/\s+/g, ' ').toLowerCase();
export default mongoose.model('Barang', barangSchema);
