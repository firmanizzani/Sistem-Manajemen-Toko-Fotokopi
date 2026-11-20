import { Router } from 'express';
import * as controller from '../controllers/barangController.js';
import { asyncHandler as wrap } from '../utils/http.js';
const router = Router();
router.get('/stok-menipis', wrap(controller.lowStock));
router.get('/ketersediaan', wrap(controller.availability));
router.route('/').get(wrap(controller.listBarang)).post(wrap(controller.createBarang));
router.route('/:id').get(wrap(controller.getBarang)).patch(wrap(controller.updateBarang)).delete(wrap(controller.deleteBarang));
export default router;
