import * as barangService from '../services/barangService.js';

export async function createBarang(req, res, next) {
  try {
    const data = await barangService.createBarang(req.body);
    res.status(201).json({ success: true, message: 'Barang berhasil ditambahkan.', data });
  } catch (error) {
    next(error);
  }
}

export async function listBarang(req, res, next) {
  try {
    const { data, meta } = await barangService.listBarang(req.query);
    res.status(200).json({ success: true, message: 'Daftar barang.', data, meta });
  } catch (error) {
    next(error);
  }
}

export async function getBarang(req, res, next) {
  try {
    const data = await barangService.getBarang(req.params.id);
    res.status(200).json({ success: true, message: 'Detail barang.', data });
  } catch (error) {
    next(error);
  }
}

export async function updateBarang(req, res, next) {
  try {
    const data = await barangService.updateBarang(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Barang berhasil diperbarui.', data });
  } catch (error) {
    next(error);
  }
}

export async function deleteBarang(req, res, next) {
  try {
    const data = await barangService.deleteBarang(req.params.id);
    res.status(200).json({ success: true, message: 'Barang diarsipkan; riwayat tetap tersimpan.', data });
  } catch (error) {
    next(error);
  }
}

export async function lowStock(req, res, next) {
  try {
    const { data, meta } = await barangService.lowStock(req.query);
    res.status(200).json({ success: true, message: 'Daftar barang stok menipis.', data, meta });
  } catch (error) {
    next(error);
  }
}

export async function availability(req, res, next) {
  try {
    const data = await barangService.availability(req.query);
    res.status(200).json({ success: true, message: 'Ketersediaan stok.', data });
  } catch (error) {
    next(error);
  }
}
