import { Router } from 'express';
import * as controller from '../controllers/transaksiController.js';
const router = Router();

router.get('/', controller.list);
router.get('/:id', controller.detail);
router.post('/', controller.create);
router.patch('/:id/batal', controller.cancel);

export default router;
