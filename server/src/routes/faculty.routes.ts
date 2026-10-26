import { Router } from 'express';
import * as facCtrl from '../controllers/faculty.controller';
import { adminAuth } from '../middleware/auth';

const router = Router();
router.use(adminAuth);
router.post('/', facCtrl.createFaculty);
router.get('/', facCtrl.getFaculties);
router.get('/:id', facCtrl.getFaculty);
router.patch('/:id', facCtrl.updateFaculty);
export default router;
