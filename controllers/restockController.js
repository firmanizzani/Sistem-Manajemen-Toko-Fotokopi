import * as restockService from '../services/restockService.js';

// Tambah restock
export async function create(req, res, next) {
  try {
    const data = await restockService.createRestock(req.body);
    res.status(201).json({ success: true, message: 'Restock dicatat dan stok bertambah.', data });
  } catch (error) { next(error); }
}

// Riwayat restock
export async function list(req, res, next) {
  try {
    const { data, meta } = await restockService.listRestock(req.query);
    res.status(200).json({ success: true, message: 'Riwayat restock.', data, meta });
  } catch (error) { next(error); }
}

// Detail restock
export async function detail(req, res, next) {
  try {
    const data = await restockService.getRestock(req.params.id);
    res.status(200).json({ success: true, message: 'Detail restock.', data });
  } catch (error) { next(error); }
}

// Batalkan restock
export async function cancel(req, res, next) {
  try {
    const data = await restockService.cancelRestock(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Restock dibatalkan dan stok dikembalikan.', data });
  } catch (error) { next(error); }
}
