import express from 'express';
import mongoose from 'mongoose';
import barangRoutes from './routes/barangRoutes.js';
import transaksiRoutes from './routes/transaksiRoutes.js';
import laporanRoutes from './routes/laporanRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  if (['POST', 'PATCH', 'PUT'].includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({ success: false, message: 'Gunakan Content-Type: application/json.' });
  }
  next();
});
app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ success: connected, message: 'Sistem Manajemen Toko Fotokopi', data: { database: connected ? 'terhubung' : 'terputus' } });
});
app.use('/api/barang', barangRoutes);
app.use('/api/transaksi', transaksiRoutes);
app.use('/api/laporan', laporanRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
