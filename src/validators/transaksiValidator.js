import { validateBody, validateText, validateItems } from './commonValidator.js';

// Penjualan restock
export function validateTransaksi(body) {
  validateBody(body, ['items', 'catatan']);
  return {
    items: validateItems(body.items),
    catatan: body.catatan === undefined ? '' : validateText(body.catatan, 'catatan', 500)
  };
}

// Alasan pembatalan
export function validatePembatalan(body) {
  validateBody(body, ['alasan']);
  return validateText(body.alasan, 'alasan', 500);
}
