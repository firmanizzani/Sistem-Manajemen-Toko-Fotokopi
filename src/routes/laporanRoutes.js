import { Router } from 'express';
import * as controller from '../controllers/laporanController.js';
const router = Router();
router.get('/inventaris', controller.inventaris);
router.get('/penjualan', controller.penjualan);
export default router;
