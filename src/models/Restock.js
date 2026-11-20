import mongoose from 'mongoose';

// Detail restock
const itemSchema = new mongoose.Schema({
  barangId: { type: mongoose.Schema.Types.ObjectId, ref: 'Barang', required: true },
  nama: { type: String, required: true },
  jumlah: { type: Number, required: true, min: 1 }
}, { _id: false });

// Struktur restock
const restockSchema = new mongoose.Schema({
  nomorRestock: { type: String, required: true, unique: true },
  tanggal: { type: Date, required: true, default: Date.now },
  items: { type: [itemSchema], required: true },
  status: { type: String, enum: ['selesai', 'dibatalkan'], default: 'selesai' },
  catatan: { type: String, default: '', maxlength: 500 },
  alasanPembatalan: { type: String, maxlength: 500 },
  dibatalkanPada: Date
}, { collection: 'restock', versionKey: false });

restockSchema.index({ tanggal: -1, _id: -1 });
restockSchema.index({ 'items.barangId': 1 });
export default mongoose.model('Restock', restockSchema);
