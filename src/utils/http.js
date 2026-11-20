export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// try/catch diterapkan untuk meneruskan error asynchronous ke middleware.
export const asyncHandler = (handler) => async (req, res, next) => {
  try { await handler(req, res, next); } catch (error) { next(error); }
};

export const success = (res, data, message = 'Berhasil.', status = 200, meta) =>
  res.status(status).json({ success: true, message, data, ...(meta ? { meta } : {}) });
