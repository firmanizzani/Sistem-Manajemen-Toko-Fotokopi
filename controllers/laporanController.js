import * as laporanService from '../services/laporanService.js';

export async function inventaris(req, res, next) {
  try {
    const data = await laporanService.getInventaris(req.query);
    res.status(200).json({ success: true, message: 'Ringkasan inventaris.', data });
  } catch (error) {
    next(error);
  }
}

export async function penjualan(req, res, next) {
  try {
    const data = await laporanService.getPenjualan(req.query);
    res.status(200).json({ success: true, message: 'Ringkasan penjualan.', data });
  } catch (error) {
    next(error);
  }
}
