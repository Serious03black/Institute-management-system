import { Router } from 'express';
import * as courseCtrl from '../controllers/course.controller';
import { adminAuth } from '../middleware/auth';

const router = Router();
router.use(adminAuth);
router.get('/', courseCtrl.getModules);
router.patch('/:id', courseCtrl.updateModule);
export default router;
