import express from 'express';
import mongoose from 'mongoose';
import barangRoutes from './routes/barangRoutes.js';
import transaksiRoutes from './routes/transaksiRoutes.js';
import restockRoutes from './routes/restockRoutes.js';
import laporanRoutes from './routes/laporanRoutes.js';
import validateJson from './middlewares/validateJson.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();
app.disable('x-powered-by');

// Baca JSON
app.use(express.json({ limit: '100kb' }));
app.use(validateJson);

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
app.use('/api/restock', restockRoutes);
app.use('/api/laporan', laporanRoutes);

// Tangani error
app.use(notFound);
app.use(errorHandler);

export default app;
