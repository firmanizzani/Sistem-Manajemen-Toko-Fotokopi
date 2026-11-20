import { Router } from 'express';
import * as controller from '../controllers/transaksiController.js';
import { asyncHandler as wrap } from '../utils/http.js';
const router = Router();
router.route('/').get(wrap(controller.list)).post(wrap(controller.create));
router.get('/:id', wrap(controller.detail));
router.patch('/:id/batal', wrap(controller.cancel));
export default router;
