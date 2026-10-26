import { Router } from 'express';
import * as batchCtrl from '../controllers/batch.controller';
import { adminAuth } from '../middleware/auth';

const router = Router();
router.use(adminAuth);
router.get('/', batchCtrl.getBatches);
router.get('/slots', batchCtrl.getBatchSlots);
router.post('/', batchCtrl.createBatch);
router.patch('/:id', batchCtrl.updateBatch);
router.get('/:id/students', batchCtrl.getBatchStudents);
export default router;
