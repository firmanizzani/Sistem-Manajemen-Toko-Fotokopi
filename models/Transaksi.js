import mongoose from 'mongoose';

// Detail transaksi
const detailSchema = new mongoose.Schema({
  barangId: { type: mongoose.Schema.Types.ObjectId, ref: 'Barang', required: true },
  nama: { type: String, required: true },
  jumlah: { type: Number, required: true, min: 1 },
  harga: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 }
}, { _id: false });

// Struktur transaksi
const transaksiSchema = new mongoose.Schema({
  nomorTransaksi: { type: String, required: true, unique: true },
  jenis: { type: String, enum: ['masuk', 'keluar'], required: true },
  tanggal: { type: Date, required: true, default: Date.now },
  items: { type: [detailSchema], required: true },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['selesai', 'dibatalkan'], default: 'selesai' },
  catatan: { type: String, default: '', maxlength: 500 },
  alasanPembatalan: { type: String, maxlength: 500 },
  dibatalkanPada: Date
}, { timestamps: true, collection: 'transaksi', versionKey: false });

// Indeks pencarian
transaksiSchema.index({ tanggal: -1, _id: -1 });
transaksiSchema.index({ 'items.barangId': 1 });
export default mongoose.model('Transaksi', transaksiSchema);
