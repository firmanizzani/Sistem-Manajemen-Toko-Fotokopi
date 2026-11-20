export function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  if (error.code === 11000) {
    status = 409;
    message = 'Data duplikat. Nama barang atau nomor transaksi sudah digunakan.';
  } else if (['ValidationError', 'CastError', 'StrictModeError'].includes(error.name)) {
    status = 400;
    message = 'Data tidak valid. Periksa tipe dan nilai setiap field.';
  } else if (error.type === 'entity.parse.failed') {
    status = 400;
    message = 'Format JSON tidak valid.';
  } else if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
    status = 503;
    message = 'Database tidak tersedia.';
  }
  if (status >= 500) {
    console.error(error);
    message = status === 503 ? message : 'Terjadi kesalahan pada server.';
  }
  res.status(status).json({ success: false, message });
}
