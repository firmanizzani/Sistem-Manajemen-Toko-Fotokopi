import mongoose from 'mongoose';

// Status error
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Tolak input
export function fail(message) {
  throw new HttpError(400, message);
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

// Pembagian halaman
export function getPagination(query) {
  const page = readQueryInteger(query.page, 'page', 1, 1, 1_000_000);
  const limit = readQueryInteger(query.limit, 'limit', 20, 1, 100);
  return { page, limit, skip: (page - 1) * limit };
}

// Filter tanggal
export function getDateFilter(query) {
  const range = {};
  for (const [key, operator] of [['dari', '$gte'], ['sampai', '$lt']]) {
    if (query[key] === undefined) continue;
    const value = query[key];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${key} harus berformat YYYY-MM-DD.`);
    const utc = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 10) !== value) fail(`${key} tidak valid.`);
    const start = new Date(`${value}T00:00:00.000+07:00`);
    range[operator] = key === 'sampai' ? new Date(start.getTime() + 86400000) : start;
  }
  if (range.$gte && range.$lt && range.$gte >= range.$lt) fail('dari tidak boleh melewati sampai.');
  return Object.keys(range).length ? { tanggal: range } : {};
}

// Amankan pencarian
export function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
