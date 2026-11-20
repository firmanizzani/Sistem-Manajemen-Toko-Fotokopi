import { mkdir, writeFile } from 'node:fs/promises';

const items = [];
function add(name, method, path, code, body, extra = [], prerequest = []) {
  const tests = [
    `pm.test('HTTP ${code}', () => pm.response.to.have.status(${code}));`,
    `pm.test('Response JSON dan success sesuai', () => { pm.response.to.be.json; pm.expect(pm.response.json().success).to.eql(${code < 400}); });`,
    ...extra
  ];
  const raw = `{{baseUrl}}${path}`;
  const [pathname, search] = path.split('?');
  items.push({ name, request: {
    method, header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
    url: { raw, host: ['{{baseUrl}}'], path: pathname.slice(1).split('/'),
      ...(search ? { query: search.split('&').map((pair) => { const [key, value] = pair.split('='); return { key, value }; }) } : {}) },
    ...(body ? { body: { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } } } : {})
  }, event: [
    ...(prerequest.length ? [{ listen: 'prerequest', script: { type: 'text/javascript', exec: prerequest } }] : []),
    { listen: 'test', script: { type: 'text/javascript', exec: tests } }
  ] });
}
const item = (variable, jumlah) => ({ barangId: `{{${variable}}}`, jumlah });
const save = (variable) => `pm.collectionVariables.set('${variable}', pm.response.json().data._id);`;

