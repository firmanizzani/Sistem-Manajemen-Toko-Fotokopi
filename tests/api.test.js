import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../index.js';
import { connectDatabase } from '../config/database.js';
import Barang from '../models/Barang.js';
import Transaksi from '../models/Transaksi.js';

const databaseName = `fotokopi_test_${Date.now()}_${process.pid}`;
const baseUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/?replicaSet=rsFotokopi&directConnection=true';
const uri = new URL(baseUri);
uri.pathname = `/${databaseName}`;
const api = request(app);
let a, b;

before(async () => {
  await connectDatabase(uri.toString());
  await Promise.all([Barang.init(), Transaksi.init()]);
});
beforeEach(async () => {
  await Promise.all([Barang.deleteMany({}), Transaksi.deleteMany({})]);
  a = (await api.post('/api/barang').send({ nama: 'Pulpen', kategori: 'Alat Tulis', harga: 3500, stok: 5, stokMinimum: 2 }).expect(201)).body.data;
  b = (await api.post('/api/barang').send({ nama: 'Buku', kategori: 'Kertas', harga: 5000, stok: 4, stokMinimum: 5 }).expect(201)).body.data;
});
after(async () => {
  if (mongoose.connection.name === databaseName && databaseName.startsWith('fotokopi_test_')) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const sale = (items) => api.post('/api/transaksi').send({ jenis: 'keluar', items });
const stock = async (barang) => (await api.get(`/api/barang/${barang._id}`).expect(200)).body.data.stok;

test('health dan endpoint tidak dikenal menggunakan status yang benar', async () => {
  await api.get('/api/health').expect(200);
  await api.get('/tidak-ada').expect(404);
});

test('CRUD barang, penolakan stok langsung, dan pengarsipan stok nol', async () => {
  const c = (await api.post('/api/barang').send({ nama: 'Map', kategori: 'Aksesoris', harga: 4000 }).expect(201)).body.data;
  await api.get(`/api/barang/${c._id}`).expect(200);
  const updated = await api.patch(`/api/barang/${c._id}`).send({ nama: 'Map Plastik', harga: 4500 }).expect(200);
  assert.equal(updated.body.data.harga, 4500);
  await api.patch(`/api/barang/${c._id}`).send({ stok: 99 }).expect(400);
  await api.delete(`/api/barang/${a._id}`).expect(409);
  await api.delete(`/api/barang/${c._id}`).expect(200);
  assert.equal((await api.get(`/api/barang/${c._id}`)).body.data.aktif, false);
  const archived = await api.get('/api/barang?aktif=false').expect(200);
  assert.equal(archived.body.meta.total, 1);
  await api.delete(`/api/barang/${c._id}`).expect(404);
});

test('validasi nama duplikat mengabaikan kapital/spasi dan juga berlaku saat update', async () => {
  await api.post('/api/barang').send({ nama: ' PULPEN ', kategori: 'Tes', harga: 1 }).expect(409);
  await api.patch(`/api/barang/${b._id}`).send({ nama: 'pulpen' }).expect(409);
});

test('validasi body, angka, ID, content type, dan malformed JSON', async () => {
  for (const extra of [{ harga: -1 }, { stok: 1.5 }, { stok: null }, { harga: '5000' }, { nama: '   ' }, { rahasia: true }]) {
    await api.post('/api/barang').send({ nama: 'Tes', kategori: 'Tes', harga: 100, ...extra }).expect(400);
  }
  await api.post('/api/barang').send([]).expect(400);
  await api.post('/api/barang').set('Content-Type', 'text/plain').send('abc').expect(415);
  await api.post('/api/barang').set('Content-Type', 'application/json').send('{').expect(400);
  await api.get('/api/barang/bukan-id').expect(400);
  await api.get('/api/barang/000000000000000000000000').expect(404);
  await api.patch(`/api/barang/${a._id}`).send({}).expect(400);
});

test('pencarian, kategori, batas stok, sort, pagination, dan query invalid', async () => {
  const found = await api.get('/api/barang?q=pul&kategori=Alat%20Tulis&stokMaks=5&limit=1').expect(200);
  assert.equal(found.body.meta.total, 1);
  assert.equal(found.body.data[0]._id, a._id);
  const page = await api.get('/api/barang?sort=stok&limit=1&page=2').expect(200);
  assert.equal(page.body.data[0]._id, a._id);
  for (const query of ['limit=0', 'page=-1', 'sort=toString', 'aktif=ya', 'q[x]=abc', 'stokMaks=abc', 'unknown=1', 'q=a&q=b']) {
    await api.get(`/api/barang?${query}`).expect(400);
  }
});

test('stok menipis menggunakan stokMinimum atau batas dari query', async () => {
  const low = await api.get('/api/barang/stok-menipis').expect(200);
  assert.equal(low.body.meta.total, 1);
  assert.equal(low.body.data[0]._id, b._id);
  assert.equal((await api.get('/api/barang/stok-menipis?batas=5')).body.meta.total, 2);
});

test('ketersediaan dan nilai inventaris sesuai data database', async () => {
  const report = (await api.get('/api/laporan/inventaris').expect(200)).body.data;
  assert.equal(report.totalStok, 9);
  assert.equal(report.totalNilaiInventaris, 37500);
  assert.equal(report.jumlahStokMenipis, 1);
  assert.equal((await api.get('/api/barang/ketersediaan')).body.data.seluruhBarangTersedia, true);
  await sale([{ barangId: a._id, jumlah: 5 }]).expect(201);
  const availability = (await api.get('/api/barang/ketersediaan')).body.data;
  assert.equal(availability.jumlahBarangHabis, 1);
  assert.equal(availability.status, 'perlu_restock');
});

test('satu penjualan banyak barang mengubah stok dan total dari harga database', async () => {
  const result = await sale([{ barangId: a._id, jumlah: 2 }, { barangId: b._id, jumlah: 3 }]).expect(201);
  assert.equal(result.body.data.total, 22000);
  assert.equal(result.body.data.items.length, 2);
  assert.equal(await stock(a), 3);
  assert.equal(await stock(b), 1);
  const detail = (await api.get(`/api/transaksi/${result.body.data._id}`).expect(200)).body.data;
  assert.equal(detail.nomorTransaksi, result.body.data.nomorTransaksi);
});

test('stok tidak cukup pada barang kedua membatalkan seluruh perubahan', async () => {
  await sale([{ barangId: a._id, jumlah: 2 }, { barangId: b._id, jumlah: 99 }]).expect(409);
  assert.equal(await stock(a), 5);
  assert.equal(await stock(b), 4);
  assert.equal(await Transaksi.countDocuments(), 0);
});

test('barang tidak ditemukan tidak menyisakan transaksi atau perubahan stok', async () => {
  await sale([{ barangId: a._id, jumlah: 1 }, { barangId: 'ffffffffffffffffffffffff', jumlah: 1 }]).expect(404);
  assert.equal(await stock(a), 5);
  assert.equal(await Transaksi.countDocuments(), 0);
});

test('transaksi menolak item duplikat, jumlah invalid, dan manipulasi harga/total', async () => {
  await sale([{ barangId: a._id, jumlah: 1 }, { barangId: a._id, jumlah: 2 }]).expect(400);
  for (const jumlah of [0, -1, 0.5, '2', null]) await sale([{ barangId: a._id, jumlah }]).expect(400);
  await sale([{ barangId: a._id, jumlah: 1, harga: 0 }]).expect(400);
  await api.post('/api/transaksi').send({ jenis: 'keluar', items: [{ barangId: a._id, jumlah: 1 }], total: 0 }).expect(400);
  await sale([]).expect(400);
  await api.post('/api/transaksi').send({ jenis: 'lain', items: [{ barangId: a._id, jumlah: 1 }] }).expect(400);
  assert.equal(await stock(a), 5);
});

test('snapshot harga dan nama tetap meskipun data barang diperbarui', async () => {
  const transaksi = (await sale([{ barangId: a._id, jumlah: 1 }]).expect(201)).body.data;
  await api.patch(`/api/barang/${a._id}`).send({ nama: 'Pulpen Baru', harga: 9000 }).expect(200);
  const detail = (await api.get(`/api/transaksi/${transaksi._id}`)).body.data;
  assert.equal(detail.items[0].nama, 'Pulpen');
  assert.equal(detail.items[0].harga, 3500);
});

test('barang masuk menambah stok tanpa dihitung sebagai penjualan', async () => {
  const result = await api.post('/api/transaksi').send({ jenis: 'masuk', items: [{ barangId: a._id, jumlah: 10 }] }).expect(201);
  assert.equal(result.body.data.total, 0);
  assert.equal(await stock(a), 15);
  assert.equal((await api.get('/api/laporan/penjualan')).body.data.totalPenjualan, 0);
  await api.patch(`/api/transaksi/${result.body.data._id}/batal`).send({ alasan: 'Salah input' }).expect(200);
  assert.equal(await stock(a), 5);
});

test('pembatalan penjualan mengembalikan stok sekali dan dikecualikan dari laporan', async () => {
  const transaksi = (await sale([{ barangId: a._id, jumlah: 2 }])).body.data;
  assert.equal((await api.get('/api/laporan/penjualan')).body.data.totalPenjualan, 7000);
  await api.patch(`/api/transaksi/${transaksi._id}/batal`).send({ alasan: 'Pelanggan batal membeli' }).expect(200);
  await api.patch(`/api/transaksi/${transaksi._id}/batal`).send({ alasan: 'Ulang' }).expect(409);
  assert.equal(await stock(a), 5);
  assert.equal((await api.get('/api/laporan/penjualan')).body.data.totalPenjualan, 0);
  assert.equal(await Transaksi.countDocuments(), 1);
});

test('pembatalan barang masuk ditolak seluruhnya ketika stok telah terpakai', async () => {
  const masuk = (await api.post('/api/transaksi').send({ jenis: 'masuk', items: [{ barangId: a._id, jumlah: 2 }, { barangId: b._id, jumlah: 10 }] }).expect(201)).body.data;
  await sale([{ barangId: b._id, jumlah: 12 }]).expect(201);
  await api.patch(`/api/transaksi/${masuk._id}/batal`).send({ alasan: 'Koreksi' }).expect(409);
  assert.equal(await stock(a), 7);
  assert.equal(await stock(b), 2);
  assert.equal((await Transaksi.findById(masuk._id)).status, 'selesai');
});

test('penjualan bersamaan tidak menyebabkan stok negatif', async () => {
  const responses = await Promise.all([sale([{ barangId: a._id, jumlah: 4 }]), sale([{ barangId: a._id, jumlah: 4 }])]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await stock(a), 1);
  assert.equal(await Transaksi.countDocuments(), 1);
});

test('pembatalan bersamaan mengembalikan stok tepat satu kali', async () => {
  const transaksi = (await sale([{ barangId: a._id, jumlah: 3 }])).body.data;
  const cancel = () => api.patch(`/api/transaksi/${transaksi._id}/batal`).send({ alasan: 'Batal' });
  const responses = await Promise.all([cancel(), cancel()]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  assert.equal(await stock(a), 5);
});

test('filter riwayat dan laporan rentang tanggal menghormati batas hari WIB', async () => {
  const transaksi = (await sale([{ barangId: a._id, jumlah: 2 }])).body.data;
  await Transaksi.updateOne({ _id: transaksi._id }, { tanggal: new Date('2026-11-20T17:30:00Z') });
  const query = `jenis=keluar&status=selesai&barangId=${a._id}&dari=2026-11-21&sampai=2026-11-21`;
  assert.equal((await api.get(`/api/transaksi?${query}`).expect(200)).body.meta.total, 1);
  assert.equal((await api.get('/api/transaksi?dari=2026-11-20&sampai=2026-11-20')).body.meta.total, 0);
  const report = (await api.get('/api/laporan/penjualan?dari=2026-11-21&sampai=2026-11-21').expect(200)).body.data;
  assert.equal(report.totalPenjualan, 7000);
  assert.equal(report.totalUnitTerjual, 2);
  assert.equal(report.harian[0].tanggal, '2026-11-21');
  for (const query of ['dari=2026-02-30', 'dari=2026-11-22&sampai=2026-11-20', 'status=salah', 'barangId=x']) await api.get(`/api/transaksi?${query}`).expect(400);
});

test('barang diarsipkan tidak boleh ditransaksikan atau dipulihkan lewat pembatalan', async () => {
  const transaksi = (await sale([{ barangId: a._id, jumlah: 5 }])).body.data;
  await api.delete(`/api/barang/${a._id}`).expect(200);
  await api.post('/api/transaksi').send({ jenis: 'masuk', items: [{ barangId: a._id, jumlah: 1 }] }).expect(404);
  await api.patch(`/api/transaksi/${transaksi._id}/batal`).send({ alasan: 'Batal' }).expect(409);
  assert.equal(await stock(a), 0);
  assert.equal((await api.get(`/api/transaksi/${transaksi._id}`)).body.data.items[0].nama, 'Pulpen');
});

test('database kosong memiliki laporan dan ketersediaan yang jelas', async () => {
  await Barang.deleteMany({});
  const report = (await api.get('/api/laporan/inventaris')).body.data;
  assert.equal(report.totalStok, 0);
  assert.equal((await api.get('/api/barang/ketersediaan')).body.data.status, 'kosong');
  assert.deepEqual((await api.get('/api/laporan/penjualan')).body.data.harian, []);
});
