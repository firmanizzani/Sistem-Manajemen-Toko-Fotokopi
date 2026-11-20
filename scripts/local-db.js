import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import mongoose from 'mongoose';

const exec = promisify(execFile);
const { MongoClient } = mongoose.mongo;
const uri = 'mongodb://127.0.0.1:27017/?directConnection=true';

async function check() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1500 });
  try {
    await client.connect();
    return await client.db('admin').command({ hello: 1 });
  } finally { await client.close(); }
}

try {
  if (process.argv[2] !== 'start') throw new Error('Gunakan npm run db:start.');
  let hello;
  try { hello = await check(); }
  catch {
    if (process.platform !== 'win32') throw new Error('Jalankan service MongoDB replica set di port 27017.');
    try {
      await exec('powershell.exe', ['-NoProfile', '-Command', "Start-Service -Name MongoDB -ErrorAction Stop"], { windowsHide: true });
    } catch {
      throw new Error('Service MongoDB belum berjalan. Nyalakan lewat Services atau jalankan Start-Service MongoDB di PowerShell Administrator.');
    }
    hello = await check();
  }
  if (hello.setName !== 'rsFotokopi' || !hello.isWritablePrimary) {
    throw new Error('MongoDB port 27017 belum PRIMARY pada replica set rsFotokopi. Periksa konfigurasi service.');
  }
  console.log('MongoDB siap pada 127.0.0.1:27017 (rsFotokopi). Service otomatis berjalan saat Windows menyala.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
