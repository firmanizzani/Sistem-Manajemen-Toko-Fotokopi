// Validasi format
export default function validateJson(req, res, next) {
  if (['POST', 'PATCH', 'PUT'].includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({ success: false, message: 'Gunakan Content-Type: application/json.' });
  }
  next();
}
