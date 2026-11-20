import * as barangService from '../services/barangService.js';

// Tambah barang
export async function createBarang(req, res, next) {
  try {
    const data = await barangService.createBarang(req.body);
    res.status(201).json({ success: true, message: 'Barang berhasil ditambahkan.', data });
  } catch (error) {
    next(error);
  }
}

// Daftar barang
export async function listBarang(req, res, next) {
  try {
    const { data, meta } = await barangService.listBarang(req.query);
    res.status(200).json({ success: true, message: 'Daftar barang.', data, meta });
  } catch (error) {
    next(error);
  }
}

// Detail barang
export async function getBarang(req, res, next) {
  try {
    const data = await barangService.getBarang(req.params.id);
    res.status(200).json({ success: true, message: 'Detail barang.', data });
  } catch (error) {
    next(error);
  }
}

// Ubah barang
export async function updateBarang(req, res, next) {
  try {
    const data = await barangService.updateBarang(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Barang berhasil diperbarui.', data });
  } catch (error) {
    next(error);
  }
}

// Ganti barang
export async function replaceBarang(req, res, next) {
  try {
    const data = await barangService.replaceBarang(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Data barang berhasil diganti.', data });
  } catch (error) {
    next(error);
  }
}

// Hapus barang
export async function deleteBarang(req, res, next) {
  try {
    const data = await barangService.deleteBarang(req.params.id);
    res.status(200).json({ success: true, message: 'Barang dihapus permanen; riwayat transaksi tetap tersimpan.', data });
  } catch (error) {
    next(error);
  }
}

// Stok menipis
export async function lowStock(req, res, next) {
  try {
    const { data, meta } = await barangService.lowStock(req.query);
    res.status(200).json({ success: true, message: 'Daftar barang stok menipis.', data, meta });
  } catch (error) {
    next(error);
  }
}

// Ketersediaan stok
export async function availability(req, res, next) {
  try {
    const data = await barangService.availability(req.query);
    res.status(200).json({ success: true, message: 'Ketersediaan stok.', data });
  } catch (error) {
    next(error);
  }
}
