import { Router } from 'express';
import * as controller from '../controllers/barangController.js';
const router = Router();

router.get('/stok-menipis', controller.lowStock);
router.get('/ketersediaan', controller.availability);
router.get('/', controller.listBarang);
router.get('/:id', controller.getBarang);
router.post('/', controller.createBarang);
router.patch('/:id', controller.updateBarang);
router.delete('/:id', controller.deleteBarang);

export default router;
