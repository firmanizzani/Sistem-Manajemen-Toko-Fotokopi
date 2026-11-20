import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import Barang from './models/Barang.js';
import Transaksi from './models/Transaksi.js';

try {
  await connectDatabase();
  await Promise.all([Barang.init(), Transaksi.init()]);
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const server = app.listen(port, host, () => console.log(`Sistem Manajemen Toko Fotokopi: http://${host}:${port}/api/health`));
  server.on('error', async (error) => { console.error(error.message); await mongoose.disconnect(); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    server.close(async () => { await mongoose.disconnect(); process.exit(0); });
  });
} catch (error) {
  console.error(`Server gagal dijalankan: ${error.message}`);
  await mongoose.disconnect();
  process.exitCode = 1;
}
