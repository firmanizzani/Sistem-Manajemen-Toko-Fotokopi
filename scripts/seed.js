import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import Barang, { namaKunci } from '../src/models/Barang.js';

try {
  await connectDatabase();
  await Barang.init();
  const items = JSON.parse(await readFile(new URL('../data/barang-awal.json', import.meta.url), 'utf8'));
  let added = 0;
  await mongoose.connection.transaction(async (session) => {
    added = 0;
    for (const item of items) {
      const result = await Barang.updateOne({ namaKunci: namaKunci(item.nama) }, {
        $setOnInsert: { ...item, namaKunci: namaKunci(item.nama), aktif: true, createdAt: new Date(), updatedAt: new Date() }
      }, { upsert: true, session, timestamps: false });
      added += result.upsertedCount;
    }
  });
  console.log(`Seed selesai: ${added} barang baru. Data dan stok barang yang sudah ada tidak ditimpa.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
