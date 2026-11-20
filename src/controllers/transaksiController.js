import * as transaksiService from '../services/transaksiService.js';

// Buat transaksi
export async function create(req, res, next) {
  try {
    const data = await transaksiService.createTransaksi(req.body);
    res.status(201).json({ success: true, message: 'Transaksi berhasil dicatat dan stok diperbarui.', data });
  } catch (error) {
    next(error);
  }
}

// Riwayat transaksi
export async function list(req, res, next) {
  try {
    const { data, meta } = await transaksiService.listTransaksi(req.query);
    res.status(200).json({ success: true, message: 'Riwayat transaksi.', data, meta });
  } catch (error) {
    next(error);
  }
}

// Detail transaksi
export async function detail(req, res, next) {
  try {
    const data = await transaksiService.getTransaksi(req.params.id);
    res.status(200).json({ success: true, message: 'Detail transaksi.', data });
  } catch (error) {
    next(error);
  }
}

// Batalkan transaksi
export async function cancel(req, res, next) {
  try {
    const data = await transaksiService.cancelTransaksi(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Transaksi dibatalkan dan stok dikembalikan.', data });
  } catch (error) {
    next(error);
  }
}
