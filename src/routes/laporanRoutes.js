import { Router } from 'express';
import * as controller from '../controllers/laporanController.js';
import { asyncHandler as wrap } from '../utils/http.js';
const router = Router();
router.get('/inventaris', wrap(controller.inventaris));
router.get('/penjualan', wrap(controller.penjualan));
export default router;
