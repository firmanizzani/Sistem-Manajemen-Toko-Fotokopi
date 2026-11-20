import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { connectDatabase } from './config/database.js';
import Barang from './models/Barang.js';
import Transaksi from './models/Transaksi.js';
import barangRoutes from './routes/barangRoutes.js';
import transaksiRoutes from './routes/transaksiRoutes.js';
import laporanRoutes from './routes/laporanRoutes.js';

const app = express();
app.disable('x-powered-by');

// Baca JSON
app.use(express.json({ limit: '100kb' }));
// Validasi format
app.use((req, res, next) => {
  if (['POST', 'PATCH', 'PUT'].includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({ success: false, message: 'Gunakan Content-Type: application/json.' });
  }
  next();
});

// Cek koneksi
app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    success: connected,
    message: 'Sistem Manajemen Toko Fotokopi',
    data: { database: connected ? 'terhubung' : 'terputus' }
  });
});

// Pasang routes
app.use('/api/barang', barangRoutes);
app.use('/api/transaksi', transaksiRoutes);
app.use('/api/laporan', laporanRoutes);

// Endpoint hilang
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
});

// Tangani error
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;

  if (error.code === 11000) {
    status = 409;
    message = 'Data duplikat. Nama barang atau nomor transaksi sudah digunakan.';
  } else if (['ValidationError', 'CastError', 'StrictModeError'].includes(error.name)) {
    status = 400;
    message = 'Data tidak valid. Periksa tipe dan nilai setiap field.';
  } else if (error.type === 'entity.parse.failed') {
    status = 400;
    message = 'Format JSON tidak valid.';
  } else if (['MongoServerSelectionError', 'MongoNetworkError'].includes(error.name)) {
    status = 503;
    message = 'Database tidak tersedia.';
  }

  if (status >= 500) {
    console.error(error);
    if (status !== 503) message = 'Terjadi kesalahan pada server.';
  }
  res.status(status).json({ success: false, message });
});

// Eksekusi langsung
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await connectDatabase();
    await Promise.all([Barang.init(), Transaksi.init()]);
    const port = Number(process.env.PORT || 3000);
    const host = process.env.HOST || '127.0.0.1';
    // Jalankan server
    const server = app.listen(port, host, () => {
      console.log(`Sistem Manajemen Toko Fotokopi: http://${host}:${port}/api/health`);
    });
    server.on('error', async (error) => {
      console.error(error.message);
      await mongoose.disconnect();
      process.exitCode = 1;
    });
    // Tutup koneksi
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, () => {
        server.close(async () => {
          await mongoose.disconnect();
          process.exit(0);
        });
      });
    }
  } catch (error) {
    console.error(`Server gagal dijalankan: ${error.message}`);
    await mongoose.disconnect();
    process.exitCode = 1;
  }
}

export default app;