add('01 Health', 'GET', '/api/health', 200, null, [], ["pm.collectionVariables.set('suffix', Date.now().toString() + '-' + Math.floor(Math.random()*100000));"]);
add('02 Tambah barang A', 'POST', '/api/barang', 201, { nama: 'Demo Pulpen {{suffix}}', kategori: 'Demo', harga: 3500, stok: 0, stokMinimum: 2 }, [save('barangA')]);
add('03 Tambah barang B', 'POST', '/api/barang', 201, { nama: 'Demo Buku {{suffix}}', kategori: 'Demo', harga: 5000, stok: 0, stokMinimum: 2 }, [save('barangB')]);
add('04 Nama duplikat ditolak', 'POST', '/api/barang', 409, { nama: 'Demo Pulpen {{suffix}}', kategori: 'Demo', harga: 3500 });
add('05 Validasi angka negatif', 'POST', '/api/barang', 400, { nama: 'Invalid', kategori: 'Demo', harga: -1 });
add('06 Detail barang dan path parameter', 'GET', '/api/barang/{{barangA}}', 200, null, ["pm.test('Stok awal nol', () => pm.expect(pm.response.json().data.stok).to.eql(0));"]);
add('07 Update data barang', 'PATCH', '/api/barang/{{barangA}}', 200, { stokMinimum: 3 });
add('08 Daftar barang dan query parameter', 'GET', '/api/barang?kategori=Demo&q={{suffix}}&sort=stok&page=1&limit=10', 200, null, ["pm.test('Dua barang demo ditemukan', () => pm.expect(pm.response.json().meta.total).to.eql(2));"]);
add('09 Barang masuk banyak item', 'POST', '/api/transaksi', 201, { jenis: 'masuk', items: [item('barangA', 5), item('barangB', 4)], catatan: 'Restock demo Postman' }, [save('transaksiMasuk'), "pm.test('Barang masuk bukan pendapatan', () => pm.expect(pm.response.json().data.total).to.eql(0));"]);
add('10 Penjualan banyak item', 'POST', '/api/transaksi', 201, { jenis: 'keluar', items: [item('barangA', 2), item('barangB', 3)], catatan: 'Penjualan demo Postman' }, [save('transaksiKeluar'), "pm.test('Total penjualan 22000', () => pm.expect(pm.response.json().data.total).to.eql(22000));", "pm.test('Memuat dua detail barang', () => pm.expect(pm.response.json().data.items).to.have.length(2));"]);
add('11 Stok otomatis setelah penjualan', 'GET', '/api/barang/{{barangA}}', 200, null, ["pm.test('Stok A menjadi 3', () => pm.expect(pm.response.json().data.stok).to.eql(3));"]);
add('12 Stok tidak cukup membatalkan semua item', 'POST', '/api/transaksi', 409, { jenis: 'keluar', items: [item('barangA', 1), item('barangB', 99)] });
add('13 Pastikan stok tidak berubah setelah gagal', 'GET', '/api/barang/{{barangA}}', 200, null, ["pm.test('Stok A tetap 3', () => pm.expect(pm.response.json().data.stok).to.eql(3));"]);
add('14 Detail transaksi', 'GET', '/api/transaksi/{{transaksiKeluar}}', 200);
add('15 Riwayat dengan filter barang jenis dan status', 'GET', '/api/transaksi?barangId={{barangA}}&jenis=keluar&status=selesai&page=1&limit=10', 200, null, ["pm.test('Hanya satu penjualan berhasil', () => pm.expect(pm.response.json().meta.total).to.eql(1));"]);
add('16 Filter tanggal riwayat', 'GET', '/api/transaksi?dari=2020-01-01&sampai=2099-12-31&barangId={{barangA}}', 200);
add('17 Stok menipis', 'GET', '/api/barang/stok-menipis?batas=3&page=1&limit=100', 200);
add('18 Ketersediaan stok', 'GET', '/api/barang/ketersediaan', 200);
add('19 Ringkasan inventaris', 'GET', '/api/laporan/inventaris', 200);
add('20 Laporan penjualan dan query tanggal', 'GET', '/api/laporan/penjualan?dari=2020-01-01&sampai=2099-12-31', 200, null, ["pm.test('Penjualan demo tercakup', () => pm.expect(pm.response.json().data.totalPenjualan).to.be.at.least(22000));"]);
add('21 Harga transaksi tidak boleh dikirim client', 'POST', '/api/transaksi', 400, { jenis: 'keluar', items: [{ ...item('barangA', 1), harga: 1 }] });
add('22 Pembatalan penjualan', 'PATCH', '/api/transaksi/{{transaksiKeluar}}/batal', 200, { alasan: 'Demo pembatalan' }, ["pm.test('Status dibatalkan', () => pm.expect(pm.response.json().data.status).to.eql('dibatalkan'));"]);
add('23 Stok pulih setelah pembatalan', 'GET', '/api/barang/{{barangA}}', 200, null, ["pm.test('Stok A kembali 5', () => pm.expect(pm.response.json().data.stok).to.eql(5));"]);
add('24 Pembatalan dua kali ditolak', 'PATCH', '/api/transaksi/{{transaksiKeluar}}/batal', 409, { alasan: 'Percobaan ulang' });
add('25 Pembatalan barang masuk', 'PATCH', '/api/transaksi/{{transaksiMasuk}}/batal', 200, { alasan: 'Selesai demonstrasi' });
add('26 Hapus atau arsipkan barang A', 'DELETE', '/api/barang/{{barangA}}', 200);
add('27 Hapus atau arsipkan barang B', 'DELETE', '/api/barang/{{barangB}}', 200);
add('28 ID invalid ditolak', 'GET', '/api/barang/bukan-id', 400);
add('29 Barang tidak ditemukan', 'GET', '/api/barang/000000000000000000000000', 404);
add('30 Query tanggal invalid ditolak', 'GET', '/api/transaksi?dari=2026-02-30', 400);
add('31 Endpoint tidak ditemukan', 'GET', '/api/tidak-ada', 404);

const collection = {
  info: { name: 'Sistem Manajemen Toko Fotokopi', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description: 'Jalankan seluruh collection berurutan. Membuat dua barang demo, restock, penjualan, pembatalan, dan pengarsipan. Nama demo unik per run. Detail tersimpan di array items. Gunakan database demo untuk presentasi.' },
  variable: [{ key: 'baseUrl', value: 'http://127.0.0.1:3000' }], item: items
};
const folder = new URL('../postman/', import.meta.url);
await mkdir(folder, { recursive: true });
await writeFile(new URL('sistem-manajemen-toko-fotokopi.postman_collection.json', folder), JSON.stringify(collection, null, 2) + '\n');
console.log(`Collection Postman dibuat: ${items.length} request.`);
