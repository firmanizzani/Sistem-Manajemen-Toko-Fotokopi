import { spawn } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const root = fileURLToPath(new URL('../', import.meta.url));
const dbPath = path.join(root, '.local', 'mongo');
const uri = 'mongodb://127.0.0.1:27018/?directConnection=true';
const { MongoClient } = mongoose.mongo;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connection() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 700 });
  try { await client.connect(); return client; }
  catch (error) { await client.close(); throw error; }
}

async function verify(client) {
  const options = await client.db('admin').command({ getCmdLineOpts: 1 });
  const actualPath = options.parsed?.storage?.dbPath;
  if (!actualPath || path.resolve(actualPath).toLowerCase() !== path.resolve(dbPath).toLowerCase()) {
    throw new Error('Port 27018 digunakan instance lain. Tidak ada perubahan yang dilakukan.');
  }
}

async function findMongod() {
  if (process.env.MONGOD_PATH) return process.env.MONGOD_PATH;
  if (process.platform === 'win32') {
    const server = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'MongoDB', 'Server');
    const versions = await readdir(server).catch(() => []);
    versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    if (versions.length) return path.join(server, versions[0], 'bin', 'mongod.exe');
  }
  return 'mongod';
}

async function start() {
  let client;
  try { client = await connection(); } catch { /* Port belum melayani MongoDB. */ }
  if (client) {
    try {
      await verify(client);
      const hello = await client.db('admin').command({ hello: 1 });
      if (hello.setName !== 'rsFotokopi' || !hello.isWritablePrimary) throw new Error('Instance proyek belum PRIMARY; periksa .local/mongo/mongod.log.');
      console.log('MongoDB proyek sudah aktif pada port 27018.');
      return;
    } finally { await client.close(); }
  }
  await mkdir(dbPath, { recursive: true });
  const child = spawn(await findMongod(), [
    '--dbpath', dbPath, '--port', '27018', '--bind_ip', '127.0.0.1',
    '--replSet', 'rsFotokopi', '--oplogSize', '128',
    '--logpath', path.join(dbPath, 'mongod.log'), '--logappend'
  ], { detached: true, stdio: 'ignore', windowsHide: true });
  let spawnError;
  child.on('error', (error) => { spawnError = error; });
  child.unref();
  for (let attempt = 0; attempt < 60; attempt++) {
    if (spawnError) throw new Error(`mongod gagal dijalankan: ${spawnError.message}. Isi MONGOD_PATH jika diperlukan.`);
    try { client = await connection(); break; } catch { await delay(300); }
  }
  if (!client) throw new Error('MongoDB tidak dapat dimulai. Periksa .local/mongo/mongod.log dan port 27018.');
  try {
    await verify(client);
    try {
      await client.db('admin').command({ replSetInitiate: { _id: 'rsFotokopi', members: [{ _id: 0, host: '127.0.0.1:27018' }] } });
    } catch (error) { if (error.codeName !== 'AlreadyInitialized') throw error; }
    for (let attempt = 0; attempt < 60; attempt++) {
      const hello = await client.db('admin').command({ hello: 1 });
      if (hello.isWritablePrimary && hello.setName === 'rsFotokopi') {
        console.log('MongoDB replica set proyek siap pada 127.0.0.1:27018 (rsFotokopi).');
        return;
      }
      await delay(500);
    }
    throw new Error('Replica set belum PRIMARY. Periksa log MongoDB proyek.');
  } finally { await client.close(); }
}

async function stop() {
  const client = await connection();
  try {
    await verify(client);
    try { await client.db('admin').command({ shutdown: 1 }); }
    catch (error) { if (!['MongoNetworkError', 'MongoServerSelectionError'].includes(error.name)) throw error; }
    console.log('MongoDB khusus proyek dihentikan. Data tetap tersimpan.');
  } finally { await client.close(); }
}

try {
  if (process.argv[2] === 'start') await start();
  else if (process.argv[2] === 'stop') await stop();
  else throw new Error('Gunakan start atau stop.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
