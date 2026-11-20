import { validateBody, validateText, validateInteger, fail } from './commonValidator.js';

// Barang baru
export function validateCreateBarang(body) {
  validateBody(body, ['nama', 'kategori', 'harga', 'stok', 'stokMinimum']);
  return {
    nama: validateText(body.nama, 'nama'),
    kategori: validateText(body.kategori, 'kategori', 80),
    harga: validateInteger(body.harga, 'harga'),
    stok: validateInteger(body.stok === undefined ? 0 : body.stok, 'stok'),
    stokMinimum: validateInteger(body.stokMinimum === undefined ? 10 : body.stokMinimum, 'stokMinimum')
  };
}

// Perubahan barang
export function validateUpdateBarang(body) {
  validateBody(body, ['nama', 'kategori', 'harga', 'stokMinimum']);
  if (!Object.keys(body).length) fail('Isi minimal satu field yang ingin diperbarui.');
  const update = {};
  if ('nama' in body) update.nama = validateText(body.nama, 'nama');
  if ('kategori' in body) update.kategori = validateText(body.kategori, 'kategori', 80);
  for (const field of ['harga', 'stokMinimum']) {
    if (field in body) update[field] = validateInteger(body[field], field);
  }
  return update;
}
