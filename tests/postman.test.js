import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import mongoose from 'mongoose';
import newman from 'newman';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import Barang, { namaKunci } from '../src/models/Barang.js';
import Transaksi from '../src/models/Transaksi.js';
import Restock from '../src/models/Restock.js';

const databaseName = `fotokopi_postman_test_${Date.now()}_${process.pid}`;
const uri = new URL(process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/?replicaSet=rsFotokopi&directConnection=true');
uri.pathname = `/${databaseName}`;
const collection = JSON.parse(await readFile(new URL('../postman/sistem-manajemen-toko-fotokopi.postman_collection.json', import.meta.url), 'utf8'));
const seed = JSON.parse(await readFile(new URL('../data/barang-awal.json', import.meta.url), 'utf8'));
let server;
const reports = [];

before(async () => {
  await connectDatabase(uri.toString());
  await Promise.all([Barang.init(), Transaksi.init(), Restock.init()]);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
});

beforeEach(async () => {
  await Promise.all([Barang.deleteMany({}), Transaksi.deleteMany({}), Restock.deleteMany({})]);
  await Barang.insertMany(seed.map((item) => ({ ...item, namaKunci: namaKunci(item.nama) })));
});

after(async () => {
  await writeFile(new URL('../postman/hasil-pengujian.json', import.meta.url), JSON.stringify({
    project: 'Sistem Manajemen Toko Fotokopi',
    runAt: new Date().toISOString(),
    runner: 'Node Test Runner dan Newman',
    database: 'Database uji sementara, terpisah dari data utama.',
    passed: reports.length === 3,
    scenarios: reports
  }, null, 2) + '\n');
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.name === databaseName && databaseName.startsWith('fotokopi_postman_test_')) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// Jalankan collection
function run(items = collection.item, iterationCount = 1) {
  const messages = [];
  return new Promise((resolve, reject) => {
    const runner = newman.run({
      collection: { ...structuredClone(collection), item: structuredClone(items) },
      reporters: [], silent: true, timeoutRequest: 10000, iterationCount,
      envVar: [
        { key: 'baseUrl', value: `http://127.0.0.1:${server.address().port}` },
        // Menguji variabel environment kosong tidak menimpa ID collection.
        { key: 'pulpenStandardId', value: '' }
      ]
    }, (error, result) => {
      if (error) return reject(error);
      resolve({ ...result, messages });
    });
    runner.on('console', (error, event) => {
      if (!error) messages.push(event.messages.join(' '));
    });
  });
}

function checkFailures(result) {
  const failures = result.run.failures.map((failure) => ({ request: failure.source.name, message: failure.error.message }));
  assert.deepEqual(failures, []);
}

// Bukti pengujian
function saveResult(name, result) {
  reports.push({
    name,
    requests: result.run.stats.requests.total,
    assertions: result.run.stats.assertions.total,
    failures: result.run.failures.map((failure) => failure.error.message),
    responses: result.run.executions.filter((entry) => entry.response).map((entry) => ({
      name: entry.item.name, method: entry.request.method, status: entry.response.code
    }))
  });
}

test('semua 24 nomor berjalan dua putaran tanpa ID kosong atau stok berubah', async () => {
  const before = await Barang.find().sort({ _id: 1 }).select('_id stok').lean();
  const result = await run(collection.item, 2);
  checkFailures(result);
  assert.equal(result.run.stats.requests.total, 48);
  assert.equal(result.run.executions.length, 48);
  const methods = [...new Set(result.run.executions.map((entry) => entry.request.method))].sort();
  assert.deepEqual(methods, ['DELETE', 'GET', 'PATCH', 'POST', 'PUT']);
  const after = await Barang.find().sort({ _id: 1 }).select('_id stok').lean();
  assert.deepEqual(after, before);
  assert.equal(await Transaksi.countDocuments({ status: 'dibatalkan' }), 2);
  assert.equal(await Restock.countDocuments({ status: 'dibatalkan' }), 2);
  saveResult('Alur lengkap dua putaran', result);
});

test('CREATE berulang tetap 201 dan READ hanya menampilkan pulpen terakhir', async () => {
  const barang = collection.item.find((item) => item.name.startsWith('1. Barang'));
  const result = await run([collection.item[0], barang.item[0], barang.item[2], barang.item[2], barang.item[3]]);
  checkFailures(result);
  const creates = result.run.executions.filter((entry) => entry.request.method === 'POST');
  assert.deepEqual(creates.map((entry) => entry.response.code), [201, 201]);
  const first = JSON.parse(creates[0].response.stream.toString()).data;
  const second = JSON.parse(creates[1].response.stream.toString()).data;
  assert.notEqual(first.nama, second.nama);
  assert.notEqual(first._id, second._id);
  const detail = JSON.parse(result.run.executions.at(-1).response.stream.toString()).data;
  assert.equal(Array.isArray(detail), false);
  assert.equal(detail._id, second._id);
  saveResult('CREATE berulang dan READ satu barang', result);
});

test('READ tanpa ID dihentikan dan tidak mengambil semua barang', async () => {
  const barang = collection.item.find((item) => item.name.startsWith('1. Barang'));
  const result = await run([barang.item[3]]);
  checkFailures(result);
  assert.equal(result.run.stats.requests.total, 0);
  assert.ok(result.messages.some((message) => message.includes('Kirim 3. CREATE')));
  saveResult('READ tanpa ID tidak dikirim', result);
});
