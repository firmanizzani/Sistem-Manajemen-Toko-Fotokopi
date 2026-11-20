import { readQueryInteger, fail } from '../validators/commonValidator.js';

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
