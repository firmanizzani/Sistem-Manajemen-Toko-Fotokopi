import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';

// Tolak input
export function fail(message) {
  throw new AppError(400, message);
}

// Validasi body
export function validateBody(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Body harus berupa object JSON.');
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) fail(`Field tidak dikenal: ${unknown.join(', ')}.`);
}

// Validasi teks
export function validateText(value, label, max = 120) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    fail(`${label} wajib berupa teks berisi 1–${max} karakter.`);
  }
  return value.trim();
}

// Validasi angka
export function validateInteger(value, label, min = 0, max = 1_000_000_000) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    fail(`${label} harus bilangan bulat antara ${min} dan ${max}.`);
  }
  return value;
}

// Validasi ID
export function validateId(value, label = 'ID') {
  if (typeof value !== 'string' || !mongoose.isObjectIdOrHexString(value)) fail(`${label} tidak valid.`);
  return value;
}

// Validasi query
export function validateQuery(query, allowed) {
  validateBody(query, allowed);
  for (const value of Object.values(query)) {
    if (typeof value !== 'string') fail('Setiap query parameter harus berisi satu nilai teks.');
  }
}

// Angka query
export function readQueryInteger(value, label, fallback, min = 0, max = 1_000_000_000) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) fail(`${label} harus berupa bilangan bulat.`);
  return validateInteger(Number(value), label, min, max);
}

// Validasi barang
export function validateItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) fail('items harus berisi 1–50 barang.');
  const seen = new Set();
  return items.map((item) => {
    validateBody(item, ['barangId', 'jumlah']);
    const barangId = validateId(item.barangId, 'barangId').toLowerCase();
    if (seen.has(barangId)) fail('Barang yang sama tidak boleh berulang; gabungkan jumlahnya.');
    seen.add(barangId);
    return { barangId, jumlah: validateInteger(item.jumlah, 'jumlah', 1, 1_000_000) };
  });
}
