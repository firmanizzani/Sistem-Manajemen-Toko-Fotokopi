import mongoose from 'mongoose';

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI belum diisi. Salin .env.example menjadi .env.');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') {
    await mongoose.disconnect();
    throw new Error('Transaksi stok membutuhkan replica set. Pastikan service MongoDB memakai replica set rsFotokopi dan gunakan URI di .env.example.');
  }
}
