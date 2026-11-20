import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import mongoose from 'mongoose';
import newman from 'newman';
import app from '../index.js';
import { connectDatabase } from '../config/database.js';
import Barang from '../models/Barang.js';
import Transaksi from '../models/Transaksi.js';

const databaseName = `fotokopi_postman_${Date.now()}_${process.pid}`;
const uri = new URL(process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/?replicaSet=rsFotokopi&directConnection=true');
uri.pathname = `/${databaseName}`;
let server;
try {
  await connectDatabase(uri.toString());
  await Promise.all([Barang.init(), Transaksi.init()]);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const collection = JSON.parse(await readFile(new URL('../postman/sistem-manajemen-toko-fotokopi.postman_collection.json', import.meta.url), 'utf8'));
  const summary = await new Promise((resolve, reject) => {
    newman.run({ collection, reporters: ['cli'],
      envVar: [{ key: 'baseUrl', value: `http://127.0.0.1:${server.address().port}` }],
      timeoutRequest: 10000
    }, (error, result) => error ? reject(error) : resolve(result));
  });
  const report = {
    project: 'Sistem Manajemen Toko Fotokopi',
    runAt: new Date().toISOString(), runner: 'Newman (Postman collection)',
    database: 'Database pengujian sementara; dihapus setelah pengujian.',
    stats: summary.run.stats,
    failures: summary.run.failures.map((f) => ({ name: f.error.name, message: f.error.message, request: f.source.name })),
    requests: summary.run.executions.map((entry) => ({
      name: entry.item.name, method: entry.request.method, status: entry.response?.code,
      assertions: entry.assertions?.map((a) => ({ name: a.assertion, passed: !a.error })) ?? []
    }))
  };
  await mkdir(new URL('../postman/', import.meta.url), { recursive: true });
  await writeFile(new URL('../postman/hasil-pengujian.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  if (summary.run.failures.length) process.exitCode = 1;
} catch (error) { console.error(error); process.exitCode = 1; }
finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.name === databaseName && databaseName.startsWith('fotokopi_postman_')) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
